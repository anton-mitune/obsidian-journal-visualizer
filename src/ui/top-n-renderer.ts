import { NoteCounterResult } from '../types';

/**
 * TopNRenderer - Renders horizontal bar charts for top-N note backlink counts
 * FEA007: Top Bars Visualization
 * 
 * Uses Chart.js for rendering horizontal bar charts showing backlink counts
 * for multiple watched notes in descending order.
 */
export class TopNRenderer {
	private container: HTMLElement;
	private chart: any; // Chart.js instance

	constructor(container: HTMLElement) {
		this.container = container;
	}

	/**
	 * Render top-N horizontal bar chart for note counter results
	 * @param results Array of note counter results to visualize
	 * @param periodLabel Label describing the time period (e.g., "past 30 days")
	 */
	render(results: NoteCounterResult[], periodLabel: string): void {
		// Clear container
		this.container.empty();

		if (results.length === 0) {
			this.renderEmptyState();
			return;
		}

		// Sort results by count (descending), then by title (ascending) for ties
		const sortedResults = this.sortResults(results);

		// Create canvas element for Chart.js
		this.container.createEl('canvas', {
			cls: 'top-n-chart-canvas'
		});

		// For now, render placeholder content until Chart.js is properly integrated
		this.renderPlaceholder(sortedResults, periodLabel);
	}

	/**
	 * Sort results by count (descending), then by note title (ascending) for ties
	 */
	private sortResults(results: NoteCounterResult[]): NoteCounterResult[] {
		return [...results].sort((a, b) => {
			if (a.count !== b.count) {
				return b.count - a.count; // Descending by count
			}
			return a.noteTitle.localeCompare(b.noteTitle); // Ascending by title for ties
		});
	}

	/**
	 * Render placeholder content showing the data structure
	 * This will be replaced with actual Chart.js rendering once Chart.js is integrated
	 */
	private renderPlaceholder(results: NoteCounterResult[], periodLabel: string): void {
		// Clear existing content
		this.container.empty();
		
		const placeholderContainer = this.container.createEl('div', {
			cls: 'top-n-placeholder'
		});

		// Title
		placeholderContainer.createEl('h4', {
			text: `Top ${results.length} Notes by Backlinks (${periodLabel})`,
			cls: 'top-n-title'
		});

		// Create horizontal bar-like visualization using HTML/CSS
		const chartContainer = placeholderContainer.createEl('div', {
			cls: 'top-n-chart-placeholder'
		});

		// Find max count to normalize bar widths
		const maxCount = Math.max(...results.map(r => r.count));

		results.forEach((result, index) => {
			const barContainer = chartContainer.createEl('div', {
				cls: 'top-n-bar-container'
			});

			// Note title (left side)
			const noteTitle = this.truncateTitle(result.noteTitle, 25);
			barContainer.createEl('div', {
				text: noteTitle,
				cls: 'top-n-bar-label',
				attr: { title: result.noteTitle } // Full title on hover
			});

			// Bar visualization
			const barWrapper = barContainer.createEl('div', {
				cls: 'top-n-bar-wrapper'
			});

			const barWidth = maxCount > 0 ? (result.count / maxCount) * 100 : 0;
			barWrapper.createEl('div', {
				cls: 'top-n-bar',
				attr: { 
					style: `width: ${barWidth}%`,
					'data-count': result.count.toString()
				}
			});

			// Count label (right side)
			barContainer.createEl('div', {
				text: result.count.toString(),
				cls: 'top-n-bar-count'
			});
		});
	}

	/**
	 * Render empty state when no results are available
	 */
	private renderEmptyState(): void {
		this.container.createEl('div', {
			text: '📊 No data available for top-N visualization',
			cls: 'top-n-empty-state'
		});
	}

	/**
	 * Truncate long note titles with ellipsis
	 */
	private truncateTitle(title: string, maxLength: number): string {
		if (title.length <= maxLength) {
			return title;
		}
		return title.substring(0, maxLength - 3) + '...';
	}

	/**
	 * Clean up Chart.js instance
	 */
	destroy(): void {
		if (this.chart) {
			this.chart.destroy();
			this.chart = null;
		}
	}
}
