import { App } from 'obsidian';

/**
 * Component responsible for injecting daily note backlink count into the UI
 */
export class UIInjector {
	private app: App;
	private countElement: HTMLElement | null = null;
	private static readonly BADGE_CLASS = 'vault-visualizer-daily-count';
	private static readonly BADGE_CONTAINER_CLASS = 'vault-visualizer-badge-container';

	constructor(app: App) {
		this.app = app;
	}

	/**
	 * Update or create the daily note backlink count display
	 */
	updateDailyNoteCount(count: number, noteTitle: string): void {
		// Remove existing badge if present
		this.removeBadge();

		// Find a suitable location to inject the badge
		const targetContainer = this.findInjectionTarget();
		if (!targetContainer) {
			return;
		}

		// Create and inject the new badge
		this.createAndInjectBadge(targetContainer, count);
	}

	/**
	 * Remove the daily note count badge from the UI
	 */
	removeBadge(): void {
		const existingBadge = document.querySelector(`.${UIInjector.BADGE_CONTAINER_CLASS}`);
		if (existingBadge) {
			existingBadge.remove();
		}
		this.countElement = null;
	}

	/**
	 * Find the best location to inject the daily note count badge
	 */
	private findInjectionTarget(): HTMLElement | null {
		// Try to find the backlinks section or a note content area
		// Strategy: look for common Obsidian UI elements where we can inject our badge
		
		// Option 1: Look for backlinks container in the right sidebar
		let target = document.querySelector('.backlink') as HTMLElement;
		if (target) {
			return target;
		}

		// Option 2: Look for the active view's content area
		target = document.querySelector('.workspace-leaf.mod-active .view-content') as HTMLElement;
		if (target) {
			return target;
		}

		// Option 3: Look for workspace split (fallback)
		target = document.querySelector('.workspace-split.mod-root') as HTMLElement;
		if (target) {
			return target;
		}

		return null;
	}

	/**
	 * Create and inject the daily note count badge
	 */
	private createAndInjectBadge(container: HTMLElement, count: number): void {
		// Create container div
		const badgeContainer = document.createElement('div');
		badgeContainer.className = UIInjector.BADGE_CONTAINER_CLASS;
		badgeContainer.style.cssText = `
			padding: 8px 12px;
			margin: 4px 0;
			background-color: var(--background-secondary);
			border-radius: 4px;
			border: 1px solid var(--background-modifier-border);
			font-size: 0.9em;
			color: var(--text-muted);
		`;

		// Create the badge content
		const badge = document.createElement('div');
		badge.className = UIInjector.BADGE_CLASS;
		badge.innerHTML = `
			<span style="font-weight: 500;">Daily notes (this month):</span>
			<span style="margin-left: 8px; font-weight: 600; color: var(--text-normal);">${count}</span>
		`;

		// Apply additional styling based on count
		if (count === 0) {
			badge.style.opacity = '0.7';
		}

		badgeContainer.appendChild(badge);

		// Insert the badge at the top of the container
		container.insertBefore(badgeContainer, container.firstChild);
		
		this.countElement = badgeContainer;
	}

	/**
	 * Clean up any UI elements when the plugin is disabled
	 */
	cleanup(): void {
		this.removeBadge();
	}
}
