import { App, TFile } from 'obsidian';
import { BacklinkInfo } from '../types';

/**
 * Utility class for identifying and working with daily notes
 */
export class DailyNoteClassifier {
	private app: App;

	constructor(app: App) {
		this.app = app;
	}

	/**
	 * Get the daily notes folder path from Obsidian settings
	 */
	private getDailyNotesFolder(): string {
		// Access daily notes plugin settings
		const dailyNotesSettings = (this.app as any).internalPlugins?.plugins?.['daily-notes']?.instance?.options;
		return dailyNotesSettings?.folder || '';
	}

	/**
	 * Check if a file path represents a daily note for the current month
	 */
	isDailyNoteFromCurrentMonth(file: TFile): boolean {
		// Get the daily notes folder
		const dailyNotesFolder = this.getDailyNotesFolder();
		
		// Check if file is in the daily notes folder
		if (dailyNotesFolder && !file.path.startsWith(dailyNotesFolder)) {
			return false;
		}

		// Extract date from filename using YYYY-MM-DD pattern
		const dateMatch = file.basename.match(/(\d{4})-(\d{2})-(\d{2})/);
		if (!dateMatch) {
			return false;
		}

		const [, year, month] = dateMatch;
		const fileDate = new Date(parseInt(year), parseInt(month) - 1); // month is 0-indexed

		// Get current month/year
		const now = new Date();
		const currentYear = now.getFullYear();
		const currentMonth = now.getMonth();

		return fileDate.getFullYear() === currentYear && fileDate.getMonth() === currentMonth;
	}

	/**
	 * Filter backlinks to only include those from daily notes in current month
	 */
	filterDailyNoteBacklinks(backlinks: BacklinkInfo[]): BacklinkInfo[] {
		return backlinks.filter(backlinkInfo => this.isDailyNoteFromCurrentMonth(backlinkInfo.file));
	}

	/**
	 * Count total links from daily notes in current month (including multiple links from same file)
	 */
	countCurrentMonthDailyNoteBacklinks(backlinks: BacklinkInfo[]): number {
		const dailyNoteBacklinks = this.filterDailyNoteBacklinks(backlinks);
		// Sum up all link counts from daily notes in current month
		return dailyNoteBacklinks.reduce((total, backlinkInfo) => total + backlinkInfo.linkCount, 0);
	}
}
