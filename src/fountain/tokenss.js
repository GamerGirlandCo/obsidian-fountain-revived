import {
	TitlePage, SceneHeading, 
	// Lyric as lll , 
	// Action as a,
	// Note as n,
	// PB as PageBreak,
	Transition as ttt,
	// Synopsis as sis,
	// Character as cc,
	// Parenthetical as para
	// _Centered as c,
	// Italic as ita,
	// Underline as ul,
	// CloseNote as cn,
	// OpenNote as on,
	Note as n,
	Transition,
	// Speech as sped
} from "./parser.terms"

import {ContextTracker, ExternalTokenizer, InputStream} from "@lezer/lr";

const regex = {
    title_page: /^((?:title|credit|author[s]?|source|notes|draft date|date|contact|copyright)\:)/gim,

    scene_heading: /^((?:\*{0,3}_?)?(?:(?:int|ext|est|i\/e)[. ]).+)|^(?:\.(?!\.+))(.+)/i,
    scene_number: /( *#(.+)# *)/,

    transition: /^((FADE (TO BLACK|OUT)|CUT TO BLACK)|.+ TO\:)|^>.+/g,

    dialogue: /^(?:([A-Z*_][0-9A-Z ._\-']*(?:\(.*\))?[ ]*)|\@([A-Za-z*_][0-9A-Za-z (._\-')]*))(\^?)?(?:\n(?!\n+))([\s\S]+)/,
    parenthetical: /^(\(.+\))$/,

    action: /^(.+)/g,
    centered: /^(?:> *)(.+)(?: *<)(\n.+)*/g,

    lyrics: /^~(?![ ]).+(?:\n.+)*/,

    section: /^(#+)(?: *)(.*)/,
    synopsis: /^(?:\=(?!\=+) *)(.*)/,

    note: /^(?:\[{2}(?!\[+))(.+)(?:\]{2}(?!\[+))$/,
    note_inline: /(?:\[{2}(?!\[+))([\s\S]+?)(?:\]{2}(?!\[+))/g,
    boneyard: /(^\/\*|^\*\/)$/g,

    page_break: /^\={3,}$/,
    line_break: /^ {2}$/,

    emphasis: /(_|\*{1,3}|_\*{1,3}|\*{1,3}_)(.+)(_|\*{1,3}|_\*{1,3}|\*{1,3}_)/g,
    bold_italic_underline: /(_{1}\*{3}(?=.+\*{3}_{1})|\*{3}_{1}(?=.+_{1}\*{3}))(.+?)(\*{3}_{1}|_{1}\*{3})/g,
    bold_underline: /(_{1}\*{2}(?=.+\*{2}_{1})|\*{2}_{1}(?=.+_{1}\*{2}))(.+?)(\*{2}_{1}|_{1}\*{2})/g,
    italic_underline: /(_{1}\*{1}(?=.+\*{1}_{1})|\*{1}_{1}(?=.+_{1}\*{1}))(.+?)(\*{1}_{1}|_{1}\*{1})/g,
    bold_italic: /(\*{3}(?=.+\*{3}))(.+?)(\*{3})/g,
    bold: /(\*{2}(?=.+\*{2}))(.+?)(\*{2})/g,
    italic: /(\*{1}(?=.+\*{1}))(.+?)(\*{1})/g,
    underline: /(_{1}(?=.+_{1}))(.+?)(_{1})/g,

    splitter: /\n{2,}/g,
    cleaner: /^\n+|\n+$/,
    standardizer: /\r\n|\r/g,
    whitespacer: /^\t+|^ {3,}/gm
  };

function cc(n) {
	return String.fromCharCode(n)
}

const sqbopen = "[".charCodeAt(0),
	sqbclose = "]".charCodeAt(0),
	bolditali = "*".charCodeAt(0),
	underline = "_".charCodeAt(0),
	bopen = "(".charCodeAt(0),
	bclose = ")".charCodeAt(0)

export const _Centered = new ExternalTokenizer((input, stack) => {
	// if(input.chunk.split("").contains("\n")) return
	console.log("cent")
	if(input.chunk.match(regex.transition) && !input.chunk.trim().endsWith("<")) {
		// input.acceptToken()
	} else if(input.chunk.match(regex.centered)) {
		// input.acceptToken(c)
	}
	input.advance()
	// return -1
})
export const desensitizedSceneHeading = (input, stack) => {
    let rego = /^((?:(?:int|ext|est|i\/e)[. ]).+)|^(?:\.(?!\.+))(.+)/i
	// console.debug("m", input)
    if(input.match(rego)) {
        // console.log("mmm")
        return SceneHeading
    }
	return -1
}

export const desensitizedTitleField = (input, stack) => {
    let rego = /^((title|credit|author[s]?|source|notes|draft date|date|contact|copyright)\:).*?/gsim
    if(input.toLowerCase().match(rego)) {
		// stack.context = {lol: "kk"}
		console.debug("dtf", input, stack.context)
        return TitlePage
    }
	return -1
}

export const Note_ = new ExternalTokenizer((input, stack) => {
	let rego = /(\[{2})([\s\S]*)(\]{2})/
	// if(input.chunk.split("").contains("\n")) return
	// if(input.chunk.split("").filter(a => a == "\n").length > 3) {
	// 	return
	// }
	let isopening = input.next === "[".charCodeAt(0) &&
		input.peek(1) === "[".charCodeAt(0)
	let isclosing = input.next === "]".charCodeAt(0)
	// stack.context = {}
	if(isopening) {
		input.acceptToken(on)
	}
	if(isclosing && stack.context.char === "[[") {
		if (input.next === sqbclose) {
			input.acceptToken(cn)
		}
	}
	input.advance()
})




export const _Speech = new ExternalTokenizer( (input, stack) => {
	console.debug("dial", input)
	// if(input.split("").contains("\n")) return -1
	// input.advance()
	if(input.chunk.match(/.+/)) {
		console.debug("dially", input)
		input.acceptToken()
	}
	input.advance()
})

export const Underline_ = new ExternalTokenizer((input, stack) => {
	if(input.chunk.split("").contains("\n")) return
	if(input.next === "_".charCodeAt(0)) {
		console.debug("underline!", input)
		// stack.context.mark = "underline"
		input.acceptToken(ul)
	}
	input.advance()
})

export const Italic_ = new ExternalTokenizer((i, s) => {
	if(i.chunk.split("").contains("\n")) return
	
	if(i.next === bolditali && i.peek(1) !==  bolditali) {
		console.debug("italy", i.chunk)
		i.acceptToken(ita)
	}
	i.advance()
})

export const Twansition = (input, stack) => {
    if(input.match(regex.transition) && !input.trim().endsWith("<")) {
        // console.log("trans", input)
        // input.advance()
        return ttt
        // input.acceptToken(ttt)
    } else {
        return -1
        // input.advance()
    }
}

export const MarkupContext = new ContextTracker({
	start: {},
	shift(context, term, stack, input) {
		let blip = input.next;
		let boop = {};
		console.debug("SHIFT", context, stack, input.chunk)
		return boop

	},
	reduce(context, term, stack, input) {
		let blip = input.next;
		let boop = {};
		let arewein;
		console.debug("REDUCE", context, stack, input.chunk)
		return boop

	},
	reuse(context, node, stack, input) {
		console.log("chode js", node)
	},
	hash(context) { return context ? context.hash : 0 },
	strict: true
})
