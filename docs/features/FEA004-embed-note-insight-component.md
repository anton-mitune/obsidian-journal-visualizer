## Ideation
- Allow adding note insight components from existing notes as code blocks in editors
- Users can add insights to markdown notes or canvas text nodes via editor context menus
- Provides a simple way to embed note metadata and visualizations where users are actively working
- Components should update automatically when the watched note's backlinks change, regardless of whether they're in markdown notes or canvas nodes
- Real-time updates provide better UX than requiring manual refresh or file switching

## Requirements

### Assumptions
- Users work with both markdown notes and canvas text nodes
- Note insight components can be added via editor context menus only (no command palette)
- Each insight type has its own context menu option: "Add Yearly Tracker from Vault", "Add Monthly Tracker from Vault", etc.

### Requirement 1 — Add note insight component to editors via context menu
**User Story:** As a knowledge worker, I want to add note insight components from existing notes to my current editor context (markdown notes or canvas text nodes), so that I can visualize metadata and patterns directly where I'm working.

**Example:**
- GIVEN that I have a note with 2 backlinks from daily notes in 2025 AND I have a markdown editor or canvas text node editor active
- WHEN I right-click in the editor to open the context menu
- THEN I see options for "Add Yearly Tracker from Vault" and "Add Monthly Tracker from Vault"
- WHEN I select one of these options
- THEN I am prompted to select a source note via a note selector modal
- WHEN I select the note
- THEN the corresponding note insight code block is inserted at the cursor position, it is rendered into a note insight component displaying the insight data for that note exactly as it appears in the note insights panel

### Requirement 2 - Component refresh on backlink changes
**User Story:** As a knowledge worker, I want the embedded note insight components to update automatically when the watched note's backlinks change, so that I always see current data without manual intervention.

**Example 1 - Markdown notes:**
- GIVEN that I have a note containing a yearly tracker code block for Note A
- AND Note A currently has 2 backlinks from daily notes in current year
- WHEN I open today's daily note and add a backlink to Note A
- THEN the yearly tracker component updates to reflect the new backlink count (3 backlinks) within a few seconds

**Example 2 - Canvas nodes:**
- GIVEN that I have a canvas with a text node containing a yearly tracker code block for Note A
- AND Note A currently has 2 backlinks from daily notes in current year
- AND the canvas is open in pane A
- WHEN I open today's daily note in pane B and add a backlink to Note A
- THEN the yearly tracker component in the canvas updates to reflect the new backlink count (3 backlinks) within a few seconds
- This update happens regardless of whether I'm currently editing the text node or just viewing it

**Example 3 - Multiple simultaneous views:**
- GIVEN that I have both a markdown note and a canvas open, each containing a yearly tracker for Note A
- WHEN I add a backlink to Note A from a daily note
- THEN both tracker components (in markdown and canvas) update to show the new count

### Requirement 3 - Persistent period selection
**User Story:** As a note author, I want embedded note insight components to remember my last selected period across Obsidian restarts or active note or canvas change, so that I don't have to reconfigure them each time I open Obsidian or the component's container.
**Example 1:**
- GIVEN that I have embedded a yearly tracker for Note A in note B
- AND the yearly tracker is set to year 2024
- AND current year is 2025
- WHEN I close Obsidian and reopen it
- AND open note B
- THEN the yearly tracker still shows year 2024 as the selected year
**Example 2 for independant instances:**
- GIVEN that I have embedded two yearly trackers for Note A in note B
- AND the first yearly tracker is set to year 2023
- AND the second yearly tracker is set to year 2024
- WHEN I close Obsidian and reopen it
- AND open note B
- THEN the first yearly tracker shows year 2023 as the selected year
- AND the second yearly tracker shows year 2024 as the selected year

## Codeblock Format Specification

```note-insight-yearly
notePath: Vault/Path/to/SelectedNote.md
selectedYear: 2024
```

```note-insight-monthly
notePath: Vault/Path/to/SelectedNote.md
selectedMonth: 2024-03
```

## Design

**Selected Implementation Approach: Code Block Rendering with Metadata-Driven Refresh**

The implementation uses custom markdown code blocks (e.g., ```note-insight-yearly) that render full interactive components within editors. Each component listens to metadata cache changes and refreshes when its watched note's backlinks are modified.

**Implementation Architecture:**

1. **Code Block Processors**: Register custom markdown processors for `note-insight-yearly` and `note-insight-monthly` that:
   - Render the existing tracker components with full interactivity
   - Register a `metadata-cache:resolved` event listener that monitors backlink changes
   - Store component instance, watched note path, and event listener references for cleanup
   - Use `MarkdownPostProcessorContext` to detect when to clean up
   - When the watched note's backlinks change in the metadata cache, re-query backlink data via `BacklinkAnalysisService` and call the component's `updateData()` method to refresh the visualization
   - Clean up event listeners when the code block is removed from DOM

2. **Editor Context Menu Integration**: Add insight options to editor context menus that:
   - Present note selector modal when selected
   - Insert appropriate code block at cursor position
   - Work in both markdown editors and canvas text node editors

3. **Component Integration**: Reuse existing `YearlyTrackerComponent` and `MonthlyTrackerComponent` without modification, preserving all interactive features (navigation, hover tooltips, etc.)

4. **State Persistence**: Implemented via codeblock property.

**Refresh Strategy:**
- **Trigger**: When Obsidian's metadata cache resolves link changes (via `metadata-cache:resolved` event)
- **Detection**: Each code block processor checks if the event affects its watched note's backlinks
- **Action**: If backlinks changed, the processor:
  1. Queries latest backlink data from `BacklinkAnalysisService`
  2. Calls the component's `updateData()` method with fresh data
  3. Component re-renders itself with new counts/visualizations
- **Scope**: Works for all contexts - markdown notes, canvas text nodes, canvas note nodes
- **Timing**: Updates occur within seconds after backlink changes (limited by Obsidian's metadata cache update frequency)

**Why Metadata Cache Events Instead of File Events:**
- `file-open` events only fire when opening markdown files, not when interacting with canvas
- `metadata-cache:resolved` fires whenever link relationships change, regardless of which file is open or which pane is focused
- This enables updates in canvas nodes without requiring file switching or node selection
- Provides consistent behavior across markdown and canvas contexts

**User Workflow:**
1. User right-clicks in an editor (markdown or canvas text node) → selects "Add Monthly Tracker from Vault"
2. Note selector modal appears (similar to native Obsidian file picker)
3. User selects source note
4. Code block is inserted at cursor position:
```note-insight-monthly
notePath: Vault/Path/to/SelectedNote.md
selectedMonth: 2024-03
```
5. Component renders immediately with current backlink data
6. When user adds/removes backlinks to SelectedNote.md from any note, all visible tracker components for that note update automatically within seconds (as per obsidian's metadata cache refresh rate)

**Technical Rationale:**
- **API Stability**: Uses official `registerMarkdownCodeBlockProcessor` and `metadata-cache` events, ensuring future compatibility
- **Full Functionality**: Preserves 100% of existing component features and interactivity
- **Context-Agnostic**: Works identically in markdown notes and canvas nodes
- **Event-Driven**: Responds to actual data changes rather than UI focus events
- **Simple Lifecycle**: Each code block processor instance manages its component's refresh independently
- **Maintainability**: Reuses existing architecture and analysis service; no duplication

**Implementation Details:**
- Code block format:
```note-insight-[yearly|monthly]
notePath: [note-path]
selectedYear: [optional-initial-year]
```
- Editor integration using `editor-menu` events for consistent behavior
- Each processor stores: component instance, watched note path, event listener reference
- Event listener checks if metadata change affects the watched note's incoming links
- Use `MarkdownPostProcessorContext` for cleanup detection
- Store the selected period in the processor instance for state persistence

**known Limitations:**
- Update frequency is bounded by Obsidian's metadata cache refresh rate (typically 1-3 seconds after file save)

## Components and Interfaces

**Core Components:**
1. **BacklinkAnalysisService** - Introducing a new Centralized service providing note analysis data to code block processors. Existing components in Note Insight View should also leverage this service to avoid duplication.
2. **NoteInsightCommandsManager** - Handles code block insertion into active editors (markdown or canvas text nodes)
3. **NoteInsightContextMenuManager** - Integrates insight options into editor context menus
4. **CodeBlockProcessors** - Registers and manages custom code block rendering for insight components (uses shared analysis service)

**Integration Points:**
- Existing `YearlyTrackerComponent` and `MonthlyTrackerComponent` (no modifications required)
- Shared `BacklinkAnalysisService` eliminates duplication between canvas features and note insights panel
- Editor context menu system for consistent user experience across markdown and canvas text editors
- Obsidian markdown processing system for code block rendering

**Architecture Benefits:**
- **No Logic Duplication**: Canvas feature leverages the same analysis service as the main insights panel
- **Consistent Results**: All components show identical data since they use the same analysis pipeline
- **Maintainability**: Single point of change for backlink analysis logic

## Technical References

- [Canvas Context Menu Integration Guide](../references/canvas-context-menu-integration.md) - Technical documentation for adding custom canvas context menus
- [Canvas Event Research](../references/canvas-event-research/) - Debugging examples and source code research
- node_modules/obsidian/obsidian.d.ts - Obsidian TypeScript definitions for plugin APIs
