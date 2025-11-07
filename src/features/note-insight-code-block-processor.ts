import { App, MarkdownPostProcessorContext, Plugin, TFile, EventRef, MarkdownRenderChild } from 'obsidian';
import { BacklinkAnalysisService } from '../services/backlink-analysis-service';
import { YearlyTrackerComponent } from '../ui/yearly-tracker-component';
import { MonthlyTrackerComponent } from '../ui/monthly-tracker-component';

/**
 * Metadata for tracking a rendered code block and its refresh lifecycle
 */
interface CodeBlockInstance {
	component: YearlyTrackerComponent | MonthlyTrackerComponent;
	notePath: string;
	eventRef: EventRef;
	type: 'yearly' | 'monthly';
	ctx: MarkdownPostProcessorContext;
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

	constructor(app: App, plugin: Plugin, analysisService: BacklinkAnalysisService) {
		this.app = app;
		this.plugin = plugin;
		this.analysisService = analysisService;
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
			// Parse the notePath from the code block
			const notePath = this.parseNotePath(source);
			if (!notePath) {
				el.createEl('div', {
					text: 'Error: notePath not specified',
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
			const yearBounds = this.analysisService.getYearBounds(file as any);

			// Create container for the component
			const container = el.createEl('div', { cls: 'note-insight-code-block yearly' });
			
			// Add title
			container.createEl('h4', { text: noteInfo.noteTitle, cls: 'note-insight-title' });

			// Create yearly tracker component
			const trackerContainer = container.createEl('div', { cls: 'yearly-tracker-wrapper' });
			const tracker = new YearlyTrackerComponent(trackerContainer);
			
			// Set year bounds and data
			tracker.setYearBounds(yearBounds);
			tracker.updateData(noteInfo.yearlyData);

			// Generate unique ID for this instance
			const instanceId = `yearly-${ctx.sourcePath}-${Date.now()}-${Math.random()}`;

			// Register metadata-cache:resolved event listener to refresh component when watched note's backlinks change
			const eventRef = this.app.metadataCache.on('resolved', () => {
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
				ctx
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
			// Parse the notePath from the code block
			const notePath = this.parseNotePath(source);
			if (!notePath) {
				el.createEl('div', {
					text: 'Error: notePath not specified',
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

			// Get current month/year for initial display
			const now = new Date();
			const currentMonth = now.getMonth();
			const currentYear = now.getFullYear();

			// Get monthly data
			const monthlyData = this.analysisService.getMonthlyData(file as any, currentMonth, currentYear);
			
			// Get month bounds
			const monthBounds = this.analysisService.getMonthBounds(file as any);

			// Create container for the component
			const container = el.createEl('div', { cls: 'note-insight-code-block monthly' });
			
			// Add title
			const noteTitle = file.name.replace(/\.md$/, '');
			container.createEl('h4', { text: noteTitle, cls: 'note-insight-title' });

			// Create monthly tracker component
			const trackerContainer = container.createEl('div', { cls: 'monthly-tracker-wrapper' });
			const tracker = new MonthlyTrackerComponent(trackerContainer);
			
			// Set month bounds and data
			tracker.setMonthBounds(monthBounds);
			tracker.updateData(monthlyData);

			// Generate unique ID for this instance
			const instanceId = `monthly-${ctx.sourcePath}-${Date.now()}-${Math.random()}`;

			// Register metadata-cache:resolved event listener to refresh component when watched note's backlinks change
			const eventRef = this.app.metadataCache.on('resolved', () => {
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
			this.instances.set(instanceId, {
				component: tracker,
				notePath,
				eventRef,
				type: 'monthly',
				ctx
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
}
