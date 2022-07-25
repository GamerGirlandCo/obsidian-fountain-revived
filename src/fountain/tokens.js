import {
	// Synopsis as sis
	SceneHeading as sh,
	SceneNumber as sn,
	TitlePage as tp,
	Note as n,
	CloseNote as cn,
	OpenNote as on
} from "./parser.terms"

import {regex} from "./regexes"

import {ExternalTokenizer, ContextTracker} from "@lezer/lr";
import { requestUrl } from "obsidian";
// import { trackIndent } from "z-dist/python/src/tokens";



const dot = 46,
hash = 35,
newline = 10,
carriagereturn = 13,

startNote = "[["

export const TP = new ExternalTokenizer((i, s) => {
	if(i.next === -1) {
		return
	}
	if(i.chunk.match(regex.title_page)) {
		console.log("chk", i.chunk, s.pos)
		i.acceptToken(tp)
	}  else {
	}
	i.advance()
	// else {
	// }
})
export const SceneHeading = new ExternalTokenizer((i, s) => {
	let current = i.next
	if(isSpace(i.next))return 
	// console.log("stackpos", s.pos)
	if(i.next === dot && s.pos === 0) {
		i.acceptToken(sh)
	} else {
		if(i.input.string.toLowerCase().match(regex.scene_heading)) {
			console.log("mefix", i.input.string)
			i.acceptToken(sh)
		} else {
			i.advance()
		}
	}
})

export const OpenNote = new ExternalTokenizer((i, s) => {
	// let next = i.next
	// let nextup = i.peek(1)
	// let notmatch = (i.next !== "[".charCodeAt(0) || i.next !== "]".charCodeAt(0))
	// if(notmatch) {
	// 	return
	// }
	// console.debug("stack", s)
	// console.log("isopen-1", )
	// i.advance()
	let isopening = i.next === "[".charCodeAt(0) && i.peek(1) === "[".charCodeAt(0)
	let isclosing = i.next === "]".charCodeAt(0)
	if(isopening) {
		console.log("yis?", String.fromCharCode(i.next), i.next === "[".charCodeAt(0)) 
		console.log(i.input.string)
		// console.log("isopen", String.fromCharCode(i.next))
		return i.acceptToken(on)
	} else if(isclosing) {
		console.log("is?", String.fromCharCode(i.next), i.next === "]".charCodeAt(0)) 
		console.log(i.input.string)

		// console.log("store's closed")
		if (i.next === "]".charCodeAt(0)) {
			// console.log("pool!")
			return i.acceptToken(cn)
		}
	}
	i.advance()
	
	// console.debug("e_t", i.chunk, String.fromCharCode(current));
	// i.acceptToken(1)
})
export const TrackNote = new ContextTracker({
	start: null,
	shift(context, term, stack, input) {
		// console.debug("shifty", context, term, stack, input)
		return term === n ? new NoteContext(context) : context
	},
	reduce(c, t) {
		// console.debug("ceetee", c, t)
		return null
	}
})

export const TrackSceneNumber = new ContextTracker({
	start: null,
	shift(c,t,s,i) {
		
		return (i.next === hash && i.peek(1) !== hash) ? {char: "#"} : c
	},
	reduce(c, t, s, i) {
		console.debug("reduce!", c, t, String.fromCharCode(i.next), s.pos)
		// return
	}
})

export const desensitizedTitleField = (input, stack) => {
	let rego = /^((?:title|credit|author[s]?|source|notes|draft date|date|contact|copyright)\:)/gim
	// console.debug("dtf", input, stack)
	if(input.toLowerCase().match(rego)) {
		console.debug("matcho")
		return TP
	} else {
		return -1
	}
}

function scenePrefixAfter(i, o) {
	let pos = i.pos + o;
	let next = i.peek(o)
	while(isSpace(next)) next = input.peek(++offset)
	let prefix = "";
	for(;;) {
		if(isSpace(next)) break;
		name += String.fromCharCode(next)
		next = input.peek(++offset)
	}
}

function isSpace(ch) {
	return ch == 9 || ch == 10 || ch == 13 || ch == 32
}
function isNumber(ch) {
	let str = String.fromCharCode(ch);
	return !Number.isNaN(parseInt(str))
}