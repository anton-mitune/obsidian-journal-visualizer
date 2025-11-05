import { App, TFile, WorkspaceLeaf, Plugin } from 'obsidian';
import { DailyNoteClassifier } from '../utils/daily-note-classifier';
import { BacklinkInfo, DailyNoteBacklinkInfo, YearBounds } from '../types';

/**
 * Component that watches for note changes and triggers backlink count updates
 */
export class BacklinkWatcher {
	private app: App;
	private plugin: Plugin;
	private dailyNoteClassifier: DailyNoteClassifier;
	private onNoteInfoChanged: (noteInfo: DailyNoteBacklinkInfo, yearBounds: YearBounds) => void;
	private currentFile: TFile | null = null;
	private currentYear: number = new Date().getFullYear();
	
	// Bound event handlers to maintain reference for cleanup
	private boundHandleLeafChange: (leaf: WorkspaceLeaf | null) => void;
	private boundHandleFileOpen: (file: TFile | null) => void;

	constructor(
		app: App, 
		plugin: Plugin,
		dailyNoteClassifier: DailyNoteClassifier,
		onNoteInfoChanged: (noteInfo: DailyNoteBacklinkInfo, yearBounds: YearBounds) => void
	) {
		this.app = app;
		this.plugin = plugin;
		this.dailyNoteClassifier = dailyNoteClassifier;
		this.onNoteInfoChanged = onNoteInfoChanged;
		
		// Bind event handlers once
		this.boundHandleLeafChange = this.handleLeafChange.bind(this);
		this.boundHandleFileOpen = this.handleFileOpen.bind(this);
	}

	/**
	 * Set the current year for data fetching
	 */
	setCurrentYear(year: number): void {
		this.currentYear = year;
		// Re-update the current file with new year data
		if (this.currentFile) {
			this.updateBacklinkCount(this.currentFile);
		}
	}

	/**
	 * Start watching for file changes that should trigger backlink count updates
	 */
	startWatching(): void {
		// Use plugin's registerEvent for proper cleanup
		this.plugin.registerEvent(
			this.app.workspace.on('active-leaf-change', this.boundHandleLeafChange)
		);
		this.plugin.registerEvent(
			this.app.workspace.on('file-open', this.boundHandleFileOpen)
		);
		
		// Initial calculation for currently open file
		this.updateBacklinkCountForCurrentFile();
	}

	/**
	 * Stop watching for changes (cleanup is automatic via plugin.registerEvent)
	 */
	stopWatching(): void {
		// Cleanup is handled automatically by plugin.registerEvent
		// This method is kept for API compatibility
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

		// Get yearly daily note backlink data for the selected year
		const yearlyData = this.dailyNoteClassifier.getYearlyDailyNoteBacklinks(backlinks, this.currentYear);

		// Calculate year bounds based on available daily notes
		const yearBounds = this.dailyNoteClassifier.getYearBounds(backlinks);

		// Create note info object
		const noteInfo: DailyNoteBacklinkInfo = {
			count: count,
			noteTitle: file.basename,
			yearlyData: yearlyData
		};

		// Notify UI component with year bounds
		this.onNoteInfoChanged(noteInfo, yearBounds);
	}

	/**
	 * Get all files that link to the specified file with their link counts
	 */
	private getBacklinksForFile(file: TFile): BacklinkInfo[] {
		const backlinks: BacklinkInfo[] = [];
		const resolvedLinks = this.app.metadataCache.resolvedLinks;
		
		// Iterate through all files to find those that link to our target file
		for (const sourcePath in resolvedLinks) {
			const links = resolvedLinks[sourcePath];
			if (links && links[file.path]) {
				const sourceFile = this.app.vault.getAbstractFileByPath(sourcePath);
				if (sourceFile instanceof TFile) {
					backlinks.push({
						file: sourceFile,
						linkCount: links[file.path]
					});
				}
			}
		}
		
		return backlinks;
	}
}
