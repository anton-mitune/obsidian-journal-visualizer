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

export interface CounterState {
	selectedPeriod: TimePeriod;
}

export interface DateRange {
	startDate: Date;
	endDate: Date;
}
