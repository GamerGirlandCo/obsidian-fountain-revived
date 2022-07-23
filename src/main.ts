import {
	App,
	Modal,
	Notice,
	Plugin,
	PluginSettingTab,
	Setting,
	WorkspaceLeaf,
} from "obsidian";
import { Decoration, EditorView } from "@codemirror/view"

import { Fountain } from "fountain-js";
import FountainView from "./fountain-view";

export default class ObsidianFountain extends Plugin {
	fountain: Fountain;
	editor: EditorView
	async onload() {
		console.log(`Loading Fountain Plugin - v${this.manifest.version}`)


		this.fountain = new Fountain();
		// this.editor
		this.registerExtensions(["fountain"], "fountain")
		this.registerEditorExtension([])
		// this.registerMarkdownCodeBlockProcessor("fountain", this.codeBlockProcessor.bind(this))
		this.registerView("fountain", this.makeView)
	}
	async codeBlockProcessor(s, e) {
		let container = e.createDiv({cls: "screenplay"})
		let parsed = this.fountain.parse(s)
		console.debug("parsed", parsed)
		container.innerHTML = parsed.html.script
	}
	async postProcessor(element, ctx) {
		console.debug("postprocess", element, ctx);
	}
	makeView(leaf: WorkspaceLeaf) {
		return new FountainView(leaf);
	}
	onunload() {
		console.log("bye bye!");
	}
}