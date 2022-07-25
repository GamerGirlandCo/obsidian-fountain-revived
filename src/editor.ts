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
import { Fountain } from "fountain-js";
import { basicSetup } from "./extensions";

export class ViewPluginClass {
	source = false;

	constructor(view: EditorView) {
		// this.manager = new StatefulDecorationSet(view);
		this.build(view);
	}

	update(update: ViewUpdate) {
		if (!isLivePreview(update.view.state)) {
			if (this.source == false) {
				this.source = true;
			}

			return;
		}
		if (
			update.docChanged ||
			update.viewportChanged ||
			update.selectionSet ||
			this.source == true
		) {
			this.source = false;
			this.build(update.view);
		}
	}

	destroy() {}

	build(view: EditorView) {
		// if (!isLivePreview(view.state)) return;
		
		// const targetElements: TokenSpec[] = [];
		
		for (let { from, to } of view.visibleRanges) {
			const tree = syntaxTree(view.state);
			tree.iterate({
				from,
				to,
				enter: ({type, from, to}) => {
					const original = view.state.doc.sliceString(
						from,
						to
					);
					// if(type.name.startsWith("⚠") || !original.trim()) return
					const tokenProps =
					type.prop(tokenClassNodeProp);

					writeFileSync("C:\\tree.debug", JSON.stringify(tree, null, "\t"))
					
					const props = new Set(tokenProps?.split(" "));
					// console.debug("just making sure", tree)
					console.log("iteratetree", type.name, original)
					// console.debug("iteratetree", original)
				}
			});
		}
		// 


		// this.manager.updateDecos(targetElements);
	}
}



const isLivePreview = (state: EditorState) => {
	return state.field(editorLivePreviewField);
};
