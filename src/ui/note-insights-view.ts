import { ItemView, WorkspaceLeaf, TFile } from 'obsidian';
import { DailyNoteBacklinkInfo } from '../types';
import { YearlyTrackerComponent } from './yearly-tracker-component';

export const NOTE_INSIGHTS_VIEW_TYPE = 'note-insights-view';

/**
 * Custom view that displays insights about the currently active note
 * This replaces the DOM manipulation approach with proper Obsidian view API
 */
export class NoteInsightsView extends ItemView {
	private currentNoteInfo: DailyNoteBacklinkInfo | null = null;
	private yearlyTracker: YearlyTrackerComponent | null = null;

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
	updateNoteInfo(noteInfo: DailyNoteBacklinkInfo): void {
		this.currentNoteInfo = noteInfo;
		this.render();
	}

	/**
	 * Clear the view when no note is active
	 */
	clearNoteInfo(): void {
		this.currentNoteInfo = null;
		if (this.yearlyTracker) {
			this.yearlyTracker.clear();
		}
		this.render();
	}

	/**
	 * Render the view content
	 */
	private render(): void {
		const container = this.containerEl;
		container.empty();

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

		// Daily notes count section
		const countSection = container.createEl('div', { cls: 'note-insights-section' });
		countSection.createEl('div', {
			text: 'Daily notes (this month)',
			cls: 'note-insights-label'
		});
		
		const countDisplay = countSection.createEl('div', { cls: 'note-insights-count-display' });
		const countValue = countDisplay.createEl('span', {
			text: this.currentNoteInfo.count.toString(),
			cls: 'note-insights-count-value'
		});

		// Apply styling based on count
		if (this.currentNoteInfo.count === 0) {
			countValue.addClass('note-insights-count-zero');
		} else if (this.currentNoteInfo.count >= 5) {
			countValue.addClass('note-insights-count-high');
		}

		const countLabel = countDisplay.createEl('span', {
			text: this.currentNoteInfo.count === 1 ? ' link' : ' links',
			cls: 'note-insights-count-label'
		});

		// Add description for context
		const description = countSection.createEl('div', {
			text: 'Number of distinct daily notes from this month that link to this note',
			cls: 'note-insights-description'
		});

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
			this.yearlyTracker = new YearlyTrackerComponent(trackerContainer);
			this.yearlyTracker.updateData(this.currentNoteInfo.yearlyData);
		}
	}

	async onOpen(): Promise<void> {
		this.render();
	}

	async onClose(): Promise<void> {
		// Cleanup when view is closed
		this.currentNoteInfo = null;
		this.yearlyTracker = null;
	}
}
