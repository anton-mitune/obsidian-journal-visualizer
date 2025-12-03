import { App, Plugin } from 'obsidian';
import { NoteInsightsView, NOTE_INSIGHTS_VIEW_TYPE } from './note-insights-view';
import { DailyNoteBacklinkInfo, YearBounds, MonthBounds } from '../types';
import { BacklinkAnalysisService } from '../services/backlink-analysis-service';
import { SettingsService } from '../services/settings-service';
import { logger } from '../utils/logger';

/**
 * Manages the Note Insights view lifecycle and registration
 * This replaces the UIInjector with proper Obsidian view management
 */
export class ViewManager {
	private app: App;
	private plugin: Plugin;
	private view: NoteInsightsView | null = null;
	private onYearChangeCallback?: (year: number) => void;
	private onMonthChangeCallback?: (month: number, year: number) => void;
	private analysisService: BacklinkAnalysisService;
	private settingsService: SettingsService;

	constructor(
		app: App, 
		plugin: Plugin, 
		analysisService: BacklinkAnalysisService,
		settingsService: SettingsService
	) {
		this.app = app;
		this.plugin = plugin;
		this.analysisService = analysisService;
		this.settingsService = settingsService;
	}

	/**
	 * Set the callback for when year changes in the yearly tracker
	 */
	setOnYearChangeCallback(callback: (year: number) => void): void {
		this.onYearChangeCallback = callback;
		if (this.view) {
			this.view.setOnYearChangeCallback(callback);
		}
	}

	/**
	 * Set the callback for when month changes in the monthly tracker
	 */
	setOnMonthChangeCallback(callback: (month: number, year: number) => void): void {
		this.onMonthChangeCallback = callback;
		if (this.view) {
			this.view.setOnMonthChangeCallback(callback);
		}
	}

	/**
	 * Register the view with Obsidian and create it in the right sidebar
	 */
	registerView(): void {
		// Register the view type
		this.plugin.registerView(
			NOTE_INSIGHTS_VIEW_TYPE,
			(leaf) => {
				const view = new NoteInsightsView(leaf);

				// Set services when view is created (when user opens it)
				view.setAnalysisService(this.analysisService);
				view.setSettingsService(this.settingsService);
				
				// Set callbacks if available
				if (this.onYearChangeCallback) {
					view.setOnYearChangeCallback(this.onYearChangeCallback);
				}
				if (this.onMonthChangeCallback) {
					view.setOnMonthChangeCallback(this.onMonthChangeCallback);
				}
				
				// Store reference
				this.view = view;
				
				return view;
			}
		);

		// Add ribbon icon to toggle the view
		this.plugin.addRibbonIcon('bar-chart-3', 'Note insights', () => {
			this.activateView();
		});
	}

	/**
	 * Activate the view in the right sidebar
	 * Opens the view if it doesn't exist, or reveals it if it's hidden
	 */
	private async activateView(): Promise<void> {
		try {
			// Check if view already exists
			const existingLeaf = this.app.workspace.getLeavesOfType(NOTE_INSIGHTS_VIEW_TYPE)?.[0];
			
			if (existingLeaf) {
				// View exists, just reveal it
				this.app.workspace.revealLeaf(existingLeaf);
				this.view = existingLeaf.view as NoteInsightsView;
			} else {
				// Create new view in right sidebar
				const rightLeaf = this.app.workspace.getRightLeaf(false);
				if (rightLeaf) {
					await rightLeaf.setViewState({
						type: NOTE_INSIGHTS_VIEW_TYPE,
						active: true
					});
					// View reference will be set by the factory function
				}
			}
		} catch (error) {
			logger.error('Vault Visualizer: Error activating view:', error);
		}
	}

	/**
	 * Update the view with new daily note backlink information
	 */
	updateNoteInfo(noteInfo: DailyNoteBacklinkInfo, yearBounds?: YearBounds, monthBounds?: MonthBounds): void {
		// Ensure we have a current view reference
		this.ensureViewReference();

		if (this.view && typeof this.view.updateNoteInfo === 'function') {
			this.view.updateNoteInfo(noteInfo, yearBounds, monthBounds);
		} else {
			// View not ready yet, will update on next call
			console.debug('Vault Visualizer: View not ready to update');
		}
	}

	/**
	 * Ensure we have a valid view reference
	 */
	private ensureViewReference(): void {
		if (!this.view) {
			const existingLeaf = this.app.workspace.getLeavesOfType(NOTE_INSIGHTS_VIEW_TYPE)?.[0];
			if (existingLeaf) {
				this.view = existingLeaf.view as NoteInsightsView;
				// Ensure analysis service is set
				if(!this.view.setAnalysisService) return;
				this.view.setAnalysisService(this.analysisService);
				// Set callbacks if available
				if (this.onYearChangeCallback) {
					this.view.setOnYearChangeCallback(this.onYearChangeCallback);
				}
				if (this.onMonthChangeCallback) {
					this.view.setOnMonthChangeCallback(this.onMonthChangeCallback);
				}
			}
		}
	}

	/**
	 * Clear the view when no note is active
	 */
	clearNoteInfo(): void {
		if (this.view) {
			this.view.clearNoteInfo();
		}
	}

	/**
	 * Get the current view instance
	 */
	getView(): NoteInsightsView | null {
		return this.view;
	}

	/**
	 * Cleanup when plugin is disabled
	 */
	cleanup(): void {
		// The view will be automatically cleaned up by Obsidian when unregistered
		this.view = null;
	}
}
