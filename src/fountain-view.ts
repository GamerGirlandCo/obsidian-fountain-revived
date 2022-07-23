import { Editor, MarkdownEditView, MarkdownPreviewEvents, MarkdownSubView, MarkdownView, TextFileView, WorkspaceLeaf, editorEditorField, editorViewField, setIcon } from "obsidian";
import {EditorState, Text} from "@codemirror/state";

import CodeMirror from "codemirror";
import {EditorView} from "@codemirror/view";
import { Fountain } from "fountain-js";
import { basicSetup } from "./extensions";

// ...
export default class FountainView extends TextFileView {
	document: string;
	codeMirror: EditorView;
	cmState: EditorState;
	constructor(leaf: WorkspaceLeaf) {
		super(leaf)
		this.cmState = EditorState.create({
				doc: "",
				extensions: basicSetup
			})
			this.codeMirror = new EditorView({
				state: this.cmState,
				parent: this.containerEl.getElementsByClassName("view-content")[0],
			})
			console.log("constructor", this, this.app.workspace.getActiveFile(), this.file)
	
		// this.document = await this.app.vault.read(this.app.workspace.getActiveFile())
	}
	onload() {
		this.app.vault.read(this.file)
		
		this.codeMirror.dispatch({
			changes: {
				from: 0,
				insert: this.document
			}
		})
	}
	getViewType() {
		return "fountain"
	}
	getViewData() {
		return this.document;
	}
	setViewData(data: string) {
		this.codeMirror.dispatch({
			changes: {
				from: 0,
				insert: this.document
			}
		})
	}
	clear() {
		// this.c
	}
	getDisplayText() {
		if (this.file) return this.file.basename;
		else return "fountain (no file opened)";
	}
	canAcceptExtension(extension: string) {
		return extension == 'fountain';
	}
}