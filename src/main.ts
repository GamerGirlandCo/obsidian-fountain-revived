import {
	Plugin,
	WorkspaceLeaf,

} from "obsidian";
import {EditorView , ViewPlugin} from "@codemirror/view"
import { ViewPluginClass } from "./fountain-view";
import fountain from "./fountain/lang"

import { Fountain } from "fountain-js";
import {FountainView} from "./fountain-view";
import { inlinePlugin } from "./editor";

export default class ObsidianFountain extends Plugin {
	fountain: Fountain;
	editor: EditorView
	async onload() {
		console.log(`Loading Fountain Plugin - v${this.manifest.version}`)
		
		
		this.fountain = new Fountain();
		// this.editor
		this.registerExtensions(["fountain"], "fountain")
		this.registerView("fountain", this.makeView)
		this.registerEditorExtension([/* fountain(), */ inlinePlugin()])
		this.app.workspace.updateOptions()
		this.registerMarkdownCodeBlockProcessor("fountain", this.codeBlockProcessor.bind(this))
		// this.registerMarkdownPostProcessor(this.postProcessor.bind(this))
	}
	async codeBlockProcessor(s, e) {
		let container = e.createDiv({cls: "screenplay"})
		let parsed = this.fountain.parse(s)
		console.debug("parsed", parsed)
		container.innerHTML = parsed.html.script
	}
	async postProcessor(element, ctx) {
		let v = this
		let file = this.app.workspace.getActiveFile()
		let str = await this.app.vault.read(file)
		console.debug("postprocess", ctx, v);
		element.innerHTML = this.fountain.parse(str).html.script
		element.addClass("screenplay")
	}
	makeView(leaf: WorkspaceLeaf) {
		return new FountainView(leaf);
	}
	onunload() {
		console.log("bye bye!");
	}
}

