import { App, TFile, TFolder } from 'obsidian';
import { logger } from './logger';

/**
 * Utility class for resolving folders and getting notes within them
 * FEA009: Multiple Notes Watching - Folder mode support
 */
export class FolderResolver {
	private app: App;

	constructor(app: App) {
		this.app = app;
	}

	/**
	 * Get all markdown notes within a folder path
	 * This is dynamic - re-queries on each call to reflect current vault state
	 * 
	 * @param folderPath - The folder path to query (e.g., "Projects" or "Work/Tasks")
	 * @param recursive - Whether to include notes from nested subfolders (default: true)
	 * @returns Array of TFile objects representing markdown notes in the folder
	 * 
	 * Edge cases handled:
	 * - Folder not found: returns empty array and logs warning
	 * - Invalid folder path: returns empty array and logs warning
	 * - Empty folder: returns empty array (no warning)
	 * - Folder with no markdown files: returns empty array (no warning)
	 */
	getNotesInFolder(folderPath: string, recursive: boolean = true): TFile[] {
		// Validate input
		if (!folderPath || typeof folderPath !== 'string') {
			logger.warn('[FolderResolver] Invalid folder path:', folderPath);
			return [];
		}

		// Normalize folder path (remove leading/trailing slashes)
		const normalizedPath = folderPath.trim().replace(/^\/+|\/+$/g, '');

		// Get folder from vault
		const folder = this.app.vault.getAbstractFileByPath(normalizedPath);

		// Handle folder not found
		if (!folder) {
			logger.warn('[FolderResolver] Folder not found:', normalizedPath);
			return [];
		}

		// Handle path is not a folder
		if (!(folder instanceof TFolder)) {
			logger.warn('[FolderResolver] Path is not a folder:', normalizedPath);
			return [];
		}

		// Get notes from folder
		const notes: TFile[] = [];

		if (recursive) {
			// Recursively get all markdown files in folder and subfolders
			this.collectNotesRecursive(folder, notes);
		} else {
			// Get only direct children markdown files
			for (const child of folder.children) {
				if (child instanceof TFile && child.extension === 'md') {
					notes.push(child);
				}
			}
		}

		return notes;
	}

	/**
	 * Recursively collect all markdown notes from a folder and its subfolders
	 */
	private collectNotesRecursive(folder: TFolder, notes: TFile[]): void {
		for (const child of folder.children) {
			if (child instanceof TFile && child.extension === 'md') {
				notes.push(child);
			} else if (child instanceof TFolder) {
				// Recurse into subfolder
				this.collectNotesRecursive(child, notes);
			}
		}
	}
}
