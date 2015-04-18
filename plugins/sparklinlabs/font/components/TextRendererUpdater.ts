var THREE = SupEngine.THREE;
import FontAsset = require("../data/FontAsset");
import TextRenderer = require("./TextRenderer");

// FontFace is a very new feature (supported in Chrome only). Not available in lib.d.ts just yet
declare var FontFace: any;

class TextRendererUpdater {

  client: SupClient.ProjectClient;
  textRenderer: TextRenderer;

  receiveAssetCallbacks: any;
  editAssetCallbacks: any;

  fontAssetId: string;
  text: string;
  options: {align: string; size?: number; color?: string;};

  fontSubscriber: {
    onAssetReceived: (assetId: string, asset: any) => any;
    onAssetEdited: (id: string, command: string, ...args: any[]) => any;
    onAssetTrashed: (assetId: string) => any};

  fontAsset: FontAsset;
  url: string;
  font: any;

  constructor(client: SupClient.ProjectClient, textRenderer: TextRenderer, config: any, receiveAssetCallbacks?: any, editAssetCallbacks?: any) {
    this.client = client;
    this.textRenderer = textRenderer;
    this.receiveAssetCallbacks = receiveAssetCallbacks;
    this.editAssetCallbacks = editAssetCallbacks;

    this.fontAssetId = config.fontAssetId;
    this.text = config.text;
    this.options = {align: config.align, size: config.size, color: config.color};

    this.fontSubscriber = {
      onAssetReceived: this._onFontAssetReceived,
      onAssetEdited: this._onFontAssetEdited,
      onAssetTrashed: this._onFontAssetTrashed
    };
    if (this.fontAssetId != null) this.client.subAsset(this.fontAssetId, "font", this.fontSubscriber);
  }

  config_setProperty(path: string, value: any) {
    switch (path) {
      case "fontAssetId": {
        if (this.fontAssetId != null) this.client.unsubAsset(this.fontAssetId, this.fontSubscriber);
        this.fontAssetId = value

        this.fontAsset = null
        this.textRenderer.clearMesh();

        if (this.fontAssetId != null) this.client.subAsset(this.fontAssetId, "font", this.fontSubscriber);
        break;
      }
      case "text": {
        this.text = value;
        this.textRenderer.setText(this.text);
        break;
      }
      case "align":
      case "size":
      case "color": {
        (<any>this.options)[path] = (value != "") ? value : null;
        this.textRenderer.setOptions(this.options);
        break;
      }
    }
  }

  _onFontAssetReceived = (assetId: string, asset: any) => {
    this.fontAsset = asset;

    this.textRenderer.setText(this.text);
    this.textRenderer.setOptions(this.options);
    if (this.font == null && asset.pub.font.byteLength !== 0) this._loadFont();
    else if (this.font != null) this.textRenderer.setFont(asset.pub);

    if (this.receiveAssetCallbacks != null) this.receiveAssetCallbacks.font(null);
  }

  _onFontAssetEdited = (id: string, command: string, ...args: any[]) => {
    var commandFunction = (<any>this)[`_onEditCommand_${command}`];
    if (commandFunction != null) commandFunction.apply(this, args);

    if (this.editAssetCallbacks != null && this.editAssetCallbacks.font[command] != null) {
      this.editAssetCallbacks.font[command].apply(null, args);
    }
  }

  _loadFont() {
    if (this.url != null) URL.revokeObjectURL(this.url);
    if (this.font != null) delete this.font;

    var typedArray = new Uint8Array(this.fontAsset.pub.font);
    var blob = new Blob([ typedArray ], { type: "font/*" });
    this.url = URL.createObjectURL(blob);
    this.fontAsset.pub.name = `Font${this.fontAssetId}`;
    this.font = new FontFace(this.fontAsset.pub.name, `url(${this.url})`);
    (<any>document).fonts.add(this.font);
    this.font.load().then(() => { this.textRenderer.setFont(this.fontAsset.pub) });
  }

  _onEditCommand_upload() {
    this._loadFont();
  }

  _onEditCommand_setProperty(path: string) {
    this.textRenderer.setFont(this.fontAsset.pub);
  }

  _onFontAssetTrashed = () => {
    this.textRenderer.clearMesh();
    if (this.editAssetCallbacks != null) SupClient.onAssetTrashed();
  }
}
export = TextRendererUpdater;
