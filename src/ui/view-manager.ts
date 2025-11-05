import { App, Plugin, WorkspaceLeaf } from 'obsidian';
import { NoteInsightsView, NOTE_INSIGHTS_VIEW_TYPE } from './note-insights-view';
import { DailyNoteBacklinkInfo, YearBounds } from '../types';

/**
 * Manages the Note Insights view lifecycle and registration
 * This replaces the UIInjector with proper Obsidian view management
 */
export class ViewManager {
	private app: App;
	private plugin: Plugin;
	private view: NoteInsightsView | null = null;
	private onYearChangeCallback?: (year: number) => void;

	constructor(app: App, plugin: Plugin) {
		this.app = app;
		this.plugin = plugin;
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
	 * Register the view with Obsidian and create it in the right sidebar
	 */
	registerView(): void {
		// Register the view type
		this.plugin.registerView(
			NOTE_INSIGHTS_VIEW_TYPE,
			(leaf) => new NoteInsightsView(leaf)
		);

		// Add ribbon icon to toggle the view
		this.plugin.addRibbonIcon('bar-chart-3', 'Note insights', () => {
			this.activateView();
		});

		// Auto-open the view on startup
		this.activateView();
	}

	/**
	 * Activate the view in the right sidebar
	 */
	private async activateView(): Promise<void> {
		// Check if view already exists
		const existingLeaf = this.app.workspace.getLeavesOfType(NOTE_INSIGHTS_VIEW_TYPE)?.[0];
		
		if (existingLeaf) {
			// If view exists, reveal it
			this.app.workspace.revealLeaf(existingLeaf);
			this.view = existingLeaf.view as NoteInsightsView;
		} else {
			// Create new view in right sidebar
			const rightSplit = this.app.workspace.getRightLeaf(false);
			if (rightSplit) {
				await rightSplit.setViewState({
					type: NOTE_INSIGHTS_VIEW_TYPE,
					active: true
				});
				this.view = rightSplit.view as NoteInsightsView;
				
				// Set year change callback if available
				if (this.onYearChangeCallback) {
					this.view.setOnYearChangeCallback(this.onYearChangeCallback);
				}
			}
		}
	}

	/**
	 * Update the view with new daily note backlink information
	 */
	updateNoteInfo(noteInfo: DailyNoteBacklinkInfo, yearBounds?: YearBounds): void {
		// Ensure we have a current view reference
		this.ensureViewReference();

		if (this.view) {
			this.view.updateNoteInfo(noteInfo, yearBounds);
		} else {
			console.log('Vault Visualizer: No view available to update');
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
