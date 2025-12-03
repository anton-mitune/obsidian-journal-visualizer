import { App } from 'obsidian';
import { DailyNoteYearlyData, DailyNoteBacklinkSummary, YearNavigationState, YearBounds } from '../types';
import { DailyNoteClassifier } from '../utils/daily-note-classifier';

/**
 * Component that renders a yearly tracker (git-style grid) showing daily note backlinks
 * Similar to GitHub contribution graph or Anilist activity tracker
 */
export class YearlyTrackerComponent {
	private app: App;
	private container: HTMLElement;
	private yearlyData: DailyNoteYearlyData;
	private maxIntensity: number = 5; // Cap intensity at 5 backlinks for consistent coloring
	private navigationState: YearNavigationState;
	private yearBounds: YearBounds;
	private onYearChangeCallback?: (year: number) => void;
	private watchedNotePath: string | null = null;

	constructor(app: App, container: HTMLElement, onYearChange?: (year: number) => void) {
		this.app = app;
		this.container = container;
		this.yearlyData = {};
		this.onYearChangeCallback = onYearChange;
		
		// Initialize with current year
		const currentYear = new Date().getFullYear();
		this.navigationState = {
			currentYear,
			minYear: currentYear - 10, // Default reasonable bounds
			maxYear: currentYear + 1
		};
		this.yearBounds = {
			minYear: currentYear - 10,
			maxYear: currentYear + 1
		};
	}

	/**
	 * Update the tracker with new yearly data
	 */
	updateData(yearlyData: DailyNoteYearlyData, watchedNotePath?: string): void {
		this.yearlyData = yearlyData;
		if (watchedNotePath !== undefined) {
			this.watchedNotePath = watchedNotePath;
		}
		this.render();
	}

	/**
	 * Set the watched note path
	 */
	setWatchedNotePath(path: string): void {
		this.watchedNotePath = path;
	}

	/**
	 * Set year bounds based on available data
	 */
	setYearBounds(bounds: YearBounds): void {
		this.yearBounds = bounds;
		this.navigationState.minYear = bounds.minYear;
		this.navigationState.maxYear = bounds.maxYear;
		
		// Ensure current year is within bounds
		if (this.navigationState.currentYear < bounds.minYear) {
			this.navigationState.currentYear = bounds.minYear;
		} else if (this.navigationState.currentYear > bounds.maxYear) {
			this.navigationState.currentYear = bounds.maxYear;
		}
		
		this.render();
	}

	/**
	 * Set the current year to display
	 */
	setCurrentYear(year: number): void {
		if (year < this.yearBounds.minYear || year > this.yearBounds.maxYear) {
			return; // Invalid year
		}
		
		this.navigationState.currentYear = year;
		this.render();
		
		// Notify callback if provided
		if (this.onYearChangeCallback) {
			this.onYearChangeCallback(year);
		}
	}

	/**
	 * Get the current year being displayed
	 */
	getCurrentYear(): number {
		return this.navigationState.currentYear;
	}

	/**
	 * Clear the tracker
	 */
	clear(): void {
		this.yearlyData = {};
		this.render();
	}

	/**
	 * Render the yearly tracker grid
	 */
	private render(): void {
		this.container.empty();

		// Create tracker container
		const trackerContainer = this.container.createEl('div', { cls: 'yearly-tracker-container' });


		// Create watched note title header if available (FEA002 Requirement 4)
		if (this.watchedNotePath) {
			this.createNoteHeader(trackerContainer);
		}

		// Create header with year navigation
		this.createHeader(trackerContainer);

		// Create grid container
		const gridContainer = trackerContainer.createEl('div', { cls: 'yearly-tracker-grid' });

		// Generate all days for selected year
		const selectedYear = this.navigationState.currentYear;
		const days = this.generateYearDays(selectedYear);

		// Create month labels
		this.createMonthLabels(gridContainer, selectedYear);

		// Create day grid
		const dayGrid = gridContainer.createEl('div', { cls: 'yearly-tracker-days' });
		
		// Create weekday labels
		this.createWeekdayLabels(dayGrid);

		// Create day squares
		this.createDaySquares(dayGrid, days);

		// Create legend
		this.createLegend(trackerContainer);
	}

	/**
	 * Create note header with clickable title
	 * FEA002 Requirement 4: Click on note title to open the watched note
	 */
	private createNoteHeader(container: HTMLElement): void {
		const noteHeader = container.createEl('div', { cls: 'yearly-tracker-note-header' });
		
		// Get note name from path
		const noteName = this.watchedNotePath?.split('/').pop()?.replace('.md', '') || 'Unknown Note';
		
		const noteTitle = noteHeader.createEl('h4', {
			text: noteName,
			cls: 'yearly-tracker-note-title'
		});

		// Make title clickable
		noteTitle.addEventListener('click', async () => {
			if (this.watchedNotePath) {
				const file = this.app.vault.getAbstractFileByPath(this.watchedNotePath);
				if (file) {
					await this.app.workspace.getLeaf(false).openFile(file as any);
				}
			}
		});
	}

	/**
	 * Create header with title and year navigation controls
	 */
	private createHeader(container: HTMLElement): void {
		const header = container.createEl('div', { cls: 'yearly-tracker-header' });
		
		// Title
		header.createEl('div', {
			text: 'Daily note backlinks',
			cls: 'yearly-tracker-title'
		});

		// Year navigation controls
		const yearNav = header.createEl('div', { cls: 'yearly-tracker-year-nav' });
		
		// Previous year button
		const prevButton = yearNav.createEl('button', {
			text: '‹',
			cls: 'yearly-tracker-year-btn yearly-tracker-year-prev'
		});
		prevButton.disabled = this.navigationState.currentYear <= this.yearBounds.minYear;
		prevButton.addEventListener('click', () => {
			if (this.navigationState.currentYear > this.yearBounds.minYear) {
				this.setCurrentYear(this.navigationState.currentYear - 1);
			}
		});

		// Current year display
		yearNav.createEl('span', {
			text: this.navigationState.currentYear.toString(),
			cls: 'yearly-tracker-current-year'
		});

		// Next year button
		const nextButton = yearNav.createEl('button', {
			text: '›',
			cls: 'yearly-tracker-year-btn yearly-tracker-year-next'
		});
		nextButton.disabled = this.navigationState.currentYear >= this.yearBounds.maxYear;
		nextButton.addEventListener('click', () => {
			if (this.navigationState.currentYear < this.yearBounds.maxYear) {
				this.setCurrentYear(this.navigationState.currentYear + 1);
			}
		});
	}





	/**
	 * Generate all days for the given year
	 */
	private generateYearDays(year: number): Date[] {
		const days: Date[] = [];
		const startDate = new Date(year, 0, 1); // January 1st
		const endDate = new Date(year, 11, 31); // December 31st

		for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
			days.push(new Date(date));
		}

		return days;
	}

	/**
	 * Create month labels above the grid
	 */
	private createMonthLabels(container: HTMLElement, year: number): void {
		const monthsContainer = container.createEl('div', { cls: 'yearly-tracker-months' });
		
		const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
		              'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
		
		months.forEach(month => {
			monthsContainer.createEl('div', {
				text: month,
				cls: 'yearly-tracker-month-label'
			});
		});
	}

	/**
	 * Create weekday labels on the left side
	 */
	private createWeekdayLabels(container: HTMLElement): void {
		const weekdaysContainer = container.createEl('div', { cls: 'yearly-tracker-weekdays' });
		
		const weekdays = ['', 'Mon', '', 'Wed', '', 'Fri', ''];
		
		weekdays.forEach(day => {
			weekdaysContainer.createEl('div', {
				text: day,
				cls: 'yearly-tracker-weekday-label'
			});
		});
	}

	/**
	 * Create the day squares grid
	 */
	private createDaySquares(container: HTMLElement, days: Date[]): void {
		const squaresContainer = container.createEl('div', { cls: 'yearly-tracker-squares' });

		// Calculate weeks and create columns
		const startDate = days[0];
		const startWeekday = startDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
		// Adjust to make Monday = 0
		const adjustedStartWeekday = (startWeekday + 6) % 7;

		// Create empty squares for days before the year starts
		for (let i = 0; i < adjustedStartWeekday; i++) {
			squaresContainer.createEl('div', { cls: 'yearly-tracker-square yearly-tracker-square-empty' });
		}

		// Create squares for each day
		days.forEach(date => {
			const dateString = this.formatDateString(date);
			const summary: DailyNoteBacklinkSummary = this.yearlyData[dateString] || { linkCount: 0 };
			const intensity = this.calculateIntensity(summary.linkCount);

			const square = squaresContainer.createEl('div', { 
				cls: `yearly-tracker-square yearly-tracker-square-intensity-${intensity}` 
			});

			// Add tooltip with summary
			this.addTooltip(square, date, summary);
		});
	}

	/**
	 * Create intensity legend
	 */
	private createLegend(container: HTMLElement): void {
		const legendContainer = container.createEl('div', { cls: 'yearly-tracker-legend' });
		
		legendContainer.createEl('span', {
			text: 'Less',
			cls: 'yearly-tracker-legend-label'
		});

		// Create intensity squares
		for (let i = 0; i <= 4; i++) {
			legendContainer.createEl('div', {
				cls: `yearly-tracker-square yearly-tracker-square-intensity-${i} yearly-tracker-legend-square`
			});
		}

		legendContainer.createEl('span', {
			text: 'More',
			cls: 'yearly-tracker-legend-label'
		});
	}

	/**
	 * Format date as YYYY-MM-DD string
	 */
	private formatDateString(date: Date): string {
		const year = date.getFullYear();
		const month = String(date.getMonth() + 1).padStart(2, '0');
		const day = String(date.getDate()).padStart(2, '0');
		return `${year}-${month}-${day}`;
	}

	/**
	 * Calculate intensity level (0-4) based on link count
	 */
	private calculateIntensity(linkCount: number): number {
		if (linkCount === 0) return 0;
		if (linkCount === 1) return 1;
		if (linkCount === 2) return 2;
		if (linkCount <= 4) return 3;
		return 4; // 5+ links get max intensity
	}

	/**
	 * Add tooltip to a day square
	 */
	/**
	 * Add hover interactions to a day square
	 */
	private addTooltip(element: HTMLElement, date: Date, summary: DailyNoteBacklinkSummary): void {
		// Keep aria-label for accessibility
		const dateString = date.toLocaleDateString('en-GB', {
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		});

		let ariaText: string;
		if (summary.linkCount === 0) {
			ariaText = `No backlinks on ${dateString}`;
		} else {
			ariaText = `${summary.linkCount} backlink${summary.linkCount > 1 ? 's' : ''} on ${dateString}`;
		}
		element.setAttribute('aria-label', ariaText);

		// FEA002 Requirement 5: Make days with backlinks clickable
		if (summary.linkCount > 0) {
			element.addClass('yearly-tracker-square-clickable');
			element.addEventListener('click', async () => {
				await this.openDailyNote(date);
			});
		}

	}

	/**
	 * Open the daily note for a specific date
	 * FEA002 Requirement 5: Click on day to open corresponding daily note
	 */
	private async openDailyNote(date: Date): Promise<void> {
		const classifier = new DailyNoteClassifier(this.app);
		const file = classifier.findDailyNote(date);
		
		if (file) {
			await this.app.workspace.getLeaf(false).openFile(file);
		}
	}
}
