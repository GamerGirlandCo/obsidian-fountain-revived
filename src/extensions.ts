import { Extension } from "@codemirror/state";
import {
  EditorView,
  dropCursor,
  highlightSpecialChars,
  keymap,
} from "@codemirror/view";
import { autocompletion, closeBrackets, closeBracketsKeymap, completionKeymap } from "@codemirror/autocomplete";
import {
  bracketMatching,
  codeFolding,
  foldGutter,
  foldKeymap,
  indentOnInput,
} from "@codemirror/language";
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import { searchKeymap } from "@codemirror/search";

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
        el.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-chevron-down"><polyline points="6 9 12 15 18 9"></polyline></svg>`
      } else {
        el.addClass("fold-closed")
        el.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-chevron-right"><polyline points="9 18 15 12 9 6"></polyline></svg>`
      }
      return el;
    }  
  }),
  codeFolding({
    placeholderDOM(view, onclick) {
      console.log("pleec", view)
        const el = document.createElement("span")
        el.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-move-vertical"><polyline points="8 18 12 22 16 18"></polyline><polyline points="8 6 12 2 16 6"></polyline><line x1="12" x2="12" y1="2" y2="22"></line></svg>`
        el.addClass("screenplay-foldwidget")
        el.onclick = (e) => {
          onclick(e)
          // console.log("pleec", view)
        };
        el.setAttribute("aria-label", view.state.phrase("folded scene (click to unfold)"))
        return el;
    },
  }),

  dropCursor(),
//   EditorState.allowMultipleSelections.of(true),
  indentOnInput(),
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