import {
	Decoration,
	DecorationSet,
	EditorView,
	ViewPlugin,
	ViewUpdate,
	WidgetType,
} from '@codemirror/view';
import type { EditorSelection, Range } from '@codemirror/state';
import {
	editorEditorField,
	editorViewField,
	editorLivePreviewField,
	EditableFileView,
} from 'obsidian';
import { exts } from './fountain-view';
import {ftn} from "./lang-fountain"
import {visualize} from "@colin_t/lezer-tree-visualizer";
import { foldable } from '@codemirror/language';

function selectionAndRangeOverlap(
	selection: EditorSelection,
	rangeFrom: number,
	rangeTo: number
) {
	for (const range of selection.ranges) {
		if (range.from <= rangeTo && range.to >= rangeFrom) {
			return true;
		}
	}

	return false;
}

function inlineRender(view: EditorView) {
	const widgets: Range<Decoration>[] = [];
	let iiii = 1;
	const all = view.state.doc.toString()
	let parser = ftn().language.parser
	visualize(parser.parse(all).cursor(), view.state.doc.toString())
	// console.log("vr", view.visibleRanges[0])
	try {
		for (const { from, to } of view.visibleRanges) {
			const text = view.state.doc.sliceString(0, to, "\n");
			const tree = parser.parse(all);
			let cursor = tree.cursor();
			iiii++
			do {
				const start = cursor.from;
				const end = cursor.to;
				const name = cursor.name;
				const text2 = view.state.doc.sliceString(start, end)
				const whichline = view.state.doc.lineAt(start)
				if (name === 'Screenplay' || name === "TitlePageField") continue;
				console.debug("tree", name, text2)
				// if (selectionAndRangeOverlap(selection, start, end)) continue;
	
				// if (name === 'DivideSubs') {
				//     const content = view.state.doc.sliceString(start, end);
				// 	widgets.push(
				// 		Decoration.replace({
				// 			widget: new InlineWidget(name, content, view, true),
				// 			inclusive: false,
				// 			block: false,
				// 		}).range(start, end)
				// 	);
				// } else {
				//     const content = view.state.doc.sliceString(start + 3, end - 3);
				// 	widgets.push(
				// 		Decoration.replace({
				// 			widget: new InlineWidget(name, content, view),
				// 			inclusive: false,
				// 			block: false,
				// 		}).range(start, start + 3)
				// 	);
				// 	widgets.push(
				// 		Decoration.replace({
				// 			widget: new InlineWidget(name, content, view),
				// 			inclusive: false,
				// 			block: false,
				// 		}).range(end - 3, end)
				// 	);
	
	
				// 	// make sure that mark decoration isn't empty
				// 	if (start + 3 !== end - 3) {
				// 		
				// 	}
				// }
				let cssClass: string = '';
				switch (name) {
					case 'TitlePage':
						cssClass = 'header';
						break;
					case "SceneHeading":
						cssClass = "scene-heading"
						break;
					case "SceneNumber":
						cssClass = "scene-number";
						break;
					case "Character": 
						cssClass = "character";
						break;
					case 'Transition':
						cssClass = 'transition';
						break;
					case 'Lyrics':
						cssClass = 'lyric';
						break;
					case 'Synopsis':
						cssClass = 'synopsis';
						break;
					case "PageBreak":
						cssClass = "page-break"
						break;
					case "Dialogue":
						cssClass = "dialogue"
						break;
					case "Speech":
						cssClass = "dialogue"
						break;
					case "Centered":
						cssClass = "centered"
						break;
					case "Note":
						cssClass = "note"
						break;
					case "BlockNote":
						cssClass = "note";
						break;
					case "OpenNote":
						cssClass = "note";
						break;
					case "CloseNote":
						cssClass = "note";
						break;
					case "Parenthetical":
						cssClass ="parenthetical"
						break;
					case "LineBreak":
						cssClass = "line-break"
						break;
					case "BoneYard":
						cssClass = "bone-yard"
						break;
					case "CloseBoneMark":
						cssClass = "bone-yard"
						break;
					case "BoneMark":
						cssClass = "bone-yard"
						break;
					default:
						break;
				}
				const content = view.state.doc.sliceString(start, end);
				// console.debug("namey", name, content)
				if(name === "SceneHeading") {
						widgets.push(
							Decoration.line({
								class: `screenplay-scene-heading`,
							}).range(whichline.from + 1),
						);
				} else if( name === "SceneNumber" || name === "Underline" || name === "Italic" || name === "CharacterExt" || name === "Bold") {
					widgets.push(Decoration.mark({
						class: name === "SceneNumber" ? `screenplay-scene-number` : `screenplay-marker ${name.toLowerCase()}`,
						inclusive: true,
						block: false
					}).range(start, end))
				} else if(start !== end) {
					if((name !== "PlainText") && cssClass !== "") {
						widgets.push(
							Decoration.line({
								class: `screenplay-${cssClass}`,
								block: true,
							}).range(whichline.from),
						);
					}
					if(name == "Dialogue") {
						widgets.push(
							Decoration.line({
								class: `screenplay-dialogue`,
								block: true,
							}).range(whichline.from),
						);
					}	
				}		
				if(name=== "SceneNumber" ) {
					widgets.push(Decoration.mark({
						class: "screenplay-scene-number",
						inclusive: false,
						block: false
					}).range(start, end))
				}
			} while (cursor.next());
		}
	} finally {
		return Decoration.set(widgets, true);
	}
}

export enum Enum {
	Document = 1,
	Fuck,
	Going,
	Outside
}


const something = Enum.Fuck

export function inlinePlugin(): ViewPlugin<any> {
	return ViewPlugin.fromClass(
		class {
			decorations: DecorationSet;

			constructor(view: EditorView) {
				this.decorations = Decoration.none;
				this.render(view);
			}

			render(view: EditorView) {
				this.decorations = inlineRender(view) ?? Decoration.none;
			}
			build(view: EditorView) {
				
			}

			update(update: ViewUpdate) {
				if (
					update.docChanged ||
					update.viewportChanged ||
					update.selectionSet
				) {
					let selly = update.view.state.selection.main.head
					console.log("node", selly, update.view.state.doc.lineAt(selly))
					// this.render(update.view);
					this.render(update.view)
				}
			}
		},
		{ decorations: (v) => v.decorations }
	);
}