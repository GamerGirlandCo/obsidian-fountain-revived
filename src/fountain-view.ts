import { 
	EditableFileView, Editor, MarkdownEditView, MarkdownPreviewEvents, 
	MarkdownSubView, MarkdownView, TFile, TextFileView, WorkspaceLeaf, 
	editorEditorField, editorViewField, setIcon, App,
	Modal,
	Notice,
	PluginSettingTab,
	Setting,
	debounce, editorLivePreviewField, normalizePath } from "obsidian";
import { Language, syntaxTree, tokenClassNodeProp } from "@codemirror/language";

import {EditorState, Text, Range, StateEffect, StateEffectType, StateField, Extension} from "@codemirror/state";

import CodeMirror from "codemirror";
import {EditorView, Decoration, DecorationSet, ViewUpdate} from "@codemirror/view";
import { Fountain } from "fountain-js";
import { basicSetup } from "./extensions";
import { inlinePlugin } from "./editor";
import { FountainParser, parser, ftn } from "./lang-fountain";

const theme = EditorView.theme({
	".cm-line": {
		caretColor: "var(--text-normal)",
		"font-family": "'Courier Final Draft', 'Courier Screenplay', Courier !important"
	},
	".cm-foldGutter": {
		backgroundColor: "var(--interactive-accent)",
		opacity: "0.5"
	}
})

export const exts = [
	theme, 
	inlinePlugin(), 
	ftn(), 
	EditorView.lineWrapping
	// ...basicSetup
]

// ...
export class FountainView extends TextFileView {
	document: string;
	cm: EditorView;
	extensions: Extension[]
	// state: EditorState
	// mev: MarkdownEditView
	constructor(leaf: WorkspaceLeaf) {
		super(leaf)
		this.extensions = exts
			/* .concat(
				EditorView.updateListener.of((update) => {
				let string = update.view.state.doc.toString()
				const countParent = document.querySelector("div.status-bar-item.plugin-word-count");
				const words = countParent.children[0]
				const characters = countParent.children[1]
				words.innerHTML = `${string.split(/\W+/g).length} words`
				characters.innerHTML = `${string.split("").length} characters`
			})) */
		// super.onLoadFile(this.file)
		this.cm = new EditorView({
			state: EditorState.create({
				extensions: this.extensions
			}),
			parent: this.containerEl.getElementsByClassName("view-content")[0],
		})
		// this.document = await this.app.vault.read(this.app.workspace.getActiveFile())
		
	}

	async onUnloadFile(file: TFile): Promise<void> {
		console.log(":::", file)
		await this.app.vault.adapter.write(normalizePath(file.path), this.getViewData())
		this.clear()
	}
	async onLoadFile(filee: TFile) {
		console.debug("load fucker")
		this.document = await this.app.vault.read(filee);
		console.debug("finally"/* , this.document */)
		// console.debug(f)
		
		let state = EditorState.create({
			extensions: this.extensions
		})
		this.cm.setState(state)
		this.containerEl.setAttr("data-type", "fountain")
		this.setViewData(this.document, false)
		
		// console.log("constructor", this.file)
		// this.app.workspace.updateOptions()
		this.app.workspace.on('editor-change', () => {
			// console.log("sav")
			// this.setViewData(this.cm.state.doc.toString(), false)
			// status-bar-item.plugin-word-count
			// await this.app.vault.adapter.write(normalizePath(filee.path), this.cm.state.doc.toString())
			this.requestSave();
		});
		
	}
	getViewType() {
		return "fountain"
	}
	getViewData() { return this.cm.state.doc.toString() }
	setViewData(data: string, clear: boolean): void {
		// this.editor.setValue(data)
		this.document = data;
		this.cm.setState(EditorState.create({
			doc: this.document,
			extensions: this.extensions
			
		}))
	}
	
	clear() {
		this.setViewData("", true)
		// this.editor.clearHistory();
	}
	// getScroll(): number {
	// 	return this.cm.state.doc.lineAt(this.cm.state.selection.main.head).number
	// }
	// applyScroll(scroll: number): void {
	// 	let effect = EditorView.scrollIntoView(scroll);
	// 	this.cm.dispatch({
	// 		effects: effect
	// 	})
	// }
	getDisplayText() {
		if (this.file) return this.file.basename;
		else return "fountain (no file opened)";
	}
	canAcceptExtension(extension: string) {
		console.log("accept?", extension, this.app.workspace.getActiveFile())
		return extension === 'fountain' || this.file.path.endsWith(".fountain.md") || this.file.name.endsWith("fountain");
	}
}