import {EditorState, Extension} from "@codemirror/state"

import {EditorView} from "@codemirror/view";

export function editorFromTextArea(textarea: HTMLTextAreaElement, extensions: Extension, initial: string) {
	let view = new EditorView({
		state: EditorState.create({ doc: textarea.value, extensions }),
	});
	textarea.parentNode!.insertBefore(view.dom, textarea);
	textarea.style.display = "none";
	if (textarea.form)
	textarea.form.addEventListener("submit", () => {
		textarea.value = view.state.doc.toString();
	});
	return view;
}