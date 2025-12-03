import { App, TFile, setIcon } from 'obsidian';
import { TimePeriod, CounterState, BacklinkInfo, NoteCounterResult, DisplayMode, WatchMode } from '../types';
import { DateRangeCalculator } from '../utils/date-range-calculator';
import { DailyNoteClassifier } from '../utils/daily-note-classifier';
import { BacklinkAnalysisService } from '../services/backlink-analysis-service';
import { SettingsService } from '../services/settings-service';
import { FolderResolver } from '../utils/folder-resolver';
import { NoteSelector } from './note-selector';
import { FolderSelector } from './folder-selector';
import { TopNRenderer } from './top-n-renderer';
import { PieRenderer } from './pie-renderer';
import { TimeSeriesRenderer, buildTimeSeriesData } from './time-series-renderer';
import { logger } from '../utils/logger';

/**
 * Component that displays backlink count for watched notes over a selected time period
 * FEA005: Backlink Count Tracker
 * FEA009: Multiple Notes Watching
 * FEA010: Reacts to settings changes (firstDayOfWeek, maxWatchedNotes, series colors)
 * Supports:
 * - Single note watching (original feature)
 * - Multiple notes watching (FEA009)
 */
export class BacklinkCounterComponent {
	private container: HTMLElement;
	private app: App;
	private classifier: DailyNoteClassifier;
	private analysisService: BacklinkAnalysisService;
	private settingsService: SettingsService;
	private folderResolver: FolderResolver;
	private state: CounterState;
	private counterResults: NoteCounterResult[] = [];
	private topNRenderer: TopNRenderer;
	private pieRenderer: PieRenderer;
	private timeSeriesRenderer: TimeSeriesRenderer;
	private onPeriodChangeCallback?: (period: TimePeriod) => void;
	private onNoteAddedCallback?: (notePath: string) => void;
	private onNoteRemovedCallback?: (notePath: string) => void;
	private onDisplayModeChangeCallback?: (mode: DisplayMode) => void;
	// FEA009: Folder watching callbacks
	private onModeChangeCallback?: (mode: WatchMode) => void;
	private onFolderAddedCallback?: (folderPath: string) => void;
	private onFolderRemovedCallback?: () => void;
	private unsubscribeSettings?: () => void;

	constructor(
		container: HTMLElement, 
		app: App,
		classifier: DailyNoteClassifier,
		analysisService: BacklinkAnalysisService,
		settingsService: SettingsService,
		onPeriodChangeCallback?: (period: TimePeriod) => void,
		onNoteAddedCallback?: (notePath: string) => void,
		onNoteRemovedCallback?: (notePath: string) => void,
		onDisplayModeChangeCallback?: (mode: DisplayMode) => void,
		// FEA009: Folder watching callbacks
		onModeChangeCallback?: (mode: WatchMode) => void,
		onFolderAddedCallback?: (folderPath: string) => void,
		onFolderRemovedCallback?: () => void
	) {
		this.container = container;
		this.app = app;
		this.classifier = classifier;
		this.analysisService = analysisService;
		this.settingsService = settingsService;
		this.folderResolver = new FolderResolver(app);
		this.onPeriodChangeCallback = onPeriodChangeCallback;
		this.onNoteAddedCallback = onNoteAddedCallback;
		this.onNoteRemovedCallback = onNoteRemovedCallback;
		this.onDisplayModeChangeCallback = onDisplayModeChangeCallback;
		// FEA009: Store folder watching callbacks
		this.onModeChangeCallback = onModeChangeCallback;
		this.onFolderAddedCallback = onFolderAddedCallback;
		this.onFolderRemovedCallback = onFolderRemovedCallback;
		// Default to past 30 days, default display mode, and folder watch mode (FEA009)
		this.state = { 
			selectedPeriod: TimePeriod.PAST_30_DAYS,
			displayAs: DisplayMode.DEFAULT,
			watchMode: WatchMode.FOLDER // FEA009: Default to folder mode
		};
		// Initialize TopNRenderer with a placeholder container that will be set during render
		this.topNRenderer = new TopNRenderer(this.container);
		// Initialize PieRenderer with a placeholder container that will be set during render
		this.pieRenderer = new PieRenderer(this.container);
		// Initialize TimeSeriesRenderer with a placeholder container that will be set during render
		this.timeSeriesRenderer = new TimeSeriesRenderer(this.container);

		// Subscribe to settings changes (FEA010)
		// Re-render when relevant settings change (firstDayOfWeek, maxWatchedNotes, series colors)
		this.unsubscribeSettings = this.settingsService.subscribe(() => {
			this.updateCounts();
			this.render();
		});
	}

	/**
	 * Cleanup method - unsubscribe from settings
	 * Should be called when component is destroyed
	 */
	cleanup(): void {
		if (this.unsubscribeSettings) {
			this.unsubscribeSettings();
		}
	}

	/**
	 * Update the component with watched notes configuration
	 * Can be called with:
	 * - Single note path (legacy)
	 * - Multiple note paths
	 * - Display mode (FEA007)
	 * - Watch mode and folder path (FEA009)
	 */
	updateWatchedItems(config: { 
		notePath?: string[]; 
		displayAs?: DisplayMode;
		watchMode?: WatchMode;
		folderPath?: string[];
	}): void {
		this.state.notePath = config.notePath;
		if (config.displayAs !== undefined) {
			this.state.displayAs = config.displayAs;
		}
		// FEA009: Update watch mode and folder path
		if (config.watchMode !== undefined) {
			this.state.watchMode = config.watchMode;
		}
		if (config.folderPath !== undefined) {
			this.state.folderPath = config.folderPath;
		}
		this.updateCounts();
		this.render();
	}

	/**
	 * Update for single note (backward compatibility with Note Insights View)
	 */
	updateData(backlinks: BacklinkInfo[], noteTitle?: string, notePath?: string): void {
		// Set notePaths so updateCounts() can recalculate on period change
		if (notePath) {
			this.state.notePath = [notePath];
		}
		
		// Calculate count for single note (legacy behavior)
		const count = this.calculateCountForBacklinks(backlinks);
		this.counterResults = [{
			notePath: notePath || '',
			noteTitle: noteTitle || 'Unknown',
			count
		}];
		this.render();
	}

	/**
	 * Set the selected period
	 */
	setSelectedPeriod(period: TimePeriod): void {
		this.state.selectedPeriod = period;
		this.updateCounts();
		this.render();
	}

	/**
	 * Set the display mode (FEA007)
	 */
	setDisplayMode(mode: DisplayMode): void {
		this.state.displayAs = mode;
		this.render();
	}

	/**
	 * Clear the component
	 */
	clear(): void {
		this.counterResults = [];
		this.container.empty();
	}

	/**
	 * Add a note to the watched list (FEA009 - Add Note UI)
	 */
	addNote(notePath: string): void {
		if (this.onNoteAddedCallback) {
			this.onNoteAddedCallback(notePath);
		}
	}

	/**
	 * Remove a note from the watched list (FEA009 - Remove Note UI)
	 */
	removeNote(notePath: string): void {
		if (this.onNoteRemovedCallback) {
			this.onNoteRemovedCallback(notePath);
		}
	}

	/**
	 * Change watch mode (FEA009 - Mode Toggle)
	 */
	changeWatchMode(mode: WatchMode): void {
		if (this.onModeChangeCallback) {
			this.onModeChangeCallback(mode);
		}
	}

	/**
	 * Add a folder to watch (FEA009 - Folder watching)
	 */
	addFolder(folderPath: string): void {
		if (this.onFolderAddedCallback) {
			this.onFolderAddedCallback(folderPath);
		}
	}

	/**
	 * Remove the watched folder (FEA009 - Folder watching)
	 */
	removeFolder(): void {
		if (this.onFolderRemovedCallback) {
			this.onFolderRemovedCallback();
		}
	}

	/**
	 * Check if component is empty (no folder and no notes)
	 * FEA009: Used to determine if mode toggle should be enabled
	 */
	isEmpty(): boolean {
		const hasNotes = this.state.notePath && this.state.notePath.length > 0;
		const hasFolder = this.state.folderPath && this.state.folderPath.length > 0;
		return !hasNotes && !hasFolder;
	}

	/**
	 * Check if mode toggle should be enabled
	 * FEA009: Mode toggle is only enabled when component is empty
	 */
	isModeToggleEnabled(): boolean {
		return this.isEmpty();
	}

	/**
	 * Update all counter results based on current state
	 * Handles both note mode and folder mode (FEA009)
	 */
	private updateCounts(): void {
		this.counterResults = [];

		const currentMode = this.state.watchMode || WatchMode.FOLDER;

		if (currentMode === WatchMode.FOLDER) {
			// Folder watching mode (FEA009)
			if (this.state.folderPath && this.state.folderPath.length > 0) {
				const folderPath = this.state.folderPath[0]; // Currently supporting single folder
				const notes = this.folderResolver.getNotesInFolder(folderPath);
				
				for (const file of notes) {
					const backlinks = this.analysisService.getBacklinksForFile(file);
					const count = this.calculateCountForBacklinks(backlinks);
					this.counterResults.push({
						notePath: file.path,
						noteTitle: file.basename,
						count
					});
				}
				
				logger.log('[BacklinkCounter] Folder mode - found', notes.length, 'notes in', folderPath);
			}
		} else {
			// Note watching mode (original behavior)
			if (this.state.notePath && this.state.notePath.length > 0) {
				if(typeof this.state.notePath === 'string'){
					this.state.notePath = [this.state.notePath];
				}
				for (const notePath of this.state.notePath) {
					const file = this.app.vault.getAbstractFileByPath(notePath);
					if (file instanceof TFile) {
						const backlinks = this.analysisService.getBacklinksForFile(file);
						logger.warn('[BacklinkCounter] Calculating count for note:', file.path, backlinks);
						const count = this.calculateCountForBacklinks(backlinks);
						this.counterResults.push({
							notePath: file.path,
							noteTitle: file.basename,
							count
						});
					}
				}
			}
		}
	}

	/**
	 * Calculate backlink count for a set of backlinks within the selected period
	 */
	private calculateCountForBacklinks(backlinks: BacklinkInfo[]): number {
		if (backlinks.length === 0) {
			return 0;
		}

		const firstDayOfWeek = this.settingsService.getSettings().firstDayOfWeek;
		const dateRange = DateRangeCalculator.calculateDateRange(this.state.selectedPeriod, firstDayOfWeek);
		let totalCount = 0;

		// DEBUG: Log date range for troubleshooting
		logger.log('[BacklinkCounter] Date range:', {
			period: this.state.selectedPeriod,
			startDate: dateRange.startDate.toISOString(),
			endDate: dateRange.endDate.toISOString()
		});

		// Filter backlinks to daily notes within the date range
		for (const backlinkInfo of backlinks) {
			if (this.classifier.isDailyNote(backlinkInfo.file)) {
				const dateString = this.classifier.extractDateFromDailyNote(backlinkInfo.file);
				if (dateString) {
					const fileDate = this.parseDateString(dateString);
					if (fileDate) {
						const isInRange = fileDate >= dateRange.startDate && fileDate <= dateRange.endDate;
						// DEBUG: Log each daily note check
						logger.log('[BacklinkCounter] Checking daily note:', {
							file: backlinkInfo.file.path,
							dateString,
							fileDate: fileDate.toISOString(),
							isInRange,
							linkCount: backlinkInfo.linkCount
						});
						if (isInRange) {
							totalCount += backlinkInfo.linkCount;
						}
					}
				}
			}
		}

		logger.log('[BacklinkCounter] Final count:', totalCount);
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

	/**
	 * Handle period selection change
	 */
	private onPeriodChange(newPeriod: TimePeriod): void {
		this.state.selectedPeriod = newPeriod;
		this.updateCounts();
		this.render();
		
		// Notify callback if provided
		if (this.onPeriodChangeCallback) {
			this.onPeriodChangeCallback(newPeriod);
		}
	}

	/**
	 * Handle display mode change (FEA007)
	 */
	private onDisplayModeChange(newMode: DisplayMode): void {
		this.state.displayAs = newMode;
		this.render();
		
		// Notify callback if provided
		if (this.onDisplayModeChangeCallback) {
			this.onDisplayModeChangeCallback(newMode);
		}
	}

	/**
	 * Render the component
	 */
	render(): void {
		this.container.empty();
		this.container.addClass('backlink-counter-component');

		// Render controls (including mode toggle)
		this.renderControls();

		// Render content based on display mode
		const currentDisplayMode = this.state.displayAs || DisplayMode.DEFAULT;
		if (currentDisplayMode === DisplayMode.TOP_N) {
			this.renderTopNMode();
		} else if (currentDisplayMode === DisplayMode.PIE) {
			this.renderPieMode();
		} else if (currentDisplayMode === DisplayMode.TIME_SERIES) {
			this.renderTimeSeriesMode();
		} else {
			this.renderDefaultMode();
		}
	}

	/**
	 * Render the mode toggle (Folder/Note switch)
	 * FEA009: Only shown when callbacks are provided (code block context)
	 */
	private renderModeToggle(parentContainer: HTMLElement): void {
		// Only show mode toggle if we have the callback (code block context, not Note Insights View)
		if (!this.onModeChangeCallback) {
			return;
		}

		const toggleContainer = parentContainer.createEl('div', { cls: 'watch-mode-toggle-container' });
		
		const currentMode = this.state.watchMode || WatchMode.FOLDER;
		const isEnabled = this.isModeToggleEnabled();
		
		// Create toggle button group
		const toggleGroup = toggleContainer.createEl('div', { 
			cls: `watch-mode-toggle ${isEnabled ? 'enabled' : 'disabled'}`
		});
		
		// Folder button
		const folderButton = toggleGroup.createEl('button', {
			cls: `watch-mode-option ${currentMode === WatchMode.FOLDER ? 'active' : ''}`,
			text: 'Folder',
			attr: { 
				'aria-label': 'Watch folder mode',
				'disabled': isEnabled ? null : 'true'
			}
		});
		
		// Note button
		const noteButton = toggleGroup.createEl('button', {
			cls: `watch-mode-option ${currentMode === WatchMode.NOTE ? 'active' : ''}`,
			text: 'Note',
			attr: { 
				'aria-label': 'Watch note mode',
				'disabled': isEnabled ? null : 'true'
			}
		});
		
		// Only attach event listeners if enabled
		if (isEnabled) {
			folderButton.addEventListener('click', () => {
				if (currentMode !== WatchMode.FOLDER) {
					this.changeWatchMode(WatchMode.FOLDER);
				}
			});
			
			noteButton.addEventListener('click', () => {
				if (currentMode !== WatchMode.NOTE) {
					this.changeWatchMode(WatchMode.NOTE);
				}
			});
		}
	}

	/**
	 * Render the control elements (period selector, display mode toggle, add button)
	 */
	private renderControls(): void {
		const controlsContainer = this.container.createEl('div', { cls: 'backlink-counter-controls' });
		
		// FEA009: Render mode toggle first in the controls
		this.renderModeToggle(controlsContainer);

		// Display mode dropdown button (FEA007, FEA006)
		if (this.shouldShowDisplayModeToggle()) {
			const currentMode = this.state.displayAs || DisplayMode.DEFAULT;
			
			const toggleButton = controlsContainer.createEl('button', {
				cls: 'backlink-counter-mode-toggle',
				attr: { 
					'aria-label': this.getDisplayModeLabel(currentMode)
				}
			});

			// Use appropriate icon based on current mode
			setIcon(toggleButton, this.getDisplayModeIcon(currentMode));
			
			toggleButton.addEventListener('click', () => {
				const newMode = this.getNextDisplayMode(currentMode);
				this.onDisplayModeChange(newMode);
			});
		}

		// Period selector dropdown
		const select = controlsContainer.createEl('select', { cls: 'backlink-counter-dropdown' });

		// Add all period options
		const periods = DateRangeCalculator.getAllPeriods();
		periods.forEach(period => {
			const option = select.createEl('option', {
				text: period.label,
				value: period.value
			});
			if (period.value === this.state.selectedPeriod) {
				option.selected = true;
			}
		});

		// Handle selection changes
		select.addEventListener('change', () => {
			this.onPeriodChange(select.value as TimePeriod);
		});

		// Add button (Folder or Note based on watch mode) - only show when callbacks provided
		const currentMode = this.state.watchMode || WatchMode.FOLDER;
		const hasFolderCallback = this.onFolderAddedCallback;
		const hasNoteCallback = this.onNoteAddedCallback;
		
		// Show add button if we have the appropriate callback for the current mode
		if ((currentMode === WatchMode.FOLDER && hasFolderCallback) || 
		    (currentMode === WatchMode.NOTE && hasNoteCallback)) {
			const currentCount = this.state.notePath?.length || 0;
			const maxWatchedNotes = this.settingsService.getSettings().maxWatchedNotes;
			
			// In folder mode, we can only watch one folder, so check if folder exists
			const isFolderMode = currentMode === WatchMode.FOLDER;
			const hasFolderSelected = this.state.folderPath && this.state.folderPath.length > 0;
			const isAtLimit = isFolderMode ? hasFolderSelected : (currentCount >= maxWatchedNotes);
			
			const addButton = controlsContainer.createEl('button', { 
				cls: `backlink-counter-add-button ${isAtLimit ? 'disabled' : ''}`,
				attr: { 
					'aria-label': isAtLimit 
						? (isFolderMode 
							? 'A folder is already selected' 
							: `Maximum limit of ${maxWatchedNotes} notes reached`)
						: (isFolderMode ? 'Add folder to watch' : 'Add note to watch')
				}
			});
			
			// Set button text based on mode
			const buttonText = isFolderMode ? ' +' : ' +';
			addButton.textContent = buttonText;
			
			// Set icon based on mode
			const iconName = isFolderMode ? 'folder-plus' : 'plus';
			setIcon(addButton, iconName);
			
			if (isAtLimit) {
				addButton.disabled = true;
			} else {
				addButton.addEventListener('click', () => {
					if (isFolderMode) {
						this.showFolderSelector();
					} else {
						this.showNoteSelector();
					}
				});
			}
		}
	}

	/**
	 * Check if display mode toggle should be shown
	 * Only show for multiple notes watching (FEA007 requirement)
	 */
	private shouldShowDisplayModeToggle(): boolean {
		return this.counterResults.length > 1;
	}

	/**
	 * Render default mode display (FEA007)
	 */
	private renderDefaultMode(): void {
		// Display counter results
		if (this.counterResults.length === 0) {
			// Empty state - show placeholder with mode selector
			this.renderEmptyState();
		} else {
			const currentMode = this.state.watchMode || WatchMode.FOLDER;
			
			// In folder mode, show folder info first (FEA009 - Task 3.5)
			if (currentMode === WatchMode.FOLDER && this.state.folderPath && this.state.folderPath.length > 0) {
				this.renderFolderHeader();
			}
			
			if (this.counterResults.length === 1 && currentMode === WatchMode.NOTE) {
				// Single note display (original layout - only in note mode)
				const result = this.counterResults[0];
				const countContainer = this.container.createEl('div', { cls: 'backlink-counter-display' });
				
				countContainer.createEl('div', { 
					cls: 'backlink-counter-number',
					text: result.count.toString()
				});

				countContainer.createEl('div', {
					cls: 'backlink-counter-label',
					text: this.getCountLabel(result.count)
				});
			} else {
				// Multiple notes display (FEA009) - or notes in folder mode
				const listContainer = this.container.createEl('div', { cls: 'backlink-counter-list' });
				
				// sort counter results by count descending
				this.counterResults.sort((a, b) => b.count - a.count);

				// Phase 4: Display limit implementation - limit to maxWatchedNotes (FEA009)
				const maxWatchedNotes = this.settingsService.getSettings().maxWatchedNotes;
				const displayedNotes = this.counterResults.slice(0, maxWatchedNotes);
				const totalNotes = this.counterResults.length;
				const isLimited = totalNotes > maxWatchedNotes;

				// Render limited list
				for (const result of displayedNotes) {
					const itemContainer = listContainer.createEl('div', { cls: 'backlink-counter-item' });
					
					itemContainer.createEl('div', {
						cls: 'backlink-counter-item-title',
						text: result.noteTitle
					});

					itemContainer.createEl('div', {
						cls: 'backlink-counter-item-count',
						text: `${result.count} ${result.count === 1 ? 'backlink' : 'backlinks'}`
					});

					// Add remove button (only when callback provided and in note mode)
					if (this.onNoteRemovedCallback && currentMode === WatchMode.NOTE) {
						const removeButton = itemContainer.createEl('button', {
							cls: 'backlink-counter-item-remove',
							attr: { 'aria-label': `Remove ${result.noteTitle}` }
						});
						setIcon(removeButton, 'x');
						removeButton.addEventListener('click', (e) => {
							e.stopPropagation();
							this.removeNote(result.notePath);
						});
					}
				}

				// Show limit message if applicable (Phase 4 - FEA009)
				if (isLimited) {
					listContainer.createEl('div', {
						cls: 'backlink-counter-limit-message',
						text: `Showing top ${maxWatchedNotes} of ${totalNotes} notes`
					});
				}
			}
		}
	}

	/**
	 * Render empty state with mode selector and placeholder
	 * FEA009: Task 3.4
	 */
	private renderEmptyState(): void {
		const emptyContainer = this.container.createEl('div', { cls: 'backlink-counter-empty-state' });
		
		// Add placeholder icon and text
		const placeholderIcon = emptyContainer.createEl('div', { cls: 'empty-state-icon' });
		setIcon(placeholderIcon, 'inbox');
		
		emptyContainer.createEl('div', { 
			cls: 'empty-state-text',
			text: 'Add a folder or note to start showing stats'
		});
		
		// Add hint text
		emptyContainer.createEl('div', {
			cls: 'empty-state-hint',
			text: `Click the ${this.state.watchMode === WatchMode.FOLDER ? 'folder' : 'note'} button above to get started`
		});
	}

	/**
	 * Render folder header with folder name and remove button
	 * FEA009: Task 3.5 - Folder mode populated UI
	 */
	private renderFolderHeader(): void {
		const folderPath = this.state.folderPath?.[0];
		if (!folderPath) return;

		const headerContainer = this.container.createEl('div', { cls: 'backlink-counter-folder-header' });
		
		// Folder icon and name
		const folderInfo = headerContainer.createEl('div', { cls: 'folder-info' });
		folderInfo.createEl('span', { cls: 'folder-icon', text: '📁' });
		folderInfo.createEl('span', {
			cls: 'folder-name',
			text: folderPath.endsWith('/') ? folderPath : folderPath + '/'
		});
		
		// Remove button (only if callback provided)
		if (this.onFolderRemovedCallback) {
			const removeButton = headerContainer.createEl('button', {
				cls: 'folder-remove-button',
				attr: { 'aria-label': `Remove folder ${folderPath}` }
			});
			setIcon(removeButton, 'x');
			removeButton.addEventListener('click', (e) => {
				e.stopPropagation();
				this.removeFolder();
			});
		}
	}

	/**
	 * Render top-N mode display (FEA007)
	 */
	private renderTopNMode(): void {
		// Create container for top-N visualization
		const topNContainer = this.container.createEl('div', { cls: 'backlink-counter-top-n' });
		
		// Phase 4: Apply display limit
		const maxWatchedNotes = this.settingsService.getSettings().maxWatchedNotes;
		const displayedResults = this.counterResults.slice(0, maxWatchedNotes);
		
		// Update TopNRenderer container and render
		this.topNRenderer = new TopNRenderer(topNContainer);
		const periodLabel = DateRangeCalculator.getPeriodLabel(this.state.selectedPeriod);
		this.topNRenderer.render(displayedResults, periodLabel);
		
		// Show limit message if applicable
		if (this.counterResults.length > maxWatchedNotes) {
			topNContainer.createEl('div', {
				cls: 'backlink-counter-limit-message',
				text: `Showing top ${maxWatchedNotes} of ${this.counterResults.length} notes`
			});
		}
	}

	/**
	 * Render pie mode display (FEA006)
	 */
	private renderPieMode(): void {
		// Create container for pie visualization
		const pieContainer = this.container.createEl('div', { cls: 'backlink-counter-pie' });
		
		// Phase 4: Apply display limit
		const maxWatchedNotes = this.settingsService.getSettings().maxWatchedNotes;
		const displayedResults = this.counterResults.slice(0, maxWatchedNotes);
		
		// Update PieRenderer container and render with colors from settings (FEA010)
		this.pieRenderer = new PieRenderer(pieContainer);
		const periodLabel = DateRangeCalculator.getPeriodLabel(this.state.selectedPeriod);
		const colors = this.settingsService.getSeriesColors();
		this.pieRenderer.render(displayedResults, periodLabel, colors);
		
		// Show limit message if applicable
		if (this.counterResults.length > maxWatchedNotes) {
			pieContainer.createEl('div', {
				cls: 'backlink-counter-limit-message',
				text: `Showing top ${maxWatchedNotes} of ${this.counterResults.length} notes`
			});
		}
	}

	/**
	 * Render time-series mode display (FEA008)
	 */
	private renderTimeSeriesMode(): void {
		// Create container for time-series visualization
		const timeSeriesContainer = this.container.createEl('div', { cls: 'backlink-counter-time-series' });
		
		// Phase 4: Apply display limit
		const maxWatchedNotes = this.settingsService.getSettings().maxWatchedNotes;
		const displayedResults = this.counterResults.slice(0, maxWatchedNotes);
		
		// Get time-series data for each watched note
		const firstDayOfWeek = this.settingsService.getSettings().firstDayOfWeek;
		const dateRange = DateRangeCalculator.calculateDateRange(this.state.selectedPeriod, firstDayOfWeek);
		const timeSeriesData: Array<{ notePath: string; noteTitle: string; data: any }> = [];
		
		// Build time series data from displayed results (limited)
		for (const result of displayedResults) {
			const file = this.app.vault.getAbstractFileByPath(result.notePath);
			if (file instanceof TFile) {
				// Get daily backlink data for this note within the period
				const backlinks = this.analysisService.getBacklinksForFile(file);
				const dailyData = this.classifier.getDailyBacklinksInRange(backlinks, dateRange.startDate, dateRange.endDate);
				
				timeSeriesData.push({
					notePath: file.path,
					noteTitle: file.basename,
					data: dailyData
				});
			}
		}
		
		// Build series data and render using colors from settings (FEA010)
		const colors = this.settingsService.getSeriesColors();
		const seriesData = buildTimeSeriesData(timeSeriesData, colors);
		
		this.timeSeriesRenderer = new TimeSeriesRenderer(timeSeriesContainer);
		const periodLabel = DateRangeCalculator.getPeriodLabel(this.state.selectedPeriod);
		this.timeSeriesRenderer.render(seriesData, periodLabel);
		
		// Show limit message if applicable
		if (this.counterResults.length > maxWatchedNotes) {
			timeSeriesContainer.createEl('div', {
				cls: 'backlink-counter-limit-message',
				text: `Showing top ${maxWatchedNotes} of ${this.counterResults.length} notes`
			});
		}
	}

	/**
	 * Show note selector modal to add a note
	 */
	private showNoteSelector(): void {
		const modal = new NoteSelector(this.app, (file) => {
			this.addNote(file.path);
		});
		modal.open();
	}

	/**
	 * Show folder selector modal to add a folder (FEA009)
	 */
	private showFolderSelector(): void {
		const modal = new FolderSelector(this.app, (folder) => {
			this.addFolder(folder.path);
		});
		modal.open();
	}

	/**
	 * Get the label text for a count
	 */
	private getCountLabel(count: number): string {
		const periodLabel = DateRangeCalculator.getPeriodLabel(this.state.selectedPeriod);
		const backlinkWord = count === 1 ? 'backlink' : 'backlinks';
		return `${backlinkWord} in the ${periodLabel}`;
	}

	/**
	 * Get icon name for display mode (FEA007, FEA006, FEA008)
	 */
	private getDisplayModeIcon(mode: DisplayMode): string {
		switch (mode) {
			case DisplayMode.DEFAULT:
				return 'list';
			case DisplayMode.TOP_N:
				return 'bar-chart-2';
			case DisplayMode.PIE:
				return 'pie-chart';
			case DisplayMode.TIME_SERIES:
				return 'trending-up';
			default:
				return 'list';
		}
	}

	/**
	 * Get aria label for display mode (FEA007, FEA006, FEA008)
	 */
	private getDisplayModeLabel(mode: DisplayMode): string {
		switch (mode) {
			case DisplayMode.DEFAULT:
				return 'Switch to bar chart view';
			case DisplayMode.TOP_N:
				return 'Switch to pie chart view';
			case DisplayMode.PIE:
				return 'Switch to time-series view';
			case DisplayMode.TIME_SERIES:
				return 'Switch to list view';
			default:
				return 'Switch display mode';
		}
	}

	/**
	 * Get next display mode in cycle: default -> top-n -> pie -> time-series -> default (FEA007, FEA006, FEA008)
	 */
	private getNextDisplayMode(currentMode: DisplayMode): DisplayMode {
		switch (currentMode) {
			case DisplayMode.DEFAULT:
				return DisplayMode.TOP_N;
			case DisplayMode.TOP_N:
				return DisplayMode.PIE;
			case DisplayMode.PIE:
				return DisplayMode.TIME_SERIES;
			case DisplayMode.TIME_SERIES:
				return DisplayMode.DEFAULT;
			default:
				return DisplayMode.DEFAULT;
		}
	}
}
