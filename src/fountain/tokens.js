import { ExternalTokenizer } from "@lezer/lr"
import { TitlePage, SceneHeading, Transition, Centered, Character, Speech,
	Lyric, Note } from "./parser.terms"

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

    note: /^(\[{2}(?!\[+))(.+)(?:\]{2}(?!\[+))$/,
    note_inline: /(\[{2}(?!\[+))([\s\S]+?)(?:\]{2}(?!\[+))/gm,
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

export const desensitizedSceneHeading =  (input, stack) => {
    // let rego = 
    
}

let previous = []

export const somethingTransition = (input, stack) => {
	if(input.match(regex.transition) && !input.endsWith("<")) {
		// console.log("trans", input)
		return Transition
	} else if(input.match(regex.centered) && input.trim().endsWith("<")) {
		// console.log("blip")
		return Centered
	}
	if(input.match(/^(\.|int|ext|est|i\/e)\.\s?.+/igm)) {
		console.debug("mm", input, stack)
		return SceneHeading
    } 

	if(input.startsWith("~")) return Lyric
	// if(input.match(regex.note_inline) || input.match(regex.note)) return Note
	let rego = /^(title|credit|author[s]?|source|notes|draft date|date|contact|copyright)\:.*/sgim
	// console.debug("dtf", input, stack, input.match(rego))
    if(input.toLowerCase().match(rego)) {
        // input.acceptToken(TitlePage)
		previous.unshift(TitlePage)
		return TitlePage
    }
	// if(previous[2] === TitlePage) {
	// 	return TitlePage
	// }
	if(input.match(rego)) {
        // console.log("m")
        // input.acceptToken(SceneHeading)
		previous.unshift(SceneHeading)
		return SceneHeading
    } 
	if(input.toLowerCase().match(/^((title|credit|author[s]?|source|notes|draft date|date|contact|copyright)\:)/gims)) {
		previous.unshift(TitlePage)
		return TitlePage
	}
	if(input.match(/^[A-Z\-\s\(\)\.\^]+$/g)) {
		previous.unshift(Character)
		return Character
	}
	if(input.match())
	if(previous[0] === Character && previous[1] !== Transition) {
		previous.unshift(Speech)
		return Speech
	}
	if(previous[0] === Character) {
		previous.unshift(Speech)
		return Speech
	}
	return 
}

// export const desensitizedTitleField = (input, stack) => {
//     let rego = /^(title|credit|author[s]?|source|notes|draft date|date|contact|copyright)\:/gim
//     if(input.toLowerCase().match(rego)) {
// 		console.debug("dtf", input, stack, input.match(rego))
//         // input.acceptToken(TitlePage)
// 		return TitlePage
//     }
// }

