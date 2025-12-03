import { App, TFile, WorkspaceLeaf, Plugin } from 'obsidian';
import { BacklinkAnalysisService } from '../services/backlink-analysis-service';
import { DailyNoteBacklinkInfo, YearBounds, MonthBounds } from '../types';

/**
 * watches for note changes and triggers backlink count updates
 */
export class BacklinkWatcher {
	private app: App;
	private plugin: Plugin;
	private analysisService: BacklinkAnalysisService;
	private onNoteInfoChanged: (noteInfo: DailyNoteBacklinkInfo, yearBounds: YearBounds, monthBounds: MonthBounds) => void;
	private currentFile: TFile | null = null;
	private currentYear: number = new Date().getFullYear();
	private currentMonth: number = new Date().getMonth();
	private selectedMonthYear: number = new Date().getFullYear();
	
	// Bound event handlers to maintain reference for cleanup
	private boundHandleLeafChange: (leaf: WorkspaceLeaf | null) => void;
	private boundHandleFileOpen: (file: TFile | null) => void;

	constructor(
		app: App, 
		plugin: Plugin,
		analysisService: BacklinkAnalysisService,
		onNoteInfoChanged: (noteInfo: DailyNoteBacklinkInfo, yearBounds: YearBounds, monthBounds: MonthBounds) => void
	) {
		this.app = app;
		this.plugin = plugin;
		this.analysisService = analysisService;
		this.onNoteInfoChanged = onNoteInfoChanged;
		
		// Bind event handlers once
		this.boundHandleLeafChange = this.handleLeafChange.bind(this);
		this.boundHandleFileOpen = this.handleFileOpen.bind(this);
	}

	/**
	 * Set current year for filtering yearly data
	 */
	setCurrentYear(year: number): void {
		this.currentYear = year;
		// Re-update the current file with new year data
		if (this.currentFile) {
			this.updateBacklinkCount(this.currentFile);
		}
	}

	/**
	 * Set current month for filtering monthly data
	 */
	setCurrentMonth(month: number, year: number): void {
		this.currentMonth = month;
		this.selectedMonthYear = year;
		// Re-update the current file with new month data
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
	private handleLeafChange(): void {
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
		// Analyze the note using the centralized service
		const noteInfo = this.analysisService.analyzeNote(file, this.currentYear);
		
		// Get year and month bounds
		const yearBounds = this.analysisService.getYearBounds(file);
		const monthBounds = this.analysisService.getMonthBounds(file);

		// Notify UI component with year and month bounds
		this.onNoteInfoChanged(noteInfo, yearBounds, monthBounds);
	}
}
