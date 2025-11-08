import { App, TFile, WorkspaceLeaf } from 'obsidian';
import { TimePeriod } from '../types';

/**
 * Configuration for updating a canvas codeblock
 */
export interface CanvasCodeblockUpdate {
	notePath: string;
	trackerType: 'yearly' | 'monthly' | 'counter';
	newPeriod: number | string | TimePeriod;
}

/**
 * Result of a canvas update operation
 */
export interface CanvasUpdateResult {
	success: boolean;
	updatedNodeCount: number;
	error?: string;
}

/**
 * Handles updating codeblocks in canvas text nodes
 */
export class CanvasUpdater {
	constructor(private app: App) {}

	/**
	 * Update codeblock period selection in canvas text nodes
	 */
	async updateCodeblock(update: CanvasCodeblockUpdate): Promise<CanvasUpdateResult> {
		console.log('[CanvasUpdater] Starting canvas update:', update);

		try {
			// Find the active canvas file through workspace
			const canvasLeaf = this.app.workspace.getMostRecentLeaf();
			if (!canvasLeaf) {
				return { success: false, updatedNodeCount: 0, error: 'No active leaf found' };
			}

			const view = canvasLeaf.view;
			console.log('[CanvasUpdater] Active view type:', view.getViewType());
			
			// Check if this is a canvas view
			if (view.getViewType() !== 'canvas') {
				return { success: false, updatedNodeCount: 0, error: 'Active view is not a canvas' };
			}

			// Get the canvas file
			const canvasFile = (view as any).file;
			if (!canvasFile || !(canvasFile instanceof TFile)) {
				return { success: false, updatedNodeCount: 0, error: 'Canvas file not found' };
			}

			console.log('[CanvasUpdater] Found canvas file:', canvasFile.path);

			// Read and parse canvas data
			const canvasContent = await this.app.vault.read(canvasFile);
			const canvasData = JSON.parse(canvasContent);

		// Find all text nodes containing matching codeblocks
		const codeblockType = update.trackerType === 'yearly' ? 'note-insight-yearly' : 
		                       update.trackerType === 'monthly' ? 'note-insight-monthly' :
		                       'note-insight-counter';
		const matchingNodes: any[] = [];			console.log('[CanvasUpdater] Searching', canvasData.nodes?.length, 'canvas nodes');
			console.log('[CanvasUpdater] Looking for codeblock type:', codeblockType);

			for (const node of canvasData.nodes || []) {
				if (node.type === 'text' && typeof node.text === 'string') {
					// Check if this node's text contains our notePath AND the correct codeblock type
					if (node.text.includes(update.notePath) && node.text.includes(`\`\`\`${codeblockType}`)) {
						console.log('[CanvasUpdater] Found matching node:', node.id);
						matchingNodes.push(node);
					}
				}
			}

			if (matchingNodes.length === 0) {
				return { success: false, updatedNodeCount: 0, error: 'No matching canvas nodes found' };
			}

			// Update all matching nodes
			for (const targetNode of matchingNodes) {
				console.log('[CanvasUpdater] Updating node:', targetNode.id);
				this.updateNodeText(targetNode, update);
			}

			// Save canvas file once after updating all nodes
			await this.app.vault.modify(canvasFile, JSON.stringify(canvasData, null, 2));
			
			console.log('[CanvasUpdater] Canvas file saved successfully');
			return { success: true, updatedNodeCount: matchingNodes.length };

		} catch (error) {
			console.error('[CanvasUpdater] Error:', error);
			return { success: false, updatedNodeCount: 0, error: error.message };
		}
	}

	/**
	 * Update the text content of a canvas node
	 */
	private updateNodeText(node: any, update: CanvasCodeblockUpdate): void {
		const lines = node.text.split('\n');
		let updatedLines = false;

		// Find and update the period line
		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];
			if (update.trackerType === 'yearly' && line.trim().startsWith('selectedYear:')) {
				lines[i] = `selectedYear: ${update.newPeriod}`;
				updatedLines = true;
				console.log('[CanvasUpdater] Updated selectedYear at line', i);
				break;
			} else if (update.trackerType === 'monthly' && line.trim().startsWith('selectedMonth:')) {
				lines[i] = `selectedMonth: ${update.newPeriod}`;
				updatedLines = true;
				console.log('[CanvasUpdater] Updated selectedMonth at line', i);
				break;
			} else if (update.trackerType === 'counter' && line.trim().startsWith('selectedPeriod:')) {
				lines[i] = `selectedPeriod: ${update.newPeriod}`;
				updatedLines = true;
				console.log('[CanvasUpdater] Updated selectedPeriod at line', i);
				break;
			}
		}

		// If no existing period line, add it after notePath
		if (!updatedLines) {
			for (let i = 0; i < lines.length; i++) {
				if (lines[i].trim().startsWith('notePath:')) {
					const periodKey = update.trackerType === 'yearly' ? 'selectedYear' : 
					                   update.trackerType === 'monthly' ? 'selectedMonth' :
					                   'selectedPeriod';
					lines.splice(i + 1, 0, `${periodKey}: ${update.newPeriod}`);
					console.log('[CanvasUpdater] Added', periodKey, 'at line', i + 1);
					break;
				}
			}
		}

		// Update node text
		node.text = lines.join('\n');
	}
}
