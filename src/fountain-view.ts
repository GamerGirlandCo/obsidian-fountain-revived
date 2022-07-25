import { 
	EditableFileView, Editor, MarkdownEditView, MarkdownPreviewEvents, 
	MarkdownSubView, MarkdownView, TFile, TextFileView, WorkspaceLeaf, 
	editorEditorField, editorViewField, setIcon, App,
	Modal,
	Notice,
	PluginSettingTab,
	Setting,
	debounce, editorLivePreviewField, normalizePath } from "obsidian";
	import {writeFileSync} from "node:fs"
import { syntaxTree, tokenClassNodeProp } from "@codemirror/language";

import {EditorState, Text, Range, StateEffect, StateEffectType, StateField} from "@codemirror/state";

import CodeMirror from "codemirror";
import {EditorView, Decoration, DecorationSet, ViewUpdate, ViewPlugin} from "@codemirror/view";
import { basicSetup } from "./extensions";
import { ViewPluginClass } from "./editor";
import fountain from "./fountain/lang"

const myTheme = EditorView.theme({
	".cm-line": {
		fontFamily: "'Courier Final Draft', 'Courier Screenplay', Courier",
		caretColor: "var(--text-normal) !important"
	},
	".cm-content": {
		caretColor: "var(--text-normal) !important"
	},
	".cm-gutter": {
		background: "var(--interactive-accent)"
	}
})

const vp = ViewPlugin.fromClass(ViewPluginClass)
const ext = [
	myTheme,
	vp,
	fountain(),
	...basicSetup,
]

// ...
export class FountainView extends TextFileView {
	document: string;
	cm: EditorView;
	// state: EditorState
	// mev: MarkdownEditView
	constructor(leaf: WorkspaceLeaf) {
		super(leaf)
		this.containerEl.setAttribute("data-type", "fountain")
		let state = EditorState.create({
			doc: "",
			extensions: ext
		})
		this.cm = new EditorView({
			state: state,
			parent: this.containerEl.getElementsByClassName("view-content")[0],
		})
		// super.onLoadFile(this.file)
		// this.onLoadFile().then(() => {
		// 	console.log("edi", this.editor, this.getMode())
		// 	this.editor.cm.setState(EditorState.create({
		// 		doc: this.document,
		// 		extensions: [...basicSetup, 
		// 			fountain(),
		// 			EditorView.updateListener.of.bind(this, function(e) {
		// 				console.log("sweet dreams are made of", this)
		// 				this.document = e.state.doc.toString();
		// 			})
		// 		]
				
		// 	}))
		// })
		
		// this.document = await this.app.vault.read(this.app.workspace.getActiveFile())
	}
	async onUnloadFile(file: TFile): Promise<void> {
		await this.app.vault.adapter.write(normalizePath(file.path), this.getViewData())
		this.clear()
		console.log(":::")
		// super.onUnloadFile(file)
	}
	async onLoadFile(filee) {
		console.debug("load fucker", filee)
		this.document = await this.app.vault.read(filee);
		console.debug("finally"/* , this.document */)
		// this.setViewData(this.document)
		this.app.workspace.on('editor-change', () => {
			this.requestSave();
		});
		// console.debug(f)
		
		let state = EditorState.create({
			doc: this.document,
			extensions: ext
		})
		
		this.cm.setState(state)
		
		this.app.workspace.iterateCodeMirrors(e => {
			e.cm.setState(EditorState.create({
				// doc: this.document,
				extensions: ext
			}))
		})
		// 	console.debug("icm", e)
		// console.log("constructor", this.file)
		this.app.workspace.updateOptions()
		
	}
	getViewType() {
		return "fountain"
	}
	getViewData() { return this.document }
	setViewData(data: string, clear: boolean): void {
		this.document = data;
		this.cm.setState(EditorState.create({
			doc: this.document,
			extensions: ext
			
		}))

	}

	clear() {
		// this.editor.setValue('');
		// super.clear()
		// this.editor.clearHistory();
		this.cm.setState(EditorState.create({
			doc: "",
			extensions: ext
		}))
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
		return extension === 'fountain';
	}
}


