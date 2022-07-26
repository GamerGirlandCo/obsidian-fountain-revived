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
import {EditorView, Decoration, DecorationSet, ViewUpdate} from "@codemirror/view";
import { Fountain } from "fountain-js";
import { basicSetup } from "./extensions";
import fountain from "./fountain/lang"
import { inlinePlugin } from "./editor";

const theme = EditorView.theme({
	".cm-line": {
		caretColor: "var(--text-normal)",
		"font": "12pt 'Courier Final Draft', 'Courier Screenplay', Courier !important"
	},
	".cm-foldGutter": {
		backgroundColor: "var(--interactive-accent)"
	}
})

export const exts = [theme, fountain(), inlinePlugin(), ...basicSetup]

// ...
export class FountainView extends TextFileView {
	document: string;
	cm: EditorView;
	// state: EditorState
	// mev: MarkdownEditView
	constructor(leaf: WorkspaceLeaf) {
		super(leaf)
		// super.onLoadFile(this.file)
		this.cm = new EditorView({
			state: EditorState.create({
				doc: "",
				extensions: exts
			}),
			parent: this.containerEl.getElementsByClassName("view-content")[0],
		})
		// this.document = await this.app.vault.read(this.app.workspace.getActiveFile())
	}
	async onUnloadFile(file: TFile): Promise<void> {
		await this.app.vault.adapter.write(normalizePath(file.path), this.getViewData())
		this.clear()
	}
	async onLoadFile(filee) {
		console.debug("load fucker")
		this.document = await this.app.vault.read(this.app.workspace.getActiveFile());
		console.debug("finally"/* , this.document */)
		this.app.workspace.on('editor-change', () => {
			// console.log("sav")

			this.requestSave();
		});
		// console.debug(f)
		
		let state = EditorState.create({
			doc: this.document,
			extensions: exts
		})
		this.cm.setState(state)
		this.containerEl.setAttr("data-type", "fountain")
		this.setViewData(this.document, false)
		
		// console.log("constructor", this.file)
		this.app.workspace.updateOptions()
		
	}
	getViewType() {
		return "fountain"
	}
	getViewData() { return this.document }
	setViewData(data: string, clear: boolean): void {
		// this.cm.setState
		this.document = data;
		this.cm.setState(EditorState.create({
			doc: this.document,
			extensions: exts
			
		}))
	}
	
	clear() {
		this.setViewData("")
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
		return extension === 'fountain';
	}
}


export class ViewPluginClass {
	manager: StatefulDecorationSet;
	source = false;

	constructor(view: EditorView) {
		this.manager = new StatefulDecorationSet(view);
		this.build(view);
	}

	update(update: ViewUpdate) {
		if (!isLivePreview(update.view.state)) {
			if (this.source == false) {
				this.source = true;
				this.manager.updateDecos([]);
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
		if (!isLivePreview(view.state)) return;
		
		const targetElements: TokenSpec[] = [];
		
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
					if(type.name.startsWith("⚠") || !original.trim()) return
					const tokenProps =
					type.prop(tokenClassNodeProp);

					writeFileSync("C:\\tree.debug", JSON.stringify(tree, null, "\t"))
					
					const props = new Set(tokenProps?.split(" "));
					console.debug("iteratetree", type.name, "", original)
					// console.debug("iteratetree", original)
				}
			});
		}
		// 


		this.manager.updateDecos(targetElements);
	}
}

type TokenSpec = {
	from: number;
	to: number;
	loc: { from: number; to: number };
	attributes: [string, string][];
	value: string;
	index: number;
};

class StatefulDecorationSet {
	editor: EditorView;
	decoCache: { [cls: string]: Decoration } = Object.create(null);
	sd: {
		update: StateEffectType<DecorationSet>;
		field: StateField<DecorationSet>;
	}
	

	constructor(editor: EditorView) {
		this.editor = editor; 
		this.sd = defineStatefulDecoration()
	}
	
	async computeAsyncDecorations(tokens: TokenSpec[]): Promise<DecorationSet | null> {
		const decorations: Range<Decoration>[] = [];
		for (let token of tokens) {
			let deco = this.decoCache[token.value];
			if (!deco) {
				console.log("expensive async operation called");
				await sleep(200); // simulate some slow IO operation
				// deco = this.decoCache[token.value] = Decoration.widget({ widget: new EmojiWidget(randomEmoji()) });
			}
			decorations.push(deco.range(token.from, token.from));
		}
		return Decoration.set(decorations, true);
	}
	
	debouncedUpdate = debounce(this.updateDecos, 100, true);
	
	async updateDecos(tokens: TokenSpec[]): Promise<void> {
		const decorations = await this.computeAsyncDecorations(tokens);
		// if our compute function returned nothing and the state field still has decorations, clear them out
		if (decorations || this.editor.state.field(this.sd.field).size) {
			this.editor.dispatch({ effects: this.sd.update.of(decorations || Decoration.none) });
		}
	}
} 

function defineStatefulDecoration(): {
	update: StateEffectType<DecorationSet>;
	field: StateField<DecorationSet>;
} {
	const update = StateEffect.define<DecorationSet>();
	const field = StateField.define<DecorationSet>({
		create(): DecorationSet {
			return Decoration.none;
		},
		update(deco, tr): DecorationSet {
			return tr.effects.reduce((deco, effect) => (effect.is(update) ? effect.value : deco), deco.map(tr.changes));
		},
		provide: field => EditorView.decorations.from(field),
	});
	return { update, field };
}

const isLivePreview = (state: EditorState) => {
	return state.field(editorLivePreviewField);
};
