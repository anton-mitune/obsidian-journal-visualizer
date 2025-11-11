import { App, Plugin, MarkdownPostProcessorContext, MarkdownRenderChild, TFile } from 'obsidian';
import { BaseCodeBlockProcessor } from './base-code-block-processor';
import { MonthlyTrackerComponent } from '../ui/monthly-tracker-component';
import { BacklinkAnalysisService } from '../services/backlink-analysis-service';
import { logger } from '../utils/logger';

/**
 * Configuration parsed from monthly code block
 */
interface MonthlyCodeBlockConfig {
	id: string; // Required - written by insert command
	notePath: string;
	selectedMonth?: string;
}

/**
 * Processes note-insight-monthly code blocks
 * Handles monthly tracker component rendering and persistence
 */
export class MonthlyTrackerCodeBlockProcessor extends BaseCodeBlockProcessor {
	private analysisService: BacklinkAnalysisService;

	constructor(
		app: App,
		plugin: Plugin,
		analysisService: BacklinkAnalysisService
	) {
		super(app, plugin);
		this.analysisService = analysisService;
	}

	/**
	 * Register the monthly tracker code block processor
	 */
	register(): void {
		this.plugin.registerMarkdownCodeBlockProcessor(
			'note-insight-monthly',
			this.process.bind(this)
		);
	}

	/**
	 * Process a monthly tracker code block
	 */
	async process(
		source: string,
		el: HTMLElement,
		ctx: MarkdownPostProcessorContext
	): Promise<void> {
		try {
			// Parse configuration
			const config = this.parseConfig(source);
			if (!config) {
				el.createEl('div', {
					text: 'Error: codeblock ID missing. Please insert codeblock using the context menu.',
					cls: 'note-insight-error'
				});
				return;
			}

			const { id, notePath, selectedMonth } = config;

			// Validate required fields
			if (!notePath) {
				el.createEl('div', {
					text: 'Error: notePath must be specified',
					cls: 'note-insight-error'
				});
				return;
			}

			// Get the file
			const file = this.app.vault.getAbstractFileByPath(notePath);
			if (!file) {
				el.createEl('div', {
					text: `Error: Note not found: ${notePath}`,
					cls: 'note-insight-error'
				});
				return;
			}

			// Parse selectedMonth or use current month
			let initialMonth: number;
			let initialYear: number;

			if (selectedMonth) {
				const [yearStr, monthStr] = selectedMonth.split('-');
				initialYear = parseInt(yearStr, 10);
				initialMonth = parseInt(monthStr, 10) - 1; // Month is 0-indexed
			} else {
				const now = new Date();
				initialMonth = now.getMonth();
				initialYear = now.getFullYear();
			}

		// Get monthly data
		const monthlyData = this.analysisService.getMonthlyData(file as TFile, initialMonth, initialYear);

		// Get month bounds
		const monthBounds = this.analysisService.getMonthBounds(file as TFile);

		// Create container
		const container = el.createEl('div', { cls: 'note-insight-code-block monthly' });

		// Add title
		const noteTitle = file.name.replace(/\.md$/, '');
		container.createEl('h4', { text: noteTitle, cls: 'note-insight-title' });

		// Create monthly tracker component with callback (use ID as instance key)
		const trackerContainer = container.createEl('div', { cls: 'monthly-tracker-wrapper' });
		const tracker = new MonthlyTrackerComponent(
			trackerContainer,
			(month: number, year: number) => this.onMonthChanged(ctx, id, month, year)
		);

		// Set month bounds and data
		tracker.setMonthBounds(monthBounds);
		tracker.updateData(monthlyData);
		tracker.setCurrentMonth(initialMonth, initialYear);

		// Register metadata-cache listener for auto-refresh
		const eventRef = this.app.metadataCache.on('resolved', () => {
			const instance = this.instances.get(id);
			if (!instance || instance.isUpdatingCodeblock) {
				return;
			}

			// Re-analyze the watched note and update the component
			const updatedFile = this.app.vault.getAbstractFileByPath(notePath);
			if (updatedFile) {
				// Get the currently displayed month/year from the component
				const { month, year } = tracker.getCurrentMonth();

				// Get updated monthly data for the current view
				const updatedMonthlyData = this.analysisService.getMonthlyData(updatedFile as TFile, month, year);
				const updatedMonthBounds = this.analysisService.getMonthBounds(updatedFile as TFile);

				tracker.setMonthBounds(updatedMonthBounds);
				tracker.updateData(updatedMonthlyData);
			}
		});

		this.plugin.registerEvent(eventRef);

		// Store instance using codeblock ID (not instanceId)
		const initialMonthStr = `${initialYear}-${String(initialMonth + 1).padStart(2, '0')}`;
		this.instances.set(id, {
			component: tracker,
			codeblockId: id,
			eventRef,
			type: 'monthly',
			ctx,
			el,
			lastKnownPeriod: initialMonthStr,
			isUpdatingCodeblock: false
		});

		// Register cleanup
		const renderChild = new MarkdownRenderChild(container);
		renderChild.onunload = () => {
			const instance = this.instances.get(id);
			if (instance) {
				this.app.workspace.offref(instance.eventRef);
				this.instances.delete(id);
			}
		};
		ctx.addChild(renderChild);	} catch (error) {
			logger.error('[MonthlyTrackerCodeBlockProcessor] Error:', error);
			el.createEl('div', {
				text: `Error: ${error.message}`,
				cls: 'note-insight-error'
			});
		}
	}

	/**
	 * Parse monthly configuration from code block source
	 */
	private parseConfig(source: string): MonthlyCodeBlockConfig | null {
		const config = this.parseCodeBlockConfig(source);

		// Extract and validate required fields
		const id = config.id as string | undefined;
		const notePath = config.notePath as string | undefined;
		const selectedMonth = config.selectedMonth as string | undefined;

		// ID is required (written by insert command)
		if (!id) {
			return null;
		}

		if (!notePath) {
			return null;
		}

		return { id, notePath, selectedMonth };
	}

	/**
	 * Handle month selection change
	 */
	private async onMonthChanged(
		ctx: MarkdownPostProcessorContext,
		instanceId: string,
		month: number,
		year: number
	): Promise<void> {
		const instance = this.instances.get(instanceId);
		if (!instance || instance.isUpdatingCodeblock) {
			return;
		}

		const newMonthStr = `${year}-${String(month + 1).padStart(2, '0')}`;
		if (instance.lastKnownPeriod === newMonthStr) {
			return;
		}

		instance.isUpdatingCodeblock = true;

		try {
			await this.updateCodeblockProperty(ctx, instance, 'selectedMonth', newMonthStr);
		} finally {
			setTimeout(() => {
				instance.isUpdatingCodeblock = false;
			}, 100);
		}
	}
}
