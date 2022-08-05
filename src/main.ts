import {
	Plugin,
	WorkspaceLeaf,

} from "obsidian";
import {EditorView , ViewPlugin} from "@codemirror/view"

import { Fountain } from "fountain-js";
import {FountainView} from "./fountain-view";
import { ftn as fountain } from "./lang-fountain";
import { inlinePlugin } from "./editor";

export default class ObsidianFountain extends Plugin {
	async onload() {
		console.log(`Loading Fountain Plugin - v${this.manifest.version}`)
		// this.editor
		this.registerExtensions(["fountain", "fountain.md"], "fountain")
		this.registerView("fountain", this.makeView)
		// this.registerEditorExtension([inlinePlugin(), fountain().extension])
		this.app.workspace.updateOptions()
		// this.registerMarkdownCodeBlockProcessor("fountain", this.codeBlockProcessor.bind(this))
		// this.registerMarkdownPostProcessor(this.postProcessor.bind(this))
	}
	makeView(leaf: WorkspaceLeaf) {
		return new FountainView(leaf);
	}
	onunload() {
		console.log("bye bye!");
	}
}

