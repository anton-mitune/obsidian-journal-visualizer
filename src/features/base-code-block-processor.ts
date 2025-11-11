import { App, Plugin, MarkdownPostProcessorContext, TFile, EventRef } from 'obsidian';
import { CounterConfig, TimePeriod } from '../types';
import { logger } from '../utils/logger';

/**
 * Tracks a code block instance for cleanup and updates
 */
export interface CodeBlockInstance {
	component: any;
	codeblockId: string; // ID from the codeblock config (for updates)
	eventRef: EventRef;
	type: 'yearly' | 'monthly' | 'counter';
	ctx: MarkdownPostProcessorContext;
	el: HTMLElement;
	lastKnownPeriod: number | string;
	isUpdatingCodeblock: boolean;
	notePath?: string[]; // For counter component - track watched notes
}

/**
 * Base class for code block processors
 * Provides common utilities for canvas/markdown file access and instance management
 */
export abstract class BaseCodeBlockProcessor {
	protected app: App;
	protected plugin: Plugin;
	protected instances: Map<string, CodeBlockInstance> = new Map();

	constructor(app: App, plugin: Plugin) {
		this.app = app;
		this.plugin = plugin;
	}

	/**
	 * Register the code block processor with Obsidian
	 * Each subclass implements this to register their specific code block type
	 */
	abstract register(): void;

	/**
	 * Process a code block
	 * Each subclass implements their specific rendering and setup logic
	 */
	abstract process(
		source: string,
		el: HTMLElement,
		ctx: MarkdownPostProcessorContext
	): Promise<void>;

	/**
	 * Get the active canvas file (if in canvas context)
	 */
	protected getActiveCanvasFile(): TFile | null {
		const canvasLeaf = this.app.workspace.getMostRecentLeaf();
		if (!canvasLeaf) {
			return null;
		}

		const view = canvasLeaf.view;
		if (view.getViewType() !== 'canvas') {
			return null;
		}

		const canvasFile = (view as any).file;
		if (!canvasFile || !(canvasFile instanceof TFile)) {
			return null;
		}

		return canvasFile;
	}

	/**
	 * Check if we're in a canvas context
	 */
	protected isCanvasContext(ctx: MarkdownPostProcessorContext): boolean {
		return !ctx.sourcePath || ctx.sourcePath === '';
	}

	/**
	 * Parse code block configuration from source text
	 * Generic key-value parser that accumulates duplicate keys into arrays
	 * 
	 * @param source - The raw code block source text
	 * @returns Object with parsed key-value pairs
	 * 
	 * Example input:
	 * ```
	 * notePath: path/to/note.md
	 * selectedPeriod: past-30-days
	 * notePaths: note1.md
	 * notePaths: note2, with commas.md
	 * notePaths: note3.md
	 * ```
	 * 
	 * Returns:
	 * ```
	 * {
	 *   notePath: "path/to/note.md",
	 *   selectedPeriod: "past-30-days",
	 *   notePaths: ["note1.md", "note2, with commas.md", "note3.md"]
	 * }
	 * ```
	 */
	protected parseCodeBlockConfig(source: string): Record<string, any> {
		const config: Record<string, any> = {};
		const lines = source.trim().split('\n');

		for (const line of lines) {
			const trimmedLine = line.trim();
			const colonIndex = trimmedLine.indexOf(':');
			
			if (colonIndex > 0) {
				const key = trimmedLine.substring(0, colonIndex).trim();
				const value = trimmedLine.substring(colonIndex + 1).trim();

				// If key already exists, convert to array or append to existing array
				if (config.hasOwnProperty(key)) {
					if (Array.isArray(config[key])) {
						config[key].push(value);
					} else {
						config[key] = [config[key], value];
					}
				} else {
					config[key] = value;
				}
			}
		}
		return config
	}

	/**
	 * Generate a unique instance ID for component lifecycle tracking
	 */
	protected generateInstanceId(ctx: MarkdownPostProcessorContext): string {
		return `${ctx.sourcePath}-${Date.now()}-${Math.random()}`;
	}

	/**
	 * Generate a short random codeblock ID for discrimination
	 */
	protected generateCodeblockId(): string {
		return Math.random().toString(36).substring(2, 8);
	}

	/**
	 * Ensure the codeblock has an ID written to it
	 * If the config doesn't have an ID, this will write the generated one
	 */
	protected async ensureCodeblockId(
		ctx: MarkdownPostProcessorContext,
		instance: CodeBlockInstance,
		configHadId: boolean
	): Promise<void> {
		// Only write if the config didn't already have an ID
		if (!configHadId) {
			await this.updateCodeblockProperty(ctx, instance, 'id', instance.codeblockId);
		}
	}

	/**
	 * Update a code block property (generic handler for canvas and markdown)
	 * Handles the "how" of updating - child classes decide "when" and "what"
	 * 
	 * @param ctx - The markdown processor context
	 * @param instance - The code block instance being updated
	 * @param propertyName - The property name to update (e.g., 'selectedPeriod', 'selectedYear')
	 * @param propertyValue - The new value for the property
	 */
	protected async updateCodeblockProperty(
		ctx: MarkdownPostProcessorContext,
		instance: CodeBlockInstance,
		propertyName: string,
		propertyValue: any
	): Promise<void> {
		const normalizedValue = this.normalizePropertyValue(propertyValue);

		if (this.isCanvasContext(ctx)) {
			await this.updateCanvasNode(instance, propertyName, normalizedValue);
		} else {
			await this.updateNote(ctx, instance, propertyName, normalizedValue);
		}

		// Update instance state on success
		instance.lastKnownPeriod = propertyValue;
	}

	/**
	 * Normalize property value to string array format
	 */
	private normalizePropertyValue(value: any): string[] {
		if (Array.isArray(value)) {
			return value.map(v => String(v));
		}
		return [String(value)];
	}

	/**
	 * Update codeblock property in a canvas node
	 */
	private async updateCanvasNode(
		instance: CodeBlockInstance,
		propertyName: string,
		propertyValue: string[]
	): Promise<void> {
		const canvasFile = this.getActiveCanvasFile();
		if (!canvasFile) {
			logger.error('[BaseCodeBlockProcessor] No active canvas file found');
			return;
		}

		try {
			// Read and parse canvas data
			const canvasContent = await this.app.vault.read(canvasFile);
			const canvasData = JSON.parse(canvasContent);

			// Find text nodes containing matching codeblock by ID
			const matchingNodes: any[] = [];
			for (const node of canvasData.nodes || []) {
				if (node.type === 'text' && typeof node.text === 'string') {
					if (node.text.includes('```note-insight-') && node.text.includes(`id: ${instance.codeblockId}`)) {
						matchingNodes.push(node);
					}
				}
			}

			if (matchingNodes.length === 0) {
				logger.warn('[BaseCodeBlockProcessor] No matching canvas nodes found for ID:', instance.codeblockId);
				return;
			}

			// Update all matching nodes
			for (const node of matchingNodes) {
				const lines = node.text.split('\n');
				const updatedLines = this.updateCodeblockContent(
					lines,
					instance.codeblockId,
					propertyName,
					propertyValue
				);
				node.text = updatedLines.join('\n');
			}

			// Save canvas file
			await this.app.vault.modify(canvasFile, JSON.stringify(canvasData, null, 2));
		} catch (error) {
			logger.error('[BaseCodeBlockProcessor] Canvas update error:', error);
		}
	}

	/**
	 * Update codeblock property in a markdown note
	 */
	private async updateNote(
		ctx: MarkdownPostProcessorContext,
		instance: CodeBlockInstance,
		propertyName: string,
		propertyValue: string[]
	): Promise<void> {
		const file = this.app.vault.getAbstractFileByPath(ctx.sourcePath);
		if (!file || !(file instanceof TFile)) {
			logger.error('[BaseCodeBlockProcessor] File not found:', ctx.sourcePath);
			return;
		}

		try {
			// Read note content
			const content = await this.app.vault.read(file);
			const lines = content.split('\n');

			// Update codeblock content
			const updatedLines = this.updateCodeblockContent(
				lines,
				instance.codeblockId,
				propertyName,
				propertyValue
			);

			// Write updated content
			const updatedContent = updatedLines.join('\n');
			await this.app.vault.modify(file, updatedContent);
		} catch (error) {
			logger.error('[BaseCodeBlockProcessor] Note update error:', error);
		}
	}

	/**
	 * Core logic: Update codeblock content in a string array
	 * Finds codeblock by ID, removes old property lines, inserts new ones
	 */
	private updateCodeblockContent(
		lines: string[],
		codeblockId: string,
		propertyName: string,
		propertyValue: string[]
	): string[] {
		// Find target codeblock by ID
		let inTargetBlock = false;
		let blockStartIndex = -1;
		let blockEndIndex = -1;
		const propertyLineIds: number[] = [];

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i].trim();

			// Start of a codeblock
			if (line.startsWith('```note-insight-')) {
				inTargetBlock = false;
				blockStartIndex = i;
			}
			// ID line in a codeblock
			else if (
				inTargetBlock === false &&
				blockStartIndex !== -1 &&
				line.startsWith('id:') &&
				line.includes(codeblockId)
			) {
				inTargetBlock = true;
			}
			// End of a codeblock
			else if (line === '```' && blockStartIndex !== -1) {
				if (inTargetBlock) {
					blockEndIndex = i;
					break;
				} else {
					// Reset for next block
					blockStartIndex = -1;
					inTargetBlock = false;
					propertyLineIds.length = 0;
				}
			}

			// Track property lines to remove
			if (inTargetBlock && line.startsWith(`${propertyName}:`)) {
				propertyLineIds.push(i);
			}
		}

		// If target block not found, return unchanged
		if (blockStartIndex === -1 || blockEndIndex === -1) {
			logger.warn('[BaseCodeBlockProcessor] Target codeblock not found for ID:', codeblockId);
			return lines;
		}

		// Remove old property lines (from end to start to preserve indices)
		for (let i = propertyLineIds.length - 1; i >= 0; i--) {
			lines.splice(propertyLineIds[i], 1);
		}

		// Insert new property lines before block end
		const insertionIndex = blockEndIndex - propertyLineIds.length - 1;
		for (let i = 0; i < propertyValue.length; i++) {
			const newLine = `${propertyName}: ${propertyValue[i]}`;
			lines.splice(insertionIndex + i + 1, 0, newLine);
		}

		return lines;
	}

	/**
	 * Clean up instances when the plugin unloads
	 */
	unload(): void {
		this.instances.clear();
	}
}
