import { ItemView, WorkspaceLeaf, TFile } from 'obsidian';
import { DailyNoteBacklinkInfo, YearBounds, MonthBounds } from '../types';
import { YearlyTrackerComponent } from './yearly-tracker-component';
import { MonthlyTrackerComponent } from './monthly-tracker-component';
import { BacklinkCounterComponent } from './backlink-counter-component';
import { DailyNoteClassifier } from '../utils/daily-note-classifier';
import { BacklinkAnalysisService } from '../services/backlink-analysis-service';
import { SettingsService } from '../services/settings-service';
import { logger } from '../utils/logger';

export const NOTE_INSIGHTS_VIEW_TYPE = 'note-insights-view';

/**
 * Custom view that displays insights about the currently active note
 * This replaces the DOM manipulation approach with proper Obsidian view API
 */
export class NoteInsightsView extends ItemView {
	private currentNoteInfo: DailyNoteBacklinkInfo | null = null;
	private yearlyTracker: YearlyTrackerComponent | null = null;
	private monthlyTracker: MonthlyTrackerComponent | null = null;
	private backlinkCounter: BacklinkCounterComponent | null = null;
	private yearBounds: YearBounds | null = null;
	private monthBounds: MonthBounds | null = null;
	private onYearChangeCallback?: (year: number) => void;
	private onMonthChangeCallback?: (month: number, year: number) => void;
	private classifier: DailyNoteClassifier;
	private analysisService: BacklinkAnalysisService | null = null;
	private settingsService: SettingsService | null = null;

	constructor(leaf: WorkspaceLeaf) {
		super(leaf);
		this.classifier = new DailyNoteClassifier(this.app);
	}

	/**
	 * Set the analysis service (called by ViewManager)
	 */
	setAnalysisService(service: BacklinkAnalysisService): void {
		this.analysisService = service;
		// If view is already open, load the current active note
		if (this.containerEl.isShown()) {
			this.loadCurrentActiveNote();
		}
	}

	/**
	 * Set the settings service (called by ViewManager)
	 * FEA010: Plugin Settings
	 */
	setSettingsService(service: SettingsService): void {
		this.settingsService = service;
	}

	getViewType(): string {
		return NOTE_INSIGHTS_VIEW_TYPE;
	}

	getDisplayText(): string {
		return 'Note insights';
	}

	getIcon(): string {
		return 'bar-chart-3';
	}

	/**
	 * Update the view with new daily note backlink information
	 */
	updateNoteInfo(noteInfo: DailyNoteBacklinkInfo, yearBounds?: YearBounds, monthBounds?: MonthBounds): void {
		this.currentNoteInfo = noteInfo;
		if (yearBounds) {
			this.yearBounds = yearBounds;
		}
		if (monthBounds) {
			this.monthBounds = monthBounds;
		}
		this.render();
	}

	/**
	 * Set the callback for when year changes in the yearly tracker
	 */
	setOnYearChangeCallback(callback: (year: number) => void): void {
		this.onYearChangeCallback = callback;
	}

	/**
	 * Set the callback for when month changes in the monthly tracker
	 */
	setOnMonthChangeCallback(callback: (month: number, year: number) => void): void {
		this.onMonthChangeCallback = callback;
	}

	/**
	 * Clear the view when no note is active
	 */
	clearNoteInfo(): void {
		this.currentNoteInfo = null;
		if (this.yearlyTracker) {
			this.yearlyTracker.clear();
		}
		if (this.monthlyTracker) {
			this.monthlyTracker.clear();
		}
		if (this.backlinkCounter) {
			this.backlinkCounter.clear();
		}
		this.render();
	}

	/**
	 * Render the view content
	 */
	private render(): void {
		const container = this.containerEl;
		container.empty();
		container.addClass('note-insights-view');

		// Add view header
		const header = container.createEl('div', { cls: 'note-insights-header' });
		header.createEl('h3', { 
			text: 'Note insights',
			cls: 'note-insights-title'
		});

		// Create content area
		const content = container.createEl('div', { cls: 'note-insights-content' });

		if (!this.currentNoteInfo) {
			// Show empty state
			this.renderEmptyState(content);
		} else {
			// Show note insights
			this.renderNoteInsights(content);
		}
	}

	/**
	 * Render empty state when no note is active
	 */
	private renderEmptyState(container: HTMLElement): void {
		const emptyState = container.createEl('div', { cls: 'note-insights-empty' });
		emptyState.createEl('p', {
			text: 'Open a note to see insights',
			cls: 'note-insights-empty-text'
		});
	}

	/**
	 * Render the note insights content
	 */
	private renderNoteInsights(container: HTMLElement): void {
		if (!this.currentNoteInfo) return;

		// Note title section
		const titleSection = container.createEl('div', { cls: 'note-insights-section' });
		titleSection.createEl('div', { 
			text: 'Active note',
			cls: 'note-insights-label'
		});
		titleSection.createEl('div', {
			text: this.currentNoteInfo.noteTitle,
			cls: 'note-insights-note-title'
		});

		// counter section (FEA005)
		const counterSection = container.createEl('div', { cls: 'note-insights-section' });
		counterSection.createEl('div', {
			text: 'counter',
			cls: 'note-insights-label'
		});
		
		// Only create counter if we have analysisService and settingsService
		if (this.analysisService && this.settingsService) {
			// Create counter container
			const counterContainer = counterSection.createEl('div', { cls: 'note-insights-backlink-counter' });
			// Create counter component (no callbacks needed for view panel - it doesn't persist or allow editing)
			this.backlinkCounter = new BacklinkCounterComponent(
				counterContainer, 
				this.app,
				this.classifier, 
				this.analysisService,
				this.settingsService
				// No callbacks - view panel is read-only display
			);
			// Get backlinks for current note and update
			const activeFile = this.app.workspace.getActiveFile();
			if (activeFile) {
				const backlinks = this.analysisService.getBacklinksForFile(activeFile);
				logger.log('[NoteInsightsView] Counter - updating with backlinks:', backlinks.length);
				this.backlinkCounter.updateData(backlinks, activeFile.basename, activeFile.path);
			} else {
				logger.warn('[NoteInsightsView] Counter - no active file');
			}
		} else {
			logger.error('[NoteInsightsView] Counter - analysisService is null! Cannot create counter.');
			counterSection.createEl('div', {
				text: 'Counter unavailable (service not initialized)',
				cls: 'note-insights-error'
			});
		}

		// Monthly tracker section
		if (this.currentNoteInfo.yearlyData) {
			const monthlySection = container.createEl('div', { cls: 'note-insights-section' });
			monthlySection.createEl('div', {
				text: 'Monthly tracker',
				cls: 'note-insights-label'
			});
			// Create monthly tracker container
			const monthlyTrackerContainer = monthlySection.createEl('div', { cls: 'note-insights-monthly-tracker' });
			// Always create a new tracker for each note
			this.monthlyTracker = new MonthlyTrackerComponent(monthlyTrackerContainer, this.onMonthChangeCallback);
			this.monthlyTracker.updateData(this.currentNoteInfo.yearlyData);
			
			// Set month bounds if available
			if (this.monthBounds) {
				this.monthlyTracker.setMonthBounds(this.monthBounds);
			}
		}

		// Yearly tracker section
		if (this.currentNoteInfo.yearlyData) {
			const yearlySection = container.createEl('div', { cls: 'note-insights-section' });
			yearlySection.createEl('div', {
				text: 'Yearly tracker',
				cls: 'note-insights-label'
			});
			// Create yearly tracker container
			const trackerContainer = yearlySection.createEl('div', { cls: 'note-insights-yearly-tracker' });
			// Always create a new tracker for each note
			this.yearlyTracker = new YearlyTrackerComponent(trackerContainer, this.onYearChangeCallback);
			this.yearlyTracker.updateData(this.currentNoteInfo.yearlyData);
			
			// Set year bounds if available
			if (this.yearBounds) {
				this.yearlyTracker.setYearBounds(this.yearBounds);
			}
		}
	}

	async onOpen(): Promise<void> {
		// When view opens, try to load the current active note
		this.loadCurrentActiveNote();
		this.render();
	}

	/**
	 * Load and display insights for the currently active note
	 */
	private loadCurrentActiveNote(): void {
		if (!this.analysisService) {
			// Analysis service not yet set, will be loaded when it's set
			return;
		}

		const activeFile = this.app.workspace.getActiveFile();
		if (!activeFile) {
			// No active file, show empty state
			this.clearNoteInfo();
			return;
		}

		// Analyze the current active note
		const noteInfo = this.analysisService.analyzeNote(activeFile);
		const yearBounds = this.analysisService.getYearBounds(activeFile);
		const monthBounds = this.analysisService.getMonthBounds(activeFile);

		// Update the view with the current note's data
		this.updateNoteInfo(noteInfo, yearBounds, monthBounds);
	}

	async onClose(): Promise<void> {
		// Cleanup when view is closed
		this.currentNoteInfo = null;
		this.yearlyTracker = null;
		this.monthlyTracker = null;
		this.backlinkCounter = null;
	}
}
