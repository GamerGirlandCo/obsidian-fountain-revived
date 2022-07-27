import {
	// TitlePage, SceneHeading, 
	// Lyric as lll , 
	// Action as a,
	// Note as n,
	// PB as PageBreak,
	// Transition as ttt,
	// Synopsis as sis,
	// Character as cc,
	// Parenthetical as para,
	Underline as ul,
	CloseNote as cn,
	OpenNote as on,
	Note as n,
	// Speech as sped
} from "./parser.terms"

import {ContextTracker, ExternalTokenizer, InputStream} from "@lezer/lr";

import { regex } from "./regexes";

const dot = 46
const hash = 35

export const desensitizedSceneHeading = (input, stack) => {
	let rego = /^((?:(?:int|ext|est|i\/e)[. ]).+)|^(?:\.(?!\.+))(.+)/i
	if(input.match(rego)) {
		// console.debug("m", input, stack)
		// console.debug("m")
		return SceneHeading
	}
	return -1
}



export const desensitizedTitleField = (input, stack) => {
	let rego = /^((?:title|credit|author[s]?|source|notes|draft date|date|contact|copyright)\:)/i
	// console.debug("dtf", input, stack)
	if(input.toLowerCase().match(rego)) {
		return TitlePage
	} else {
		return -1
	}
}

export const Character = (input, stack) => {
	if(input.match(/^[A-Z\s]+$/)) {
		console.log("charry", input)
		return cc
	}
	return -1
}

export const Action = (input, stack) => {
	// return -1
	return a
}

export const Lyric = (input, stack) => {
	let rego = /^~.+(?:\n.+)*/;
	if(input.match(rego)) {
		return lll
	} else {
		return -1
	}
}
export const Note_ = new ExternalTokenizer((input, stack) => {
	let rego = /(\[{2})([\s\S]*)(\]{2})/
	let isopening = input.next === "[".charCodeAt(0) &&
		input.peek(1) === "[".charCodeAt(0)
	let isclosing = input.next === "]".charCodeAt(0)
	if(isopening) {
		// console.log("yis?", String.fromCharCode(i.next), i.next === "[".charCodeAt(0)) 
		// console.debug("notie", String.fromCharCode(input.next))
		// console.log(input.input.string)
		// console.log("isopen", String.fromCharCode(i.next))
		return input.acceptToken(on)
	} else if(isclosing) {
		// console.log("is?", String.fromCharCode(i.next), i.next === "]".charCodeAt(0)) 
		// console.log(input.input.string)

		// console.log("store's closed")
		if (input.next === "]".charCodeAt(0)) {
			// console.log("pool!")
			return input.acceptToken(cn)
		}
	}
	input.advance()
})


export const Twansition = (input, stack) => {
	if(input.match(regex.transition)) {
		// console.log("trans", input)
		// input.advance()
		return ttt
		// input.acceptToken(ttt)
	} else {
		return -1
		// input.advance()
	}
}

export const PB = (input, stack) => {
	let rego = /={3,}/g
	if(input.match(rego)) {
		return PageBreak
	} else {
		return -1
	}
}

export const Parenthetical = (input, stack) => {
	if(input.match(regex.parenthetical)) {
		console.debug("parenthetical", input)
		return para
	}
	return -1
}

export const Synopsis = (input, stack) => {
	let rego = /^(\={1,2}\s*)(.*)/

	if(input.match(rego)) {
		// console.debug("syn", input)
		return sis
	} 
	return -1
}

export const Speech = new ExternalTokenizer( (input, stack) => {
	console.debug("dial", input)
	// if(input.split("").contains("\n")) return -1
	// input.advance()
	if(input.chunk.match(/.+/)) {
		console.debug("dially", input)
		return sped
	}
	return -1
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


export const MarkupContext = new ContextTracker({
	start: null,
	shift(context, term, stack, input) {
		let blip = input.next;
		let boop = {};
		let arewein;
		if(input.next === "_".charCodeAt(0)) {
			arewein = true
			boop.type = "underline",
			boop.char = "_"
		} else if(
				input.next === "*".charCodeAt(0) &&
				input.peek(1) === "*".charCodeAt(0)
			) {
				arewein = true
			boop.type = "bold";
			boop.char = "**"
		}
		// console.debug("termy", context, term, stack, input)
		return arewein && !context ? boop : context
	},
	reduce(context, term, stack, input) {
		let blip = input.next;
		let boop = {};
		let arewein;
		if(input.next === "_".charCodeAt(0)) {
			arewein = true
			boop.type = "underline",
			boop.char = "_"
		} else if(
				input.next === "*".charCodeAt(0) &&
				input.peek(1) === "*".charCodeAt(0)
			) {
				arewein = true
			boop.type = "bold";
			boop.char = "**"
		}
		// console.debug("reddd", context, term, stack, input)
		return arewein && !context ? boop : context
	},
	reuse(context, node, stack, input) {
		console.log("chode js", node)
	}
})
