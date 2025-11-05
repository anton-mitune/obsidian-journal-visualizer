import { Plugin } from 'obsidian';
import { VaultVisualizerSettings, DEFAULT_SETTINGS } from './src/types';
import { DailyNoteClassifier } from './src/utils/daily-note-classifier';
import { BacklinkWatcher } from './src/features/backlink-watcher';
import { ViewManager } from './src/ui/view-manager';

/**
 * Vault Visualizer Plugin - Turn your notes into insight
 * 
 * Features:
 * - FEA001: Show daily note backlink count for current month
 */
export default class VaultVisualizerPlugin extends Plugin {
	settings: VaultVisualizerSettings;
	private dailyNoteClassifier: DailyNoteClassifier;
	private backlinkWatcher: BacklinkWatcher;
	private viewManager: ViewManager;

	async onload() {
		// Load settings
		await this.loadSettings();

		// Initialize components
		this.dailyNoteClassifier = new DailyNoteClassifier(this.app);
		this.viewManager = new ViewManager(this.app, this);
		
		// Register the view with Obsidian
		this.viewManager.registerView();
		
		// Create backlink watcher with callback to update UI
		this.backlinkWatcher = new BacklinkWatcher(
			this.app,
			this,
			this.dailyNoteClassifier,
			(noteInfo, yearBounds) => {
				this.viewManager.updateNoteInfo(noteInfo, yearBounds);
			}
		);

		// Set up year change callback
		this.viewManager.setOnYearChangeCallback((year: number) => {
			this.backlinkWatcher.setCurrentYear(year);
		});

		// Start watching for note changes
		this.backlinkWatcher.startWatching();

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
