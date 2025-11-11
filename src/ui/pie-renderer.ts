import { NoteCounterResult } from '../types';

/**
 * PieRenderer - Renders pie charts for backlink distribution among watched notes
 * FEA006: Pie Visualization
 * 
 * Uses Chart.js for rendering pie charts showing proportional backlink counts
 * for multiple watched notes, sorted by count descending starting from 12 o'clock position.
 */
export class PieRenderer {
	private container: HTMLElement;
	private chart: any; // Chart.js instance

	constructor(container: HTMLElement) {
		this.container = container;
	}

	/**
	 * Render pie chart for note counter results
	 * @param results Array of note counter results to visualize
	 * @param periodLabel Label describing the time period (e.g., "past 30 days")
	 * @param colors Optional array of colors to use for the pie slices (FEA010)
	 */
	render(results: NoteCounterResult[], periodLabel: string, colors?: string[]): void {
		// Clear container
		this.container.empty();

		if (results.length === 0) {
			this.renderEmptyState();
			return;
		}

		// Sort results by count (descending), then by title (ascending) for ties
		const sortedResults = this.sortResults(results);

		// Create canvas element for Chart.js
		const canvas = this.container.createEl('canvas', {
			cls: 'pie-chart-canvas'
		});

		// For now, render placeholder content until Chart.js is properly integrated
		this.renderPlaceholder(sortedResults, periodLabel, colors);
	}

	/**
	 * Sort results by count (descending), then by note title (ascending) for ties
	 * Per FEA006: sections sorted by backlink count descending, starting at top (12 o'clock)
	 * and going clockwise. Same count = alphabetical by title.
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
	 * Render placeholder content showing the pie chart visualization
	 * This will be replaced with actual Chart.js rendering once Chart.js is integrated
	 * @param colors Optional array of colors to use for the pie slices (FEA010)
	 */
	private renderPlaceholder(results: NoteCounterResult[], periodLabel: string, colors?: string[]): void {
		// Clear existing content
		this.container.empty();
		
		const placeholderContainer = this.container.createEl('div', {
			cls: 'pie-placeholder'
		});

		// Title
		placeholderContainer.createEl('h4', {
			text: `Backlink Distribution (${periodLabel})`,
			cls: 'pie-title'
		});

		// Create pie chart visualization container
		const chartWrapper = placeholderContainer.createEl('div', {
			cls: 'pie-chart-wrapper'
		});

		// Calculate total for percentages
		const totalCount = results.reduce((sum, r) => sum + r.count, 0);

		// Create visual pie chart using CSS
		const pieContainer = chartWrapper.createEl('div', {
			cls: 'pie-chart-container'
		});

		// Generate pie chart slices using conic-gradient
		// We'll create a visual pie using CSS, starting at 12 o'clock (top)
		const pieVisual = pieContainer.createEl('div', {
			cls: 'pie-chart-visual'
		});

		// Build conic-gradient string for the pie chart
		let gradientStops: string[] = [];
		let currentAngle = 0; // Start at 0 degrees (12 o'clock)

		// Use provided colors or fall back to default palette (FEA010)
		const defaultColors = [
			'#8b5cf6', // purple
			'#3b82f6', // blue
			'#10b981', // green
			'#f59e0b', // amber
			'#ef4444', // red
			'#ec4899', // pink
			'#14b8a6', // teal
			'#f97316', // orange
		];
		const colorPalette = colors || defaultColors;

		results.forEach((result, index) => {
			const percentage = totalCount > 0 ? (result.count / totalCount) * 100 : 0;
			const angleDegrees = (percentage / 100) * 360;
			const color = colorPalette[index % colorPalette.length];
			
			const startAngle = currentAngle;
			const endAngle = currentAngle + angleDegrees;
			
			// Add gradient stop
			if (index === 0) {
				gradientStops.push(`${color} 0deg ${endAngle}deg`);
			} else {
				gradientStops.push(`${color} ${startAngle}deg ${endAngle}deg`);
			}
			
			currentAngle = endAngle;
		});

		// Apply conic gradient to create the pie
		pieVisual.style.background = `conic-gradient(from -90deg, ${gradientStops.join(', ')})`;

		// Create legend
		const legendContainer = chartWrapper.createEl('div', {
			cls: 'pie-legend'
		});

		results.forEach((result, index) => {
			const legendItem = legendContainer.createEl('div', {
				cls: 'pie-legend-item'
			});

			// Color indicator
			const colorBox = legendItem.createEl('div', {
				cls: 'pie-legend-color'
			});
			colorBox.style.backgroundColor = colorPalette[index % colorPalette.length];

			// Legend text
			const legendText = legendItem.createEl('div', {
				cls: 'pie-legend-text'
			});

			const noteTitle = this.truncateTitle(result.noteTitle, 30);
			const percentage = totalCount > 0 ? ((result.count / totalCount) * 100).toFixed(1) : 0;
			
			legendText.createEl('span', {
				text: noteTitle,
				cls: 'pie-legend-label',
				attr: { title: result.noteTitle } // Full title on hover
			});

			legendText.createEl('span', {
				text: `${result.count} (${percentage}%)`,
				cls: 'pie-legend-count'
			});
		});
	}

	/**
	 * Render empty state when no results are available
	 */
	private renderEmptyState(): void {
		this.container.createEl('div', {
			text: '📊 No data available for pie visualization',
			cls: 'pie-empty-state'
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
