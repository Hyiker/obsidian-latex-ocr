
import axios from 'axios';
import { App, Editor, FileSystemAdapter, MarkdownView, Plugin, PluginSettingTab, Setting } from 'obsidian';
import { Settings } from './settings';
import { MD5 } from 'crypto-js';

export default class MyPlugin extends Plugin {
	settings: Settings;
	private async readLocalResourceImage(imagePath: string): Promise<ArrayBuffer> {
		// const attachmentFoler = this.app.vault.getResourcePath(imagePath);
		const attachmentFolder: string = this.app.vault.getConfig("attachmentFolderPath");
		const realPath = attachmentFolder.length != 0 ? `${attachmentFolder}/${imagePath}` : imagePath;
		const fullPath = (this.app.vault.adapter as FileSystemAdapter).getFullPath(realPath);
		console.log(imagePath, realPath, fullPath);
		return FileSystemAdapter.readLocalFile(decodeURI(fullPath));
	}
	private generateRandomString(length: number): string {
		const characters = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
		let result = "";
		for (let i = 0; i < length; i++) {
			result += characters.charAt(Math.floor(Math.random() * characters.length));
		}
		return result;
	}
	private async getLatexFromImage(imagePath: string): Promise<string> {
		await this.readLocalResourceImage(imagePath);
		// const fullPath = (this.app.vault.adapter as FileSystemAdapter).getFullPath(imagePath);
		// read image
		const image: ArrayBuffer = await this.readLocalResourceImage(imagePath);
		// send image to server
		const formData = new FormData();
		// generate random string length = 16, including 0-9, a-z, A-Z
		const randomString = this.generateRandomString(16);
		//  timestamp in seconds
		const timestamp = Date.now();
		let signature = `app-id=${this.settings.appID}&random-str=${randomString}&timestamp=${timestamp}&app-secret=${this.settings.appSecret}`;
		// md5
		signature = MD5(signature).toString();
		const headers = {
			'timestamp': timestamp,
			'random-str': randomString,
			'app-id': this.settings.appID,
			'sign': signature
		};
		const configs = {
			'headers': headers,
		};


		formData.append("file", new Blob([image]), imagePath);

		const response = await axios.post("https://server.simpletex.cn/api/latex_ocr", formData, configs);

		console.log(response.data);

		return "";
	}
	async onload() {
		await this.loadSettings();


		// This adds a status bar item to the bottom of the app. Does not work on mobile apps.
		const statusBarItemEl = this.addStatusBarItem();
		statusBarItemEl.setText('Status Bar Text');

		// This adds an editor command that can perform some operation on the current editor instance
		this.addCommand({
			id: 'ocr-extract-latex',
			name: 'Extract LaTeX from image',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				const selection = editor.getSelection();
				const latexCode = this.getLatexFromImage(selection);
				console.log(latexCode);
			}
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SampleSettingTab(this.app, this));


	}

	onunload() {
	}

	async loadSettings() {
		this.settings = Object.assign({}, {}, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}


class SampleSettingTab extends PluginSettingTab {
	plugin: MyPlugin;

	constructor(app: App, plugin: MyPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();


		// add settings for simpletex
		containerEl.createEl('h2', { text: 'SimpleTex API Settings' });
		new Setting(containerEl).setName("SimpleTex App ID").setDesc("App ID for SimpleTex API").addText(text => {
			text.setValue(this.plugin.settings.appID);
			text.onChange(async (value) => {
				this.plugin.settings.appID = value;
				await this.plugin.saveSettings();
			});
		});
		new Setting(containerEl).setName("SimpleTex App Secret").setDesc("App Secret for SimpleTex API").addText(text => {
			text.setValue(this.plugin.settings.appSecret);
			text.onChange(async (value) => {
				this.plugin.settings.appSecret = value;
				await this.plugin.saveSettings();
			});
		});
	}
}
