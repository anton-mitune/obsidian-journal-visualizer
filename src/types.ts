import { TFile } from 'obsidian';

export interface VaultVisualizerSettings {
	// Currently no settings needed for FEA001
	// Future settings will be added here
}

export const DEFAULT_SETTINGS: VaultVisualizerSettings = {
	// Default values will be added as settings are introduced
};

export interface DailyNoteBacklinkInfo {
	count: number;
	noteTitle: string;
	yearlyData?: DailyNoteYearlyData; // Optional yearly data for tracker
}

export interface BacklinkInfo {
	file: TFile;
	linkCount: number;
}


export interface DailyNoteBacklinkSummary {
	linkCount: number;
	lines?: string[]; // Optional: lines or context from daily note
}

export interface DailyNoteYearlyData {
	[dateString: string]: DailyNoteBacklinkSummary;
}

export interface YearlyTrackerData {
	noteTitle: string;
	year: number;
	dailyLinkCounts: DailyNoteYearlyData;
}

export interface YearNavigationState {
	currentYear: number;
	minYear: number;
	maxYear: number;
}

export interface YearBounds {
	minYear: number;
	maxYear: number;
}
