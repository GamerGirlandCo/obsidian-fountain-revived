import { ExternalTokenizer } from "@lezer/lr"
import { TitlePage, SceneHeading } from "./parser.terms"
export const desensitizedSceneHeading =  (input, stack) => {
    let rego = /^(((int|ext|est|i\/e)\.).+)|^(\.(?!\.+))(.+)/i
    if(input.match(rego)) {
        console.debug("mm", input, stack)
        // console.log("m")
        // input.acceptToken(SceneHeading)
		return SceneHeading
    } else {
		return -1
		// input.advance()
	}
}



export const desensitizedTitleField = (input, stack) => {
    let rego = /^((?:title|credit|author[s]?|source|notes|draft date|date|contact|copyright)\:)/gim
    console.debug("dtf", input, stack)
    if(input.toLowerCase().match(rego)) {
        // input.acceptToken(TitlePage)
		return TitlePage
    } else {
		return -1
        // input.advance()
    }
}

