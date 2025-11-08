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
	 * Get monthly daily note backlink data for a specific month/year
	 */
	getMonthlyDailyNoteBacklinks(backlinks: BacklinkInfo[], month: number, year: number): DailyNoteYearlyData {
		const monthlyData: DailyNoteYearlyData = {};
		
		// Filter to specified month/year daily notes only
		const monthBacklinks = backlinks.filter(backlinkInfo => 
			this.isDailyNoteFromMonth(backlinkInfo.file, month, year)
		);

		for (const backlinkInfo of monthBacklinks) {
			const dateString = this.extractDateFromDailyNote(backlinkInfo.file);
			if (dateString) {
				monthlyData[dateString] = {
					linkCount: backlinkInfo.linkCount,
					lines: undefined // Could be extended later for line extraction
				};
			}
		}
		
		return monthlyData;
	}

	/**
	 * Calculate month bounds based on available daily notes
	 */
	calculateMonthBounds(backlinks: BacklinkInfo[]): MonthBounds {
		const dailyNoteBacklinks = backlinks.filter(backlinkInfo => {
			const dailyNotesFolder = this.getDailyNotesFolder();
			return !dailyNotesFolder || backlinkInfo.file.path.startsWith(dailyNotesFolder);
		});

		if (dailyNoteBacklinks.length === 0) {
			// No daily notes found, default to current month
			const now = new Date();
			return {
				minMonth: now.getMonth(),
				minYear: now.getFullYear(),
				maxMonth: now.getMonth(),
				maxYear: now.getFullYear()
			};
		}

		let minYear = Infinity;
		let minMonth = 11;
		let maxYear = -Infinity;
		let maxMonth = 0;

		for (const backlinkInfo of dailyNoteBacklinks) {
			const dateMatch = backlinkInfo.file.basename.match(/(\d{4})-(\d{2})-(\d{2})/);
			if (dateMatch) {
				const year = parseInt(dateMatch[1]);
				const month = parseInt(dateMatch[2]) - 1; // 0-indexed

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

		// Add buffer for current month if it's beyond the range
		const now = new Date();
		const currentYear = now.getFullYear();
		const currentMonth = now.getMonth();

		if (currentYear > maxYear || (currentYear === maxYear && currentMonth > maxMonth)) {
			maxYear = currentYear;
			maxMonth = currentMonth;
		}

		return {
			minMonth: minMonth === Infinity ? currentMonth : minMonth,
			minYear: minYear === Infinity ? currentYear : minYear,
			maxMonth: maxMonth === -Infinity ? currentMonth : maxMonth,
			maxYear: maxYear === -Infinity ? currentYear : maxYear
		};
	}

	/**
	 * Get yearly daily note backlink data for the current year (deprecated - use getYearlyDailyNoteBacklinks)
	 */
	getYearlyDailyNoteBacklinksLegacy(backlinks: BacklinkInfo[]): DailyNoteYearlyData {
		return this.getYearlyDailyNoteBacklinks(backlinks, new Date().getFullYear());
	}

	/**
	 * Count backlinks from daily notes within a specific date range
	 * FEA005: Used by counter component
	 */
	countBacklinksInRange(targetNotePath: string, startDate: Date, endDate: Date): number {
		// Get all backlinks to the target note
		const resolvedLinks = this.app.metadataCache.resolvedLinks;
		let totalCount = 0;

		// Iterate through all files to find backlinks
		for (const [sourcePath, links] of Object.entries(resolvedLinks)) {
			// Check if this file links to our target
			if (links[targetNotePath]) {
				const sourceFile = this.app.vault.getAbstractFileByPath(sourcePath);
				
				// Only count if it's a daily note
				if (sourceFile instanceof TFile && this.isDailyNote(sourceFile as TFile)) {
					const dateString = this.extractDateFromDailyNote(sourceFile as TFile);
					if (dateString) {
						const fileDate = this.parseDateString(dateString);
						
						// Check if the file date is within our range
						if (fileDate && fileDate >= startDate && fileDate <= endDate) {
							totalCount += links[targetNotePath];
						}
					}
				}
			}
		}

		return totalCount;
	}

	/**
	 * Parse a date string in YYYY-MM-DD format to a Date object (at midnight)
	 */
	private parseDateString(dateString: string): Date | null {
		const match = dateString.match(/(\d{4})-(\d{2})-(\d{2})/);
		if (!match) {
			return null;
		}
		const [, year, month, day] = match;
		return new Date(parseInt(year), parseInt(month) - 1, parseInt(day), 0, 0, 0, 0);
	}
}
