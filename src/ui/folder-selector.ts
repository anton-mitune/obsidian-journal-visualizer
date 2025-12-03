import { App, SuggestModal, TFolder } from 'obsidian';

/**
 * Modal for selecting a folder from the vault
 * Similar to Obsidian's native folder picker
 * FEA009: Folder watching
 */
export class FolderSelector extends SuggestModal<TFolder> {
	private onSelect: (folder: TFolder) => void;
	private folders: TFolder[];

	constructor(app: App, onSelect: (folder: TFolder) => void) {
		super(app);
		this.onSelect = onSelect;
		
		// Get all folders in the vault (excluding root)
		this.folders = this.getAllFolders().filter(f => f.path !== '/');
		
		// Set modal title
		this.setPlaceholder('Select a folder to watch...');
	}

	/**
	 * Recursively get all folders in the vault
	 */
	private getAllFolders(): TFolder[] {
		const folders: TFolder[] = [];
		
		const traverse = (folder: TFolder) => {
			folders.push(folder);
			folder.children.forEach(child => {
				if (child instanceof TFolder) {
					traverse(child);
				}
			});
		};
		
		// Start from root
		const root = this.app.vault.getRoot();
		if (root instanceof TFolder) {
			root.children.forEach(child => {
				if (child instanceof TFolder) {
					traverse(child);
				}
			});
		}
		
		return folders;
	}

	/**
	 * Get suggestions based on user input
	 */
	getSuggestions(query: string): TFolder[] {
		if (query === '') {
			return this.folders;
		}
		
		const lowerQuery = query.toLowerCase();
		
		return this.folders.filter(folder => {
			const folderName = folder.name.toLowerCase();
			const folderPath = folder.path.toLowerCase();
			
			return folderName.includes(lowerQuery) || folderPath.includes(lowerQuery);
		});
	}

	/**
	 * Render each suggestion
	 */
	renderSuggestion(folder: TFolder, el: HTMLElement): void {
		el.createEl('div', { text: folder.name });
		el.createEl('small', { text: folder.path, cls: 'folder-selector-path' });
	}

	/**
	 * Handle selection
	 */
	onChooseSuggestion(folder: TFolder, _evt: MouseEvent | KeyboardEvent): void {
		this.onSelect(folder);
	}
}
