import { TFile } from 'obsidian';

/**
 * Plugin settings interface
 * FEA010: Plugin Settings
 */
export interface VaultVisualizerSettings {
	firstDayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = Sunday, 1 = Monday, etc.
	maxWatchedNotes: number;
	series1Color: string;
	series2Color: string;
	series3Color: string;
	series4Color: string;
	series5Color: string;
	series6Color: string;
	series7Color: string;
	series8Color: string;
	series9Color: string;
	series10Color: string;
}

export const DEFAULT_SETTINGS: VaultVisualizerSettings = {
	firstDayOfWeek: 1, // Monday
	maxWatchedNotes: 50,
	series1Color: '#8b5cf6', // purple
	series2Color: '#3b82f6', // blue
	series3Color: '#10b981', // green
	series4Color: '#f59e0b', // amber
	series5Color: '#ef4444', // red
	series6Color: '#ec4899', // pink
	series7Color: '#14b8a6', // teal
	series8Color: '#f97316', // orange
	series9Color: '#6366f1', // indigo
	series10Color: '#84cc16', // lime
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

export interface MonthNavigationState {
	currentMonth: number; // 0-11 (January = 0, December = 11)
	currentYear: number;
	minMonth: number;
	minYear: number;
	maxMonth: number;
	maxYear: number;
}

export interface MonthBounds {
	minMonth: number; // 0-11
	minYear: number;
	maxMonth: number; // 0-11
	maxYear: number;
}

// FEA005: Counter types
export enum TimePeriod {
	PAST_24_HOURS = 'past-24-hours',
	PAST_7_DAYS = 'past-7-days',
	PAST_30_DAYS = 'past-30-days',
	PAST_90_DAYS = 'past-90-days',
	PAST_YEAR = 'past-year',
	TODAY = 'today',
	THIS_WEEK = 'this-week',
	THIS_MONTH = 'this-month',
	THIS_QUARTER = 'this-quarter',
	THIS_YEAR = 'this-year'
}

// FEA007: Display mode types
export enum DisplayMode {
	DEFAULT = 'default',
	TOP_N = 'top-n',
	PIE = 'pie',
	TIME_SERIES = 'time-series'
}

export interface CounterState {
	selectedPeriod: TimePeriod;
	// Support for watching multiple notes (FEA009)
	notePath?: string[];
	// FEA007: Display mode support
	displayAs?: DisplayMode;
}

export interface CounterConfig{
	id: string;
	notePath: string | string[];
	selectedPeriod: TimePeriod;
	// FEA007: Display mode support
	displayAs?: DisplayMode;
}

export interface DateRange {
	startDate: Date;
	endDate: Date;
}

// Individual note counter result for multiple notes watching
export interface NoteCounterResult {
	notePath: string;
	noteTitle: string;
	count: number;
}
