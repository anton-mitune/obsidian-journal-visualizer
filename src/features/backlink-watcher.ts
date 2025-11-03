import { App, TFile, WorkspaceLeaf } from 'obsidian';
import { DailyNoteClassifier } from '../utils/daily-note-classifier';

/**
 * Component that watches for note changes and triggers backlink count updates
 */
export class BacklinkWatcher {
	private app: App;
	private dailyNoteClassifier: DailyNoteClassifier;
	private onBacklinkCountChanged: (count: number, noteTitle: string) => void;
	private currentFile: TFile | null = null;

	constructor(
		app: App, 
		dailyNoteClassifier: DailyNoteClassifier,
		onBacklinkCountChanged: (count: number, noteTitle: string) => void
	) {
		this.app = app;
		this.dailyNoteClassifier = dailyNoteClassifier;
		this.onBacklinkCountChanged = onBacklinkCountChanged;
	}

	/**
	 * Start watching for file changes that should trigger backlink count updates
	 */
	startWatching(): void {
		// Watch for active file changes
		this.app.workspace.on('active-leaf-change', this.handleLeafChange.bind(this));
		this.app.workspace.on('file-open', this.handleFileOpen.bind(this));
		
		// Initial calculation for currently open file
		this.updateBacklinkCountForCurrentFile();
	}

	/**
	 * Stop watching for changes
	 */
	stopWatching(): void {
		this.app.workspace.off('active-leaf-change', this.handleLeafChange.bind(this));
		this.app.workspace.off('file-open', this.handleFileOpen.bind(this));
	}

	/**
	 * Handle workspace leaf changes
	 */
	private handleLeafChange(leaf: WorkspaceLeaf | null): void {
		this.updateBacklinkCountForCurrentFile();
	}

	/**
	 * Handle file open events
	 */
	private handleFileOpen(file: TFile | null): void {
		if (file && file !== this.currentFile) {
			this.currentFile = file;
			this.updateBacklinkCount(file);
		}
	}

	/**
	 * Update backlink count for the currently active file
	 */
	private updateBacklinkCountForCurrentFile(): void {
		const activeFile = this.app.workspace.getActiveFile();
		if (activeFile && activeFile !== this.currentFile) {
			this.currentFile = activeFile;
			this.updateBacklinkCount(activeFile);
		}
	}

	/**
	 * Calculate and update the daily note backlink count for a specific file
	 */
	private updateBacklinkCount(file: TFile): void {
		// Get backlinks for the current file
		const backlinks = this.getBacklinksForFile(file);
		
		// Count daily note backlinks from current month
		const count = this.dailyNoteClassifier.countCurrentMonthDailyNoteBacklinks(backlinks);
		
		// Notify UI component
		this.onBacklinkCountChanged(count, file.basename);
	}

	/**
	 * Get all files that link to the specified file
	 */
	private getBacklinksForFile(file: TFile): TFile[] {
		const backlinks: TFile[] = [];
		const resolvedLinks = this.app.metadataCache.resolvedLinks;
		
		// Iterate through all files to find those that link to our target file
		for (const sourcePath in resolvedLinks) {
			const links = resolvedLinks[sourcePath];
			if (links && links[file.path]) {
				const sourceFile = this.app.vault.getAbstractFileByPath(sourcePath);
				if (sourceFile instanceof TFile) {
					backlinks.push(sourceFile);
				}
			}
		}
		
		return backlinks;
	}
}
