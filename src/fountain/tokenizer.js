import {TitlePage, SceneHeading, 
	Lyric as lll , Note as n,
	// Action as a,
	PB as PageBreak,
	Transition as ttt,
	Synopsis as sis,
	Character as cc
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
	return -1
}

export const Lyric = (input, stack) => {
	let rego = /^~.+(?:\n.+)*/;
	if(input.match(rego)) {
		return lll
	} else {
		return -1
	}
}
export const Note = (input, stack) => {
	// console.log("notie", input)
	let rego = /(\[{2})([\s\S]*)(\]{2})/
	if(input.match(rego)) {
		// console.debug("nmatch", input)
		return n;
	}
	return -1
}


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


export const Synopsis = (input, stack) => {
	let rego = /^(\={1,2}\s*)(.*)/

	if(input.match(rego)) {
		// console.debug("syn", input)
		return sis
	} else {
		return -1
	}
}

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
		// console.log("termy", context, term, stack, input)
		return arewein ? boop : context
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
		// console.log("reddd", context, term, stack, input)
		return arewein ? boop : context
	},
	reuse(context, node, stack, input) {
		console.log("chode js", node)
	}
})