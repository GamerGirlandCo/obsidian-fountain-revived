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
import {Fountain} from "./fountain/lang"
import {parser} from "./lang-fountain"
import {visualize} from "@colin_t/lezer-tree-visualizer";
import { SceneNumber } from './fountain/parser.terms';

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

class InlineWidget extends WidgetType {
	private customClass
	constructor(
		readonly name: string,
		readonly text: string,
		private view: EditorView,
		private marker: boolean = false,
		customClass: string,

	) {
		super();
		this.customClass = customClass
	}

	// Widgets only get updated when the text changes/the element gets focus and loses it
	// to prevent redraws when the editor updates.
	eq(other: InlineWidget): boolean {
		if (other.text === this.text) {
			return true;
		}
		return false;
	}

	toDOM(view: EditorView): HTMLElement {
		let bool = this.text === "(" || this.text === ")" || this.text === "#"
		if (!this.marker) {
			return createSpan({ cls: ['screenplay-marker', ...this.customClass.split(" ")] });
		} else {
			return createSpan({
				cls: ['screenplay-marker', ...this.customClass.split(" ")],
				text: bool ? "" : this.text
			});
		}
	}
	/* Make the markers only editable when shift is pressed (or navigated inside with the keyboard
	 * or the mouse is placed at the end, but that is always possible regardless of this method).
	 * If the widgets should always be expandable, make this always return false.
     * TODO: Shouldn't be too important because the replacements are empty anyway and cannot be clicked. I just
     * reused this from my implementation for dataview. This needs some some attention.
	 */
	ignoreEvent(event: MouseEvent | Event): boolean {
		// instanceof check does not work in pop-out windows, so check it like this
		if (event.type === 'mousedown') {
			const currentPos = this.view.posAtCoords({
				x: (event as MouseEvent).x,
				y: (event as MouseEvent).y,
			});
			if ((event as MouseEvent).shiftKey) {
				// Set the cursor after the element so that it doesn't select starting from the last cursor position.
				if (currentPos) {
                    //@ts-ignore
					const { editor } = this.view.state
                        //@ts-ignore
						.field(editorEditorField)
						.state.field(editorViewField);
					editor.setCursor(editor.offsetToPos(currentPos));
				}
				return false;
			}
		}
		return true;
	}
}

function inlineRender(view: EditorView) {
	const widgets: Range<Decoration>[] = [];
	let iiii = 1;
	const all = view.state.doc.toString()
	try {
		for (const { from, to } of view.visibleRanges) {
			visualize(parser.parse(all).cursor(), view.state.doc.toString())
			const text = view.state.doc.sliceString(from, to);
			const tree = parser.parse(all);
			let cursor = tree.cursor();
			iiii++
			do {
				const start = cursor.from;
				const end = cursor.to;
				const name = cursor.name;
				const texties = view.state.doc.sliceString(start, end)
				const whichline = view.state.doc.lineAt(start)
				if (name === 'Screenplay' || name === "⚠") continue;
				// console.log("tree", name, texties)
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
					case "SceneNumber":
						cssClass = "scene-number";
						break;
					case "Character": 
						cssClass = "character";
						break;
					case 'TitlePage':
						cssClass = 'header';
						break;
					case "SceneHeading":
						cssClass = "scene-heading"
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
					case "Action":
						cssClass = 'action';
						break;
					case "Centered":
						cssClass = "centered"
						break;
					case "Note":
						cssClass = "note"
						break;
					case "Parenthetical":
						cssClass ="parenthetical"
						break;
					default:
						break;
				}
				if(name === "Underline" || name === "Italic" || name === "CharacterExt" || name === "Bold" || name=== "SceneNumber") {
					const content = view.state.doc.sliceString(start, end);
					widgets.push(Decoration.mark({
						class: `screenplay-marker ${name.toLowerCase()}`,
						inclusive: true,
						block: false
					}).range(start, end))
				} else if( name === "SceneHeading") {
					widgets.push(Decoration.mark({
						class: `screenplay-scene-heading`,
						inclusive: false,
						block: false
					}).range(start, end))
				}
				// console.log(cssClass)
				 else if(start !== end) {
						// console.log("notinline", cssClass)
						widgets.push(
							Decoration.line({
								class: cssClass !== "" && `screenplay-${cssClass}`,
								// attributes: { 'data-contents': 'string' },
							}).range(whichline.from),
						);
					// if((cssClass === "scene-number" || cssClass === "underline" || cssClass === "bold" || cssClass === "italic")) {
					// 	// console.log("inline", cssClass)
					// 	Decoration.mark({
					// 		class: `screenplay-${cssClass}`,
					// 		// attributes: { 'data-contents': 'string' },
					// 	}).range(start, end)
						
					// } else {
					// }
				}
			} while (cursor.next());
		}
	} finally {
		// console.log(widgets)
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
				// only activate in LP and not source mode
				//@ts-ignore
				// console.log("updy")
				if (
					update.docChanged ||
					update.viewportChanged ||
					update.selectionSet
				) {
					// this.render(update.view);
				}
				this.render(update.view)
			}
		},
		{ decorations: (v) => v.decorations }
	);
}