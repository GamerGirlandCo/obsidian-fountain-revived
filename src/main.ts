import {
	App,
	Modal,
	Notice,
	Plugin,
	PluginSettingTab,
	Setting,
} from "obsidian";
export default class ObsidianFountain extends Plugin {
	async onload() {
	
	}
	onunload() {
		console.log("unloading plugin");
	}
}