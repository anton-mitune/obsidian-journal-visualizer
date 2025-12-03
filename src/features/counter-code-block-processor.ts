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
	notePath?: string | string[];
	watchMode?: WatchMode; // FEA009: watch mode (note or folder)
	folderPath?: string | string[]; // FEA009: folder path for folder watching
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
		// Obsidian API expects callback matching their handler signature
		// The API doesn't have proper TypeScript definitions for this method
		 
		this.plugin.registerMarkdownCodeBlockProcessor(
			'note-insight-counter',
			this.process.bind(this)
		);
	}

	/**
	 * Process a counter code block
	 */
	process(
		source: string,
		el: HTMLElement,
		ctx: MarkdownPostProcessorContext
	): void {
		try {
			// Parse configuration
			const config = this.parseConfig(source);
			if (!config) {
				el.createEl('div', {
					text: 'Error: note path or note paths not specified',
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
					text: 'Error: note path or folder path must be specified',
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
			void counter.updateWatchedItems({ 
				notePath: config.notePath,
				displayAs: initialDisplayMode,
				watchMode: initialWatchMode,
				folderPath: config.folderPath
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
					void counter.updateWatchedItems({ 
						notePath: instance.notePath,
						displayAs: currentDisplayMode
					});
			} else if (config.folderPath) {
				// Trigger re-render by updating with the same folder path
				void counter.updateWatchedItems({
					folderPath: config.folderPath,
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
			let errorMessage = 'Error rendering counter';
			if (error instanceof Error) {
				errorMessage = `Error rendering counter: ${error.message}`;
			}
			el.createEl('div', {
				text: errorMessage,
				cls: 'note-insight-error'
			});
		}
	}
	/**
	 * Parse counter configuration from code block source
	 */
	private parseConfig(source: string): CounterCodeBlockConfig | null {
		const rawConfig = this.parseCodeBlockConfig(source);
		const config: Record<string, string | string[]> = {};

		// Validate and convert id (required)
		if (typeof rawConfig.id !== 'string' || !rawConfig.id) {
			throw new Error(`Invalid code block config: missing required 'id' property`);
		}
		config.id = rawConfig.id;

		// Convert notePath to string array
		if (typeof rawConfig.notePath === 'string') {
			config.notePath = [rawConfig.notePath];
		} else if (Array.isArray(rawConfig.notePath)) {
			config.notePath = rawConfig.notePath;
		} else {
			config.notePath = [];
		}

		// FEA009: Parse watchMode - default to 'note' for backward compatibility
		if (rawConfig.watchMode && Object.values(WatchMode).includes(rawConfig.watchMode as WatchMode)) {
			config.watchMode = rawConfig.watchMode as WatchMode;
		} else {
			config.watchMode = WatchMode.NOTE;
		}

		// FEA009: Parse folderPath - keep as string if present, undefined otherwise
		if (typeof rawConfig.folderPath === 'string') {
			// Only set folderPath if it's a non-empty string and not the literal 'undefined'
			if (rawConfig.folderPath && rawConfig.folderPath !== 'undefined') {
				config.folderPath = rawConfig.folderPath;
			}
		} else if (rawConfig.folderPath) {
			// Convert non-string values to string if present
			const folderPathStr = JSON.stringify(rawConfig.folderPath);
			if (folderPathStr && folderPathStr !== 'undefined') {
				config.folderPath = folderPathStr;
			}
		}

		// Parse selectedPeriod with validation
		if (rawConfig.selectedPeriod && Object.values(TimePeriod).includes(rawConfig.selectedPeriod as TimePeriod)) {
			config.selectedPeriod = rawConfig.selectedPeriod as TimePeriod;
		} else {
			config.selectedPeriod = TimePeriod.PAST_30_DAYS;
		}

		// Parse displayMode with validation
		if (rawConfig.displayMode && Object.values(DisplayMode).includes(rawConfig.displayMode as DisplayMode)) {
			config.displayMode = rawConfig.displayMode as DisplayMode;
		} else {
			config.displayMode = DisplayMode.DEFAULT;
		}

		// if watchMode is not valid enum value, make it undefined


		// Return typed config as CounterCodeBlockConfig
		this.config = {
			id: config.id,
			notePath: config.notePath,
			watchMode: Object.values(WatchMode).includes(config.watchMode as WatchMode) ? config.watchMode as WatchMode : WatchMode.NOTE,
			folderPath: config.folderPath,
			selectedPeriod: Object.values(TimePeriod).includes(config.selectedPeriod as TimePeriod) ? config.selectedPeriod as TimePeriod : TimePeriod.PAST_30_DAYS,
			displayAs: Object.values(DisplayMode).includes(config.displayMode as DisplayMode) ? config.displayMode as DisplayMode : DisplayMode.DEFAULT
		}
		return JSON.parse(JSON.stringify(this.config)) as CounterCodeBlockConfig;
	}

	/**
	 * Handle period selection change
	 */
	private onPeriodChanged(
		ctx: MarkdownPostProcessorContext,
		instanceId: string,
		newPeriod: TimePeriod
	): void {
		const instance = this.instances.get(instanceId);
		logger.warn('[CounterCodeBlockProcessor] Period changing to', newPeriod, 'for instance', instanceId, instance);
		if (!instance || instance.isUpdatingCodeblock) {
			return;
		}

		if (instance.lastKnownPeriod === newPeriod) {
			return;
		}

		instance.isUpdatingCodeblock = true;

		this.updateCodeblockProperty(ctx, instance, 'selectedPeriod', newPeriod).catch(() => {});
		window.setTimeout(() => {
			instance.isUpdatingCodeblock = false;
		}, 100);
	}

	/**
	 * Handle display mode change (FEA007)
	 */
	private onDisplayModeChanged(
		ctx: MarkdownPostProcessorContext,
		instanceId: string,
		newMode: DisplayMode
	): void {
		const instance = this.instances.get(instanceId);
		if (!instance || instance.isUpdatingCodeblock) {
			return;
		}

		instance.isUpdatingCodeblock = true;

		this.updateCodeblockProperty(ctx, instance, 'displayAs', newMode).catch(() => {});
		setTimeout(() => {
			instance.isUpdatingCodeblock = false;
		}, 100);
	}

	/**
	 * Handle note added
	 */
	private onNoteAdded(
		ctx: MarkdownPostProcessorContext,
		instanceId: string,
		notePath: string
	): void {
		logger.log('[CounterCodeBlockProcessor] Adding note to watch list:', notePath);
		const instance = this.instances.get(instanceId);

		if (!instance || instance.isUpdatingCodeblock) {
			return;
		}

		instance.isUpdatingCodeblock = true;

		if (this.config?.notePath) {
			const notePathArray = Array.isArray(this.config.notePath) ? this.config.notePath : [this.config.notePath];
			if (!notePathArray.includes(notePath)) {
				notePathArray.push(notePath);
				this.config.notePath = notePathArray;
				this.updateCodeblockProperty(ctx, instance, 'notePath', this.config.notePath).catch(() => {});
			}
		}
		setTimeout(() => {
			instance.isUpdatingCodeblock = false;
		}, 100);
	}

	/**
	 * Handle note removed
	 */
	private onNoteRemoved(
		ctx: MarkdownPostProcessorContext,
		instanceId: string,
		notePath: string
	): void {
		const instance = this.instances.get(instanceId);
		if (!instance || instance.isUpdatingCodeblock) {
			return;
		}

		instance.isUpdatingCodeblock = true;

		if (this.config?.notePath) {
			const notePathArray = Array.isArray(this.config.notePath) ? this.config.notePath : [this.config.notePath];
			if (notePathArray.includes(notePath)) {
				const filtered = notePathArray.filter((p: string) => p !== notePath);
				this.config.notePath = filtered;
				this.updateCodeblockProperty(ctx, instance, 'notePath', this.config.notePath).catch(() => {});
			}
		}
		setTimeout(() => {
			instance.isUpdatingCodeblock = false;
		}, 100);
	}

	/**
	 * Handle watch mode change (FEA009)
	 */
	private onWatchModeChanged(
		ctx: MarkdownPostProcessorContext,
		instanceId: string,
		newMode: WatchMode
	): void {
		const instance = this.instances.get(instanceId);
		if (!instance || instance.isUpdatingCodeblock) {
			return;
		}

		instance.isUpdatingCodeblock = true;

		this.updateCodeblockProperty(ctx, instance, 'watchMode', newMode).catch(() => {});
		setTimeout(() => {
			instance.isUpdatingCodeblock = false;
		}, 100);
	}

	/**
	 * Handle folder added (FEA009)
	 */
	private onFolderAdded(
		ctx: MarkdownPostProcessorContext,
		instanceId: string,
		folderPath: string
	): void {
		const instance = this.instances.get(instanceId);
		if (!instance || instance.isUpdatingCodeblock) {
			return;
		}

		instance.isUpdatingCodeblock = true;

		this.updateCodeblockProperty(ctx, instance, 'folderPath', folderPath).catch(() => {});
		setTimeout(() => {
			instance.isUpdatingCodeblock = false;
		}, 100);
	}

	/**
	 * Handle folder removed (FEA009)
	 */
	private onFolderRemoved(
		ctx: MarkdownPostProcessorContext,
		instanceId: string
	): void {
		const instance = this.instances.get(instanceId);
		if (!instance || instance.isUpdatingCodeblock) {
			return;
		}

		instance.isUpdatingCodeblock = true;

		// Remove folderPath property by writing empty string array
		this.updateCodeblockProperty(ctx, instance, 'folderPath', []).catch(() => {});
		setTimeout(() => {
			instance.isUpdatingCodeblock = false;
		}, 100);
	}
}

