import { Plugin } from 'obsidian';
import { VaultVisualizerSettings, DEFAULT_SETTINGS } from './src/types';
import { DailyNoteClassifier } from './src/utils/daily-note-classifier';
import { BacklinkAnalysisService } from './src/services/backlink-analysis-service';
import { SettingsService } from './src/services/settings-service';
import { BacklinkWatcher } from './src/features/backlink-watcher';
import { ViewManager } from './src/ui/view-manager';
import { CounterCodeBlockProcessor } from './src/features/counter-code-block-processor';
import { YearlyTrackerCodeBlockProcessor } from './src/features/yearly-tracker-code-block-processor';
import { MonthlyTrackerCodeBlockProcessor } from './src/features/monthly-tracker-code-block-processor';
import { NoteInsightContextMenuManager } from './src/features/note-insight-context-menu-manager';
import { VaultVisualizerSettingTab } from './src/ui/settings-tab';
import { logger } from './src/utils/logger';

/**
 * Vault Visualizer Plugin - Turn your notes into insight
 * 
 * Features:
 * - FEA001: Show daily note backlink count for current month
 * - FEA002: Yearly tracker visualization
 * - FEA003: Monthly tracker visualization
 * - FEA004: Canvas note insight nodes (code block rendering)
 * - FEA005: Backlink count tracker
 * - FEA006: Pie display mode
 * - FEA007: Top N display mode
 * - FEA008: Time series display mode
 * - FEA009: Multiple notes watching
 * - FEA010: Plugin settings
 */
export default class VaultVisualizerPlugin extends Plugin {
	settings: VaultVisualizerSettings;
	settingsService: SettingsService;
	private dailyNoteClassifier: DailyNoteClassifier;
	private analysisService: BacklinkAnalysisService;
	private backlinkWatcher: BacklinkWatcher;
	private viewManager: ViewManager;
	private counterProcessor: CounterCodeBlockProcessor;
	private yearlyProcessor: YearlyTrackerCodeBlockProcessor;
	private monthlyProcessor: MonthlyTrackerCodeBlockProcessor;
	private contextMenuManager: NoteInsightContextMenuManager;

	async onload() {
		// Load settings
		await this.loadSettings();

		// Set log level from settings
		logger.setLevel(this.settings.logLevel);

		// Initialize settings service
		this.settingsService = new SettingsService(this.settings);

		// Register settings tab
		this.addSettingTab(new VaultVisualizerSettingTab(this.app, this));

		// Initialize components
		this.dailyNoteClassifier = new DailyNoteClassifier(this.app);
		this.analysisService = new BacklinkAnalysisService(this.app, this.dailyNoteClassifier);
		this.viewManager = new ViewManager(this.app, this, this.analysisService, this.settingsService);
		
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
		this.counterProcessor = new CounterCodeBlockProcessor(
			this.app,
			this,
			this.analysisService,
			this.settingsService
		);
		this.counterProcessor.register();

		this.yearlyProcessor = new YearlyTrackerCodeBlockProcessor(
			this.app,
			this,
			this.analysisService
		);
		this.yearlyProcessor.register();

		this.monthlyProcessor = new MonthlyTrackerCodeBlockProcessor(
			this.app,
			this,
			this.analysisService
		);
		this.monthlyProcessor.register();

		// Register context menu manager for FEA004
		this.contextMenuManager = new NoteInsightContextMenuManager(this.app, this);
		this.contextMenuManager.register();

		// Register for cleanup
		this.registerEvent(this.app.workspace.on('quit', () => {
			this.backlinkWatcher.stopWatching();
		}));
	}

	onunload(): void {
		// Clean up components
		if (this.backlinkWatcher) {
			this.backlinkWatcher.stopWatching();
		}
		if (this.counterProcessor) {
			this.counterProcessor.unload();
		}
		if (this.yearlyProcessor) {
			this.yearlyProcessor.unload();
		}
		if (this.monthlyProcessor) {
			this.monthlyProcessor.unload();
		}
		if (this.viewManager) {
			this.viewManager.cleanup();
		}
	}

	async loadSettings() {
		const loadedData = await this.loadData();
		this.settings = Object.assign({}, DEFAULT_SETTINGS, loadedData as VaultVisualizerSettings);
	}

	async saveSettings() {
		await this.saveData(this.settings);
		// Update settings service to notify listeners
		if (this.settingsService) {
			this.settingsService.updateSettings(this.settings);
		}
	}

	/**
	 * Override the loadData method to specify the return type.
	 */
	async loadData(): Promise<Partial<VaultVisualizerSettings>> {
		return super.loadData() as Promise<Partial<VaultVisualizerSettings>>;
	}
}
