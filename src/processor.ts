export default class FountainProcessor {
		static title_page = /^((?:title|credit|author[s]?|source|notes|draft date|date|contact|copyright)\:)/gim;
	
		static scene_heading = /^((?:\*{0,3}_?)?(?:(?:int|ext|est|i\/e)[. ]).+)|^(?:\.(?!\.+))(.+)/i;
		static scene_number = /( *#(.+)# *)/;
	
		static transition =  /^((?:FADE (?:TO BLACK|OUT)|CUT TO BLACK)\.|.+ TO\:)|^(?:> *)(.+)/;

		static dialogue =  /^(?:([A-Z*_][0-9A-Z ._\-']*(?:\(.*\))?[ ]*)|\@([A-Za-z*_][0-9A-Za-z (._\-')]*))(\^?)?(?:\n(?!\n+))([\s\S]+)/;
		static parenthetical =  /^(\(.+\))$/;

		static action =  /^(.+)/g;
		static centered =  /^(?:> *)(.+)(?: *<)(\n.+)*/g;

		static lyrics =  /^~(?![ ]).+(?:\n.+)*/;

		static section =  /^(#+)(?: *)(.*)/;
		static synopsis =  /^(?:\=(?!\=+) *)(.*)/;

		static note =  /^(?:\[{2}(?!\[+))(.+)(?:\]{2}(?!\[+))$/;
		static note_inline =  /(?:\[{2}(?!\[+))([\s\S]+?)(?:\]{2}(?!\[+))/g;
		static boneyard =  /(^\/\*|^\*\/)$/g;

		static page_break =  /^\={3,}$/;
		static line_break =  /^ {2}$/;

		static emphasis =  /(_|\*{1,3}|_\*{1,3}|\*{1,3}_)(.+)(_|\*{1,3}|_\*{1,3}|\*{1,3}_)/g;
		static bold_italic_underline =  /(_{1}\*{3}(?=.+\*{3}_{1})|\*{3}_{1}(?=.+_{1}\*{3}))(.+?)(\*{3}_{1}|_{1}\*{3})/g;
		static bold_underline =  /(_{1}\*{2}(?=.+\*{2}_{1})|\*{2}_{1}(?=.+_{1}\*{2}))(.+?)(\*{2}_{1}|_{1}\*{2})/g;
		static italic_underline =  /(_{1}\*{1}(?=.+\*{1}_{1})|\*{1}_{1}(?=.+_{1}\*{1}))(.+?)(\*{1}_{1}|_{1}\*{1})/g;
		static bold_italic =  /(\*{3}(?=.+\*{3}))(.+?)(\*{3})/g;
		static bold =  /(\*{2}(?=.+\*{2}))(.+?)(\*{2})/g;
		static italic =  /(\*{1}(?=.+\*{1}))(.+?)(\*{1})/g;
		static underline =  /(_{1}(?=.+_{1}))(.+?)(_{1})/g;

		static splitter =  /\n{2,}/g;
		static cleaner =  /^\n+|\n+$/;
		static standardizer =  /\r\n|\r/g;
		static whitespacer =  /^\t+|^ {3,}/gm

		constructor() {}

}