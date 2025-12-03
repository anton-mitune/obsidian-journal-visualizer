import { App, Plugin, MarkdownPostProcessorContext, MarkdownRenderChild } from 'obsidian';
import { BaseCodeBlockProcessor } from './base-code-block-processor';
import { BacklinkCounterComponent } from '../ui/backlink-counter-component';
import { BacklinkAnalysisService } from '../services/backlink-analysis-service';
import { SettingsService } from '../services/settings-service';
import { TimePeriod, DisplayMode, WatchMode } from '../types';
import { debounce } from '../utils/debounce';
import { logger } from '../utils/logger';

/**
 * Configuration parsed from counter code block
 */
interface CounterCodeBlockConfig {
	id: string; // Required - written by insert command
	notePath?: string[];
	watchMode?: WatchMode; // FEA009: watch mode (note or folder)
	folderPath?: string; // FEA009: folder path for folder watching
	selectedPeriod?: TimePeriod;
	displayAs?: DisplayMode; // FEA007: Display mode support
}

/**
 * Processes note-insight-counter code blocks
 * Handles backlink counter component rendering and persistence
 */
export class CounterCodeBlockProcessor extends BaseCodeBlockProcessor {
	private analysisService: BacklinkAnalysisService;
	private settingsService: SettingsService;
	private config?: CounterCodeBlockConfig;

	constructor(
		app: App,
		plugin: Plugin,
		analysisService: BacklinkAnalysisService,
		settingsService: SettingsService
	) {
		super(app, plugin);
		this.analysisService = analysisService;
		this.settingsService = settingsService;
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
			// FEA009: Allow empty state (no notePath and no folderPath) for mode toggle
			const hasNotes = config.notePath && config.notePath.length > 0;
			const hasFolder = config.folderPath && config.folderPath.length > 0;
			const isEmptyState = !hasNotes && !hasFolder;
			
			// Empty state is allowed - it shows the mode toggle UI
			// Other states require either notes or folder path
			if (!isEmptyState && !hasNotes && !hasFolder) {
				el.createEl('div', {
					text: 'Error: notePath or folderPath must be specified',
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

			// Cleanup existing instance if any (prevents memory leaks)
			this.cleanupInstance(config.id);

			// Create container
			const container = el.createEl('div', { cls: 'note-insight-code-block counter' });
			const counterContainer = container.createEl('div', { cls: 'backlink-counter-wrapper' });

			// Create component with callbacks (FEA009: Added folder watching callbacks)
			const counter = new BacklinkCounterComponent(
				counterContainer,
				this.app,
				this.analysisService.getClassifier(),
				this.analysisService,
				this.settingsService,
				(period: TimePeriod) => this.onPeriodChanged(ctx, config.id, period),
				(notePath: string) => this.onNoteAdded(ctx, config.id, notePath),
				(notePath: string) => this.onNoteRemoved(ctx, config.id, notePath),
				(mode: DisplayMode) => this.onDisplayModeChanged(ctx, config.id, mode),
				(mode: WatchMode) => this.onWatchModeChanged(ctx, config.id, mode),
				(folderPath: string) => this.onFolderAdded(ctx, config.id, folderPath),
				() => this.onFolderRemoved(ctx, config.id)
			);

			// Set initial period and display mode
			const initialPeriod = config.selectedPeriod ?? TimePeriod.PAST_30_DAYS;
			const initialDisplayMode = config.displayAs ?? DisplayMode.DEFAULT;
			// FEA009: Initialize watch mode (default to 'note' for backward compatibility)
			const initialWatchMode = config.watchMode ?? WatchMode.NOTE;
			counter.setSelectedPeriod(initialPeriod);
			counter.setDisplayMode(initialDisplayMode);

			// FEA009: Configure watched items with watchMode and folderPath
			// Convert folderPath string to array if present
			const folderPathArray = config.folderPath ? [config.folderPath] : undefined;
			counter.updateWatchedItems({ 
				notePath: config.notePath,
				displayAs: initialDisplayMode,
				watchMode: initialWatchMode,
				folderPath: folderPathArray
			});
			// Register metadata-cache listener for auto-refresh
			const eventRef = this.app.metadataCache.on('resolved', debounce(() => {
				const instance = this.instances.get(config.id);
				if (!instance || instance.isUpdatingCodeblock) {
					return;
				}

				// Re-calculate counts for the watched notes or folder
				// FEA009: Handle both note and folder modes
				const currentDisplayMode = config.displayAs ?? DisplayMode.DEFAULT;
				const hasNotes = instance.notePath && instance.notePath.length > 0;
				if (hasNotes) {
					counter.updateWatchedItems({ 
						notePath: instance.notePath,
						displayAs: currentDisplayMode
					});
				} else if (config.folderPath) {
					// Trigger re-render by updating with the same folder path
					counter.updateWatchedItems({
						folderPath: [config.folderPath],
						displayAs: currentDisplayMode,
						watchMode: WatchMode.FOLDER
					});
				}
			}, 5000));

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

			// Register cleanup
			const renderChild = new MarkdownRenderChild(container);
			renderChild.onunload = () => {
				this.cleanupInstance(config.id);
			};
			ctx.addChild(renderChild);
		} catch (error) {
			logger.error('[CounterCodeBlockProcessor] Error:', error);
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
		const config = this.parseCodeBlockConfig(source);

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
		
		// FEA009: Parse watchMode - default to 'note' for backward compatibility
		if (!config['watchMode'] || !Object.values(WatchMode).includes(config['watchMode'])) {
			config['watchMode'] = WatchMode.NOTE;
		}
		
		// FEA009: Parse folderPath - keep as string if present, undefined otherwise
		if (config['folderPath'] && typeof config['folderPath'] !== 'string') {
			config['folderPath'] = String(config['folderPath']);
		}
		// Ensure folderPath is either a string or undefined (not empty string)
		if (config['folderPath'] === '' || config['folderPath'] === 'undefined') {
			delete config['folderPath'];
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
		logger.warn('[CounterCodeBlockProcessor] Period changing to', newPeriod, 'for instance', instanceId, instance);
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
		logger.log('[CounterCodeBlockProcessor] Adding note to watch list:', notePath);
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

	/**
	 * Handle watch mode change (FEA009)
	 */
	private async onWatchModeChanged(
		ctx: MarkdownPostProcessorContext,
		instanceId: string,
		newMode: WatchMode
	): Promise<void> {
		const instance = this.instances.get(instanceId);
		if (!instance || instance.isUpdatingCodeblock) {
			return;
		}

		instance.isUpdatingCodeblock = true;

		try {
			await this.updateCodeblockProperty(ctx, instance, 'watchMode', newMode);
		} finally {
			setTimeout(() => {
				instance.isUpdatingCodeblock = false;
			}, 100);
		}
	}

	/**
	 * Handle folder added (FEA009)
	 */
	private async onFolderAdded(
		ctx: MarkdownPostProcessorContext,
		instanceId: string,
		folderPath: string
	): Promise<void> {
		const instance = this.instances.get(instanceId);
		if (!instance || instance.isUpdatingCodeblock) {
			return;
		}

		instance.isUpdatingCodeblock = true;

		try {
			await this.updateCodeblockProperty(ctx, instance, 'folderPath', folderPath);
		} finally {
			setTimeout(() => {
				instance.isUpdatingCodeblock = false;
			}, 100);
		}
	}

	/**
	 * Handle folder removed (FEA009)
	 */
	private async onFolderRemoved(
		ctx: MarkdownPostProcessorContext,
		instanceId: string
	): Promise<void> {
		const instance = this.instances.get(instanceId);
		if (!instance || instance.isUpdatingCodeblock) {
			return;
		}

		instance.isUpdatingCodeblock = true;

		try {
			// Remove folderPath property by writing empty string array
			await this.updateCodeblockProperty(ctx, instance, 'folderPath', []);
		} finally {
			setTimeout(() => {
				instance.isUpdatingCodeblock = false;
			}, 100);
		}
	}
}

