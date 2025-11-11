import { App, TFile, setIcon } from 'obsidian';
import { TimePeriod, CounterState, BacklinkInfo, NoteCounterResult, DisplayMode } from '../types';
import { DateRangeCalculator } from '../utils/date-range-calculator';
import { DailyNoteClassifier } from '../utils/daily-note-classifier';
import { BacklinkAnalysisService } from '../services/backlink-analysis-service';
import { NoteSelector } from './note-selector';
import { TopNRenderer } from './top-n-renderer';
import { PieRenderer } from './pie-renderer';
import { TimeSeriesRenderer, buildTimeSeriesData } from './time-series-renderer';
import { MAX_WATCHED_NOTES } from '../constants';

/**
 * Component that displays backlink count for watched notes over a selected time period
 * FEA005: Backlink Count Tracker
 * FEA009: Multiple Notes Watching
 * Supports:
 * - Single note watching (original feature)
 * - Multiple notes watching (FEA009)
 */
export class BacklinkCounterComponent {
	private container: HTMLElement;
	private app: App;
	private classifier: DailyNoteClassifier;
	private analysisService: BacklinkAnalysisService;
	private state: CounterState;
	private counterResults: NoteCounterResult[] = [];
	private topNRenderer: TopNRenderer;
	private pieRenderer: PieRenderer;
	private timeSeriesRenderer: TimeSeriesRenderer;
	private onPeriodChangeCallback?: (period: TimePeriod) => void;
	private onNoteAddedCallback?: (notePath: string) => void;
	private onNoteRemovedCallback?: (notePath: string) => void;
	private onDisplayModeChangeCallback?: (mode: DisplayMode) => void;

	constructor(
		container: HTMLElement, 
		app: App,
		classifier: DailyNoteClassifier,
		analysisService: BacklinkAnalysisService,
		onPeriodChangeCallback?: (period: TimePeriod) => void,
		onNoteAddedCallback?: (notePath: string) => void,
		onNoteRemovedCallback?: (notePath: string) => void,
		onDisplayModeChangeCallback?: (mode: DisplayMode) => void
	) {
		this.container = container;
		this.app = app;
		this.classifier = classifier;
		this.analysisService = analysisService;
		this.onPeriodChangeCallback = onPeriodChangeCallback;
		this.onNoteAddedCallback = onNoteAddedCallback;
		this.onNoteRemovedCallback = onNoteRemovedCallback;
		this.onDisplayModeChangeCallback = onDisplayModeChangeCallback;
		// Default to past 30 days and default display mode as per requirements
		this.state = { 
			selectedPeriod: TimePeriod.PAST_30_DAYS,
			displayAs: DisplayMode.DEFAULT 
		};
		// Initialize TopNRenderer with a placeholder container that will be set during render
		this.topNRenderer = new TopNRenderer(this.container);
		// Initialize PieRenderer with a placeholder container that will be set during render
		this.pieRenderer = new PieRenderer(this.container);
		// Initialize TimeSeriesRenderer with a placeholder container that will be set during render
		this.timeSeriesRenderer = new TimeSeriesRenderer(this.container);
	}

	/**
	 * Update the component with watched notes configuration
	 * Can be called with:
	 * - Single note path (legacy)
	 * - Multiple note paths
	 * - Display mode (FEA007)
	 */
	updateWatchedItems(config: { notePath?: string[]; displayAs?: DisplayMode }): void {
		this.state.notePath = config.notePath;
		if (config.displayAs !== undefined) {
			this.state.displayAs = config.displayAs;
		}
		this.updateCounts();
		this.render();
	}

	/**
	 * Update for single note (backward compatibility with Note Insights View)
	 */
	updateData(backlinks: BacklinkInfo[], noteTitle?: string, notePath?: string): void {
		// Set notePaths so updateCounts() can recalculate on period change
		if (notePath) {
			this.state.notePath = [notePath];
		}
		
		// Calculate count for single note (legacy behavior)
		const count = this.calculateCountForBacklinks(backlinks);
		this.counterResults = [{
			notePath: notePath || '',
			noteTitle: noteTitle || 'Unknown',
			count
		}];
		this.render();
	}

	/**
	 * Set the selected period
	 */
	setSelectedPeriod(period: TimePeriod): void {
		this.state.selectedPeriod = period;
		this.updateCounts();
		this.render();
	}

	/**
	 * Set the display mode (FEA007)
	 */
	setDisplayMode(mode: DisplayMode): void {
		this.state.displayAs = mode;
		this.render();
	}

	/**
	 * Clear the component
	 */
	clear(): void {
		this.counterResults = [];
		this.container.empty();
	}

	/**
	 * Add a note to the watched list (FEA009 - Add Note UI)
	 */
	addNote(notePath: string): void {
		if (this.onNoteAddedCallback) {
			this.onNoteAddedCallback(notePath);
		}
	}

	/**
	 * Remove a note from the watched list (FEA009 - Remove Note UI)
	 */
	removeNote(notePath: string): void {
		if (this.onNoteRemovedCallback) {
			this.onNoteRemovedCallback(notePath);
		}
	}

	/**
	 * Update all counter results based on current state
	 */
	private updateCounts(): void {
		this.counterResults = [];

		console.warn(this.state.notePath);

		// Handle multiple note paths
		if (this.state.notePath && this.state.notePath.length > 0) {
			if(typeof this.state.notePath === 'string'){
				this.state.notePath = [this.state.notePath];
			}
			for (const notePath of this.state.notePath) {
				const file = this.app.vault.getAbstractFileByPath(notePath);
				console.warn(file);
				if (file instanceof TFile) {
					const backlinks = this.analysisService.getBacklinksForFile(file);
					console.warn('[BacklinkCounter] Calculating count for note:', file.path, backlinks);
					const count = this.calculateCountForBacklinks(backlinks);
					this.counterResults.push({
						notePath: file.path,
						noteTitle: file.basename,
						count
					});
				}
			}
		}
	}

	/**
	 * Calculate backlink count for a set of backlinks within the selected period
	 */
	private calculateCountForBacklinks(backlinks: BacklinkInfo[]): number {
		if (backlinks.length === 0) {
			return 0;
		}

		const dateRange = DateRangeCalculator.calculateDateRange(this.state.selectedPeriod);
		let totalCount = 0;

		// DEBUG: Log date range for troubleshooting
		console.log('[BacklinkCounter] Date range:', {
			period: this.state.selectedPeriod,
			startDate: dateRange.startDate.toISOString(),
			endDate: dateRange.endDate.toISOString()
		});

		// Filter backlinks to daily notes within the date range
		for (const backlinkInfo of backlinks) {
			if (this.classifier.isDailyNote(backlinkInfo.file)) {
				const dateString = this.classifier.extractDateFromDailyNote(backlinkInfo.file);
				if (dateString) {
					const fileDate = this.parseDateString(dateString);
					if (fileDate) {
						const isInRange = fileDate >= dateRange.startDate && fileDate <= dateRange.endDate;
						// DEBUG: Log each daily note check
						console.log('[BacklinkCounter] Checking daily note:', {
							file: backlinkInfo.file.path,
							dateString,
							fileDate: fileDate.toISOString(),
							isInRange,
							linkCount: backlinkInfo.linkCount
						});
						if (isInRange) {
							totalCount += backlinkInfo.linkCount;
						}
					}
				}
			}
		}

		console.log('[BacklinkCounter] Final count:', totalCount);
		return totalCount;
	}

	/**
	 * Parse a date string in YYYY-MM-DD format to a Date object (at midnight)
	 */
	private parseDateString(dateString: string): Date | null {
		const match = dateString.match(/(\d{4})-(\d{2})-(\d{2})/);
		if (!match) {
			return null;
		}
		const [, year, month, day] = match;
		return new Date(parseInt(year), parseInt(month) - 1, parseInt(day), 0, 0, 0, 0);
	}

	/**
	 * Handle period selection change
	 */
	private onPeriodChange(newPeriod: TimePeriod): void {
		this.state.selectedPeriod = newPeriod;
		this.updateCounts();
		this.render();
		
		// Notify callback if provided
		if (this.onPeriodChangeCallback) {
			this.onPeriodChangeCallback(newPeriod);
		}
	}

	/**
	 * Handle display mode change (FEA007)
	 */
	private onDisplayModeChange(newMode: DisplayMode): void {
		this.state.displayAs = newMode;
		this.render();
		
		// Notify callback if provided
		if (this.onDisplayModeChangeCallback) {
			this.onDisplayModeChangeCallback(newMode);
		}
	}

	/**
	 * Render the component
	 */
	render(): void {
		this.container.empty();
		this.container.addClass('backlink-counter-component');

		// Render controls
		this.renderControls();

		// Render content based on display mode
		const currentDisplayMode = this.state.displayAs || DisplayMode.DEFAULT;
		if (currentDisplayMode === DisplayMode.TOP_N) {
			this.renderTopNMode();
		} else if (currentDisplayMode === DisplayMode.PIE) {
			this.renderPieMode();
		} else if (currentDisplayMode === DisplayMode.TIME_SERIES) {
			this.renderTimeSeriesMode();
		} else {
			this.renderDefaultMode();
		}
	}

	/**
	 * Render the control elements (period selector, display mode toggle, add button)
	 */
	private renderControls(): void {
		const controlsContainer = this.container.createEl('div', { cls: 'backlink-counter-controls' });
		
		// Display mode dropdown button (FEA007, FEA006)
		if (this.shouldShowDisplayModeToggle()) {
			const currentMode = this.state.displayAs || DisplayMode.DEFAULT;
			
			const toggleButton = controlsContainer.createEl('button', {
				cls: 'backlink-counter-mode-toggle',
				attr: { 
					'aria-label': this.getDisplayModeLabel(currentMode)
				}
			});

			// Use appropriate icon based on current mode
			setIcon(toggleButton, this.getDisplayModeIcon(currentMode));
			
			toggleButton.addEventListener('click', () => {
				const newMode = this.getNextDisplayMode(currentMode);
				this.onDisplayModeChange(newMode);
			});
		}

		// Period selector dropdown
		const select = controlsContainer.createEl('select', { cls: 'backlink-counter-dropdown' });

		// Add all period options
		const periods = DateRangeCalculator.getAllPeriods();
		periods.forEach(period => {
			const option = select.createEl('option', {
				text: period.label,
				value: period.value
			});
			if (period.value === this.state.selectedPeriod) {
				option.selected = true;
			}
		});

		// Handle selection changes
		select.addEventListener('change', () => {
			this.onPeriodChange(select.value as TimePeriod);
		});

		// Add Note button (only show when callbacks provided)
		if (this.onNoteAddedCallback) {
			const currentCount = this.state.notePath?.length || 0;
			const isAtLimit = currentCount >= MAX_WATCHED_NOTES;
			
			const addButton = controlsContainer.createEl('button', { 
				cls: `backlink-counter-add-button ${isAtLimit ? 'disabled' : ''}`,
				attr: { 
					'aria-label': isAtLimit 
						? `Maximum limit of ${MAX_WATCHED_NOTES} notes reached` 
						: 'Add note to watch'
				}
			});
			setIcon(addButton, 'plus');
			
			if (isAtLimit) {
				addButton.disabled = true;
			} else {
				addButton.addEventListener('click', () => this.showNoteSelector());
			}
		}
	}

	/**
	 * Check if display mode toggle should be shown
	 * Only show for multiple notes watching (FEA007 requirement)
	 */
	private shouldShowDisplayModeToggle(): boolean {
		return this.counterResults.length > 1;
	}

	/**
	 * Render default mode display (FEA007)
	 */
	private renderDefaultMode(): void {
		// Display counter results
		if (this.counterResults.length === 0) {
			// No data to display
			const emptyMessage = this.container.createEl('div', {
				cls: 'backlink-counter-empty',
				text: 'No notes being watched'
			});
		} else if (this.counterResults.length === 1) {
			// Single note display (original layout)
			const result = this.counterResults[0];
			const countContainer = this.container.createEl('div', { cls: 'backlink-counter-display' });
			
			const countNumber = countContainer.createEl('div', { 
				cls: 'backlink-counter-number',
				text: result.count.toString()
			});

			const countLabel = countContainer.createEl('div', {
				cls: 'backlink-counter-label',
				text: this.getCountLabel(result.count)
			});
		} else {
			// Multiple notes display (FEA009)
			const listContainer = this.container.createEl('div', { cls: 'backlink-counter-list' });
			
			// sort counter results by count descending
			this.counterResults.sort((a, b) => b.count - a.count);

			for (const result of this.counterResults) {
				const itemContainer = listContainer.createEl('div', { cls: 'backlink-counter-item' });
				
				const titleEl = itemContainer.createEl('div', {
					cls: 'backlink-counter-item-title',
					text: result.noteTitle
				});

				const countEl = itemContainer.createEl('div', {
					cls: 'backlink-counter-item-count',
					text: `${result.count} ${result.count === 1 ? 'backlink' : 'backlinks'}`
				});

				// Add remove button (only when callback provided)
				if (this.onNoteRemovedCallback) {
					const removeButton = itemContainer.createEl('button', {
						cls: 'backlink-counter-item-remove',
						attr: { 'aria-label': `Remove ${result.noteTitle}` }
					});
					setIcon(removeButton, 'x');
					removeButton.addEventListener('click', (e) => {
						e.stopPropagation();
						this.removeNote(result.notePath);
					});
				}
			}
		}
	}

	/**
	 * Render top-N mode display (FEA007)
	 */
	private renderTopNMode(): void {
		// Create container for top-N visualization
		const topNContainer = this.container.createEl('div', { cls: 'backlink-counter-top-n' });
		
		// Update TopNRenderer container and render
		this.topNRenderer = new TopNRenderer(topNContainer);
		const periodLabel = DateRangeCalculator.getPeriodLabel(this.state.selectedPeriod);
		this.topNRenderer.render(this.counterResults, periodLabel);
	}

	/**
	 * Render pie mode display (FEA006)
	 */
	private renderPieMode(): void {
		// Create container for pie visualization
		const pieContainer = this.container.createEl('div', { cls: 'backlink-counter-pie' });
		
		// Update PieRenderer container and render
		this.pieRenderer = new PieRenderer(pieContainer);
		const periodLabel = DateRangeCalculator.getPeriodLabel(this.state.selectedPeriod);
		this.pieRenderer.render(this.counterResults, periodLabel);
	}

	/**
	 * Render time-series mode display (FEA008)
	 */
	private renderTimeSeriesMode(): void {
		// Create container for time-series visualization
		const timeSeriesContainer = this.container.createEl('div', { cls: 'backlink-counter-time-series' });
		
		// Get time-series data for each watched note
		const dateRange = DateRangeCalculator.calculateDateRange(this.state.selectedPeriod);
		const timeSeriesData: Array<{ notePath: string; noteTitle: string; data: any }> = [];
		
		if (this.state.notePath && this.state.notePath.length > 0) {
			for (const notePath of this.state.notePath) {
				const file = this.app.vault.getAbstractFileByPath(notePath);
				if (file instanceof TFile) {
					// Get daily backlink data for this note within the period
					const backlinks = this.analysisService.getBacklinksForFile(file);
					const dailyData = this.classifier.getDailyBacklinksInRange(backlinks, dateRange.startDate, dateRange.endDate);
					
					timeSeriesData.push({
						notePath: file.path,
						noteTitle: file.basename,
						data: dailyData
					});
				}
			}
		}
		
		// Build series data and render
		const colors = [
			'#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', 
			'#ef4444', '#ec4899', '#14b8a6', '#f97316'
		];
		const seriesData = buildTimeSeriesData(timeSeriesData, colors);
		
		this.timeSeriesRenderer = new TimeSeriesRenderer(timeSeriesContainer);
		const periodLabel = DateRangeCalculator.getPeriodLabel(this.state.selectedPeriod);
		this.timeSeriesRenderer.render(seriesData, periodLabel);
	}

	/**
	 * Show note selector modal to add a note
	 */
	private showNoteSelector(): void {
		const modal = new NoteSelector(this.app, (file) => {
			this.addNote(file.path);
		});
		modal.open();
	}

	/**
	 * Get the label text for a count
	 */
	private getCountLabel(count: number): string {
		const periodLabel = DateRangeCalculator.getPeriodLabel(this.state.selectedPeriod);
		const backlinkWord = count === 1 ? 'backlink' : 'backlinks';
		return `${backlinkWord} in the ${periodLabel}`;
	}

	/**
	 * Get icon name for display mode (FEA007, FEA006, FEA008)
	 */
	private getDisplayModeIcon(mode: DisplayMode): string {
		switch (mode) {
			case DisplayMode.DEFAULT:
				return 'list';
			case DisplayMode.TOP_N:
				return 'bar-chart-2';
			case DisplayMode.PIE:
				return 'pie-chart';
			case DisplayMode.TIME_SERIES:
				return 'trending-up';
			default:
				return 'list';
		}
	}

	/**
	 * Get aria label for display mode (FEA007, FEA006, FEA008)
	 */
	private getDisplayModeLabel(mode: DisplayMode): string {
		switch (mode) {
			case DisplayMode.DEFAULT:
				return 'Switch to bar chart view';
			case DisplayMode.TOP_N:
				return 'Switch to pie chart view';
			case DisplayMode.PIE:
				return 'Switch to time-series view';
			case DisplayMode.TIME_SERIES:
				return 'Switch to list view';
			default:
				return 'Switch display mode';
		}
	}

	/**
	 * Get next display mode in cycle: default -> top-n -> pie -> time-series -> default (FEA007, FEA006, FEA008)
	 */
	private getNextDisplayMode(currentMode: DisplayMode): DisplayMode {
		switch (currentMode) {
			case DisplayMode.DEFAULT:
				return DisplayMode.TOP_N;
			case DisplayMode.TOP_N:
				return DisplayMode.PIE;
			case DisplayMode.PIE:
				return DisplayMode.TIME_SERIES;
			case DisplayMode.TIME_SERIES:
				return DisplayMode.DEFAULT;
			default:
				return DisplayMode.DEFAULT;
		}
	}
}
