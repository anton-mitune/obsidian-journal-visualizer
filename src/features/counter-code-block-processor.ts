import { App, Plugin, MarkdownPostProcessorContext, TFile, Notice } from 'obsidian';
import { BaseCodeBlockProcessor, CodeBlockInstance } from './base-code-block-processor';
import { BacklinkCounterComponent } from '../ui/backlink-counter-component';
import { BacklinkAnalysisService } from '../services/backlink-analysis-service';
import { TimePeriod, DisplayMode } from '../types';
import { MAX_WATCHED_NOTES } from '../constants';

/**
 * Configuration parsed from counter code block
 */
interface CounterCodeBlockConfig {
	id: string; // Required - written by insert command
	notePath?: string[];
	selectedPeriod?: TimePeriod;
	displayAs?: DisplayMode; // FEA007: Display mode support
}

/**
 * Processes note-insight-counter code blocks
 * Handles backlink counter component rendering and persistence
 */
export class CounterCodeBlockProcessor extends BaseCodeBlockProcessor {
	private analysisService: BacklinkAnalysisService;
	private config?: CounterCodeBlockConfig;

	constructor(
		app: App,
		plugin: Plugin,
		analysisService: BacklinkAnalysisService
	) {
		super(app, plugin);
		this.analysisService = analysisService;
	}

	/**
	 * Register the counter code block processor
	 */
	register(): void {
		this.plugin.registerMarkdownCodeBlockProcessor(
			'note-insight-counter',
			this.process.bind(this)
		);
	}

	/**
	 * Process a counter code block
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
					text: 'Error: notePath or notePaths not specified',
					cls: 'note-insight-error'
				});
				return;
			}
		
			// Validate required fields
			if (!config.notePath || config.notePath.length === 0) {
				el.createEl('div', {
					text: 'Error: notePath must be specified',
					cls: 'note-insight-error'
				});
				return;
			}

			if (!config.id) {
				el.createEl('div', {
					text: 'Error: codeblock ID missing. Please insert codeblock using the context menu.',
					cls: 'note-insight-error'
				});
				return;
			}

			// Create container
			const container = el.createEl('div', { cls: 'note-insight-code-block counter' });
			const counterContainer = container.createEl('div', { cls: 'backlink-counter-wrapper' });

			// Create component with callbacks
			const counter = new BacklinkCounterComponent(
				counterContainer,
				this.app,
				this.analysisService.getClassifier(),
				this.analysisService,
				(period: TimePeriod) => this.onPeriodChanged(ctx, config.id, period),
				(notePath: string) => this.onNoteAdded(ctx, config.id, notePath),
				(notePath: string) => this.onNoteRemoved(ctx, config.id, notePath),
				(mode: DisplayMode) => this.onDisplayModeChanged(ctx, config.id, mode)
			);

			// Set initial period and display mode
			const initialPeriod = config.selectedPeriod ?? TimePeriod.PAST_30_DAYS;
			const initialDisplayMode = config.displayAs ?? DisplayMode.DEFAULT;
			counter.setSelectedPeriod(initialPeriod);
			counter.setDisplayMode(initialDisplayMode);

			// Configure watched items (always use notePaths array) with display mode
			counter.updateWatchedItems({ 
				notePath: config.notePath,
				displayAs: initialDisplayMode
			});
			// Register metadata-cache listener for auto-refresh
			const eventRef = this.app.metadataCache.on('resolved', () => {
				const instance = this.instances.get(config.id);
				if (!instance || instance.isUpdatingCodeblock) {
					return;
				}

				// Re-calculate counts for the watched notes
				// Use updateWatchedItems to properly refresh all watched notes with current display mode
				if (instance.notePath && instance.notePath.length > 0) {
					const currentDisplayMode = config.displayAs ?? DisplayMode.DEFAULT;
					counter.updateWatchedItems({ 
						notePath: instance.notePath,
						displayAs: currentDisplayMode
					});
				}
			});

			this.plugin.registerEvent(eventRef);

			// Store instance
			this.instances.set(config.id, {
				component: counter,
				codeblockId: config.id,
				eventRef,
				type: 'counter',
				ctx,
				el,
				lastKnownPeriod: initialPeriod,
				isUpdatingCodeblock: false,
				notePath: config.notePath // Store watched notes for metadata listener
			});
		} catch (error) {
			console.error('[CounterCodeBlockProcessor] Error:', error);
			el.createEl('div', {
				text: `Error rendering counter: ${error.message}`,
				cls: 'note-insight-error'
			});
		}
	}
	/**
	 * Parse counter configuration from code block source
	 */
	private parseConfig(source: string): CounterCodeBlockConfig | null {
		let config = this.parseCodeBlockConfig(source);

		// validate config format against expected types
		// if id is not present, error, we won't be able to update later
		if (!config['id']) {
			throw new Error(`Invalid code block config: missing required 'id' property`);
		}
		// check if notePath is a string, make it an array
		if (config['notePath'] && typeof config['notePath'] === 'string') {
			config['notePath'] = [config['notePath']];
		}
		// if notepath is undefined or not a string, make it empty array
		if (!config['notePath'] || !(typeof config['notePath'] === 'string' || Array.isArray(config['notePath']))) {
			config['notePath'] = [];
		}
		// if selected period is not set or not one of the enum values, set acceptable default
		if (!config['selectedPeriod'] || !Object.values(TimePeriod).includes(config['selectedPeriod'])) {
			config['selectedPeriod'] = TimePeriod.PAST_30_DAYS;
		}
		// if display mode is not set or not one of the enum values, set acceptable default
		if (!config['displayMode'] || !Object.values(DisplayMode).includes(config['displayMode'])) {
			config['displayMode'] = DisplayMode.DEFAULT;
		}

		// return typed config as CounterCodeBlockConfig
		this.config = config as CounterCodeBlockConfig;
		return config as CounterCodeBlockConfig
	}

	/**
	 * Handle period selection change
	 */
	private async onPeriodChanged(
		ctx: MarkdownPostProcessorContext,
		instanceId: string,
		newPeriod: TimePeriod
	): Promise<void> {
		const instance = this.instances.get(instanceId);
		console.warn('[CounterCodeBlockProcessor] Period changing to', newPeriod, 'for instance', instanceId, instance);
		if (!instance || instance.isUpdatingCodeblock) {
			return;
		}

		if (instance.lastKnownPeriod === newPeriod) {
			return;
		}

		instance.isUpdatingCodeblock = true;


		try {
			await this.updateCodeblockProperty(ctx, instance, 'selectedPeriod', newPeriod);
		} finally {
			setTimeout(() => {
				instance.isUpdatingCodeblock = false;
			}, 100);
		}
	}

	/**
	 * Handle display mode change (FEA007)
	 */
	private async onDisplayModeChanged(
		ctx: MarkdownPostProcessorContext,
		instanceId: string,
		newMode: DisplayMode
	): Promise<void> {
		const instance = this.instances.get(instanceId);
		if (!instance || instance.isUpdatingCodeblock) {
			return;
		}

		instance.isUpdatingCodeblock = true;

		try {
			await this.updateCodeblockProperty(ctx, instance, 'displayAs', newMode);
		} finally {
			setTimeout(() => {
				instance.isUpdatingCodeblock = false;
			}, 100);
		}
	}

	/**
	 * Handle note added
	 */
	private async onNoteAdded(
		ctx: MarkdownPostProcessorContext,
		instanceId: string,
		notePath: string
	): Promise<void> {
		console.log('[CounterCodeBlockProcessor] Adding note to watch list:', notePath);
		const instance = this.instances.get(instanceId);

		if (!instance || instance.isUpdatingCodeblock) {
			return;
		}

		instance.isUpdatingCodeblock = true;

		try {
			if (this.config?.notePath?.includes(notePath) === false) {
				this.config.notePath.push(notePath);
				await this.updateCodeblockProperty(ctx, instance, 'notePath', this.config.notePath);
			}
		} finally {
			setTimeout(() => {
				instance.isUpdatingCodeblock = false;
			}, 100);
		}
	}

	/**
	 * Handle note removed
	 */
	private async onNoteRemoved(
		ctx: MarkdownPostProcessorContext,
		instanceId: string,
		notePath: string
	): Promise<void> {
		const instance = this.instances.get(instanceId);
		if (!instance || instance.isUpdatingCodeblock) {
			return;
		}

		instance.isUpdatingCodeblock = true;

		try {
			if (this.config?.notePath?.includes(notePath)) {
				this.config.notePath = this.config.notePath.filter(p => p !== notePath);
				await this.updateCodeblockProperty(ctx, instance, 'notePath', this.config.notePath);
			}
		} finally {
			setTimeout(() => {
				instance.isUpdatingCodeblock = false;
			}, 100);
		}
	}
}
