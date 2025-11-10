import { App, Editor, Menu, Plugin } from 'obsidian';
import { NoteSelector } from '../ui/note-selector';

/**
 * Manages context menu integration for adding note insight components
 * Adds options to editor context menus for inserting code blocks
 */
export class NoteInsightContextMenuManager {
	private app: App;
	private plugin: Plugin;

	constructor(app: App, plugin: Plugin) {
		this.app = app;
		this.plugin = plugin;
	}

	/**
	 * Register editor context menu events
	 */
	register(): void {
		// Register editor menu event for context menu integration
		this.plugin.registerEvent(
			this.app.workspace.on('editor-menu', (menu: Menu, editor: Editor) => {
				this.addMenuItems(menu, editor);
			})
		);
	}

	/**
	 * Add note insight menu items to editor context menu
	 */
	private addMenuItems(menu: Menu, editor: Editor): void {
		// Add separator before our options
		menu.addSeparator();

		// Add "Add Yearly Tracker from Vault" option
		menu.addItem((item) => {
			item
				.setTitle('Add Yearly Tracker from Vault')
				.setIcon('bar-chart-3')
				.onClick(() => {
					this.showNoteSelectorForYearly(editor);
				});
		});

		// Add "Add Monthly Tracker from Vault" option
		menu.addItem((item) => {
			item
				.setTitle('Add Monthly Tracker from Vault')
				.setIcon('calendar')
				.onClick(() => {
					this.showNoteSelectorForMonthly(editor);
				});
		});

		// Add "Add Counter from Vault" option
		menu.addItem((item) => {
			item
				.setTitle('Add Counter from Vault')
				.setIcon('hash')
				.onClick(() => {
					this.showNoteSelectorForCounter(editor);
				});
		});
	}

	/**
	 * Generate a short random codeblock ID
	 */
	private generateCodeblockId(): string {
		return Math.random().toString(36).substring(2, 8);
	}

	/**
	 * Show note selector modal for yearly tracker
	 */
	private showNoteSelectorForYearly(editor: Editor): void {
		const modal = new NoteSelector(this.app, (file) => {
			const id = this.generateCodeblockId();
			const codeBlock = `\`\`\`note-insight-yearly\nid: ${id}\nnotePath: ${file.path}\n\`\`\`\n`;
			editor.replaceSelection(codeBlock);
		});
		modal.open();
	}

	/**
	 * Show note selector modal for monthly tracker
	 */
	private showNoteSelectorForMonthly(editor: Editor): void {
		const modal = new NoteSelector(this.app, (file) => {
			const id = this.generateCodeblockId();
			const codeBlock = `\`\`\`note-insight-monthly\nid: ${id}\nnotePath: ${file.path}\n\`\`\`\n`;
			editor.replaceSelection(codeBlock);
		});
		modal.open();
	}

	/**
	 * Show note selector modal for counter
	 */
	private showNoteSelectorForCounter(editor: Editor): void {
		const modal = new NoteSelector(this.app, (file) => {
			const id = this.generateCodeblockId();
			const codeBlock = `\`\`\`note-insight-counter\nid: ${id}\nnotePath: ${file.path}\n\`\`\`\n`;
			editor.replaceSelection(codeBlock);
		});
		modal.open();
	}
}
