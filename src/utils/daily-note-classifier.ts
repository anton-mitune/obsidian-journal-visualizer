import { App, TFile } from 'obsidian';
import { BacklinkInfo, DailyNoteYearlyData, YearBounds, MonthBounds } from '../types';

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
		try {
			// Access daily notes plugin settings using type narrowing
			const internalPlugins = (this.app as unknown as Record<string, unknown>).internalPlugins as Record<string, unknown> | undefined;
			const plugins = internalPlugins?.plugins as Record<string, unknown> | undefined;
			const dailyNotesPlugin = plugins?.['daily-notes'] as Record<string, unknown> | undefined;
			const instance = dailyNotesPlugin?.instance as Record<string, unknown> | undefined;
			const options = instance?.options as Record<string, unknown> | undefined;
			return (options?.folder as string) || '';
		} catch {
			return '';
		}
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
	 * Check if a file path represents a daily note for a specific year
	 */
	isDailyNoteFromYear(file: TFile, year: number): boolean {
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

		const [, yearStr] = dateMatch;
		const fileYear = parseInt(yearStr);

		return fileYear === year;
	}

	/**
	 * Get year bounds based on available daily notes in the vault
	 */
	getYearBounds(backlinks: BacklinkInfo[]): YearBounds {
		let minYear = new Date().getFullYear();
		let maxYear = new Date().getFullYear();

		for (const backlinkInfo of backlinks) {
			if (this.isDailyNote(backlinkInfo.file)) {
				const dateString = this.extractDateFromDailyNote(backlinkInfo.file);
				if (dateString) {
					const year = parseInt(dateString.substring(0, 4));
					minYear = Math.min(minYear, year);
					maxYear = Math.max(maxYear, year);
				}
			}
		}

		// Extend bounds slightly for better UX
		minYear = Math.max(minYear - 1, 2000); // Don't go before year 2000
		maxYear = Math.min(maxYear + 1, new Date().getFullYear() + 1); // Don't go beyond next year

		return { minYear, maxYear };
	}

	/**
	 * Check if a file is a daily note (regardless of year)
	 */
	isDailyNote(file: TFile): boolean {
		// Get the daily notes folder
		const dailyNotesFolder = this.getDailyNotesFolder();
		
		// Check if file is in the daily notes folder
		if (dailyNotesFolder && !file.path.startsWith(dailyNotesFolder)) {
			return false;
		}

		// Extract date from filename using YYYY-MM-DD pattern
		const dateMatch = file.basename.match(/(\d{4})-(\d{2})-(\d{2})/);
		return dateMatch !== null;
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
	 * Get yearly daily note backlink data for a specific year
	 */
	getYearlyDailyNoteBacklinks(backlinks: BacklinkInfo[], year: number = new Date().getFullYear()): DailyNoteYearlyData {
		const yearlyData: DailyNoteYearlyData = {};
		// Filter to specified year daily notes only
		const yearBacklinks = backlinks.filter(backlinkInfo => 
			this.isDailyNoteFromYear(backlinkInfo.file, year)
		);

		for (const backlinkInfo of yearBacklinks) {
			const dateString = this.extractDateFromDailyNote(backlinkInfo.file);
			if (dateString) {
				// Optionally extract lines from the daily note file for hover summary
				const lines: string[] | undefined = undefined;
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

	/**
	 * Check if a file path represents a daily note for a specific month/year
	 */
	isDailyNoteFromMonth(file: TFile, month: number, year: number): boolean {
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

		const [, fileYearStr, fileMonthStr] = dateMatch;
		const fileYear = parseInt(fileYearStr);
		const fileMonth = parseInt(fileMonthStr) - 1; // month is 0-indexed in JS

		return fileYear === year && fileMonth === month;
	}

	/**
	 * Find the daily note file for a specific date
	 */
	findDailyNote(date: Date): TFile | null {
		const year = date.getFullYear();
		const month = String(date.getMonth() + 1).padStart(2, '0');
		const day = String(date.getDate()).padStart(2, '0');
		const targetDateString = `${year}-${month}-${day}`;

		const files = this.app.vault.getMarkdownFiles();
		for (const file of files) {
			if (this.isDailyNote(file)) {
				const fileDateString = this.extractDateFromDailyNote(file);
				if (fileDateString === targetDateString) {
					return file;
				}
			}
		}
		return null;
	}

	/**
	 * Get monthly daily note backlink data for a specific month and year
	 */
	getMonthlyDailyNoteBacklinks(backlinks: BacklinkInfo[], month: number, year: number): DailyNoteYearlyData {
		const monthlyData: DailyNoteYearlyData = {};
		// Filter to specified month and year daily notes only
		const monthBacklinks = backlinks.filter(backlinkInfo => 
			this.isDailyNoteFromMonth(backlinkInfo.file, month, year)
		);

		for (const backlinkInfo of monthBacklinks) {
			const dateString = this.extractDateFromDailyNote(backlinkInfo.file);
			if (dateString) {
				monthlyData[dateString] = {
					linkCount: backlinkInfo.linkCount,
					lines: undefined
				};
			}
		}
		return monthlyData;
	}

	/**
	 * Calculate month bounds based on available daily notes
	 */
	calculateMonthBounds(backlinks: BacklinkInfo[]): MonthBounds {
		let minYear = new Date().getFullYear();
		let maxYear = new Date().getFullYear();
		let minMonth = 0;
		let maxMonth = 11;

		// Initialize with current date
		const now = new Date();
		minYear = now.getFullYear();
		maxYear = now.getFullYear();
		minMonth = now.getMonth();
		maxMonth = now.getMonth();

		let hasData = false;

		for (const backlinkInfo of backlinks) {
			if (this.isDailyNote(backlinkInfo.file)) {
				const dateString = this.extractDateFromDailyNote(backlinkInfo.file);
				if (dateString) {
					const date = new Date(dateString);
					const year = date.getFullYear();
					const month = date.getMonth();

					if (!hasData) {
						minYear = year;
						maxYear = year;
						minMonth = month;
						maxMonth = month;
						hasData = true;
					} else {
						if (year < minYear || (year === minYear && month < minMonth)) {
							minYear = year;
							minMonth = month;
						}
						if (year > maxYear || (year === maxYear && month > maxMonth)) {
							maxYear = year;
							maxMonth = month;
						}
					}
				}
			}
		}
		
		// If no data, default to current month +/- 1 year range or something reasonable
		if (!hasData) {
			return {
				minYear: now.getFullYear() - 1,
				minMonth: 0,
				maxYear: now.getFullYear() + 1,
				maxMonth: 11
			};
		}

		return { minMonth, minYear, maxMonth, maxYear };
	}

	/**
	 * Get daily backlinks within a specific date range
	 */
	getDailyBacklinksInRange(backlinks: BacklinkInfo[], startDate: Date, endDate: Date): DailyNoteYearlyData {
		const rangeData: DailyNoteYearlyData = {};
		
		// Normalize dates to start of day for comparison
		const start = new Date(startDate);
		start.setHours(0, 0, 0, 0);
		const end = new Date(endDate);
		end.setHours(23, 59, 59, 999);

		for (const backlinkInfo of backlinks) {
			if (this.isDailyNote(backlinkInfo.file)) {
				const dateString = this.extractDateFromDailyNote(backlinkInfo.file);
				if (dateString) {
					const date = new Date(dateString);
					// Check if date is within range
					if (date >= start && date <= end) {
						rangeData[dateString] = {
							linkCount: backlinkInfo.linkCount,
							lines: undefined
						};
					}
				}
			}
		}
		return rangeData;
	}
}
