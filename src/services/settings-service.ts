import { VaultVisualizerSettings } from '../types';

/**
 * SettingsService - Manages plugin settings and provides subscription capabilities
 * FEA010: Plugin Settings
 * 
 * Centralized service for settings state management. Components can subscribe to
 * settings changes to react accordingly.
 */
export class SettingsService {
	private settings: VaultVisualizerSettings;
	private listeners: Array<(settings: VaultVisualizerSettings) => void> = [];

	constructor(settings: VaultVisualizerSettings) {
		this.settings = settings;
	}

	/**
	 * Get current settings
	 */
	getSettings(): VaultVisualizerSettings {
		return this.settings;
	}

	/**
	 * Update settings and notify all listeners
	 */
	updateSettings(settings: VaultVisualizerSettings): void {
		this.settings = settings;
		this.notifyListeners();
	}

	/**
	 * Subscribe to settings changes
	 * @param listener Callback function to be called when settings change
	 * @returns Unsubscribe function
	 */
	subscribe(listener: (settings: VaultVisualizerSettings) => void): () => void {
		this.listeners.push(listener);
		// Return unsubscribe function
		return () => {
			this.listeners = this.listeners.filter(l => l !== listener);
		};
	}

	/**
	 * Get series colors as an array
	 */
	getSeriesColors(): string[] {
		return [
			this.settings.series1Color,
			this.settings.series2Color,
			this.settings.series3Color,
			this.settings.series4Color,
			this.settings.series5Color,
			this.settings.series6Color,
			this.settings.series7Color,
			this.settings.series8Color,
			this.settings.series9Color,
			this.settings.series10Color,
		];
	}

	private notifyListeners(): void {
		this.listeners.forEach(listener => listener(this.settings));
	}
}
