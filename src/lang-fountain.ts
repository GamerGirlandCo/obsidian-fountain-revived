import { ParseContext, defineLanguageFacet, languageDataProp, Language, LanguageSupport, continuedIndent, foldNodeProp } from "@codemirror/language";
import {
	Input,
	NodeProp,
	NodePropSource,
	NodeSet,
	NodeType,
	ParseWrapper,
	Parser,
	PartialParse,
	SyntaxNode,
	Tree,
	TreeBuffer,
	TreeCursor,
	TreeFragment,
} from "@lezer/common";

import { regex } from "./regexes";

import { Tag, styleTags, tags as t } from "@lezer/highlight";
import { Extension, Facet } from "@codemirror/state";

class CompositeBlock {
	static create(
		type: number,
		value: number,
		from: number,
		parentHash: number,
		end: number
	) {
		let hash = (parentHash + (parentHash << 8) + type + (value << 4)) | 0;
		return new CompositeBlock(type, value, from, hash, end, [], []);
	}

	private hashProp: [NodeProp<any>, any][];
	constructor(
		readonly type: number,
		readonly value: number,
		readonly from: number,
		readonly hash: number,
		public end: number,
		readonly children: (Tree | TreeBuffer)[],
		readonly positions: number[]
	) {
		this.hashProp = [[NodeProp.contextHash, hash]];
	}

	addChild(child: Tree, pos: number) {
		if (child.prop(NodeProp.contextHash) != this.hash)
			child = new Tree(
				child.type,
				child.children,
				child.positions,
				child.length,
				this.hashProp
			);
		this.children.push(child);
		this.positions.push(pos);
	}

	toTree(nodeSet: NodeSet, end = this.end) {
		let last = this.children.length - 1;
		if (last >= 0)
			end = Math.max(
				end,
				this.positions[last] + this.children[last].length + this.from
			);
		let tree = new Tree(
			nodeSet.types[this.type],
			this.children,
			this.positions,
			end - this.from
		).balance({
			makeTree: (children, positions, length) =>
				new Tree(NodeType.none, children, positions, length, this.hashProp),
		});
		return tree;
	}
}

export enum Type {
	Screenplay = 1,
	Escape,
	TitlePage,
	TitlePageField,

	SceneHeading,
	Transition,
	Dialogue,
	Character,
	CharacterExt,
	Parenthetical,
	Action,
	Centered,
	
	Lyrics,
	
	Act,
	Sequence,
	Scene,
	
	Synopsis,
	BlockNote,
	BoneYard,
	
	PageBreak,
	LineBreak,
	
	// inlines
	SceneNumber,
	Note,
	
	
	OpenNote,
	CloseNote,
	OpenParen,
	CloseParen,
	SceneNumberMarker,
	// ...
	Bold,
	Italic,
	Underline,
	Emphasis, // catch all thingy?
	
	BoldMark,
	ItalicMark,
	UnderlineMark,
	SectionMark,
	EmphasisMark,
	PlainText
}

export class LeafBlock {
	/// @internal
	marks: Element[] = [];
	/// The block parsers active for this block.
	parsers: LeafBlockParser[] = [];

	/// @internal
	constructor(
		/// The start position of the block.
		readonly start: number,
		/// The block's text content.
		public content: string
	) {}
}

export class Line {
	/// The line's full text.
	text = "";
	/// The base indent provided by the composite contexts (that have
	/// been handled so far).
	baseIndent = 0;
	/// The string position corresponding to the base indent.
	basePos = 0;
	/// The number of contexts handled @internal
	depth = 0;
	/// Any markers (i.e. block quote markers) parsed for the contexts. @internal
	markers: Element[] = [];
	/// The position of the next non-whitespace character beyond any
	/// list, blockquote, or other composite block markers.
	pos = 0;
	/// The column of the next non-whitespace character.
	indent = 0;
	/// The character code of the character after `pos`.
	next = -1;
	/// @internal
	forward() {
		if (this.basePos > this.pos) this.forwardInner();
	}

	/// @internal
	forwardInner() {
		let newPos = this.skipSpace(this.basePos);
		this.indent = this.countIndent(newPos, this.pos, this.indent);
		this.pos = newPos;
		this.next = newPos == this.text.length ? -1 : this.text.charCodeAt(newPos);
	}

	/// Skip whitespace after the given position, return the position of
	/// the next non-space character or the end of the line if there's
	/// only space after `from`.
	skipSpace(from: number) {
		return skipSpace(this.text, from);
	}

	/// @internal
	reset(text: string) {
		this.text = text;
		this.baseIndent = this.basePos = this.pos = this.indent = 0;
		this.forwardInner();
		this.depth = 1;
		while (this.markers.length) this.markers.pop();
	}

	/// Move the line's base position forward to the given position.
	/// This should only be called by composite [block
	/// parsers](#BlockParser.parse) or [markup skipping
	/// functions](#NodeSpec.composite).
	moveBase(to: number) {
		this.basePos = to;
		this.baseIndent = this.countIndent(to, this.pos, this.indent);
	}

	/// Move the line's base position forward to the given _column_.
	moveBaseColumn(indent: number) {
		this.baseIndent = indent;
		this.basePos = this.findColumn(indent);
	}

	/// Store a composite-block-level marker. Should be called from
	/// [markup skipping functions](#NodeSpec.composite) when they
	/// consume any non-whitespace characters.
	addMarker(elt: Element) {
		this.markers.push(elt);
	}

	/// Find the column position at `to`, optionally starting at a given
	/// position and column.
	countIndent(to: number, from = 0, indent = 0) {
		for (let i = from; i < to; i++)
			indent += this.text.charCodeAt(i) == 9 ? 4 - (indent % 4) : 1;
		return indent;
	}

	/// Find the position corresponding to the given column.
	findColumn(goal: number) {
		let i = 0;
		for (let indent = 0; i < this.text.length && indent < goal; i++)
			indent += this.text.charCodeAt(i) == 9 ? 4 - (indent % 4) : 1;
		return i;
	}

	/// @internal
	scrub() {
		if (!this.baseIndent) return this.text;
		let result = "";
		for (let i = 0; i < this.basePos; i++) result += " ";
		return result + this.text.slice(this.basePos);
	}
}

const DefaultSkipMarkup: {
	[type: number]: (bl: CompositeBlock, cx: BlockContext, line: Line) => boolean;
} = {
	[Type.Screenplay]() {
		return true;
	},
	// [Type.Action](bl, cx, line) {
	// 	bl.addChild(
	// 		elt(
	// 			Type.Action, cx.lineStart, cx.lineStart + line.text.length, 
	// 			cx.parser.parseInline(line.text, cx.lineStart
	// 	)).toTree(cx.parser.nodeSet), cx.lineStart
	// 	)
	// 	return true
	// }
};

export function space(ch: number) {
	return ch == 32 || ch == 9 || ch == 10 || ch == 13;
}

function skipSpace(line: string, i = 0) {
	while (i < line.length && space(line.charCodeAt(i))) i++;
	return i;
}

function isBlockquote(line: Line) {
	return line.next != 62 /* '>' */
		? -1
		: line.text.charCodeAt(line.pos + 1) == 32
		? 2
		: 1;
}

function isPageBreak(line: Line, cx: BlockContext, breaking: boolean) {
	if (line.next != 61 /* '_-*' */)
		return -1;
	let count = 1;
	for (let pos = line.pos + 1; pos < line.text.length; pos++) {
		let ch = line.text.charCodeAt(pos);
		if (ch == line.next) count++;
		else if (!space(ch)) return -1;
	}
	// Setext headers take precedence
	if (
		breaking &&
		line.next == 61 &&
		isSetextUnderline(line) > -1 &&
		line.depth == cx.stack.length
	)
		return -1;
	return count < 3 ? -1 : 1;
}

function isLyric(line: Line, cx: BlockContext) {
	
	if(line.next != 126 /* '~' */) return -1
	let count = 1;
	for (let pos = line.pos + 1; pos < line.text.length; pos++) {
		let ch = line.text.charCodeAt(pos);
		if (ch == line.next) count++;
	}
	
	return count ===1 ? 1 :-1
}

function isSection(line: Line) {
	if (line.next != 35 /* '#' */) return -1;
	let pos = line.pos + 1;
	while (pos < line.text.length && line.text.charCodeAt(pos) == 35) pos++;
	if (pos < line.text.length && line.text.charCodeAt(pos) != 32) return -1;
	let size = pos - line.pos;
	return size > 3 ? -1 : size;
}

function isSetextUnderline(line: Line) {
	if (
		(line.next != 45 && line.next != 61) /* '-=' */ ||
		line.indent >= line.baseIndent + 4
	)
		return -1;
	let pos = line.pos + 1;
	while (pos < line.text.length && line.text.charCodeAt(pos) == line.next)
		pos++;
	let end = pos;
	while (pos < line.text.length && space(line.text.charCodeAt(pos))) pos++;
	return pos == line.text.length ? end : -1;
}


// Return type for block parsing functions. Can be either:
//
// - false to indicate that nothing was matched and lower-precedence
//   parsers should run.
//
// - true to indicate that a leaf block was parsed and the stream
//   was advanced past its content.
//
// - null to indicate that a context was opened and block parsing
//   should continue on this line.
type BlockResult = boolean | null;

// Rules for parsing blocks. A return value of false means the rule
// doesn't apply here, true means it does. When true is returned and
// `p.line` has been updated, the rule is assumed to have consumed a
// leaf block. Otherwise, it is assumed to have opened a context.
const DefaultBlockParsers: {
	[name: string]: ((cx: BlockContext, line: Line) => BlockResult) | undefined;
} = {
	Transition(cx, line) {
		if(!line.text.match(regex.transition) || line.text.endsWith("<")) return false
		let from = cx.lineStart + line.pos;
		cx.nextLine()
		cx.addNode(Type.Transition, from)
		return true
	},
	Centered(cx, line) {
		let variable = !(line.text.trim().startsWith(">") && line.text.trim().endsWith("<"))
		if (variable) return false
		let from = cx.lineStart + line.pos;
		cx.nextLine()
		cx.addNode(Type.Centered, from)
		return true
	},
	PageBreak(cx, line) {
		if(isPageBreak(line, cx, false) < 0) return false;
		let from = cx.lineStart + line.pos;
		cx.nextLine()
		cx.addNode(Type.PageBreak, from)
		return true
	},
	Lyrics(cx, line) {
		if(!line.text.trim().startsWith("~")) return false
		cx.addNode(Type.Lyrics, cx.lineStart)
		cx.nextLine()
		return true
	},
	Section(cx, line) {
		let size = isSection(line);
		if(size < 0) return false;
		if(size === 1) {
			cx.addNode(Type.Act, cx.lineStart)
		} else if(size === 2) {
			cx.addNode(Type.Sequence, cx.lineStart)
		} else if(size === 3) {
			cx.addNode(Type.Scene, cx.lineStart)
		}
		cx.nextLine()
		return true
	},
	Synopsis(cx, line) {
		if(!line.text.startsWith("=")) return false
		let from = cx.lineStart + line.pos;
		cx.nextLine()
		cx.addNode(Type.Synopsis, from)
		return true
	},

	// Character(cx, line) {
	// 	if(!line.text.match(/^[\^\sA-Z]+?(\(|$)/)) return false
	// 	let from = cx.lineStart + line.pos;
	// 	// cx.addElement(elt(Type.Character, from, cx.lineStart + line.text.length, [
			
	// 	// ]))
	// 	cx.addNode(Type.Character, from)
	// 	cx.nextLine()
	// 	return true
	// },
	// Parenthetical(cx, line) {
	// 	if(!(line.text.trim().startsWith("(") && line.text.trim().endsWith(")"))) return false
	// 	let from = cx.lineStart + line.pos
	// 	// cx.p
	// 	cx.addNode(Type.Parenthetical, from)
	// 	cx.nextLine()
	// 	return true
	// },
	// Dialogue(cx, line) {
	// 	let from = cx.lineStart + line.pos;
	// 	
	// 	if(cx.prevNode[0] === Type.Character || cx.prevNode[0] === Type.Parenthetical || cx.prevNode[0] === Type.Dialogue) {
	// 		cx.addNode(Type.Dialogue, from)
	// 		cx.nextLine()
	// 		return true
	// 	}
	// 	return false
	// }
	Action(cx, line) {
		let objOfEverythingExcept = {...regex}
		delete objOfEverythingExcept.action;
		let arr = Object.values(objOfEverythingExcept)
		if(arr.every(a => line.text.match(a) === null)) {

			cx.addNode(Type.Action, cx.lineStart, cx.absoluteLineEnd)
			cx.nextLine()
			return false
		}
		return false
	},
	Dialogue: undefined,
	SetextHeading: undefined, // Specifies relative precedence for block-continue function
	BlockNote: undefined,
	// LinkReference: undefined,
	TitlePage: undefined,
	SceneHeading: undefined,
};

enum CurrentBlock {
	Action = -1,
	Begin,
	Character,
	Parenthetical,
	Dialogue,
}


function parseCharacter(text: string, start: number, offset: number): null | Element {
	// console.debug("parsing character", text, text.match(regex.character))
	if(text.match(regex.character)) {
		return elt(Type.Character, start + offset, text.length + offset)
	}
	return null
}

function parseParenthetical(text: string, start: number, offset: number): null | Element {
	// console.debug("parsing parenthetical", text.match(regex.parenthetical))
	if(text.match(regex.parenthetical)) {
		return elt(Type.Parenthetical, start + offset, text.length + offset)
	}
	return null
}

function parseNoteElement(text: string, start: number, offset: number): null | Element {
	let opening = /\[\[/gm
	let closing = /\]\]/gm
	
	if(text.match(regex.note)|| text.match(regex.note_inline)) {
		
		return elt(Type.BlockNote, start + offset, text.length + offset)
	} else if(text.match(opening)) {
		let tio = text.indexOf("[")
		let lio = text.lastIndexOf("[")
		
		
		if(lio == tio + 1 && (tio > -1 && lio > -1)) {
			return elt(Type.BlockNote, tio + offset, text.length + offset)
		}
	} else if(text.match(closing)) {
		let tio = text.indexOf("]")
		let lio = text.lastIndexOf("]")
		
		
		if(lio == tio + 1 && (tio > -1 && lio > -1)) {
			return elt(Type.BlockNote, tio + offset, text.length + offset)
		}
		// return elt
	}
	return null
}
class DialogueParser implements LeafBlockParser {
	elts: Element[] = [];
	pos = 0;
	start: number;
	previous: CurrentBlock[] = [];
	current : CurrentBlock;
	context: BlockContext;
	leaf2: LeafBlock
	constructor(leaf: LeafBlock, cx: BlockContext) {
		this.start = leaf.start;
		this.leaf2 = leaf
		this.current = leaf.content.match(regex.character) ? CurrentBlock.Character :
			leaf.content.match(regex.parenthetical) ? CurrentBlock.Parenthetical
			: CurrentBlock.Begin
		this.context = cx
		this.advance(leaf.content, cx, cx.line);
	}
	changeType(arg: CurrentBlock) {
		if(this.previous.length>= 3) {
			this.previous.shift()
		} 
		this.previous.push(arg)
		this.current = arg
	}
	nextLine(cx: BlockContext, line: Line, leaf: LeafBlock) {
		if(this.current == CurrentBlock.Action) return false
		this.advance(leaf.content, cx, line)
		// console.log("start vs linestart")
	}

	finish(cx: BlockContext, leaf: LeafBlock) {
		if((this.current == CurrentBlock.Dialogue || this.current == CurrentBlock.Parenthetical)
		&& skipSpace(leaf.content, this.pos) == leaf.content.length) {
			return this.complete(cx, leaf, leaf.content.length)
		}
		return false;
	}
	nextPart(elt: Element | null | false, dbgtxt?: string) {
		if (elt) {
			this.pos = elt.to - this.start;
			this.elts.push(elt);
			return true;
		}
		if (elt === false) this.current = CurrentBlock.Action;
		return false;
	}
	complete(cx: BlockContext, leaf: LeafBlock, len: number) {
		return true;
	}

	advance(content: string, cx: BlockContext, line: Line) {
		// console.log("LEAFCONTENT:", this.leaf2.content, this.leaf2.start, "LINETEXT:", line.text, cx.lineStart)
		// console.log("prevnode", Type[cx.prevNode[0]])
		if(this.current == CurrentBlock.Begin) {
			if(cx.prevNode[0] == Type.Action || cx.prevNode[0] == Type.Dialogue) {
				if(this.nextPart(parseCharacter(this.leaf2.content, this.pos, this.leaf2.start))) {
					this.changeType(CurrentBlock.Character)
					return true
				} else if(this.nextPart(parseParenthetical(line.text, this.pos, cx.lineStart))) {
					this.changeType(CurrentBlock.Parenthetical)
					return true
					// this.elts.push(elt(Type.Parenthetical, this.pos + cx.lineStart, line.text.length + cx.lineStart))
					// cx.addNode(Type.Parenthetical, cx.lineStart)
				}
			} else if(parseCharacter(this.leaf2.content, this.pos, this.leaf2.start)) {
				this.changeType(CurrentBlock.Character)
				return true
			} else if((cx.prevNode[0] == Type.Character || cx.prevNode[0] == Type.Dialogue || cx.prevNode[0] == Type.Parenthetical)) {
				let blip = cx.parser.parseInline(line.text, cx.lineStart)
				cx.addLeafElement(
					this.leaf2,
					elt(Type.Dialogue, cx.lineStart, cx.lineStart + line.text.length, blip)
				)
				this.changeType(CurrentBlock.Dialogue)
				return true
			}
				// cx.addNode(Type.Dialogue, cx.lineStart)
				// cx.addElement(elt(Type.Dialogue, cx.lineStart, cx.lineStart + line.text.length + 1, cx.parser.parseInline(line.text, cx.lineStart)))

			if(cx.prevNode[0] == Type.Dialogue) {
				let blip = cx.parser.parseInline(line.text, cx.lineStart)
				cx.addElement(
					elt(Type.Dialogue, cx.lineStart, cx.lineStart + line.text.length, blip)
				)
				return true
			}

			return false
		} else if(this.current == CurrentBlock.Character) {
			if(this.nextPart(parseParenthetical(line.text, this.pos, cx.lineStart))) {
				// cx.addNode(Type.Dialogue, cx.lineStart)
				// cx.addElement(elt(Type.Dialogue, cx.lineStart, cx.lineStart + line.text.length + 1, cx.parser.parseInline(line.text, cx.lineStart)))
				
				// cx.addNode(Type.Parenthetical, cx.lineStart)
				cx.addLeafElement(this.leaf2, parseParenthetical(line.text, this.pos, cx.lineStart))
				this.changeType(CurrentBlock.Parenthetical)
				return true
			} else if(parseCharacter(this.leaf2.content, this.pos, this.leaf2.start)) {
				// cx.addNode(Type.Character, this.leaf2.start)
				this.changeType(CurrentBlock.Dialogue)
				cx.addLeafElement(this.leaf2, parseCharacter(this.leaf2.content, this.pos, this.leaf2.start))
			} else {
				let blip = cx.parser.parseInline(line.text, cx.lineStart)
				this.changeType(CurrentBlock.Dialogue)
				cx.addLeafElement(
					this.leaf2,
					elt(Type.Dialogue, cx.lineStart, cx.lineStart + line.text.length, blip)
				)
			}
			// this.changeType(CurrentBlock.Dialogue)
			return true
		} else if(this.current == CurrentBlock.Parenthetical) {
			if(parseParenthetical(line.text, this.pos, cx.lineStart)) {	
				cx.addLeafElement(this.leaf2, parseParenthetical(line.text, this.pos, cx.lineStart))
				// cx.addNode(Type.Parenthetical, cx.lineStart)
				this.changeType(CurrentBlock.Parenthetical)
			} else {
				let blip = cx.parser.parseInline(line.text, cx.lineStart)
				cx.addLeafElement(
					this.leaf2,
					elt(Type.Dialogue, cx.lineStart, cx.lineStart + line.text.length, blip)
				)
			}
			this.changeType(CurrentBlock.Dialogue)
			return true
		} else if(this.current == CurrentBlock.Dialogue || cx.prevNode[1] == Type.Dialogue) {
			// cx.addNode(Type.Dialogue, cx.lineStart)
			// cx.addElement(elt(Type.Dialogue, cx.lineStart, cx.lineStart + line.text.length + 1, cx.parser.parseInline(line.text, cx.lineStart)))
			let blip = cx.parser.parseInline(line.text, cx.lineStart)
			cx.addLeafElement(
				this.leaf2,
				elt(Type.Dialogue, cx.lineStart, cx.lineStart + line.text.length, blip)
			)
			return true
		}
	}
}

const enum NoteStage {
	None = -1,
	Begin,
	Inside,
	End

}

// This implements a state machine that incrementally parses link references. At each
// next line, it looks ahead to see if the line continues the reference or not. If it
// doesn't and a valid link is available ending before that line, it finishes that.
// Similarly, on `finish` (when the leaf is terminated by external circumstances), it
// creates a link reference if there's a valid reference up to the current point.
// @ts-ignore
class NoteBlockParser implements LeafBlockParser {
	stage = NoteStage.Begin;
	previous: NoteStage[] = []
	elts: Element[] = [];
	pos = 0;
	start: number;

	constructor(readonly leaf: LeafBlock, readonly context: BlockContext) {
		this.start = leaf.start;
		this.change(NoteStage.Begin)
		this.change((leaf.content.match(regex.note)) ?
		NoteStage.Inside : leaf.content.match(regex.opening_note) ? NoteStage.Begin :
		leaf.content.match(regex.closing_note) ? NoteStage.End : NoteStage.Begin)
		
		this.advance(leaf.content);
	}
	change(to: NoteStage) {
		if(this.previous.length >=3) {
			this.previous.pop()
			this.previous.pop()
		}
		// this.previous.unshift(this.stage)
		this.previous.unshift(to)
		this.stage = to;
	}
	nextLine(cx: BlockContext, line: Line, leaf: LeafBlock) {
		if (this.stage == NoteStage.None) return false;
		let content = leaf.content + "\n" + line.scrub();
		let finish = this.advance(content);
		return this.complete(cx, leaf, 0);
	}

	finish(cx: BlockContext, leaf: LeafBlock) {
		if (
			(this.stage == NoteStage.Begin || this.stage == NoteStage.Inside) &&
			skipSpace(leaf.content, this.pos) == leaf.content.length
		)
			return this.complete(cx, leaf, leaf.content.length);
		return false;
	}

	complete(cx: BlockContext, leaf: LeafBlock, len: number) {
		// console.debug("compleetion", this.elts)
		return true;
	}

	nextStage(elt: Element | null | false) {
		if (elt) {
			this.pos = elt.to - this.start;
			// this.elts.push(elt);
			// this.stage++;
			return true;
		}
		if (elt === false) this.stage = NoteStage.None;
		return false;
	}

	advance(content: string) {
		let blip = parseNoteElement(content, this.pos, this.start)
		for (;;) {
			let pNE = parseNoteElement(content, this.pos, this.start)
			
			if (this.stage == NoteStage.None) {
				// console.debug("none")
				return false;
			} else if (this.stage == NoteStage.Begin) {
				
				if ((this.previous[0] == NoteStage.Begin) ) {
						
					// this.context.addElement(elt(Type.BlockNote, this.pos + this.start, this.start + content.length))
					
					if(content.match(regex.note)) {
						this.change(NoteStage.End)
					} else {
						this.change(NoteStage.Inside)
					}
					return 1
				} else if(!pNE) {
					
					return -1;
				}
				return -1
				/* this.context.addNode(
					elt(Type.BlockNote, this.pos + this.start, this.pos + this.start + 1)
					.toTree(this.context.parser.nodeSet),
					this.context.lineStart
				); */
			} else if (this.stage == NoteStage.Inside) {
				if (!pNE) return -1;
				/* this.context.addNode(
					elt(Type.BlockNote, this.pos + this.start, this.start + content.length).toTree(this.context.parser.nodeSet),
					this.context.lineStart
				)
				this.context.addNode(Type.BlockNote, this.pos+this.start, content.length + this.start) */
				this.context.addLeafElement(this.leaf, pNE)
				
				this.change(NoteStage.End)
				return 1
			} else if (this.stage == NoteStage.End) {
				if (!parseNoteElement(content, this.pos, this.start)) return -1;
				
				// @ts-ignore
				// this.context.addNode(parseNoteElement(content, this.pos, this.start).toTree(this.context.parser.nodeSet), this.context.lineStart)
				this.context.addLeafElement(this.leaf, pNE)
				this.change(NoteStage.Begin)
				return 1
			} else {
				
			}
		}
	}
}

class TitlePageParser implements LeafBlockParser {
	myelements: Element[] = []
	constructor(readonly leafy: LeafBlock, bcx: BlockContext) {
		this.nextLine(bcx, new Line(), this.leafy)
	}
	nextLine(cx: BlockContext, line: Line, leaf: LeafBlock) {
		let cat = []
		let zeroed = cx.stack[0]
		let children = zeroed.children as Tree[];
		let lastOF = children[children.length - 1]?.type.name
		if(leaf.content.match(regex.title_page)) {
			this.myelements.push(
				elt(Type.TitlePage, leaf.start, leaf.content.length + 1, cx.parser.parseInline(leaf.content, leaf.start))
			);
		} else if(this.myelements.length) {
			this.myelements.push(elt(Type.TitlePage, cx.lineStart, leaf.content.length + 1, cx.parser.parseInline(leaf.content, leaf.start)))
		} /* else if(leaf.content.indexOf("\n") !== -1) {
			this.myelements.push(
				elt(Type.TitlePageField, leaf.content.indexOf("\n") + 1, leaf.content.length, cx.parser.parseInline(leaf.content, leaf.start))
			)
		} */ else if(lastOF === "TitlePage")  {
			this.myelements.push(
				elt(Type.TitlePage, leaf.start, leaf.content.length,
					cx.parser.parseInline(leaf.content, leaf.start)
				)
			)
		} else {
			return false
		}

		
		cx.addLeafElement(leaf, elt(Type.TitlePage, cx.lineStart, leaf.content.length + 1, this.myelements))
		return true;

	}

	finish() {
		return false;
	}
}

class SceneHeadingParser implements LeafBlockParser {
	constructor(readonly leafy: LeafBlock, bcx: BlockContext) {
		this.nextLine(bcx, new Line(), this.leafy)
	}
	nextLine(cx: BlockContext, _: Line, leaf: LeafBlock) {
		let startup = leaf.content.indexOf("#") !== -1 ? leaf.content.indexOf("#") : null
		let myend = leaf.content.lastIndexOf("#") !== -1 ? leaf.content.lastIndexOf("#") : null
		let sn = myend ? elt(Type.SceneNumber, (cx.lineStart + startup), cx.lineStart + myend + 1) : null
		let sh = elt(Type.SceneHeading, cx.lineStart -1, (cx.lineStart + (startup || leaf.content.length)), sn ? [sn] : [])
		cx.addLeafElement(leaf, sh)
		return true
	}

	finish() {
		return false;
	}
}

const DefaultLeafBlocks: {
	[name: string]: (cx: BlockContext, leaf: LeafBlock) => LeafBlockParser | null;
} = {
	BlockNote(cx, bl) {
		// return ((bl.content.match(regex.note_inline) || bl.content.match(regex.note)
		// || bl.content.match(regex.closing_note) || bl.content.match(regex.opening_note)) || cx.prevEl[0] == Type.BlockNote) ? 
		return new NoteBlockParser(bl, cx) 
		// : null
	},
	SceneHeading(cx, bl) {
		return bl.content.match(regex.scene_heading) ? new SceneHeadingParser(bl, cx) : null
	},
	TitlePage(cx, bl) {
		return new TitlePageParser(bl, cx)
	},
	Dialogue(cx, bl) {
		return new DialogueParser(bl, cx)
	},
	// BlockNote(_, leaf) {
	// 	return leaf.content.charCodeAt(0) === 91 ? new NoteBlockParser() : null
	// }
};

const DefaultEndLeaf: readonly ((cx: BlockContext, line: Line) => boolean)[] = [
	(_, line) => isSection(line) >= 0,
	// (_, line) => isFencedCode(line) >= 0,
	(_, line) => isBlockquote(line) >= 0,
	(p, line) => isPageBreak(line, p, true) >= 0,
	(p, line) => !!parseNoteElement(line.text, 0, p.lineStart)
	// (p, line) => isLyric(line, p) >= 0

];


const scanLineResult = { text: "", end: 0 };

export class BlockContext implements PartialParse {
	/// @internal
	block: CompositeBlock;
	/// @internal
	stack: CompositeBlock[];
	line = new Line();
	private atEnd = false;
	private fragments: FragmentCursor | null;
	private to: number;
	/// @internal
	dontInject: Set<Tree> = new Set();
	stoppedAt: number | null = null;

	/// The start of the current line.
	lineStart: number;
	/// The absolute (non-gap-adjusted) position of the line @internal
	absoluteLineStart: number;
	/// The range index that absoluteLineStart points into @internal
	rangeI = 0;
	/// @internal
	absoluteLineEnd: number;
	prevNode: Type[] = []
	prevEl: Type[] = []

	/// @internal
	constructor(
		/// The parser configuration used.
		readonly parser: FountainParser,
		/// @internal
		readonly input: Input,
		fragments: readonly TreeFragment[],
		/// @internal
		readonly ranges: readonly { from: number; to: number }[]
	) {
		this.to = ranges[ranges.length - 1].to;
		this.lineStart =
			this.absoluteLineStart =
			this.absoluteLineEnd =
				ranges[0].from;
		this.block = CompositeBlock.create(Type.Screenplay, 0, this.lineStart, 0, 0);
		this.stack = [this.block];
		this.fragments = fragments.length
			? new FragmentCursor(fragments, input)
			: null;
		this.readLine();
	}

	get parsedPos() {
		return this.absoluteLineStart;
	}

	setPrevCurr(block: Type | Tree) {
		if(this.prevNode.length >= 2) this.prevNode.pop()
		// this.prevNode.unshift(t.type.id)
		if(block instanceof Tree) block = block.type.id;
		this.prevNode.unshift(block)
	}

	advance() {
		if (this.stoppedAt != null && this.absoluteLineStart > this.stoppedAt)
			return this.finish();

		let { line } = this;
		for (;;) {
			while (line.depth < this.stack.length) this.finishContext();
			for (let mark of line.markers)
				this.addNode(mark.type, mark.from, mark.to);
			if (line.pos < line.text.length) break;
			// Empty line
			if (!this.nextLine()) return this.finish();
		}

		if (this.fragments && this.reuseFragment(line.basePos)) return null;

		start: for (;;) {
			for (let type of this.parser.blockParsers)
				if (type) {
					let result = type(this, line);
					if (result != false) {
						if (result == true) return null;
						line.forward();
						continue start;
					}
				}
			break;
		}

		let leaf = new LeafBlock(
			this.lineStart + line.pos,
			line.text.slice(line.pos)
		);
		for (let parse of this.parser.leafBlockParsers)
			if (parse) {
				let parser = parse!(this, leaf);
				if (parser) leaf.parsers.push(parser!);
			}
		lines: while (this.nextLine()) {
			if (line.pos == line.text.length) break;
			if (line.indent < line.baseIndent + 4) {
				for (let stop of this.parser.endLeafBlock)
					if (stop(this, line, leaf)) break lines;
			}
			for (let parser of leaf.parsers)
				if (parser.nextLine(this, line, leaf)) return null;
			leaf.content += "\n" + line.scrub();
			for (let m of line.markers) leaf.marks.push(m);
		}
		this.finishLeaf(leaf);
		return null;
	}

	stopAt(pos: number) {
		if (this.stoppedAt != null && this.stoppedAt < pos)
			throw new RangeError("Can't move stoppedAt forward");
		this.stoppedAt = pos;
	}

	private reuseFragment(start: number) {
		if (
			!this.fragments!.moveTo(
				this.absoluteLineStart + start,
				this.absoluteLineStart
			) ||
			!this.fragments!.matches(this.block.hash)
		)
			return false;
		let taken = this.fragments!.takeNodes(this);
		if (!taken) return false;
		let withoutGaps = taken,
			end = this.absoluteLineStart + taken;
		for (let i = 1; i < this.ranges.length; i++) {
			let gapFrom = this.ranges[i - 1].to,
				gapTo = this.ranges[i].from;
			if (gapFrom >= this.lineStart && gapTo < end)
				withoutGaps -= gapTo - gapFrom;
		}
		this.lineStart += withoutGaps;
		this.absoluteLineStart += taken;
		this.moveRangeI();
		if (this.absoluteLineStart < this.to) {
			this.lineStart++;
			this.absoluteLineStart++;
			this.readLine();
		} else {
			this.atEnd = true;
			this.readLine();
		}
		return true;
	}

	/// The number of parent blocks surrounding the current block.
	get depth() {
		return this.stack.length;
	}

	/// Get the type of the parent block at the given depth. When no
	/// depth is passed, return the type of the innermost parent.
	parentType(depth = this.depth - 1) {
		return this.parser.nodeSet.types[this.stack[depth].type];
	}

	/// Move to the next input line. This should only be called by
	/// (non-composite) [block parsers](#BlockParser.parse) that consume
	/// the line directly, or leaf block parser
	/// [`nextLine`](#LeafBlockParser.nextLine) methods when they
	/// consume the current line (and return true).
	nextLine() {
		this.lineStart += this.line.text.length;
		if (this.absoluteLineEnd >= this.to) {
			this.absoluteLineStart = this.absoluteLineEnd;
			this.atEnd = true;
			this.readLine();
			return false;
		} else {
			this.lineStart++;
			this.absoluteLineStart = this.absoluteLineEnd + 1;
			this.moveRangeI();
			this.readLine();
			return true;
		}
	}

	private moveRangeI() {
		while (
			this.rangeI < this.ranges.length - 1 &&
			this.absoluteLineStart >= this.ranges[this.rangeI].to
		) {
			this.rangeI++;
			this.absoluteLineStart = Math.max(
				this.absoluteLineStart,
				this.ranges[this.rangeI].from
			);
		}
	}

	/// @internal
	scanLine(start: number) {
		let r = scanLineResult;
		r.end = start;
		if (start >= this.to) {
			r.text = "";
		} else {
			r.text = this.lineChunkAt(start);
			r.end += r.text.length;
			if (this.ranges.length > 1) {
				let textOffset = this.absoluteLineStart,
					rangeI = this.rangeI;
				while (this.ranges[rangeI].to < r.end) {
					rangeI++;
					let nextFrom = this.ranges[rangeI].from;
					let after = this.lineChunkAt(nextFrom);
					r.end = nextFrom + after.length;
					r.text =
						r.text.slice(0, this.ranges[rangeI - 1].to - textOffset) + after;
					textOffset = r.end - r.text.length;
				}
			}
		}
		return r;
	}

	/// @internal
	readLine() {
		let { line } = this,
			{ text, end } = this.scanLine(this.absoluteLineStart);
		this.absoluteLineEnd = end;
		line.reset(text);
		for (; line.depth < this.stack.length; line.depth++) {
			let cx = this.stack[line.depth],
				handler = this.parser.skipContextMarkup[cx.type];
			if (!handler) throw new Error("Unhandled block context " + Type[cx.type]);
			if (!handler(cx, this, line)) break;
			line.forward();
		}
	}

	private lineChunkAt(pos: number) {
		let next = this.input.chunk(pos),
			text;
		if (!this.input.lineChunks) {
			let eol = next.indexOf("\n");
			text = eol < 0 ? next : next.slice(0, eol);
		} else {
			text = next == "\n" ? "" : next;
		}
		return pos + text.length > this.to ? text.slice(0, this.to - pos) : text;
	}

	/// The end position of the previous line.
	prevLineEnd() {
		return this.atEnd ? this.lineStart : this.lineStart - 1;
	}

	/// @internal
	startContext(type: Type, start: number, value = 0) {
		this.block = CompositeBlock.create(
			type,
			value,
			this.lineStart + start,
			this.block.hash,
			this.lineStart + this.line.text.length
		);
		this.stack.push(this.block);
	}

	/// Start a composite block. Should only be called from [block
	/// parser functions](#BlockParser.parse) that return null.
	startComposite(type: string, start: number, value = 0) {
		this.startContext(this.parser.getNodeType(type), start, value);
	}

	/// @internal
	addNode(block: Type | Tree, from: number, to?: number) {
		if (typeof block == "number")
		block = new Tree(
			this.parser.nodeSet.types[block],
			none,
			none,
			(to ?? this.prevLineEnd()) - from
			);
		this.setPrevCurr(block)
		this.block.addChild(block, from - this.block.from);
	}

	/// Add a block element. Can be called by [block
	/// parsers](#BlockParser.parse).
	addElement(elt: Element) {
		this.block.addChild(
			elt.toTree(this.parser.nodeSet),
			elt.from - this.block.from
		);
		if(this.prevEl.length > 2) {
			this.prevEl.pop()
		}
		this.prevEl.unshift(elt.type)
	}

	/// Add a block element from a [leaf parser](#LeafBlockParser). This
	/// makes sure any extra composite block markup (such as blockquote
	/// markers) inside the block are also added to the syntax tree.
	addLeafElement(leaf: LeafBlock, elt: Element) {
		this.addNode(
			this.buffer
				.writeElements(injectMarks(elt.children, leaf.marks), -elt.from)
				.finish(elt.type, elt.to - elt.from),
			elt.from
		);
	}

	/// @internal
	finishContext() {
		let cx = this.stack.pop()!;
		let top = this.stack[this.stack.length - 1];
		top.addChild(cx.toTree(this.parser.nodeSet), cx.from - top.from);
		this.block = top;
	}

	private finish() {
		while (this.stack.length > 1) this.finishContext();
		return this.addGaps(this.block.toTree(this.parser.nodeSet, this.lineStart));
	}

	private addGaps(tree: Tree) {
		return this.ranges.length > 1
			? injectGaps(
					this.ranges,
					0,
					tree.topNode,
					this.ranges[0].from,
					this.dontInject
			  )
			: tree;
	}

	/// @internal
	finishLeaf(leaf: LeafBlock) {
		for (let parser of leaf.parsers) if (parser.finish(this, leaf)) return;
		let inline = injectMarks(
			this.parser.parseInline(leaf.content, leaf.start),
			leaf.marks
		);
		
		this.addNode(
			this.buffer
				.writeElements(inline, -leaf.start)
				.finish(Type[Type[this.prevNode[0]]], leaf.content.length),
			leaf.start
		);
	}

	/// Create an [`Element`](#Element) object to represent some syntax
	/// node.

	elt(
		type: string,
		from: number,
		to: number,
		children?: readonly Element[]
	): Element;
	elt(tree: Tree, at: number): Element;
	elt(
		type: string | Tree,
		from: number,
		to?: number,
		children?: readonly Element[]
	): Element {
		if (typeof type == "string")
			return elt(this.parser.getNodeType(type), from, to!, children);
		return new TreeElement(type, from);
	}

	/// @internal
	get buffer() {
		return new Buffer(this.parser.nodeSet);
	}
}

function injectGaps(
	ranges: readonly { from: number; to: number }[],
	rangeI: number,
	tree: SyntaxNode,
	offset: number,
	dont: Set<Tree>
): Tree {
	if (dont.has(tree.tree!)) return tree.tree!;
	let rangeEnd = ranges[rangeI].to;
	let children = [],
		positions = [],
		start = tree.from + offset;
	function movePastNext(upto: number, inclusive: boolean) {
		while (inclusive ? upto >= rangeEnd : upto > rangeEnd) {
			let size = ranges[rangeI + 1].from - rangeEnd;
			offset += size;
			upto += size;
			rangeI++;
			rangeEnd = ranges[rangeI].to;
		}
	}
	for (let ch = tree.firstChild; ch; ch = ch.nextSibling) {
		movePastNext(ch.from + offset, true);
		let from = ch.from + offset,
			node;
		if (ch.to + offset > rangeEnd) {
			node = injectGaps(ranges, rangeI, ch, offset, dont);
			movePastNext(ch.to + offset, false);
		} else {
			node = ch.toTree();
		}
		children.push(node);
		positions.push(from - start);
	}
	movePastNext(tree.to + offset, false);
	return new Tree(
		tree.type,
		children,
		positions,
		tree.to + offset - start,
		tree.tree ? tree.tree.propValues : undefined
	);
}

export interface NodeSpec {
	/// The node's name.
	name: string;
	/// Should be set to true if this type represents a block node.
	block?: boolean;
	/// If this is a composite block, this should hold a function that,
	/// at the start of a new line where that block is active, checks
	/// whether the composite block should continue (return value) and
	/// optionally [adjusts](#Line.moveBase) the line's base position
	/// and [registers](#Line.addMarker) nodes for any markers involved
	/// in the block's syntax.
	composite?(cx: BlockContext, line: Line, value: number): boolean;
	/// Add highlighting tag information for this node. The value of
	/// this property may either by a tag or array of tags to assign
	/// directly to this node, or an object in the style of
	/// [`styleTags`](https://lezer.codemirror.net/docs/ref/#highlight.styleTags)'s
	/// argument to assign more complicated rules.
	style?: Tag | readonly Tag[] | { [selector: string]: Tag | readonly Tag[] };
}

export interface InlineParser {
	/// This parser's name, which can be used by other parsers to
	/// [indicate](#InlineParser.before) a relative precedence.
	name: string;
	/// The parse function. Gets the next character and its position as
	/// arguments. Should return -1 if it doesn't handle the character,
	/// or add some [element](#InlineContext.addElement) or
	/// [delimiter](#InlineContext.addDelimiter) and return the end
	/// position of the content it parsed if it can.
	parse(cx: InlineContext, next: number, pos: number): number;
	/// When given, this parser will be installed directly before the
	/// parser with the given name. The default configuration defines
	/// inline parsers with names Escape, Entity, InlineCode, HTMLTag,
	/// Emphasis, HardBreak, Link, and Image. When no `before` or
	/// `after` property is given, the parser is added to the end of the
	/// list.
	before?: string;
	/// When given, the parser will be installed directly _after_ the
	/// parser with the given name.
	after?: string;
}

export interface BlockParser {
	/// The name of the parser. Can be used by other block parsers to
	/// [specify](#BlockParser.before) precedence.
	name: string;
	/// The eager parse function, which can look at the block's first
	/// line and return `false` to do nothing, `true` if it has parsed
	/// (and [moved past](#BlockContext.nextLine) a block), or `null` if
	/// it has started a composite block.
	parse?(cx: BlockContext, line: Line): BlockResult;
	/// A leaf parse function. If no [regular](#BlockParser.parse) parse
	/// functions match for a given line, its content will be
	/// accumulated for a paragraph-style block. This method can return
	/// an [object](#LeafBlockParser) that overrides that style of
	/// parsing in some situations.
	leaf?(cx: BlockContext, leaf: LeafBlock): LeafBlockParser | null;
	/// Some constructs, such as code blocks or newly started
	/// blockquotes, can interrupt paragraphs even without a blank line.
	/// If your construct can do this, provide a predicate here that
	/// recognizes lines that should end a paragraph (or other non-eager
	/// [leaf block](#BlockParser.leaf)).
	endLeaf?(cx: BlockContext, line: Line, leaf: LeafBlock): boolean;
	/// When given, this parser will be installed directly before the
	/// block parser with the given name. The default configuration
	/// defines block parsers with names LinkReference, IndentedCode,
	/// FencedCode, Blockquote, HorizontalRule, BulletList, OrderedList,
	/// ATXHeading, HTMLBlock, and SetextHeading.
	before?: string;
	/// When given, the parser will be installed directly _after_ the
	/// parser with the given name.
	after?: string;
}

export interface LeafBlockParser {
	/// Update the parser's state for the next line, and optionally
	/// finish the block. This is not called for the first line (the
	/// object is contructed at that line), but for any further lines.
	/// When it returns `true`, the block is finished. It is okay for
	/// the function to [consume](#BlockContext.nextLine) the current
	/// line or any subsequent lines when returning true.
	nextLine(cx: BlockContext, line: Line, leaf: LeafBlock): boolean;
	/// Called when the block is finished by external circumstances
	/// (such as a blank line or the [start](#BlockParser.endLeaf) of
	/// another construct). If this parser can handle the block up to
	/// its current position, it should
	/// [finish](#BlockContext.addLeafElement) the block and return
	/// true.
	finish(cx: BlockContext, leaf: LeafBlock): boolean;
}


export class FountainParser extends Parser {
	/// @internal
	nodeTypes: { [name: string]: number } = Object.create(null);

	/// @internal
	constructor(
		/// The parser's syntax [node
		/// types](https://lezer.codemirror.net/docs/ref/#common.NodeSet).
		readonly nodeSet: NodeSet,
		/// @internal
		readonly blockParsers: readonly (
			| ((cx: BlockContext, line: Line) => BlockResult)
			| undefined
		)[],
		/// @internal
		readonly leafBlockParsers: readonly (
			| ((cx: BlockContext, leaf: LeafBlock) => LeafBlockParser | null)
			| undefined
		)[],
		/// @internal
		readonly blockNames: readonly string[],
		/// @internal
		readonly endLeafBlock: readonly ((
			cx: BlockContext,
			line: Line,
			leaf: LeafBlock
		) => boolean)[],
		/// @internal
		readonly skipContextMarkup: {
			readonly [type: number]: (
				bl: CompositeBlock,
				cx: BlockContext,
				line: Line
			) => boolean;
		},
		/// @internal
		readonly inlineParsers: readonly (
			| ((cx: InlineContext, next: number, pos: number) => number)
			| undefined
		)[],
		/// @internal
		readonly inlineNames: readonly string[],
		/// @internal
		readonly wrappers: readonly ParseWrapper[]
	) {
		super();
		for (let t of nodeSet.types) this.nodeTypes[t.name] = t.id;
	}

	createParse(
		input: Input,
		fragments: readonly TreeFragment[],
		ranges: readonly { from: number; to: number }[]
	): PartialParse {
		let parse: PartialParse = new BlockContext(this, input, fragments, ranges);
		for (let w of this.wrappers) parse = w(parse, input, fragments, ranges);
		return parse;
	}

	/// @internal
	getNodeType(name: string) {
		let found = this.nodeTypes[name];
		if (found == null) throw new RangeError(`Unknown node type '${name}'`);
		return found;
	}

	/// Parse the given piece of inline text at the given offset,
	/// returning an array of [`Element`](#Element) objects representing
	/// the inline content.
	parseInline(text: string, offset: number) {
		let cx = new InlineContext(this, text, offset);
		outer: for (let pos = offset; pos < cx.end; ) {
			let next = cx.char(pos);
			for (let token of this.inlineParsers) {
				if (token) {
					let result = token(cx, next, pos);
					if (result >= 0) {
						pos = result;
						continue outer;
					}
				}
				pos++;
			}
		}
		return cx.resolveMarkers(0);
	}
}


function propLogger(node, state) {
	console.debug("we are in a prop")
	console.debug("prop:state", state)
	console.debug("prop:node", node)
}

let nodeTypes = [NodeType.none];
for (let i = 1, name; (name = Type[i]); i++) {
	// console.debug("nodetype", name)
	let properties = [];
	if(name === "SceneHeading") {
		properties.push(foldNodeProp.add((type) => {
			if(type.name !== "SceneHeading") return undefined
			return (node, state) => {
				let ns = node.nextSibling.type.id === Type.SceneHeading ? state.doc.lineAt(node.nextSibling.from).to - 1 : null
				propLogger(node, state)
				return {from: state.doc.lineAt(node.from).to, to: ns}
			}
		}))
	}
	// console.debug("node:deffine", i)
	nodeTypes[i] = NodeType.define({
		id: i,
		name,
		props:
			i <= Type.Escape ? [] :
			i >= Type.PlainText
				? []
				: properties,
	});
}

function extender(): NodePropSource[] {
	let properties:NodePropSource[] = [
		languageDataProp.add({data: data})
	];
	function logger(node, state, nextsibling?) {
			console.debug("we are in a prop")
			console.debug("prop:state", state)
			console.debug("prop:node", node)
			nextsibling && console.debug("prop:ns", nextsibling)
	}
	/* properties.push(foldNodeProp.add(type => {
		console.log("prop:type", type.name)
		if(type.id === Type.Screenplay || type.id === Type.TitlePageField) return null
		return function (node, state) {
			let ns = node.nextSibling.type.id === Type.SceneHeading ? state.doc.lineAt(node.nextSibling.from).to - 1 : null
			logger(node, state, ns)
			return {from: state.doc.lineAt(node.from).to, to: ns}
		}
	})) */
	properties.push(foldNodeProp.add(type => {
		// console.log("prop:type", type.name)
		// if(type.is("Screenplay")) return undefined
		if(type.is("SceneHeading")) 
		return function (node, state) {
			logger(node, state)
			let ns = node.nextSibling.type.id === Type.SceneHeading ? state.doc.lineAt(node.nextSibling.from).to - 1 : null
			return {from: state.doc.lineAt(node.from).to, to: ns}
		}
		// return (node, state) => undefined
	}))
	// console.log("props", properties)
	return properties;
}

const none: readonly any[] = [];

class Buffer {
	content: number[] = [];
	nodes: Tree[] = [];
	constructor(readonly nodeSet: NodeSet) {}

	write(type: Type, from: number, to: number, children = 0) {
		this.content.push(type, from, to, 4 + children * 4);
		return this;
	}

	writeElements(elts: readonly (Element | TreeElement)[], offset = 0) {
		for (let e of elts) e.writeTo(this, offset);
		return this;
	}

	finish(type: Type, length: number) {
		return Tree.build({
			buffer: this.content,
			nodeSet: this.nodeSet,
			reused: this.nodes,
			topID: type,
			length,
		});
	}
}

export class Element {
	/// @internal
	constructor(
		/// The node's
		/// [id](https://lezer.codemirror.net/docs/ref/#common.NodeType.id).
		readonly type: number,
		/// The start of the node, as an offset from the start of the document.
		readonly from: number,
		/// The end of the node.
		readonly to: number,
		/// The node's child nodes @internal
		readonly children: readonly (Element | TreeElement)[] = none
	) {}

	/// @internal
	writeTo(buf: Buffer, offset: number) {
		let startOff = buf.content.length;
		buf.writeElements(this.children, offset);
		buf.content.push(
			this.type,
			this.from + offset,
			this.to + offset,
			buf.content.length + 4 - startOff
		);
	}

	/// @internal
	toTree(nodeSet: NodeSet): Tree {
		return new Buffer(nodeSet)
			.writeElements(this.children, -this.from)
			.finish(this.type, this.to - this.from);
	}
}

class TreeElement {
	constructor(readonly tree: Tree, readonly from: number) {}

	get to() {
		return this.from + this.tree.length;
	}

	get type() {
		return this.tree.type.id;
	}

	get children() {
		return none;
	}

	writeTo(buf: Buffer, offset: number) {
		buf.nodes.push(this.tree);
		buf.content.push(
			buf.nodes.length - 1,
			this.from + offset,
			this.to + offset,
			-1
		);
	}

	toTree(): Tree {
		return this.tree;
	}
}

function elt(
	type: Type,
	from: number,
	to: number,
	children?: readonly (Element | TreeElement)[]
) {
	return new Element(type, from, to, children);
}

const enum Mark {
	Open = 1,
	Close = 2,
}

export interface DelimiterType {
	/// If this is given, the delimiter should be matched automatically
	/// when a piece of inline content is finished. Such delimiters will
	/// be matched with delimiters of the same type according to their
	/// [open and close](#InlineContext.addDelimiter) properties. When a
	/// match is found, the content between the delimiters is wrapped in
	/// a node whose name is given by the value of this property.
	///
	/// When this isn't given, you need to match the delimiter eagerly
	/// using the [`findOpeningDelimiter`](#InlineContext.findOpeningDelimiter)
	/// and [`takeContent`](#InlineContext.takeContent) methods.
	resolve?: string;
	/// If the delimiter itself should, when matched, create a syntax
	/// node, set this to the name of the syntax node.
	mark?: string;
}




const EmphasisUnderline: DelimiterType = {
	resolve: "Underline",
	mark: "UnderlineMark",
};
const EmphasisBold: DelimiterType = {
	resolve: "Bold",
	mark: "BoldMark",
};
// const Emp
const EmphasisItalic: DelimiterType = {
	resolve: "Italic",
	mark: "ItalicMark"
}
const CharacterExtension: DelimiterType = {
	resolve: "CharacterExt",
	mark: "CharacterExt"
}
class InlineDelimiter {
	constructor(
		readonly type: DelimiterType,
		readonly from: number,
		readonly to: number,
		public side: Mark
	) {}
}

let Punctuation = /[!"#$%&'()+,\-.\/:;<=>?@\[\\\]^`\*\._{|}~\xA1\u2010-\u2027]*/;
try {
	Punctuation = new RegExp(
		"[\\p{Pc}|\\p{Pd}|\\p{Pe}|\\p{Pf}|\\p{Pi}|\\p{Po}|\\p{Ps}]",
		"u"
	);
} catch (_) {}

const DefaultInline: {	[name: string]: (cx: InlineContext, next: number, pos: number) => number;} = {
	Emphasis(cx, next, start) {
		if (next != 95 && next != 42) return -1;
		let pos = start + 1;
		while (cx.char(pos) == next) pos++;
		let before = cx.slice(start - 1, start),
			after = cx.slice(pos, pos + 1);
		let pBefore = Punctuation.test(before),
			pAfter = Punctuation.test(after);
		let sBefore = /\s|^$/.test(before),
			sAfter = /\s|^$/.test(after);
		let leftFlanking = !sAfter && (!pAfter || sBefore || pBefore);
		let rightFlanking = !sBefore && (!pBefore || sAfter || pAfter);
		let canOpen = leftFlanking && (next == 42 || !rightFlanking || pBefore);
		let canClose = rightFlanking && (next == 42 || !leftFlanking || pAfter);
		let hasBold = next == 42 && after == "*"
		return cx.append(
			new InlineDelimiter(
				next == 95 ? EmphasisUnderline : hasBold ? EmphasisBold : EmphasisItalic,
				start,
				pos,
				(canOpen ? Mark.Open : 0) | (canClose ? Mark.Close : 0)
			)
		);
	},
	/* Note(cx, next, start) {
		if(next != 91 && next !== 93) return -1
		if(!cx.text.match(regex.note_inline)) return -1
		let pos = start + 1
		let from = pos + cx.text.indexOf("[");
		let to = pos + cx.text.lastIndexOf("]")
		while (cx.char(pos) == next) pos++
		return cx.append(elt(Type.Note, from, to))
	} */
};

// These return `null` when falling off the end of the input, `false`
// when parsing fails otherwise (for use in the incremental link
// reference parser).


export class InlineContext {
	/// @internal
	parts: (Element | InlineDelimiter | null)[] = [];

	/// @internal
	constructor(
		/// The parser that is being used.
		readonly parser: FountainParser,
		/// The text of this inline section.
		readonly text: string,
		/// The starting offset of the section in the document.
		readonly offset: number
	) {}

	/// Get the character code at the given (document-relative)
	/// position.
	char(pos: number) {
		return pos >= this.end ? -1 : this.text.charCodeAt(pos - this.offset);
	}

	/// The position of the end of this inline section.
	get end() {
		return this.offset + this.text.length;
	}

	/// Get a substring of this inline section. Again uses
	/// document-relative positions.
	slice(from: number, to: number) {
		return this.text.slice(from - this.offset, to - this.offset);
	}

	/// @internal
	append(elt: Element | InlineDelimiter) {
		this.parts.push(elt);
		return elt.to;
	}

	/// Add a [delimiter](#DelimiterType) at this given position. `open`
	/// and `close` indicate whether this delimiter is opening, closing,
	/// or both. Returns the end of the delimiter, for convenient
	/// returning from [parse functions](#InlineParser.parse).
	addDelimiter(
		type: DelimiterType,
		from: number,
		to: number,
		open: boolean,
		close: boolean
	) {
		return this.append(
			new InlineDelimiter(
				type,
				from,
				to,
				(open ? Mark.Open : 0) | (close ? Mark.Close : 0)
			)
		);
	}

	/// Add an inline element. Returns the end of the element.
	addElement(elt: Element) {
		return this.append(elt);
	}

	/// @internal
	resolveMarkers(from: number) {
		for (let i = from; i < this.parts.length; i++) {
			let close = this.parts[i];
			if (
				!(
					close instanceof InlineDelimiter &&
					close.type.resolve &&
					close.side & Mark.Close
				)
			)
				continue;

			let emp = close.type == EmphasisItalic || close.type === EmphasisBold;
			let un = close.type == EmphasisUnderline
			let closeSize = close.to - close.from;
			let open: InlineDelimiter | undefined,
				j = i - 1;
			for (; j >= from; j--) {
				let part = this.parts[j] as InlineDelimiter;
				if (
					!(
						part instanceof InlineDelimiter &&
						part.side & Mark.Open &&
						part.type == close.type
					) ||
					(emp &&
						(close.side & Mark.Open || part.side & Mark.Close) &&
						(part.to - part.from + closeSize) % 3 == 0 &&
						((part.to - part.from) % 3 || closeSize % 3))
				)
					continue;
				open = part;
				break;
			}
			if (!open) continue;

			let type = close.type.resolve,
				content = [];
			let start = open.from,
				end = close.to;
			if (emp) {
				let size = Math.min(2, open.to - open.from, closeSize);
				start = open.to - size;
				end = close.from + size;
				type = size == 1 ? "Italic" : "Bold";
			}
			if (open.type.mark)
				content.push(this.elt(open.type.mark, start, open.to));
			for (let k = j + 1; k < i; k++) {
				if (this.parts[k] instanceof Element)
					content.push(this.parts[k] as Element);
				this.parts[k] = null;
			}
			if (close.type.mark)
				content.push(this.elt(close.type.mark, close.from, end));
			let element = this.elt(type, start, end, content);
			this.parts[j] =
				emp && open.from != start
					? new InlineDelimiter(open.type, open.from, start, open.side)
					: null;
			let keep = (this.parts[i] =
				emp && close.to != end
					? new InlineDelimiter(close.type, end, close.to, close.side)
					: null);
			if (keep) this.parts.splice(i, 0, element);
			else this.parts[i] = element;
		}

		let result = [];
		for (let i = from; i < this.parts.length; i++) {
			let part = this.parts[i];
			if (part instanceof Element) result.push(part);
		}
		return result;
	}

	/// Find an opening delimiter of the given type. Returns `null` if
	/// no delimiter is found, or an index that can be passed to
	/// [`takeContent`](#InlineContext.takeContent) otherwise.
	findOpeningDelimiter(type: DelimiterType) {
		for (let i = this.parts.length - 1; i >= 0; i--) {
			let part = this.parts[i];
			if (part instanceof InlineDelimiter && part.type == type) return i;
		}
		return null;
	}

	/// Remove all inline elements and delimiters starting from the
	/// given index (which you should get from
	/// [`findOpeningDelimiter`](#InlineContext.findOpeningDelimiter),
	/// resolve delimiters inside of them, and return them as an array
	/// of elements.
	takeContent(startIndex: number) {
		let content = this.resolveMarkers(startIndex);
		this.parts.length = startIndex;
		return content;
	}

	/// Skip space after the given (document) position, returning either
	/// the position of the next non-space character or the end of the
	/// section.
	skipSpace(from: number) {
		return skipSpace(this.text, from - this.offset) + this.offset;
	}

	/// Create an [`Element`](#Element) for a syntax node.
	elt(
		type: string,
		from: number,
		to: number,
		children?: readonly Element[]
	): Element;
	elt(tree: Tree, at: number): Element;
	elt(
		type: string | Tree,
		from: number,
		to?: number,
		children?: readonly Element[]
	): Element {
		if (typeof type == "string")
			return elt(this.parser.getNodeType(type), from, to!, children);
		return new TreeElement(type, from);
	}
}

function injectMarks(
	elements: readonly (Element | TreeElement)[],
	marks: Element[]
) {
	if (!marks.length) return elements;
	if (!elements.length) return marks;
	let elts = elements.slice(),
		eI = 0;
	for (let mark of marks) {
		while (eI < elts.length && elts[eI].to < mark.to) eI++;
		if (eI < elts.length && elts[eI].from < mark.from) {
			let e = elts[eI];
			if (e instanceof Element)
				elts[eI] = new Element(
					e.type,
					e.from,
					e.to,
					injectMarks(e.children, [mark])
				);
		} else {
			elts.splice(eI++, 0, mark);
		}
	}
	return elts;
}


// These are blocks that can span blank lines, and should thus only be
// reused if their next sibling is also being reused.
const NotLast = [
	Type.Dialogue,
	// Type.TitlePage,
	// Type.SceneHeading,
	// Type.Synopsis,
	Type.Action,
	// Type.BlockNote,
	Type.BoneYard
];

class FragmentCursor {
	// Index into fragment array
	i = 0;
	// Active fragment
	fragment: TreeFragment | null = null;
	fragmentEnd = -1;
	// Cursor into the current fragment, if any. When `moveTo` returns
	// true, this points at the first block after `pos`.
	cursor: TreeCursor | null = null;

	constructor(
		readonly fragments: readonly TreeFragment[],
		readonly input: Input
	) {
		if (fragments.length) this.fragment = fragments[this.i++];
	}

	nextFragment() {
		this.fragment =
			this.i < this.fragments.length ? this.fragments[this.i++] : null;
		this.cursor = null;
		this.fragmentEnd = -1;
	}

	moveTo(pos: number, lineStart: number) {
		while (this.fragment && this.fragment.to <= pos) this.nextFragment();
		if (!this.fragment || this.fragment.from > (pos ? pos - 1 : 0))
			return false;
		if (this.fragmentEnd < 0) {
			let end = this.fragment.to;
			while (end > 0 && this.input.read(end - 1, end) != "\n") end--;
			this.fragmentEnd = end ? end - 1 : 0;
		}

		let c = this.cursor;
		if (!c) {
			c = this.cursor = this.fragment.tree.cursor();
			c.firstChild();
		}

		let rPos = pos + this.fragment.offset;
		while (c.to <= rPos) if (!c.parent()) return false;
		for (;;) {
			if (c.from >= rPos) return this.fragment.from <= lineStart;
			if (!c.childAfter(rPos)) return false;
		}
	}

	matches(hash: number) {
		let tree = this.cursor!.tree;
		return tree && tree.prop(NodeProp.contextHash) == hash;
	}


	takeNodes(cx: BlockContext) {
		let cur = this.cursor!,
			off = this.fragment!.offset,
			fragEnd = this.fragmentEnd - (this.fragment!.openEnd ? 1 : 0);
		let start = cx.absoluteLineStart,
			end = start,
			blockI = cx.block.children.length;
		let prevEnd = end,
			prevI = blockI;
		for (;;) {
			if (cur.to - off > fragEnd) {
				if (cur.type.isAnonymous && cur.firstChild()) continue;
				break;
			}
			cx.dontInject.add(cur.tree!);
			cx.addNode(cur.tree!, cur.from - off);
			// Taken content must always end in a block, because incremental
			// parsing happens on block boundaries. Never stop directly
			// after an indented code block, since those can continue after
			// any number of blank lines.
			if (cur.type.is("Block")) {
				if (NotLast.indexOf(cur.type.id) < 0) {
					end = cur.to - off;
					blockI = cx.block.children.length;
				} else {
					end = prevEnd;
					blockI = prevI;
					prevEnd = cur.to - off;
					prevI = cx.block.children.length;
				}
			}
			if (!cur.nextSibling()) break;
		}
		while (cx.block.children.length > blockI) {
			cx.block.children.pop();
			cx.block.positions.pop();
		}

		return end - start;
	}
}



export const parser = new FountainParser(
	new NodeSet(nodeTypes).extend(...extender()),
	Object.keys(DefaultBlockParsers).map((n) => DefaultBlockParsers[n]),
	Object.keys(DefaultBlockParsers).map((n) => DefaultLeafBlocks[n]),
	Object.keys(DefaultBlockParsers),
	DefaultEndLeaf,
	DefaultSkipMarkup,
	Object.keys(DefaultInline).map((n) => DefaultInline[n]),
	Object.keys(DefaultInline),
	[]
);
const data = defineLanguageFacet({block: {open: "<!--", close: "-->"}})
const fold = defineLanguageFacet(Facet.define())

export function mkLang(parser: FountainParser) { /* console.debug("node:types", nodeTypes); */ return new Language(data, parser)}

export function ftn(exts?: Extension[]) { 
	const lang =  new Language(data, parser)
	const ls = new LanguageSupport(lang)
	// console.log("derrr", extender())
	// console.log("lag", parser.nodeSet);  
	return ls
}