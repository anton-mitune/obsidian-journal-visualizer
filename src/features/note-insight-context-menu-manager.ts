import { App, Editor, Menu, Plugin, MarkdownView, MarkdownFileInfo } from 'obsidian';
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
			this.app.workspace.on('editor-menu', ((menu: Menu, editor: Editor, _info: MarkdownView | MarkdownFileInfo) => {
				this.addMenuItems(menu, editor);
			}))
		);
	}

	/**
	 * Add note insight menu items to editor context menu
	 */
	private addMenuItems(menu: Menu, editor: Editor): void {
		// Add separator before our options
		menu.addSeparator();

		// Add "Add yearly tracker from vault" option
		menu.addItem((item) => {
			item
				.setTitle('Add yearly tracker from vault')
				.setIcon('bar-chart-3')
				.onClick(() => {
					this.showNoteSelectorForYearly(editor);
				});
		});

		// Add "Add monthly tracker from vault" option
		menu.addItem((item) => {
			item
				.setTitle('Add monthly tracker from vault')
				.setIcon('calendar')
				.onClick(() => {
					this.showNoteSelectorForMonthly(editor);
				});
		});

		// Add "Add counter" option
		menu.addItem((item) => {
			item
				.setTitle('Add counter')
				.setIcon('hash')
				.onClick(() => {
					this.insertCounterComponent(editor);
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
			this.resizeCanvasNodeIfNeeded(800, 300);
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
			this.resizeCanvasNodeIfNeeded(420, 420);
		});
		modal.open();
	}

	/**
	 * Insert empty counter component
	 */
	private insertCounterComponent(editor: Editor): void {
		const id = this.generateCodeblockId();
		const codeBlock = `\`\`\`note-insight-counter\nid: ${id}\n\`\`\`\n`;
		editor.replaceSelection(codeBlock);
		this.resizeCanvasNodeIfNeeded(420, 410);
	}

	/**
	 * Resize canvas node if we are in a canvas context
	 */
	private resizeCanvasNodeIfNeeded(width: number, height: number): void {
		// Find the active canvas view
		const activeLeaf = this.app.workspace.getMostRecentLeaf();
		if (!activeLeaf) return;
		
		const view = activeLeaf.view;
		if (view.getViewType() === 'canvas') {
			const canvas = (view as unknown as Record<string, unknown>).canvas as Record<string, unknown> | undefined;
			if (!canvas) return;
			
			const selection = canvas.selection as { size?: number; values?: () => IterableIterator<unknown> } | undefined;
			if (!selection || !selection.size || selection.size !== 1) return;
			
			const valuesIterator = selection.values?.();
			if (!valuesIterator) return;
			
			const node = valuesIterator.next()?.value as Record<string, unknown> | undefined;
			if (!node) return;
			
			try {
				if (typeof node.moveAndResize === 'function') {
					node.moveAndResize.call(node, {
						x: node.x,
						y: node.y,
						width: width,
						height: height
					});
				}
			} catch (error) {
				console.error('[NoteInsight] Canvas resizing failed:', error);
			}
		}
	}
}
