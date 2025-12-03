import { NoteCounterResult } from '../types';

/**
 * TopNRenderer - Renders horizontal bar charts for top-N note backlink counts
 * FEA007: Top Bars Visualization
 * 
 * Renders horizontal bar charts showing backlink counts for multiple watched notes
 * in descending order using HTML and CSS styling.
 */
export class TopNRenderer {
	private container: HTMLElement;

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

		// Render bar chart visualization
		this.renderBars(sortedResults, periodLabel);
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
	 * Render horizontal bars visualization using HTML and CSS
	 */
	private renderBars(results: NoteCounterResult[], periodLabel: string): void {
		// Clear existing content
		this.container.empty();
		
		const container = this.container.createEl('div', {
			cls: 'top-n-container'
		});

		// Title
		container.createEl('h4', {
			text: `Top ${results.length} notes by backlinks (${periodLabel})`,
			cls: 'top-n-title'
		});

		// Create horizontal bar visualization using HTML/CSS
		const chartContainer = container.createEl('div', {
			cls: 'top-n-chart-container'
		});

		// Find max count to normalize bar widths
		const maxCount = Math.max(...results.map(r => r.count));

		results.forEach((result) => {
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
			text: 'No data available for top-n visualization',
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
	 * Clean up resources
	 */
	destroy(): void {
		// No resources to clean up
	}
}
