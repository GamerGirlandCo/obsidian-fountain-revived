import {LRLanguage, Language, defineLanguageFacet} from "@codemirror/language";

import { basicSetup } from "src/extensions";
import {parser} from "./parser"

const facet = defineLanguageFacet({})
// export const ldp = ne

export const Fountain = LRLanguage.define({
	parser: parser.configure({
		props: [
		
		]
	})
})

// export default new Language(facet, parser, basicSetup)