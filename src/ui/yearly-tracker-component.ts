import { DailyNoteYearlyData, DailyNoteBacklinkSummary } from '../types';

/**
 * Component that renders a yearly tracker (git-style grid) showing daily note backlinks
 * Similar to GitHub contribution graph or Anilist activity tracker
 */
export class YearlyTrackerComponent {
	private container: HTMLElement;
	private yearlyData: DailyNoteYearlyData;
	private maxIntensity: number = 5; // Cap intensity at 5 backlinks for consistent coloring
	private popover: HTMLElement | null = null;
	private popoverTimeout: NodeJS.Timeout | null = null;

	constructor(container: HTMLElement) {
		this.container = container;
		this.yearlyData = {};
	}

	/**
	 * Update the tracker with new yearly data
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
	 * Render the yearly tracker grid
	 */
	private render(): void {
		this.container.empty();

		// Create tracker container
		const trackerContainer = this.container.createEl('div', { cls: 'yearly-tracker-container' });

		// Create popover for hover details
		this.createPopover(trackerContainer);

		// Create header
		const header = trackerContainer.createEl('div', { cls: 'yearly-tracker-header' });
		header.createEl('div', {
			text: 'Daily note backlinks',
			cls: 'yearly-tracker-title'
		});

		// Create grid container
		const gridContainer = trackerContainer.createEl('div', { cls: 'yearly-tracker-grid' });

		// Generate all days for current year
		const currentYear = new Date().getFullYear();
		const days = this.generateYearDays(currentYear);

		// Create month labels
		this.createMonthLabels(gridContainer, currentYear);

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
	 * Create the popover element for showing hover details
	 */
	private createPopover(container: HTMLElement): void {
		this.popover = container.createEl('div', { cls: 'yearly-tracker-popover' });
		this.popover.style.display = 'none';
		this.popover.style.position = 'absolute';
		this.popover.style.zIndex = '1000';
	}

	/**
	 * Show popover with backlink details
	 */
	private showPopover(element: HTMLElement, date: Date, summary: DailyNoteBacklinkSummary): void {
		if (!this.popover) return;

		// Clear any existing timeout
		if (this.popoverTimeout) {
			clearTimeout(this.popoverTimeout);
			this.popoverTimeout = null;
		}

		// Update popover content
		this.updatePopoverContent(date, summary);

		// Position popover relative to the square
		this.positionPopover(element);

		// Show popover immediately
		this.popover.style.display = 'block';
	}

	/**
	 * Hide popover with slight delay
	 */
	private hidePopover(): void {
		if (!this.popover) return;

		// Add small delay to prevent flickering when moving between squares
		this.popoverTimeout = setTimeout(() => {
			if (this.popover) {
				this.popover.style.display = 'none';
			}
		}, 150);
	}

	/**
	 * Update popover content with backlink details
	 */
	private updatePopoverContent(date: Date, summary: DailyNoteBacklinkSummary): void {
		if (!this.popover) return;

		this.popover.empty();

		// Create popover header
		const header = this.popover.createEl('div', { cls: 'yearly-tracker-popover-header' });
		const dateString = date.toLocaleDateString('en-GB', {
			weekday: 'long',
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		});
		header.createEl('div', {
			text: dateString,
			cls: 'yearly-tracker-popover-date'
		});

		// Create content area
		const content = this.popover.createEl('div', { cls: 'yearly-tracker-popover-content' });

		if (summary.linkCount === 0) {
			content.createEl('div', {
				text: 'No backlinks on this day',
				cls: 'yearly-tracker-popover-empty'
			});
		} else {
			// Backlink count
			const countEl = content.createEl('div', { cls: 'yearly-tracker-popover-count' });
			countEl.createEl('span', {
				text: summary.linkCount.toString(),
				cls: 'yearly-tracker-popover-count-number'
			});
			countEl.createEl('span', {
				text: ` backlink${summary.linkCount > 1 ? 's' : ''}`,
				cls: 'yearly-tracker-popover-count-label'
			});

			// Show lines if available
			if (summary.lines && summary.lines.length > 0) {
				const linesContainer = content.createEl('div', { cls: 'yearly-tracker-popover-lines' });
				linesContainer.createEl('div', {
					text: 'Context:',
					cls: 'yearly-tracker-popover-lines-header'
				});

				const linesList = linesContainer.createEl('div', { cls: 'yearly-tracker-popover-lines-list' });
				summary.lines.slice(0, 5).forEach(line => {
					linesList.createEl('div', {
						text: line.trim(),
						cls: 'yearly-tracker-popover-line'
					});
				});

				if (summary.lines.length > 5) {
					linesList.createEl('div', {
						text: `... and ${summary.lines.length - 5} more`,
						cls: 'yearly-tracker-popover-more'
					});
				}
			}
		}
	}

	/**
	 * Position popover relative to the hovered square
	 */
	private positionPopover(element: HTMLElement): void {
		if (!this.popover) return;

		// First, position popover off-screen to measure its dimensions
		this.popover.style.left = '-9999px';
		this.popover.style.top = '-9999px';
		this.popover.style.display = 'block';

		const rect = element.getBoundingClientRect();
		const containerRect = this.container.getBoundingClientRect();
		const popoverRect = this.popover.getBoundingClientRect();

		console.log('Container Rect:', containerRect);
		console.log('Element Rect:', rect);
		console.log('Popover Rect:', popoverRect);

		// Calculate position relative to the container
		let left = rect.left - containerRect.left + rect.width / 2;
		let top = rect.top - containerRect.top - 10; // 10px above the square

		// Adjust horizontal position to keep popover in bounds
		const popoverWidth = popoverRect.width;
		if (left + popoverWidth / 2 > containerRect.width) {
			left = containerRect.width - popoverWidth / 2 - 10;
		}
		if (left - popoverWidth / 2 < 0) {
			left = popoverWidth / 2 + 10;
		}

		const popoverHeight = popoverRect.height;

		this.popover.removeClass('yearly-tracker-popover-below');
		top = top - popoverHeight; // Position above the square

		this.popover.style.left = `${left}px`;
		this.popover.style.top = `${top}px`;
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

		// Add hover interactions for popover
		element.addEventListener('mouseenter', () => {
			element.addClass('yearly-tracker-square-hover');
			this.showPopover(element, date, summary);
		});

		element.addEventListener('mouseleave', () => {
			element.removeClass('yearly-tracker-square-hover');
			this.hidePopover();
		});
	}
}
