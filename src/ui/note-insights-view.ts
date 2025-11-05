import { ItemView, WorkspaceLeaf, TFile } from 'obsidian';
import { DailyNoteBacklinkInfo, YearBounds } from '../types';
import { YearlyTrackerComponent } from './yearly-tracker-component';
import { MonthlyTrackerComponent } from './monthly-tracker-component';

export const NOTE_INSIGHTS_VIEW_TYPE = 'note-insights-view';

/**
 * Custom view that displays insights about the currently active note
 * This replaces the DOM manipulation approach with proper Obsidian view API
 */
export class NoteInsightsView extends ItemView {
	private currentNoteInfo: DailyNoteBacklinkInfo | null = null;
	private yearlyTracker: YearlyTrackerComponent | null = null;
	private monthlyTracker: MonthlyTrackerComponent | null = null;
	private yearBounds: YearBounds | null = null;
	private onYearChangeCallback?: (year: number) => void;

	constructor(leaf: WorkspaceLeaf) {
		super(leaf);
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
	updateNoteInfo(noteInfo: DailyNoteBacklinkInfo, yearBounds?: YearBounds): void {
		this.currentNoteInfo = noteInfo;
		if (yearBounds) {
			this.yearBounds = yearBounds;
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
			this.monthlyTracker = new MonthlyTrackerComponent(monthlyTrackerContainer);
			this.monthlyTracker.updateData(this.currentNoteInfo.yearlyData);
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
		this.render();
	}

	async onClose(): Promise<void> {
		// Cleanup when view is closed
		this.currentNoteInfo = null;
		this.yearlyTracker = null;
		this.monthlyTracker = null;
	}
}
