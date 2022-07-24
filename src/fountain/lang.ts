import {LRLanguage, LanguageSupport, defineLanguageFacet, foldInside, foldNodeProp} from "@codemirror/language";

import { basicSetup } from "src/extensions";
import {parser} from "./parser"

const facet = defineLanguageFacet({})
// export const ldp = ne

export const Fountain = LRLanguage.define({
	parser: parser.configure({
		props: [
			foldNodeProp.add({
				"SceneHeading Section ": foldInside
			})
		]
	})
})

export default function () {
	return new LanguageSupport(Fountain)
}