import { App, TFile } from 'obsidian';
import { BacklinkInfo, DailyNoteYearlyData } from '../types';

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
	 * Check if a file path represents a daily note for the current year
	 */
	isDailyNoteFromCurrentYear(file: TFile): boolean {
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

		const [, year] = dateMatch;
		const fileYear = parseInt(year);

		// Get current year
		const currentYear = new Date().getFullYear();

		return fileYear === currentYear;
	}

	/**
	 * Extract date string (YYYY-MM-DD) from daily note file
	 */
	extractDateFromDailyNote(file: TFile): string | null {
		const dateMatch = file.basename.match(/(\d{4})-(\d{2})-(\d{2})/);
		if (!dateMatch) {
			return null;
		}
		return `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`;
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

	/**
	 * Get yearly daily note backlink data for the current year
	 */
	getYearlyDailyNoteBacklinks(backlinks: BacklinkInfo[]): DailyNoteYearlyData {
		const yearlyData: DailyNoteYearlyData = {};
		// Filter to current year daily notes only
		const currentYearBacklinks = backlinks.filter(backlinkInfo => 
			this.isDailyNoteFromCurrentYear(backlinkInfo.file)
		);

		for (const backlinkInfo of currentYearBacklinks) {
			const dateString = this.extractDateFromDailyNote(backlinkInfo.file);
			if (dateString) {
				// Optionally extract lines from the daily note file for hover summary
				let lines: string[] | undefined = undefined;
				// Try to get file contents and extract lines containing the active note link
				// This is best-effort and may be skipped for performance
				// Uncomment below if you want to extract lines:
				// const fileCache = this.app.vault.getAbstractFileByPath(backlinkInfo.file.path);
				// if (fileCache instanceof TFile) {
				//     this.app.vault.read(fileCache).then(content => {
				//         // Find lines containing links to the active note
				//         // (Assume note title is available in context)
				//     });
				// }
				yearlyData[dateString] = {
					linkCount: backlinkInfo.linkCount,
					lines: lines
				};
			}
		}
		return yearlyData;
	}
}
