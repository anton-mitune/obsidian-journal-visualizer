import { App, TFile } from 'obsidian';
import { DailyNoteClassifier } from '../utils/daily-note-classifier';
import { BacklinkInfo, DailyNoteBacklinkInfo, YearBounds, MonthBounds, DailyNoteYearlyData } from '../types';

/**
 * Centralized service for analyzing note backlinks
 * Used by both Note Insights View and code block processors
 */
export class BacklinkAnalysisService {
	private app: App;
	private dailyNoteClassifier: DailyNoteClassifier;

	constructor(app: App, dailyNoteClassifier: DailyNoteClassifier) {
		this.app = app;
		this.dailyNoteClassifier = dailyNoteClassifier;
	}

	/**
	 * Get all files that link to the specified file with their link counts
	 */
	getBacklinksForFile(file: TFile): BacklinkInfo[] {
		const backlinks: BacklinkInfo[] = [];
		const resolvedLinks = this.app.metadataCache.resolvedLinks;
		
		// Iterate through all files to find those that link to our target file
		for (const sourcePath in resolvedLinks) {
			const links = resolvedLinks[sourcePath];
			if (links && links[file.path]) {
				const sourceFile = this.app.vault.getAbstractFileByPath(sourcePath);
				if (sourceFile instanceof TFile) {
					backlinks.push({
						file: sourceFile,
						linkCount: links[file.path]
					});
				}
			}
		}
		
		return backlinks;
	}

	/**
	 * Analyze a note by its path and return complete backlink information
	 */
	analyzeNoteByPath(notePath: string, year?: number): DailyNoteBacklinkInfo | null {
		const file = this.app.vault.getAbstractFileByPath(notePath);
		if (!(file instanceof TFile)) {
			return null;
		}

		return this.analyzeNote(file, year);
	}

	/**
	 * Analyze a note and return complete backlink information
	 */
	analyzeNote(file: TFile, year?: number): DailyNoteBacklinkInfo {
		const backlinks = this.getBacklinksForFile(file);
		const currentYear = year ?? new Date().getFullYear();
		
		// Count daily note backlinks from current month
		const count = this.dailyNoteClassifier.countCurrentMonthDailyNoteBacklinks(backlinks);

		// Get yearly daily note backlink data for the selected year
		const yearlyData = this.dailyNoteClassifier.getYearlyDailyNoteBacklinks(backlinks, currentYear);

		return {
			count,
			noteTitle: file.basename,
			yearlyData
		};
	}

	/**
	 * Get yearly data for a specific note and year
	 */
	getYearlyData(file: TFile, year: number): DailyNoteYearlyData {
		const backlinks = this.getBacklinksForFile(file);
		return this.dailyNoteClassifier.getYearlyDailyNoteBacklinks(backlinks, year);
	}

	/**
	 * Get monthly data for a specific note, month, and year
	 */
	getMonthlyData(file: TFile, month: number, year: number): DailyNoteYearlyData {
		const backlinks = this.getBacklinksForFile(file);
		return this.dailyNoteClassifier.getMonthlyDailyNoteBacklinks(backlinks, month, year);
	}

	/**
	 * Calculate year bounds based on available daily notes
	 */
	getYearBounds(file: TFile): YearBounds {
		const backlinks = this.getBacklinksForFile(file);
		return this.dailyNoteClassifier.getYearBounds(backlinks);
	}

	/**
	 * Calculate month bounds based on available daily notes
	 */
	getMonthBounds(file: TFile): MonthBounds {
		const backlinks = this.getBacklinksForFile(file);
		return this.dailyNoteClassifier.calculateMonthBounds(backlinks);
	}

	/**
	 * Get the DailyNoteClassifier instance
	 */
	getClassifier(): DailyNoteClassifier {
		return this.dailyNoteClassifier;
	}
}
