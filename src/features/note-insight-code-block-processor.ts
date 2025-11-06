import { App, MarkdownPostProcessorContext, Plugin } from 'obsidian';
import { BacklinkAnalysisService } from '../services/backlink-analysis-service';
import { YearlyTrackerComponent } from '../ui/yearly-tracker-component';
import { MonthlyTrackerComponent } from '../ui/monthly-tracker-component';

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
