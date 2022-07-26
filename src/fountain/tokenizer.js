import {TitlePage, SceneHeading, 
	Lyric as lll , Note as n,
	Action as a,
	PB as PageBreak,
	Synopsis as sis
} from "./parser.terms"

import {ExternalTokenizer} from "@lezer/lr";

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
	let rego = /^((?:title|credit|author[s]?|source|notes|draft date|date|contact|copyright)\:)/gi
	// console.debug("dtf", input, stack)
	if(input.toLowerCase().match(rego)) {
		return TitlePage
	} else {
		return -1
	}

}
export const Lyric = (input, stack) => {
	let rego = /^~(?![ ]).+(?:\n.+)*/;
	if(input.match(rego)) {
		return lll
	} else {
		return -1
	}

}

export const Note = (input, stack) => {
	let rego = /(\[{2}(?!\[+))([\s\S\r\n]*?)(?:\]{2}(?!\[+))/g
	if(input.match(rego)) {
		console.debug("nmatch", input)
		return n;
	}
	return -1
}

export const Transition = (input, stack) => {
	let rego =  regex.transition
	if(input.match(rego)) {
		console.debug("trans", input, stack)
		return Transition
	} else {
		return -1
	}
}

export const PB = (input, stack) => {
	let rego = /^={3,}/
	if(input.match(rego)) {
		return PageBreak
	} else {
		return -1
	}
}

export const Synopsis = (input, stack) => {
	let rego = /^(\=\s*)(.*)/

	if(input.match(rego)) {
		// console.debug("syn", input)
		return sis
	} else {
		return -1
	}
}


export const Action = (input, stack) => {
	console.debug("a", input)
	return -1
}
