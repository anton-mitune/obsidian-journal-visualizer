import { App, TFile, MarkdownPostProcessorContext } from 'obsidian';
import { TimePeriod } from '../types';

/**
 * Configuration for updating a note codeblock
 */
export interface NoteCodeblockUpdate {
	sourcePath: string;
	notePath: string;
	trackerType: 'yearly' | 'monthly' | 'counter';
	newPeriod: number | string | TimePeriod;
	sectionInfo: { lineStart: number; lineEnd: number } | null;
}

/**
 * Result of a note update operation
 */
export interface NoteUpdateResult {
	success: boolean;
	updatedCodeblockCount: number;
	error?: string;
}

/**
 * Handles updating codeblocks in markdown note files
 */
export class NoteUpdater {
	constructor(private app: App) {}

	/**
	 * Update codeblock period selection in a markdown note
	 */
	async updateCodeblock(update: NoteCodeblockUpdate): Promise<NoteUpdateResult> {
		console.log('[NoteUpdater] Starting note update:', update);

		const file = this.app.vault.getAbstractFileByPath(update.sourcePath);
		if (!(file instanceof TFile)) {
			return { success: false, updatedCodeblockCount: 0, error: 'File not found or not a TFile' };
		}

		try {
			const content = await this.app.vault.read(file);
			const lines = content.split('\n');
			
		// Detect all matching codeblocks by scanning the entire file
		const codeblockType = update.trackerType === 'yearly' ? 'note-insight-yearly' : 
		                       update.trackerType === 'monthly' ? 'note-insight-monthly' :
		                       'note-insight-counter';
		const duplicateRanges = this.findMatchingCodeblocks(lines, codeblockType, update.notePath);			if (duplicateRanges.length === 0) {
				return { success: false, updatedCodeblockCount: 0, error: 'No matching codeblocks found' };
			}

			// Update all matching codeblocks
			for (const range of duplicateRanges) {
				this.updateCodeblockInRange(lines, range, update, duplicateRanges);
			}

			const newContent = lines.join('\n');
			await this.app.vault.modify(file, newContent);
			
			console.log('[NoteUpdater] Note file updated successfully');
			return { success: true, updatedCodeblockCount: duplicateRanges.length };

		} catch (error) {
			console.error('[NoteUpdater] Error:', error);
			return { success: false, updatedCodeblockCount: 0, error: error.message };
		}
	}

	/**
	 * Find all codeblocks matching the type and notePath
	 */
	private findMatchingCodeblocks(
		lines: string[],
		codeblockType: string,
		notePath: string
	): Array<{ start: number; end: number }> {
		const duplicateRanges: Array<{ start: number; end: number }> = [];
		
		for (let i = 0; i < lines.length; i++) {
			if (lines[i].trim() === `\`\`\`${codeblockType}`) {
				// Found a codeblock start, scan for notePath and end
				let j = i + 1;
				let hasMatchingPath = false;
				while (j < lines.length && lines[j].trim() !== '```') {
					if (lines[j].trim().startsWith('notePath:') && lines[j].includes(notePath)) {
						hasMatchingPath = true;
					}
					j++;
				}
				if (hasMatchingPath) {
					duplicateRanges.push({ start: i, end: j });
					console.log('[NoteUpdater] Found matching codeblock at lines', i, '-', j);
				}
			}
		}
		
		return duplicateRanges;
	}

	/**
	 * Update a codeblock within a specific range
	 */
	private updateCodeblockInRange(
		lines: string[],
		range: { start: number; end: number },
		update: NoteCodeblockUpdate,
		allRanges: Array<{ start: number; end: number }>
	): void {
		let updatedLines = false;
		
		// Find and update the period line within this codeblock
		for (let i = range.start; i <= range.end && i < lines.length; i++) {
			const line = lines[i];
			if (update.trackerType === 'yearly' && line.trim().startsWith('selectedYear:')) {
				lines[i] = `selectedYear: ${update.newPeriod}`;
				updatedLines = true;
				console.log('[NoteUpdater] Updated selectedYear at line', i);
				break;
			} else if (update.trackerType === 'monthly' && line.trim().startsWith('selectedMonth:')) {
				lines[i] = `selectedMonth: ${update.newPeriod}`;
				updatedLines = true;
				console.log('[NoteUpdater] Updated selectedMonth at line', i);
				break;
			} else if (update.trackerType === 'counter' && line.trim().startsWith('selectedPeriod:')) {
				lines[i] = `selectedPeriod: ${update.newPeriod}`;
				updatedLines = true;
				console.log('[NoteUpdater] Updated selectedPeriod at line', i);
				break;
			}
		}

		// If no existing period line, add it after notePath
		if (!updatedLines) {
			for (let i = range.start; i <= range.end && i < lines.length; i++) {
				if (lines[i].trim().startsWith('notePath:')) {
					const periodKey = update.trackerType === 'yearly' ? 'selectedYear' : 
					                   update.trackerType === 'monthly' ? 'selectedMonth' :
					                   'selectedPeriod';
					lines.splice(i + 1, 0, `${periodKey}: ${update.newPeriod}`);
					console.log('[NoteUpdater] Added', periodKey, 'at line', i + 1);
					
					// Adjust remaining ranges after insertion
					for (let k = 0; k < allRanges.length; k++) {
						if (allRanges[k].start > i) {
							allRanges[k].start++;
							allRanges[k].end++;
						}
					}
					break;
				}
			}
		}
	}
}
