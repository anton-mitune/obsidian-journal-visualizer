import { App, Plugin, MarkdownPostProcessorContext, MarkdownRenderChild, TFile } from 'obsidian';
import { BaseCodeBlockProcessor } from './base-code-block-processor';
import { YearlyTrackerComponent } from '../ui/yearly-tracker-component';
import { BacklinkAnalysisService } from '../services/backlink-analysis-service';
import { logger } from '../utils/logger';
/**
 * Configuration parsed from yearly code block
 */
interface YearlyCodeBlockConfig {
	id: string; // Required - written by insert command
	notePath: string;
	selectedYear?: number;
}

/**
 * Processes note-insight-yearly code blocks
 * Handles yearly tracker component rendering and persistence
 */
export class YearlyTrackerCodeBlockProcessor extends BaseCodeBlockProcessor {
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
	 * Register the yearly tracker code block processor
	 */
	register(): void {
		this.plugin.registerMarkdownCodeBlockProcessor(
			'note-insight-yearly',
			this.process.bind(this)
		);
	}

	/**
	 * Process a yearly tracker code block
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

			const { id, notePath, selectedYear } = config;

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

			// Analyze the note
			const noteInfo = this.analysisService.analyzeNoteByPath(notePath);
			if (!noteInfo || !noteInfo.yearlyData) {
				el.createEl('div', {
					text: 'Error: Unable to analyze note',
					cls: 'note-insight-error'
				});
				return;
			}

		// Get year bounds
		const yearBounds = this.analysisService.getYearBounds(file as TFile);

		// Create container
		const container = el.createEl('div', { cls: 'note-insight-code-block yearly' });
		container.createEl('h4', { text: noteInfo.noteTitle, cls: 'note-insight-title' });

		// Create yearly tracker component with callback (use ID as instance key)
		const trackerContainer = container.createEl('div', { cls: 'yearly-tracker-wrapper' });
		const tracker = new YearlyTrackerComponent(
			trackerContainer,
			(year: number) => this.onYearChanged(ctx, id, year)
		);			// Set year bounds and data
			tracker.setYearBounds(yearBounds);
			tracker.updateData(noteInfo.yearlyData);

			// Set the selected year
			const initialYear = selectedYear ?? new Date().getFullYear();
			tracker.setCurrentYear(initialYear);

		// Register metadata-cache listener for auto-refresh
		const eventRef = this.app.metadataCache.on('resolved', () => {
			const instance = this.instances.get(id);
			if (!instance || instance.isUpdatingCodeblock) {
				return;
			}

			// Re-analyze the watched note and update the component
			const updatedNoteInfo = this.analysisService.analyzeNoteByPath(notePath);
			if (updatedNoteInfo && updatedNoteInfo.yearlyData) {
				const updatedFile = this.app.vault.getAbstractFileByPath(notePath);
				if (updatedFile) {
					const updatedYearBounds = this.analysisService.getYearBounds(updatedFile as TFile);
					tracker.setYearBounds(updatedYearBounds);
					tracker.updateData(updatedNoteInfo.yearlyData);
				}
			}
		});

		this.plugin.registerEvent(eventRef);

		// Store instance using codeblock ID (not instanceId)
		this.instances.set(id, {
			component: tracker,
			codeblockId: id,
			eventRef,
			type: 'yearly',
			ctx,
			el,
			lastKnownPeriod: initialYear,
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
		ctx.addChild(renderChild);

	} catch (error) {
			logger.error('[YearlyTrackerCodeBlockProcessor] Error:', error);
			el.createEl('div', {
				text: `Error: ${error.message}`,
				cls: 'note-insight-error'
			});
		}
	}

	/**
	 * Parse yearly configuration from code block source
	 */
	private parseConfig(source: string): YearlyCodeBlockConfig | null {
		const config = this.parseCodeBlockConfig(source);

		// Extract and validate required fields
		const id = config.id as string | undefined;
		const notePath = config.notePath as string | undefined;
		const selectedYearStr = config.selectedYear as string | undefined;

		// ID is required (written by insert command)
		if (!id) {
			return null;
		}

		if (!notePath) {
			return null;
		}

		// Parse selectedYear if provided
		let selectedYear: number | undefined = undefined;
		if (selectedYearStr) {
			const year = parseInt(selectedYearStr, 10);
			if (!isNaN(year)) {
				selectedYear = year;
			}
		}

		return { id, notePath, selectedYear };
	}

	/**
	 * Handle year selection change
	 */
	private async onYearChanged(
		ctx: MarkdownPostProcessorContext,
		instanceId: string,
		newYear: number
	): Promise<void> {
		const instance = this.instances.get(instanceId);
		if (!instance || instance.isUpdatingCodeblock) {
			return;
		}

		if (instance.lastKnownPeriod === newYear) {
			return;
		}

		instance.isUpdatingCodeblock = true;

		try {
			await this.updateCodeblockProperty(ctx, instance, 'selectedYear', newYear);
		} finally {
			setTimeout(() => {
				instance.isUpdatingCodeblock = false;
			}, 100);
		}
	}
}
