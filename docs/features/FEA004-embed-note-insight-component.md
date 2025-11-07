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

**Implementation Approach: Code Block Rendering with Metadata-Driven Refresh and Persistent State**

The implementation uses custom markdown code blocks (e.g., ```note-insight-yearly) that render full interactive components within editors. Each component listens to metadata cache changes and refreshes when its watched note's backlinks are modified. Period selection is persisted directly to the codeblock content.

### Implementation Architecture

#### 1. Code Block Processors (`NoteInsightCodeBlockProcessor`)
Registers custom markdown processors for `note-insight-yearly` and `note-insight-monthly` that:

- **Parse Configuration**: Extract `notePath`, `selectedYear`, or `selectedMonth` from codeblock content
- **Render Components**: Create and mount existing `YearlyTrackerComponent` or `MonthlyTrackerComponent` with full interactivity
- **Auto-Refresh on Backlink Changes**: 
  - Register a `metadata-cache:resolved` event listener that monitors backlink changes
  - When the watched note's backlinks change, re-query backlink data via `BacklinkAnalysisService`
  - Call the component's `updateData()` method to refresh the visualization
  - Use `isUpdatingCodeblock` flag to prevent refresh loops when updating codeblock content
- **Period Selection Persistence**:
  - Components pass a callback to notify the processor when the user changes the period (year or month)
  - Processor updates the codeblock content in the file (markdown or canvas) to persist the selection
  - **Canvas detection**: Uses empty `sourcePath` as signal for canvas context, then accesses canvas file via `workspace.getMostRecentLeaf()`
  - **Content-based node matching**: Finds the correct canvas node by matching both `notePath` and codeblock type
  - **Duplicate detection**: Scans for multiple matching codeblocks and updates all instances, showing a user notification
- **Lifecycle Management**:
  - Store component instance, watched note path, event listener, and DOM element references
  - Use `MarkdownRenderChild` for proper cleanup when codeblock is removed from DOM
  - Clean up event listeners and component instances on unload

#### 2. State Persistence Strategy

**Storage Mechanism**: Period selection is stored directly in the codeblock content as properties:
```
```note-insight-yearly
notePath: Vault/Path/to/Note.md
selectedYear: 2024
```
```

**Update Flow**:
1. User interacts with component (e.g., clicks year navigation)
2. Component invokes callback with new period value
3. Processor determines context (markdown file or canvas node)
4. **For Markdown Files**:
   - Read file content via Vault API
   - Locate codeblock using `ctx.getSectionInfo()`
   - Update or insert period property
   - Write modified content back to file
5. **For Canvas Text Nodes**:
   - Detect canvas context via empty `ctx.sourcePath`
   - Access active canvas view and canvas file via workspace API
   - Parse canvas JSON
   - Find matching node(s) by searching for `notePath` + codeblock type (e.g., `` ```note-insight-yearly ``)
   - Update period property in node's text content
   - Save modified canvas JSON
6. Set `isUpdatingCodeblock` flag during update to prevent metadata cache event from triggering refresh loop

**Duplicate Handling**:
- When multiple codeblocks of the same type watch the same note in the same file/canvas:
  - All matching instances are updated simultaneously
  - User receives a notification: `⚠️ Multiple yearly tracker's found for "Note Name" in this canvas. All 3 instances will be updated.`
  - This ensures consistent state across duplicates

**Infinite Loop Prevention**:
- `isUpdatingCodeblock` flag prevents refresh during codeblock content updates
- Flag is cleared after a 100ms delay to allow file processing to complete
- Metadata cache events skip processing when flag is set

#### 3. Editor Context Menu Integration (`NoteInsightContextMenuManager`)
Adds insight options to editor context menus that:

- Listen for `editor-menu` events to detect editor context menu openings
- Add menu items: "Add Yearly Tracker from Vault" and "Add Monthly Tracker from Vault"
- Present note selector modal when selected
- Insert appropriate code block at cursor position with initial configuration
- Work in both markdown editors and canvas text node editors

#### 4. Component Integration
Reuses existing `YearlyTrackerComponent` and `MonthlyTrackerComponent` without modification:

- Components accept a callback in their constructor for period change notifications
- All interactive features preserved (navigation, hover tooltips, data visualization)
- Components remain stateless - period selection managed by processor

#### 5. Shared Analysis Service (`BacklinkAnalysisService`)
Centralized service providing note analysis data:

- Used by both code block processors and Note Insight View
- Eliminates duplication between canvas features and note insights panel
- Provides consistent results across all components
- Single point of change for backlink analysis logic

### Refresh Strategy

**Trigger**: Obsidian's `metadata-cache:resolved` event (fires when link relationships change)

**Detection**: Each code block processor checks if the event affects its watched note's backlinks

**Action**: If backlinks changed and not currently updating codeblock:
1. Query latest backlink data from `BacklinkAnalysisService`
2. Get updated year/month bounds
3. Call component's `updateData()` method with fresh data
4. Component re-renders itself with new counts/visualizations

**Scope**: Works for all contexts - markdown notes, canvas text nodes

**Timing**: Updates occur within seconds after backlink changes (limited by Obsidian's metadata cache update frequency)

### Canvas-Specific Implementation Details

**Context Detection**:
- Empty `ctx.sourcePath` indicates canvas text node context
- Uses `app.workspace.getMostRecentLeaf()` to access active canvas view
- Verifies view type is 'canvas' before proceeding

**Node Identification**:
- Searches canvas JSON nodes array for matching text nodes
- Match criteria: node contains both the `notePath` AND the codeblock type marker (e.g., `` ```note-insight-yearly ``)
- This ensures correct node is found even when multiple codeblocks watch the same note

**Update Process**:
1. Parse canvas JSON from canvas file
2. Find all matching text nodes (for duplicate detection)
3. Update period property in each node's text content
4. Save modified canvas JSON back to file
5. Single save operation after updating all duplicates

### User Workflow

1. User right-clicks in an editor (markdown or canvas text node) → selects "Add Monthly Tracker from Vault"
2. Note selector modal appears (similar to native Obsidian file picker)
3. User selects source note
4. Code block is inserted at cursor position with current period as default:
```note-insight-monthly
notePath: Vault/Path/to/SelectedNote.md
selectedMonth: 2025-11
```
5. Component renders immediately with current backlink data
6. User can navigate to different periods - selection is saved to codeblock automatically
7. When user adds/removes backlinks to the watched note from any note, all visible tracker components for that note update automatically
8. Period selection persists across Obsidian restarts and file/canvas changes

### Technical Rationale

- **API Stability**: Uses official `registerMarkdownCodeBlockProcessor` and `metadata-cache` events
- **Full Functionality**: Preserves 100% of existing component features and interactivity
- **Context-Agnostic**: Works identically in markdown notes and canvas nodes
- **Event-Driven**: Responds to actual data changes rather than UI focus events
- **Workspace-Based Canvas Access**: Uses workspace API instead of brittle DOM traversal
- **Content-Based Matching**: Identifies canvas nodes by content rather than DOM attributes
- **Maintainability**: Reuses existing architecture and analysis service; no duplication
- **Transparent Duplicate Handling**: Users are notified when duplicates exist and understand all instances synchronize

### Known Limitations

- Update frequency is bounded by Obsidian's metadata cache refresh rate (typically 1-3 seconds after file save)
- Multiple trackers of the same type watching the same note in the same file/canvas will synchronize their period selection (this is intentional to maintain consistency)
- Canvas text node updates rely on the canvas being the active view in the most recent leaf

## Components and Interfaces

**Core Components:**

1. **BacklinkAnalysisService** (`src/services/backlink-analysis-service.ts`)
   - Centralized service providing note analysis data to code block processors
   - Used by both code block processors and Note Insight View
   - Eliminates duplication between canvas features and note insights panel
   - Provides consistent results across all components

2. **NoteInsightCodeBlockProcessor** (`src/features/note-insight-code-block-processor.ts`)
   - Registers and manages custom code block rendering for `note-insight-yearly` and `note-insight-monthly`
   - Orchestrates component rendering, refresh logic, and period selection persistence
   - Delegates update operations to specialized utility classes
   - Manages component lifecycle and event listeners

3. **UserNotifier** (`src/utils/user-notifier.ts`)
   - Handles user notifications for duplicate codeblock detection
   - Provides consistent notification messages across canvas and note contexts
   - Centralizes user feedback logic

4. **CanvasUpdater** (`src/utils/canvas-updater.ts`)
   - Specialized class for updating codeblocks in canvas text nodes
   - Accesses canvas data via workspace API
   - Finds and updates matching nodes by content
   - Handles canvas JSON parsing and modification

5. **NoteUpdater** (`src/utils/note-updater.ts`)
   - Specialized class for updating codeblocks in markdown files
   - Scans entire file for matching codeblocks
   - Handles line-based text manipulation
   - Manages range adjustments when inserting new properties

6. **NoteInsightContextMenuManager** (`src/features/note-insight-context-menu-manager.ts`)
   - Integrates insight options into editor context menus
   - Handles note selection and codeblock insertion
   - Works in both markdown editors and canvas text node editors

**UI Components:**
- **YearlyTrackerComponent** and **MonthlyTrackerComponent** (no modifications required)
  - Reused from existing Note Insight View implementation
  - Accept callbacks for period change notifications
  - Remain stateless - period selection managed by processor

**Architecture Benefits:**
- **Separation of Concerns**: Update logic extracted from rendering logic into specialized classes
- **No Logic Duplication**: Canvas feature leverages the same analysis service as the main insights panel
- **Consistent Results**: All components show identical data since they use the same analysis pipeline
- **Maintainability**: Single point of change for each responsibility (notifications, canvas updates, note updates)
- **Testability**: Specialized classes can be tested independently
- **Clarity**: CodeBlockProcessor focuses on rendering and orchestration, not update details

## Technical References

- [Canvas Context Menu Integration Guide](../references/canvas-context-menu-integration.md) - Technical documentation for adding custom canvas context menus
- [Canvas Event Research](../references/canvas-event-research/) - Debugging examples and source code research
- node_modules/obsidian/obsidian.d.ts - Obsidian TypeScript definitions for plugin APIs
