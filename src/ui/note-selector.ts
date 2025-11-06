import { App, SuggestModal, TFile } from 'obsidian';

/**
 * Modal for selecting a note from the vault
 * Similar to Obsidian's native file picker
 */
export class NoteSelector extends SuggestModal<TFile> {
	private onSelect: (file: TFile) => void;
	private files: TFile[];

	constructor(app: App, onSelect: (file: TFile) => void) {
		super(app);
		this.onSelect = onSelect;
		
		// Get all markdown files in the vault
		this.files = this.app.vault.getMarkdownFiles();
		
		// Set modal title
		this.setPlaceholder('Select a note...');
	}

	/**
	 * Get suggestions based on user input
	 */
	getSuggestions(query: string): TFile[] {
		const lowerQuery = query.toLowerCase();
		
		return this.files.filter(file => {
			const fileName = file.basename.toLowerCase();
			const filePath = file.path.toLowerCase();
			
			return fileName.includes(lowerQuery) || filePath.includes(lowerQuery);
		});
	}

	/**
	 * Render each suggestion
	 */
	renderSuggestion(file: TFile, el: HTMLElement): void {
		el.createEl('div', { text: file.basename });
		el.createEl('small', { text: file.path, cls: 'note-selector-path' });
	}

	/**
	 * Handle selection
	 */
	onChooseSuggestion(file: TFile, evt: MouseEvent | KeyboardEvent): void {
		this.onSelect(file);
	}
}
