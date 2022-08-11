import {App, Modal, Setting} from "obsidian";
export class CreateModal extends Modal {
	result: string;
	constructor(app: App, readonly onSubmit: (result: string) => Promise<void>) {
		super(app)
	}
	onOpen() {
		const {contentEl} = this;
		contentEl.createEl("h3", {text: "New Fountain File"})
		new Setting(contentEl)
			.setName("File Name")
			.addText((text) =>
				text.onChange((value) => {
					this.result = value
				}))
		new Setting(contentEl)
			.addButton((btn) => 
				btn.setButtonText("Create")
				.setCta()
				.onClick(async () => {
					this.close;
					await this.onSubmit(this.result)
				}))
		contentEl.onkeydown = async (e: KeyboardEvent) => {
			if(e.key === "Enter") {
				this.close()
				await this.onSubmit(this.result)
			}
		}
	}
	onClose() {
		const {contentEl} = this;
		contentEl.empty()
	}
}