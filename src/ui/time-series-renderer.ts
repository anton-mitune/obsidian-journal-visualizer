import { DailyNoteYearlyData } from '../types';

/**
 * Data point for a time series
 */
interface TimeSeriesDataPoint {
	date: string; // YYYY-MM-DD format
	count: number;
}

/**
 * Single series of time-series data
 */
interface TimeSeriesData {
	noteTitle: string;
	notePath: string;
	dataPoints: TimeSeriesDataPoint[];
	color: string;
}

/**
 * TimeSeriesRenderer - Renders line charts for backlink evolution over time
 * FEA008: Evolution Visualization
 * 
 * Uses vanilla SVG for rendering multi-series line charts showing how backlink counts
 * change over time for multiple watched notes.
 */
export class TimeSeriesRenderer {
	private container: HTMLElement;

	constructor(container: HTMLElement) {
		this.container = container;
	}

	/**
	 * Render time-series line chart
	 * @param seriesData Array of time-series data for each note
	 * @param periodLabel Label describing the time period
	 */
	render(seriesData: TimeSeriesData[], periodLabel: string): void {
		// Clear container
		this.container.empty();

		if (seriesData.length === 0 || seriesData.every(s => s.dataPoints.length === 0)) {
			this.renderEmptyState();
			return;
		}

		// Create chart container
		const chartContainer = this.container.createEl('div', {
			cls: 'time-series-container'
		});

		// Title
		chartContainer.createEl('h4', {
			text: `Backlink Evolution (${periodLabel})`,
			cls: 'time-series-title'
		});

		// Chart wrapper
		const chartWrapper = chartContainer.createEl('div', {
			cls: 'time-series-chart-wrapper'
		});

		// Render the SVG chart
		this.renderChart(chartWrapper, seriesData);

		// Render legend
		this.renderLegend(chartContainer, seriesData);
	}

	/**
	 * Render the SVG line chart
	 */
	private renderChart(container: HTMLElement, seriesData: TimeSeriesData[]): void {
		const width = 600;
		const height = 300;
		const padding = { top: 20, right: 20, bottom: 40, left: 50 };
		const chartWidth = width - padding.left - padding.right;
		const chartHeight = height - padding.top - padding.bottom;

		// Create SVG
		const svg = container.createSvg('svg', {
			attr: {
				width: '100%',
				height: height.toString(),
				viewBox: `0 0 ${width} ${height}`,
				cls: 'time-series-svg'
			}
		});

		// Get all unique dates across all series (sorted)
		const allDates = new Set<string>();
		seriesData.forEach(series => {
			series.dataPoints.forEach(point => allDates.add(point.date));
		});
		const sortedDates = Array.from(allDates).sort();

		if (sortedDates.length === 0) {
			return;
		}

		// Find max count for y-axis scaling
		let maxCount = 0;
		seriesData.forEach(series => {
			series.dataPoints.forEach(point => {
				if (point.count > maxCount) maxCount = point.count;
			});
		});

		// Add some padding to max for better visualization
		const yMax = Math.max(maxCount + 1, 5);

		// Create scales
		const xScale = (index: number) => padding.left + (index / Math.max(sortedDates.length - 1, 1)) * chartWidth;
		const yScale = (value: number) => padding.top + chartHeight - (value / yMax) * chartHeight;

		// Draw grid lines
		const gridGroup = svg.createSvg('g', { attr: { cls: 'time-series-grid' } });
		
		// Horizontal grid lines (5 lines)
		for (let i = 0; i <= 5; i++) {
			const y = yScale((i / 5) * yMax);
			gridGroup.createSvg('line', {
				attr: {
					x1: padding.left.toString(),
					y1: y.toString(),
					x2: (padding.left + chartWidth).toString(),
					y2: y.toString(),
					stroke: 'var(--background-modifier-border)',
					'stroke-width': '1',
					'stroke-dasharray': '2,2'
				}
			});
		}

		// Draw axes
		const axesGroup = svg.createSvg('g', { attr: { cls: 'time-series-axes' } });
		
		// Y-axis
		axesGroup.createSvg('line', {
			attr: {
				x1: padding.left.toString(),
				y1: padding.top.toString(),
				x2: padding.left.toString(),
				y2: (padding.top + chartHeight).toString(),
				stroke: 'var(--text-muted)',
				'stroke-width': '2'
			}
		});

		// X-axis
		axesGroup.createSvg('line', {
			attr: {
				x1: padding.left.toString(),
				y1: (padding.top + chartHeight).toString(),
				x2: (padding.left + chartWidth).toString(),
				y2: (padding.top + chartHeight).toString(),
				stroke: 'var(--text-muted)',
				'stroke-width': '2'
			}
		});

		// Y-axis labels
		const labelsGroup = svg.createSvg('g', { attr: { cls: 'time-series-labels' } });
		for (let i = 0; i <= 5; i++) {
			const value = Math.round((i / 5) * yMax);
			const y = yScale(value);
			labelsGroup.createSvg('text', {
				attr: {
					x: (padding.left - 10).toString(),
					y: y.toString(),
					'text-anchor': 'end',
					'dominant-baseline': 'middle',
					fill: 'var(--text-muted)',
					'font-size': '12'
				}
			}).textContent = value.toString();
		}

		// X-axis labels (show max 7 date labels to avoid crowding)
		const labelInterval = Math.max(1, Math.floor(sortedDates.length / 7));
		sortedDates.forEach((date, index) => {
			if (index % labelInterval === 0 || index === sortedDates.length - 1) {
				const x = xScale(index);
				const dateLabel = this.formatDateLabel(date);
				labelsGroup.createSvg('text', {
					attr: {
						x: x.toString(),
						y: (padding.top + chartHeight + 20).toString(),
						'text-anchor': 'middle',
						fill: 'var(--text-muted)',
						'font-size': '11'
					}
				}).textContent = dateLabel;
			}
		});

		// Draw lines for each series
		const linesGroup = svg.createSvg('g', { attr: { cls: 'time-series-lines' } });
		
		seriesData.forEach((series, _seriesIndex) => {
			// Create a map of date -> count for this series
			const dataMap = new Map<string, number>();
			series.dataPoints.forEach(point => {
				dataMap.set(point.date, point.count);
			});

			// Build path data string
			let pathData = '';
			sortedDates.forEach((date, index) => {
				const count = dataMap.get(date) || 0;
				const x = xScale(index);
				const y = yScale(count);
				
				if (index === 0) {
					pathData += `M ${x} ${y}`;
				} else {
					pathData += ` L ${x} ${y}`;
				}
			});

			// Draw the line
			linesGroup.createSvg('path', {
				attr: {
					d: pathData,
					fill: 'none',
					stroke: series.color,
					'stroke-width': '2',
					'stroke-linejoin': 'round',
					'stroke-linecap': 'round'
				}
			});

			// Draw points
			const pointsGroup = linesGroup.createSvg('g', { attr: { cls: 'time-series-points' } });
			sortedDates.forEach((date, index) => {
				const count = dataMap.get(date);
				if (count !== undefined && count > 0) {
					const x = xScale(index);
					const y = yScale(count);
					
					pointsGroup.createSvg('circle', {
						attr: {
							cx: x.toString(),
							cy: y.toString(),
							r: '4',
							fill: series.color,
							stroke: 'var(--background-primary)',
							'stroke-width': '2'
						}
					});
				}
			});
		});
	}

	/**
	 * Render legend
	 */
	private renderLegend(container: HTMLElement, seriesData: TimeSeriesData[]): void {
		const legendContainer = container.createEl('div', {
			cls: 'time-series-legend'
		});

		seriesData.forEach(series => {
			const legendItem = legendContainer.createEl('div', {
				cls: 'time-series-legend-item'
			});

			// Color indicator
			const colorBox = legendItem.createEl('div', {
				cls: 'time-series-legend-color'
			});
			colorBox.style.backgroundColor = series.color;

			// Note title
			const noteTitle = this.truncateTitle(series.noteTitle, 30);
			legendItem.createEl('span', {
				text: noteTitle,
				cls: 'time-series-legend-label',
				attr: { title: series.noteTitle }
			});
		});
	}

	/**
	 * Format date label for x-axis
	 */
	private formatDateLabel(dateString: string): string {
		const parts = dateString.split('-');
		if (parts.length === 3) {
			const month = parseInt(parts[1]);
			const day = parseInt(parts[2]);
			const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
			return `${monthNames[month - 1]} ${day}`;
		}
		return dateString;
	}

	/**
	 * Render empty state when no data is available
	 */
	private renderEmptyState(): void {
		this.container.createEl('div', {
			text: 'No data available for time-series visualization',
			cls: 'time-series-empty-state'
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
	 * Clean up
	 */
	destroy(): void {
		// Nothing to clean up for SVG-based rendering
	}
}

/**
 * Helper function to build time-series data from backlink data
 */
export function buildTimeSeriesData(
	noteResults: { notePath: string; noteTitle: string; data: DailyNoteYearlyData }[],
	colors: string[]
): TimeSeriesData[] {
	return noteResults.map((result, index) => {
		const dataPoints: TimeSeriesDataPoint[] = [];
		
		// Convert DailyNoteYearlyData to array of data points
		for (const [date, summary] of Object.entries(result.data)) {
			dataPoints.push({
				date,
				count: summary.linkCount
			});
		}

		// Sort by date
		dataPoints.sort((a, b) => a.date.localeCompare(b.date));

		return {
			noteTitle: result.noteTitle,
			notePath: result.notePath,
			dataPoints,
			color: colors[index % colors.length]
		};
	});
}
