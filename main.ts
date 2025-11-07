import { Plugin } from 'obsidian';
import { VaultVisualizerSettings, DEFAULT_SETTINGS } from './src/types';
import { DailyNoteClassifier } from './src/utils/daily-note-classifier';
import { BacklinkAnalysisService } from './src/services/backlink-analysis-service';
import { BacklinkWatcher } from './src/features/backlink-watcher';
import { ViewManager } from './src/ui/view-manager';
import { NoteInsightCodeBlockProcessor } from './src/features/note-insight-code-block-processor';
import { NoteInsightContextMenuManager } from './src/features/note-insight-context-menu-manager';

/**
 * Vault Visualizer Plugin - Turn your notes into insight
 * 
 * Features:
 * - FEA001: Show daily note backlink count for current month
 * - FEA002: Yearly tracker visualization
 * - FEA003: Monthly tracker visualization
 * - FEA004: Canvas note insight nodes (code block rendering)
 */
export default class VaultVisualizerPlugin extends Plugin {
	settings: VaultVisualizerSettings;
	private dailyNoteClassifier: DailyNoteClassifier;
	private analysisService: BacklinkAnalysisService;
	private backlinkWatcher: BacklinkWatcher;
	private viewManager: ViewManager;
	private codeBlockProcessor: NoteInsightCodeBlockProcessor;
	private contextMenuManager: NoteInsightContextMenuManager;

	async onload() {
		// Load settings
		await this.loadSettings();

		// Initialize components
		this.dailyNoteClassifier = new DailyNoteClassifier(this.app);
		this.analysisService = new BacklinkAnalysisService(this.app, this.dailyNoteClassifier);
		this.viewManager = new ViewManager(this.app, this);
		
		// Register the view with Obsidian
		this.viewManager.registerView();
		
		// Create backlink watcher with callback to update UI
		this.backlinkWatcher = new BacklinkWatcher(
			this.app,
			this,
			this.analysisService,
			(noteInfo, yearBounds, monthBounds) => {
				this.viewManager.updateNoteInfo(noteInfo, yearBounds, monthBounds);
			}
		);

		// Set up year change callback
		this.viewManager.setOnYearChangeCallback((year: number) => {
			this.backlinkWatcher.setCurrentYear(year);
		});

		// Set up month change callback
		this.viewManager.setOnMonthChangeCallback((month: number, year: number) => {
			this.backlinkWatcher.setCurrentMonth(month, year);
		});

		// Start watching for note changes
		this.backlinkWatcher.startWatching();

		// Register code block processors for FEA004
		this.codeBlockProcessor = new NoteInsightCodeBlockProcessor(
			this.app,
			this,
			this.analysisService
		);
		this.codeBlockProcessor.register();

		// Register context menu manager for FEA004
		this.contextMenuManager = new NoteInsightContextMenuManager(this.app, this);
		this.contextMenuManager.register();

		// Register for cleanup
		this.registerEvent(this.app.workspace.on('quit', () => {
			this.backlinkWatcher.stopWatching();
		}));
	}

	async onunload() {
		// Clean up components
		if (this.backlinkWatcher) {
			this.backlinkWatcher.stopWatching();
		}
		if (this.codeBlockProcessor) {
			this.codeBlockProcessor.cleanup();
		}
		if (this.viewManager) {
			this.viewManager.cleanup();
		}
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
