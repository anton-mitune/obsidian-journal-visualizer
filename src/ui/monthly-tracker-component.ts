import { DailyNoteYearlyData, DailyNoteBacklinkSummary } from '../types';

/**
 * Component that renders a monthly tracker showing daily note backlinks for the current month
 * Similar to YearlyTrackerComponent but focused on current month only
 */
export class MonthlyTrackerComponent {
	private container: HTMLElement;
	private yearlyData: DailyNoteYearlyData;
	private maxIntensity: number = 5; // Cap intensity at 5 backlinks for consistent coloring

	constructor(container: HTMLElement) {
		this.container = container;
		this.yearlyData = {};
	}

	/**
	 * Update the tracker with new yearly data (we'll filter to current month)
	 */
	updateData(yearlyData: DailyNoteYearlyData): void {
		this.yearlyData = yearlyData;
		this.render();
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

		// Create header
		const header = trackerContainer.createEl('div', { cls: 'monthly-tracker-header' });
		const currentDate = new Date();
		const monthName = currentDate.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
		header.createEl('div', {
			text: `${monthName} backlinks`,
			cls: 'monthly-tracker-title'
		});

		// Create grid container
		const gridContainer = trackerContainer.createEl('div', { cls: 'monthly-tracker-grid' });

		// Generate all days for current month
		const days = this.generateCurrentMonthDays();

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
	 * Generate all days for the current month
	 */
	private generateCurrentMonthDays(): Date[] {
		const days: Date[] = [];
		const currentDate = new Date();
		const year = currentDate.getFullYear();
		const month = currentDate.getMonth();

		// First day of current month
		const startDate = new Date(year, month, 1);
		// Last day of current month
		const endDate = new Date(year, month + 1, 0);

		for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
			days.push(new Date(date));
		}

		return days;
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
