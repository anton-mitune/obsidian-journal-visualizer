import { Notice } from 'obsidian';

/**
 * Handles user notifications for duplicate codeblock detection and other events
 */
export class UserNotifier {
	/**
	 * Notify user about duplicate codeblocks being updated
	 */
	notifyDuplicateCodeblocks(
		trackerType: 'yearly' | 'monthly' | 'counter',
		notePath: string,
		count: number,
		context: 'canvas' | 'note'
	): void {
		const trackerTypeName = trackerType === 'yearly' ? 'yearly tracker' : 
		                         trackerType === 'monthly' ? 'monthly tracker' :
		                         'counter';
		const noteName = notePath.split('/').pop()?.replace('.md', '') || notePath;
		const contextName = context === 'canvas' ? 'this canvas' : 'this note';
		
		new Notice(
			`⚠️ Multiple ${trackerTypeName}s found for "${noteName}" in ${contextName}. All ${count} instances will be updated.`,
			5000
		);
		
		console.warn(`[UserNotifier] Duplicate codeblocks detected: ${count} ${trackerType} trackers for ${notePath} in ${context}`);
	}
}
