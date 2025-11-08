import { TimePeriod, CounterState, BacklinkInfo } from '../types';
import { DateRangeCalculator } from '../utils/date-range-calculator';
import { DailyNoteClassifier } from '../utils/daily-note-classifier';

/**
 * Component that displays backlink count for a watched note over a selected time period
 * FEA005: Backlink Count Tracker
 */
export class BacklinkCounterComponent {
	private container: HTMLElement;
	private classifier: DailyNoteClassifier;
	private state: CounterState;
	private backlinks: BacklinkInfo[] = [];
	private currentCount: number = 0;
	private onPeriodChangeCallback?: (period: TimePeriod) => void;

	constructor(container: HTMLElement, classifier: DailyNoteClassifier, onPeriodChangeCallback?: (period: TimePeriod) => void) {
		this.container = container;
		this.classifier = classifier;
		this.onPeriodChangeCallback = onPeriodChangeCallback;
		// Default to past 30 days as per requirements
		this.state = { selectedPeriod: TimePeriod.PAST_30_DAYS };
	}

	/**
	 * Update the component with new backlink data
	 */
	updateData(backlinks: BacklinkInfo[]): void {
		this.backlinks = backlinks;
		this.updateCount();
		this.render();
	}

	/**
	 * Set the selected period
	 */
	setSelectedPeriod(period: TimePeriod): void {
		this.state.selectedPeriod = period;
		this.updateCount();
		this.render();
	}

	/**
	 * Clear the component
	 */
	clear(): void {
		this.backlinks = [];
		this.currentCount = 0;
		this.container.empty();
	}

	/**
	 * Update the backlink count based on current state
	 */
	private updateCount(): void {
		if (this.backlinks.length === 0) {
			this.currentCount = 0;
			return;
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
		for (const backlinkInfo of this.backlinks) {
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
		this.currentCount = totalCount;
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
		this.updateCount();
		this.render();
		
		// Notify callback if provided
		if (this.onPeriodChangeCallback) {
			this.onPeriodChangeCallback(newPeriod);
		}
	}

	/**
	 * Render the component
	 */
	render(): void {
		this.container.empty();
		this.container.addClass('backlink-counter-component');

		// Period selector dropdown
		const selectorContainer = this.container.createEl('div', { cls: 'backlink-counter-selector' });
		const select = selectorContainer.createEl('select', { cls: 'backlink-counter-dropdown' });

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

		// Count display
		const countContainer = this.container.createEl('div', { cls: 'backlink-counter-display' });
		
		const countNumber = countContainer.createEl('div', { 
			cls: 'backlink-counter-number',
			text: this.currentCount.toString()
		});

		const countLabel = countContainer.createEl('div', {
			cls: 'backlink-counter-label',
			text: this.getCountLabel()
		});
	}

	/**
	 * Get the label text for the current count
	 */
	private getCountLabel(): string {
		const periodLabel = DateRangeCalculator.getPeriodLabel(this.state.selectedPeriod);
		const backlinkWord = this.currentCount === 1 ? 'backlink' : 'backlinks';
		return `${backlinkWord} in the ${periodLabel}`;
	}
}
