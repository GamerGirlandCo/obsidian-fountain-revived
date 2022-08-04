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
  foldGutter(),
//   drawSelection({
// 	drawRangeCursor: false
// }),
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