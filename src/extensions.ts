import { EditorState, Extension } from "@codemirror/state";
import {
  EditorView,
  drawSelection,
  dropCursor,
  highlightActiveLine,
  highlightActiveLineGutter,
  highlightSpecialChars,
  keymap,
  lineNumbers,
  rectangularSelection,
} from "@codemirror/view";
import { autocompletion, closeBrackets, closeBracketsKeymap, completionKeymap } from "@codemirror/autocomplete";
import {
  bracketMatching,
  defaultHighlightStyle,
  foldGutter,
  foldKeymap,
  indentOnInput,
  syntaxHighlighting,
} from "@codemirror/language";
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import { highlightSelectionMatches, searchKeymap } from "@codemirror/search";

import { lintKeymap } from "@codemirror/lint";

export const basicSetup: Extension[] = [
//   lineNumbers(),
  // highlightActiveLineGutter(),
  highlightSpecialChars(),
  history(),
  foldGutter({
    markerDOM(open) {
      let el = document.createElement("div")
      el.addClass("screenplay-fold-gutter-sym")
      if(open) {
        el.addClass("fold-open")
        el.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-chevron-down"><polyline points="6 9 12 15 18 9"></polyline></svg>`
      } else {
        el.addClass("fold-closed")
        el.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-chevron-right"><polyline points="9 18 15 12 9 6"></polyline></svg>`
      }
      return el;
    }  
  }),
  codeFolding({
    placeholderDOM(view, onclick) {
      console.log("pleec", view)
        const el = document.createElement("span")
        el.addClass("screenplay-foldwidget")
        el.onclick = (e) => {
          onclick(e)
          console.log("pleec", view)
        };
        el.setAttribute("aria-label", view.state.phrase("folded scene (click to unfold)"))
        return el;
    },
  }),
  dropCursor(),
//   EditorState.allowMultipleSelections.of(true),
  indentOnInput(),
//   fountain(),
//   syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
  EditorView.lineWrapping,
  bracketMatching(),
  closeBrackets(),
  autocompletion(),
//   rectangularSelection(),
  // highlightActiveLine(),
//   highlightSelectionMatches(),
  keymap.of([
    ...closeBracketsKeymap,
    ...defaultKeymap,
    ...searchKeymap,
    ...historyKeymap,
    indentWithTab,
    ...foldKeymap,
    ...completionKeymap,
    ...lintKeymap,
  ]),
]