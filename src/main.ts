import {
	Plugin,
	TFolder,
	WorkspaceLeaf,

} from "obsidian";

import {FountainView} from "./fountain-view";
import { ftn as fountain } from "./lang-fountain";
import { inlinePlugin } from "./editor";
import { CreateModal } from "./createModal";

export default class ObsidianFountain extends Plugin {
	async onload() {
		console.log(`Loading Fountain Plugin - v${this.manifest.version}`)
		// this.editor
		this.registerExtensions(["fountain", "fountain.md"], "fountain")
		this.registerView("fountain", this.makeView)
		this.app.workspace.updateOptions()
		// this.registerEditorExtension([inlinePlugin(), fountain().extension])
		// this.registerMarkdownCodeBlockProcessor("fountain", this.codeBlockProcessor.bind(this))
		// this.registerMarkdownPostProcessor(this.postProcessor.bind(this))
		this.registerEvent(this.app.workspace.on("file-menu", (menu, file) => {
			if(!(file instanceof TFolder)) return
			menu.addItem((item) => {
				item
					.setTitle("Create fountain file")
					.setIcon("file-plus")
					.onClick(async () => {
						new CreateModal(app, async (res) => {
							let newfile = `${file.path}/${res}.fountain`
							let newTFile = await this.app.vault.create(newfile, "")
							await this.app.workspace.getLeaf(true, "vertical").openFile(newTFile)
						})
					})
			})
		}))
	}
	makeView(leaf: WorkspaceLeaf) {
		return new FountainView(leaf);
	}
	onunload() {
		console.log("bye bye!");
	}
}

