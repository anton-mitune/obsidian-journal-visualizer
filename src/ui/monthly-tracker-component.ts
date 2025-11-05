import { DailyNoteYearlyData, DailyNoteBacklinkSummary, MonthNavigationState, MonthBounds } from '../types';

/**
 * Component that renders a monthly tracker showing daily note backlinks for a selected month
 * Similar to YearlyTrackerComponent but focused on monthly view with month navigation
 */
export class MonthlyTrackerComponent {
	private container: HTMLElement;
	private yearlyData: DailyNoteYearlyData;
	private maxIntensity: number = 5; // Cap intensity at 5 backlinks for consistent coloring
	private navigationState: MonthNavigationState;
	private monthBounds: MonthBounds;
	private onMonthChangeCallback?: (month: number, year: number) => void;

	constructor(container: HTMLElement, onMonthChange?: (month: number, year: number) => void) {
		this.container = container;
		this.yearlyData = {};
		this.onMonthChangeCallback = onMonthChange;
		
		// Initialize with current month/year
		const currentDate = new Date();
		const currentMonth = currentDate.getMonth();
		const currentYear = currentDate.getFullYear();
		
		this.navigationState = {
			currentMonth,
			currentYear,
			minMonth: currentMonth,
			minYear: currentYear - 10, // Default reasonable bounds
			maxMonth: currentMonth,
			maxYear: currentYear + 1
		};
		
		this.monthBounds = {
			minMonth: currentMonth,
			minYear: currentYear - 10,
			maxMonth: currentMonth,
			maxYear: currentYear + 1
		};
	}

	/**
	 * Update the tracker with new yearly data (we'll filter to selected month)
	 */
	updateData(yearlyData: DailyNoteYearlyData): void {
		this.yearlyData = yearlyData;
		this.render();
	}

	/**
	 * Set month bounds based on available data
	 */
	setMonthBounds(bounds: MonthBounds): void {
		this.monthBounds = bounds;
		this.navigationState.minMonth = bounds.minMonth;
		this.navigationState.minYear = bounds.minYear;
		this.navigationState.maxMonth = bounds.maxMonth;
		this.navigationState.maxYear = bounds.maxYear;
		
		// Ensure current month is within bounds
		if (this.isMonthBefore(this.navigationState.currentMonth, this.navigationState.currentYear, bounds.minMonth, bounds.minYear)) {
			this.navigationState.currentMonth = bounds.minMonth;
			this.navigationState.currentYear = bounds.minYear;
		} else if (this.isMonthAfter(this.navigationState.currentMonth, this.navigationState.currentYear, bounds.maxMonth, bounds.maxYear)) {
			this.navigationState.currentMonth = bounds.maxMonth;
			this.navigationState.currentYear = bounds.maxYear;
		}
		
		this.render();
	}

	/**
	 * Set the current month/year to display
	 */
	setCurrentMonth(month: number, year: number): void {
		if (this.isMonthBefore(month, year, this.monthBounds.minMonth, this.monthBounds.minYear) ||
			this.isMonthAfter(month, year, this.monthBounds.maxMonth, this.monthBounds.maxYear)) {
			return; // Invalid month/year
		}
		
		this.navigationState.currentMonth = month;
		this.navigationState.currentYear = year;
		this.render();
		
		// Notify callback if provided
		if (this.onMonthChangeCallback) {
			this.onMonthChangeCallback(month, year);
		}
	}

	/**
	 * Get the current month/year being displayed
	 */
	getCurrentMonth(): { month: number; year: number } {
		return {
			month: this.navigationState.currentMonth,
			year: this.navigationState.currentYear
		};
	}

	/**
	 * Navigate to previous month
	 */
	goToPreviousMonth(): void {
		let newMonth = this.navigationState.currentMonth - 1;
		let newYear = this.navigationState.currentYear;
		
		if (newMonth < 0) {
			newMonth = 11;
			newYear--;
		}
		
		this.setCurrentMonth(newMonth, newYear);
	}

	/**
	 * Navigate to next month
	 */
	goToNextMonth(): void {
		let newMonth = this.navigationState.currentMonth + 1;
		let newYear = this.navigationState.currentYear;
		
		if (newMonth > 11) {
			newMonth = 0;
			newYear++;
		}
		
		this.setCurrentMonth(newMonth, newYear);
	}

	/**
	 * Check if a month/year is before another month/year
	 */
	private isMonthBefore(month1: number, year1: number, month2: number, year2: number): boolean {
		return year1 < year2 || (year1 === year2 && month1 < month2);
	}

	/**
	 * Check if a month/year is after another month/year
	 */
	private isMonthAfter(month1: number, year1: number, month2: number, year2: number): boolean {
		return year1 > year2 || (year1 === year2 && month1 > month2);
	}

	/**
	 * Clear the tracker
	 */
	clear(): void {
		this.yearlyData = {};
		this.render();
	}

	/**
	 * Render the monthly tracker grid
	 */
	private render(): void {
		this.container.empty();

		// Create tracker container
		const trackerContainer = this.container.createEl('div', { cls: 'monthly-tracker-container' });

		// Create header with month navigation
		this.createHeader(trackerContainer);

		// Create grid container
		const gridContainer = trackerContainer.createEl('div', { cls: 'monthly-tracker-grid' });

		// Generate all days for selected month
		const days = this.generateMonthDays(this.navigationState.currentMonth, this.navigationState.currentYear);

		// Create weekday headers
		this.createWeekdayHeaders(gridContainer);

		// Create day grid
		const dayGrid = gridContainer.createEl('div', { cls: 'monthly-tracker-days' });
		
		// Create day squares
		this.createDaySquares(dayGrid, days);

		// Create legend
		this.createLegend(trackerContainer);
	}

	/**
	 * Create header with title and month navigation controls
	 */
	private createHeader(container: HTMLElement): void {
		const header = container.createEl('div', { cls: 'monthly-tracker-header' });
		
		// Title with current month/year
		const selectedDate = new Date(this.navigationState.currentYear, this.navigationState.currentMonth);
		const monthName = selectedDate.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
		header.createEl('div', {
			text: `${monthName} backlinks`,
			cls: 'monthly-tracker-title'
		});

		// Month navigation controls
		const monthNav = header.createEl('div', { cls: 'monthly-tracker-month-nav' });
		
		// Previous month button
		const prevButton = monthNav.createEl('button', {
			text: '‹',
			cls: 'monthly-tracker-month-btn monthly-tracker-month-prev'
		});
		
		// Check if we can go to previous month
		let prevMonth = this.navigationState.currentMonth - 1;
		let prevYear = this.navigationState.currentYear;
		if (prevMonth < 0) {
			prevMonth = 11;
			prevYear--;
		}
		prevButton.disabled = this.isMonthBefore(prevMonth, prevYear, this.monthBounds.minMonth, this.monthBounds.minYear);
		prevButton.addEventListener('click', () => {
			this.goToPreviousMonth();
		});

		// Current month/year display
		const monthDisplay = monthNav.createEl('span', {
			text: selectedDate.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }),
			cls: 'monthly-tracker-current-month'
		});

		// Next month button
		const nextButton = monthNav.createEl('button', {
			text: '›',
			cls: 'monthly-tracker-month-btn monthly-tracker-month-next'
		});
		
		// Check if we can go to next month
		let nextMonth = this.navigationState.currentMonth + 1;
		let nextYear = this.navigationState.currentYear;
		if (nextMonth > 11) {
			nextMonth = 0;
			nextYear++;
		}
		nextButton.disabled = this.isMonthAfter(nextMonth, nextYear, this.monthBounds.maxMonth, this.monthBounds.maxYear);
		nextButton.addEventListener('click', () => {
			this.goToNextMonth();
		});
	}

	/**
	 * Generate all days for the specified month/year
	 */
	private generateMonthDays(month: number, year: number): Date[] {
		const days: Date[] = [];

		// First day of specified month
		const startDate = new Date(year, month, 1);
		// Last day of specified month
		const endDate = new Date(year, month + 1, 0);

		for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
			days.push(new Date(date));
		}

		return days;
	}

	/**
	 * Generate all days for the current month
	 */
	private generateCurrentMonthDays(): Date[] {
		const currentDate = new Date();
		return this.generateMonthDays(currentDate.getMonth(), currentDate.getFullYear());
	}

	/**
	 * Create weekday headers above the grid
	 */
	private createWeekdayHeaders(container: HTMLElement): void {
		const weekdaysContainer = container.createEl('div', { cls: 'monthly-tracker-weekdays' });
		
		const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
		
		weekdays.forEach(day => {
			weekdaysContainer.createEl('div', {
				text: day,
				cls: 'monthly-tracker-weekday-label'
			});
		});
	}

	/**
	 * Create the day squares grid
	 */
	private createDaySquares(container: HTMLElement, days: Date[]): void {
		const squaresContainer = container.createEl('div', { cls: 'monthly-tracker-squares' });

		// Calculate starting position (which day of week does month start)
		const startDate = days[0];
		const startWeekday = startDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
		// Adjust to make Monday = 0
		const adjustedStartWeekday = (startWeekday + 6) % 7;

		// Create empty squares for days before the month starts
		for (let i = 0; i < adjustedStartWeekday; i++) {
			squaresContainer.createEl('div', { cls: 'monthly-tracker-square monthly-tracker-square-empty' });
		}

		// Create squares for each day in the month
		days.forEach(date => {
			const dateString = this.formatDateString(date);
			const summary: DailyNoteBacklinkSummary = this.yearlyData[dateString] || { linkCount: 0 };
			const intensity = this.calculateIntensity(summary.linkCount);

			const square = squaresContainer.createEl('div', { 
				cls: `monthly-tracker-square monthly-tracker-square-intensity-${intensity}` 
			});

			// Add day number to the square
			square.createEl('span', {
				text: date.getDate().toString(),
				cls: 'monthly-tracker-square-day'
			});

			// Add tooltip with summary
			this.addTooltip(square, date, summary);
		});

		// Fill remaining squares to complete the grid (up to 6 weeks)
		const totalSquares = squaresContainer.children.length;
		const maxSquares = 42; // 6 weeks * 7 days
		for (let i = totalSquares; i < maxSquares; i++) {
			squaresContainer.createEl('div', { cls: 'monthly-tracker-square monthly-tracker-square-empty' });
		}
	}

	/**
	 * Create intensity legend
	 */
	private createLegend(container: HTMLElement): void {
		const legendContainer = container.createEl('div', { cls: 'monthly-tracker-legend' });
		
		legendContainer.createEl('span', {
			text: 'Less',
			cls: 'monthly-tracker-legend-label'
		});

		// Create intensity squares
		for (let i = 0; i <= 4; i++) {
			legendContainer.createEl('div', {
				cls: `monthly-tracker-square monthly-tracker-square-intensity-${i} monthly-tracker-legend-square`
			});
		}

		legendContainer.createEl('span', {
			text: 'More',
			cls: 'monthly-tracker-legend-label'
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
	}
}
