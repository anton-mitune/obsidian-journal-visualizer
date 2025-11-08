import { App, MarkdownPostProcessorContext, Plugin, TFile, EventRef, MarkdownRenderChild } from 'obsidian';
import { BacklinkAnalysisService } from '../services/backlink-analysis-service';
import { YearlyTrackerComponent } from '../ui/yearly-tracker-component';
import { MonthlyTrackerComponent } from '../ui/monthly-tracker-component';
import { BacklinkCounterComponent } from '../ui/backlink-counter-component';
import { UserNotifier } from '../utils/user-notifier';
import { CanvasUpdater } from '../utils/canvas-updater';
import { NoteUpdater } from '../utils/note-updater';
import { TimePeriod } from '../types';

/**
 * Parsed code block configuration
 */
interface YearlyCodeBlockConfig {
	notePath: string;
	selectedYear?: number;
}

interface MonthlyCodeBlockConfig {
	notePath: string;
	selectedMonth?: string; // Format: YYYY-MM
}

interface CounterCodeBlockConfig {
	notePath: string;
	selectedPeriod?: TimePeriod;
}

/**
 * Metadata for tracking a rendered code block and its refresh lifecycle
 */
interface CodeBlockInstance {
	component: YearlyTrackerComponent | MonthlyTrackerComponent | BacklinkCounterComponent;
	notePath: string;
	eventRef: EventRef;
	type: 'yearly' | 'monthly' | 'counter';
	ctx: MarkdownPostProcessorContext;
	el: HTMLElement; // The original code block element
	lastKnownPeriod: number | string | TimePeriod; // year number for yearly, "YYYY-MM" for monthly, TimePeriod for counter
	isUpdatingCodeblock: boolean; // Flag to prevent infinite loops
}

/**
 * Registers and manages custom code block rendering for note insight components
 * Processes code blocks like:
 * ```note-insight-yearly
 * notePath: Vault/Path/to/Note.md
 * ```
 */
export class NoteInsightCodeBlockProcessor {
	private app: App;
	private plugin: Plugin;
	private analysisService: BacklinkAnalysisService;
	private instances: Map<string, CodeBlockInstance> = new Map();
	private userNotifier: UserNotifier;
	private canvasUpdater: CanvasUpdater;
	private noteUpdater: NoteUpdater;

	constructor(app: App, plugin: Plugin, analysisService: BacklinkAnalysisService) {
		this.app = app;
		this.plugin = plugin;
		this.analysisService = analysisService;
		this.userNotifier = new UserNotifier();
		this.canvasUpdater = new CanvasUpdater(app);
		this.noteUpdater = new NoteUpdater(app);
	}

	/**
	 * Register code block processors for note-insight-yearly and note-insight-monthly
	 */
	register(): void {
		this.plugin.registerMarkdownCodeBlockProcessor(
			'note-insight-yearly',
			this.processYearlyBlock.bind(this)
		);

		this.plugin.registerMarkdownCodeBlockProcessor(
			'note-insight-monthly',
			this.processMonthlyBlock.bind(this)
		);

		this.plugin.registerMarkdownCodeBlockProcessor(
			'note-insight-counter',
			this.processCounterBlock.bind(this)
		);
	}

	/**
	 * Cleanup all instances and event listeners
	 */
	cleanup(): void {
		for (const [id, instance] of this.instances.entries()) {
			this.app.workspace.offref(instance.eventRef);
		}
		this.instances.clear();
	}

	/**
	 * Process note-insight-yearly code blocks
	 */
	private async processYearlyBlock(
		source: string,
		el: HTMLElement,
		ctx: MarkdownPostProcessorContext
	): Promise<void> {
		try {
			// Parse configuration from the code block
			const config = this.parseYearlyConfig(source);
			if (!config) {
				el.createEl('div', {
					text: 'Error: notePath not specified',
					cls: 'note-insight-error'
				});
				return;
			}

			const { notePath, selectedYear } = config;

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
			const yearBounds = this.analysisService.getYearBounds(file as any);

			// Generate unique ID for this instance
			const instanceId = `yearly-${ctx.sourcePath}-${Date.now()}-${Math.random()}`;

			// Create container for the component
			const container = el.createEl('div', { cls: 'note-insight-code-block yearly' });
			
			// Add title
			container.createEl('h4', { text: noteInfo.noteTitle, cls: 'note-insight-title' });

			// Create yearly tracker component with callback
			const trackerContainer = container.createEl('div', { cls: 'yearly-tracker-wrapper' });
			const tracker = new YearlyTrackerComponent(trackerContainer, (year: number) => {
				// User changed the year - update the codeblock
				this.updateCodeBlockSource(ctx, instanceId, year);
			});
			
			// Set year bounds and data
			tracker.setYearBounds(yearBounds);
			tracker.updateData(noteInfo.yearlyData);

			// Set the selected year if provided in config
			const initialYear = selectedYear ?? new Date().getFullYear();
			tracker.setCurrentYear(initialYear);

			// Register metadata-cache:resolved event listener to refresh component when watched note's backlinks change
			const eventRef = this.app.metadataCache.on('resolved', () => {
				const instance = this.instances.get(instanceId);
				if (!instance || instance.isUpdatingCodeblock) {
					return; // Skip if we're updating the codeblock
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

			// Register the event with the plugin for proper cleanup
			this.plugin.registerEvent(eventRef);

			// Store instance for cleanup
			this.instances.set(instanceId, {
				component: tracker,
				notePath,
				eventRef,
				type: 'yearly',
				ctx,
				el,
				lastKnownPeriod: initialYear,
				isUpdatingCodeblock: false
			});

			// Register cleanup when section is unloaded
			const renderChild = new MarkdownRenderChild(container);
			renderChild.onunload = () => {
				const instance = this.instances.get(instanceId);
				if (instance) {
					this.app.workspace.offref(instance.eventRef);
					this.instances.delete(instanceId);
				}
			};
			ctx.addChild(renderChild);

		} catch (error) {
			console.error('Error processing note-insight-yearly block:', error);
			el.createEl('div', {
				text: `Error: ${error.message}`,
				cls: 'note-insight-error'
			});
		}
	}

	/**
	 * Process note-insight-monthly code blocks
	 */
	private async processMonthlyBlock(
		source: string,
		el: HTMLElement,
		ctx: MarkdownPostProcessorContext
	): Promise<void> {
		try {
			// Parse configuration from the code block
			const config = this.parseMonthlyConfig(source);
			if (!config) {
				el.createEl('div', {
					text: 'Error: notePath not specified',
					cls: 'note-insight-error'
				});
				return;
			}

			const { notePath, selectedMonth } = config;

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
			const monthlyData = this.analysisService.getMonthlyData(file as any, initialMonth, initialYear);
			
			// Get month bounds
			const monthBounds = this.analysisService.getMonthBounds(file as any);

			// Generate unique ID for this instance
			const instanceId = `monthly-${ctx.sourcePath}-${Date.now()}-${Math.random()}`;

			// Create container for the component
			const container = el.createEl('div', { cls: 'note-insight-code-block monthly' });
			
			// Add title
			const noteTitle = file.name.replace(/\.md$/, '');
			container.createEl('h4', { text: noteTitle, cls: 'note-insight-title' });

			// Create monthly tracker component with callback
			const trackerContainer = container.createEl('div', { cls: 'monthly-tracker-wrapper' });
			const tracker = new MonthlyTrackerComponent(trackerContainer, (month: number, year: number) => {
				// User changed the month - update the codeblock
				const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`;
				this.updateCodeBlockSource(ctx, instanceId, monthStr);
			});
			
			// Set month bounds and data
			tracker.setMonthBounds(monthBounds);
			tracker.updateData(monthlyData);
			tracker.setCurrentMonth(initialMonth, initialYear);

			// Register metadata-cache:resolved event listener to refresh component when watched note's backlinks change
			const eventRef = this.app.metadataCache.on('resolved', () => {
				const instance = this.instances.get(instanceId);
				if (!instance || instance.isUpdatingCodeblock) {
					return; // Skip if we're updating the codeblock
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

			// Register the event with the plugin for proper cleanup
			this.plugin.registerEvent(eventRef);

			// Store instance for cleanup
			const initialMonthStr = `${initialYear}-${String(initialMonth + 1).padStart(2, '0')}`;
			this.instances.set(instanceId, {
				component: tracker,
				notePath,
				eventRef,
				type: 'monthly',
				ctx,
				el,
				lastKnownPeriod: initialMonthStr,
				isUpdatingCodeblock: false
			});

			// Register cleanup when section is unloaded
			const renderChild = new MarkdownRenderChild(container);
			renderChild.onunload = () => {
				const instance = this.instances.get(instanceId);
				if (instance) {
					this.app.workspace.offref(instance.eventRef);
					this.instances.delete(instanceId);
				}
			};
			ctx.addChild(renderChild);

		} catch (error) {
			console.error('Error processing note-insight-monthly block:', error);
			el.createEl('div', {
				text: `Error: ${error.message}`,
				cls: 'note-insight-error'
			});
		}
	}

	/**
	 * Process note-insight-counter code blocks
	 */
	private async processCounterBlock(
		source: string,
		el: HTMLElement,
		ctx: MarkdownPostProcessorContext
	): Promise<void> {
		try {
			// Parse configuration from the code block
			const config = this.parseCounterConfig(source);
			if (!config) {
				el.createEl('div', {
					text: 'Error: notePath not specified',
					cls: 'note-insight-error'
				});
				return;
			}

			const { notePath, selectedPeriod } = config;

			// Get the file
			const file = this.app.vault.getAbstractFileByPath(notePath);
			if (!file) {
				el.createEl('div', {
					text: `Error: Note not found: ${notePath}`,
					cls: 'note-insight-error'
				});
				return;
			}

			// Get backlinks for the note
			const backlinks = this.analysisService.getBacklinksForFile(file as TFile);

			// Generate unique ID for this instance
			const instanceId = `counter-${ctx.sourcePath}-${Date.now()}-${Math.random()}`;

			// Create container for the component
			const container = el.createEl('div', { cls: 'note-insight-code-block counter' });
			
			// Add title
			const noteTitle = file.name.replace(/\.md$/, '');
			container.createEl('h4', { text: noteTitle, cls: 'note-insight-title' });

			// Create counter component with callback
			const counterContainer = container.createEl('div', { cls: 'backlink-counter-wrapper' });
			const counter = new BacklinkCounterComponent(
				counterContainer,
				this.analysisService.getClassifier(),
				(period: TimePeriod) => {
					// User changed the period - update the codeblock
					this.updateCodeBlockSource(ctx, instanceId, period);
				}
			);
			
			// Set data and initial period
			counter.updateData(backlinks);
			const initialPeriod = selectedPeriod ?? TimePeriod.PAST_30_DAYS;
			counter.setSelectedPeriod(initialPeriod);

			// Register metadata-cache:resolved event listener to refresh component when watched note's backlinks change
			const eventRef = this.app.metadataCache.on('resolved', () => {
				const instance = this.instances.get(instanceId);
				if (!instance || instance.isUpdatingCodeblock) {
					return; // Skip if we're updating the codeblock
				}

				// Re-analyze the watched note and update the component
				const updatedFile = this.app.vault.getAbstractFileByPath(notePath);
				if (updatedFile) {
					const updatedBacklinks = this.analysisService.getBacklinksForFile(updatedFile as TFile);
					counter.updateData(updatedBacklinks);
				}
			});

			// Register the event with the plugin for proper cleanup
			this.plugin.registerEvent(eventRef);

			// Store instance for cleanup
			this.instances.set(instanceId, {
				component: counter,
				notePath,
				eventRef,
				type: 'counter',
				ctx,
				el,
				lastKnownPeriod: initialPeriod,
				isUpdatingCodeblock: false
			});

			// Register cleanup when section is unloaded
			const renderChild = new MarkdownRenderChild(container);
			renderChild.onunload = () => {
				const instance = this.instances.get(instanceId);
				if (instance) {
					this.app.workspace.offref(instance.eventRef);
					this.instances.delete(instanceId);
				}
			};
			ctx.addChild(renderChild);

		} catch (error) {
			console.error('Error processing note-insight-counter block:', error);
			el.createEl('div', {
				text: `Error: ${error.message}`,
				cls: 'note-insight-error'
			});
		}
	}

	/**
	 * Parse the notePath from code block content
	 * Expected format: "notePath: Vault/Path/to/Note.md"
	 */
	private parseNotePath(source: string): string | null {
		const lines = source.trim().split('\n');
		for (const line of lines) {
			const trimmedLine = line.trim();
			if (trimmedLine.startsWith('notePath:')) {
				const path = trimmedLine.substring('notePath:'.length).trim();
				return path;
			}
		}
		return null;
	}

	/**
	 * Parse yearly code block configuration
	 * Expected format:
	 * notePath: Vault/Path/to/Note.md
	 * selectedYear: 2024
	 */
	private parseYearlyConfig(source: string): YearlyCodeBlockConfig | null {
		const lines = source.trim().split('\n');
		let notePath: string | null = null;
		let selectedYear: number | undefined = undefined;

		for (const line of lines) {
			const trimmedLine = line.trim();
			if (trimmedLine.startsWith('notePath:')) {
				notePath = trimmedLine.substring('notePath:'.length).trim();
			} else if (trimmedLine.startsWith('selectedYear:')) {
				const yearStr = trimmedLine.substring('selectedYear:'.length).trim();
				const year = parseInt(yearStr, 10);
				if (!isNaN(year)) {
					selectedYear = year;
				}
			}
		}

		if (!notePath) {
			return null;
		}

		return { notePath, selectedYear };
	}

	/**
	 * Parse monthly code block configuration
	 * Expected format:
	 * notePath: Vault/Path/to/Note.md
	 * selectedMonth: 2024-03
	 */
	private parseMonthlyConfig(source: string): MonthlyCodeBlockConfig | null {
		const lines = source.trim().split('\n');
		let notePath: string | null = null;
		let selectedMonth: string | undefined = undefined;

		for (const line of lines) {
			const trimmedLine = line.trim();
			if (trimmedLine.startsWith('notePath:')) {
				notePath = trimmedLine.substring('notePath:'.length).trim();
			} else if (trimmedLine.startsWith('selectedMonth:')) {
				selectedMonth = trimmedLine.substring('selectedMonth:'.length).trim();
			}
		}

		if (!notePath) {
			return null;
		}

		return { notePath, selectedMonth };
	}

	/**
	 * Parse counter code block configuration
	 * Expected format:
	 * notePath: Vault/Path/to/Note.md
	 * selectedPeriod: past-30-days
	 */
	private parseCounterConfig(source: string): CounterCodeBlockConfig | null {
		const lines = source.trim().split('\n');
		let notePath: string | null = null;
		let selectedPeriod: TimePeriod | undefined = undefined;

		for (const line of lines) {
			const trimmedLine = line.trim();
			if (trimmedLine.startsWith('notePath:')) {
				notePath = trimmedLine.substring('notePath:'.length).trim();
			} else if (trimmedLine.startsWith('selectedPeriod:')) {
				const periodStr = trimmedLine.substring('selectedPeriod:'.length).trim() as TimePeriod;
				// Validate it's a valid TimePeriod enum value
				if (Object.values(TimePeriod).includes(periodStr)) {
					selectedPeriod = periodStr;
				}
			}
		}

		if (!notePath) {
			return null;
		}

		return { notePath, selectedPeriod };
	}

	/**
	 * Update the code block source in the file to persist period selection
	 */
	private async updateCodeBlockSource(
		ctx: MarkdownPostProcessorContext,
		instanceId: string,
		newPeriod: number | string
	): Promise<void> {
		console.log('[updateCodeBlockSource] Called with:', { instanceId, newPeriod, sourcePath: ctx.sourcePath });
		
		const instance = this.instances.get(instanceId);
		if (!instance || instance.isUpdatingCodeblock) {
			console.log('[updateCodeBlockSource] Skipping - instance not found or already updating');
			return; // Prevent infinite loops
		}

		// Check if period actually changed
		if (instance.lastKnownPeriod === newPeriod) {
			console.log('[updateCodeBlockSource] Skipping - period unchanged');
			return; // No change needed
		}

		// Set flag to prevent infinite loops
		instance.isUpdatingCodeblock = true;

		try {
			// Empty sourcePath indicates we're in a canvas text node
			if (!ctx.sourcePath || ctx.sourcePath === '') {
				console.log('[updateCodeBlockSource] Empty sourcePath - attempting canvas update');
				await this.updateCanvasNodeCodeBlock(instance, newPeriod);
			} else {
				// Markdown file update
				console.log('[updateCodeBlockSource] Updating markdown file');
				await this.updateMarkdownFileCodeBlock(ctx, instance, newPeriod);
			}
		} finally {
			// Clear flag after a short delay to allow file processing to complete
			setTimeout(() => {
				instance.isUpdatingCodeblock = false;
			}, 100);
		}
	}

	/**
	 * Update code block in a canvas text node
	 */
	private async updateCanvasNodeCodeBlock(
		instance: CodeBlockInstance,
		newPeriod: number | string
	): Promise<void> {
		const result = await this.canvasUpdater.updateCodeblock({
			notePath: instance.notePath,
			trackerType: instance.type,
			newPeriod
		});

		if (result.success) {
			// Notify user if duplicates were found
			if (result.updatedNodeCount > 1) {
				this.userNotifier.notifyDuplicateCodeblocks(
					instance.type,
					instance.notePath,
					result.updatedNodeCount,
					'canvas'
				);
			}
			
			instance.lastKnownPeriod = newPeriod;
		} else {
			console.error('[updateCanvasNodeCodeBlock] Update failed:', result.error);
		}
	}

	/**
	 * Update code block in a markdown file
	 */
	private async updateMarkdownFileCodeBlock(
		ctx: MarkdownPostProcessorContext,
		instance: CodeBlockInstance,
		newPeriod: number | string
	): Promise<void> {
		const sectionInfo = ctx.getSectionInfo(instance.el);
		
		const result = await this.noteUpdater.updateCodeblock({
			sourcePath: ctx.sourcePath,
			notePath: instance.notePath,
			trackerType: instance.type,
			newPeriod,
			sectionInfo
		});

		if (result.success) {
			// Notify user if duplicates were found
			if (result.updatedCodeblockCount > 1) {
				this.userNotifier.notifyDuplicateCodeblocks(
					instance.type,
					instance.notePath,
					result.updatedCodeblockCount,
					'note'
				);
			}
			
			instance.lastKnownPeriod = newPeriod;
		} else {
			console.error('[updateMarkdownFileCodeBlock] Update failed:', result.error);
		}
	}
}
