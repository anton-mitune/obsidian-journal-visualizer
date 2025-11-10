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
- Each component type has its own context menu option following the pattern: "Add [Component Name] from Vault"
- All registered note insight components can be embedded using this infrastructure

**Current Available Components:**
See the [Component Capabilities Matrix](component-capabilities-matrix.md) for the full list of available components and their specific code block formats.

### Requirement 1 — Add note insight component to editors via context menu
**User Story:** As a knowledge worker, I want to add note insight components from existing notes to my current editor context (markdown notes or canvas text nodes), so that I can visualize metadata and patterns directly where I'm working.

**Example:**
- GIVEN that I have a note with 2 backlinks from daily notes in 2025 AND I have a markdown editor or canvas text node editor active
- WHEN I right-click in the editor to open the context menu
- THEN I see options for adding note insight components (e.g., "Add Yearly Tracker from Vault", "Add Monthly Tracker from Vault", "Add Backlink Counter from Vault")
- WHEN I select one of these options
- THEN I am prompted to select a source note via a note selector modal
- WHEN I select the note
- THEN the corresponding note insight code block is inserted at the cursor position, it is rendered into a note insight component displaying the insight data for that note exactly as it appears in the note insights panel

**Note:** The specific components available depend on what's registered. See individual component feature documents for details on each component's behavior.

### Requirement 2 - Component refresh on backlink changes
**User Story:** As a knowledge worker, I want the embedded note insight components to update automatically when the watched note's backlinks change, so that I always see current data without manual intervention.

**Example 1 - Markdown notes:**
- GIVEN that I have a note containing a component code block for Note A
- AND Note A currently has 2 backlinks from daily notes
- WHEN I open today's daily note and add a backlink to Note A
- THEN the component updates to reflect the new backlink count (3 backlinks) within a few seconds

**Example 2 - Canvas nodes:**
- GIVEN that I have a canvas with a text node containing a component code block for Note A
- AND Note A currently has 2 backlinks from daily notes
- AND the canvas is open in pane A
- WHEN I open today's daily note in pane B and add a backlink to Note A
- THEN the component in the canvas updates to reflect the new backlink count (3 backlinks) within a few seconds
- This update happens regardless of whether I'm currently editing the text node or just viewing it

**Example 3 - Multiple simultaneous views:**
- GIVEN that I have both a markdown note and a canvas open, each containing a component for Note A
- WHEN I add a backlink to Note A from a daily note
- THEN both components (in markdown and canvas) update to show the new count

### Requirement 3 - Persistent component state
**User Story:** As a note author, I want embedded note insight components to remember their configuration state (e.g., selected period, year, month) across Obsidian restarts or active note or canvas change, so that I don't have to reconfigure them each time I open Obsidian or the component's container.

**Example 1:**
- GIVEN that I have embedded a component for Note A in note B
- AND the component has a configurable state (e.g., selected year 2024)
- AND current year is 2025
- WHEN I close Obsidian and reopen it
- AND open note B
- THEN the component still shows the previously selected state (year 2024)

**Example 2 for independent instances:**
- GIVEN that I have embedded two instances of the same component type for Note A in note B
- AND the first instance is configured with state A (e.g., year 2023)
- AND the second instance is configured with state B (e.g., year 2024)
- WHEN I close Obsidian and reopen it
- AND open note B
- THEN the first instance shows state A (year 2023)
- AND the second instance shows state B (year 2024)

**Note:** The specific state properties depend on the component type. See individual component features for details.

## Codeblock Format Specification

All note insight components follow a consistent code block format pattern:

### Generic Format
```note-insight-[type]
notePath: path/to/watched/note.md
[component-specific-state-properties]
```

**Common Properties:**
- `notePath`: Path to the note being watched (required for all components)

**State Properties:**
Each component may have additional properties for persisting user configuration (e.g., `year`, `month`, `period`). These are documented in the individual component specifications.

## Design

**Implementation Approach: Code Block Rendering with Metadata-Driven Refresh and Persistent State**

The implementation provides a generic infrastructure for embedding any note insight component via custom markdown code blocks (e.g., ```note-insight-yearly, ```note-insight-monthly, ```note-insight-counter). Each component listens to metadata cache changes and refreshes when its watched note's backlinks are modified. Component-specific state is persisted directly to the code block content.

### Implementation Architecture

#### 1. Code Block Processors (`NoteInsightCodeBlockProcessor`)
Registers custom markdown processors for each component type (e.g., `note-insight-yearly`, `note-insight-monthly`, `note-insight-counter`) that:

- **Parse Configuration**: Extract `notePath` and component-specific state properties from code block content
- **Render Components**: Create and mount the appropriate component instance with full interactivity
- **Auto-Refresh on Backlink Changes**: 
  - Register a `metadata-cache:resolved` event listener that monitors backlink changes
  - When the watched note's backlinks change, re-query backlink data via `BacklinkAnalysisService`
  - Call the component's `updateData()` method to refresh the visualization
  - Use `isUpdatingCodeblock` flag to prevent refresh loops when updating code block content
- **Component State Persistence**:
  - Components pass a callback to notify the processor when the user changes component state
  - Processor updates the code block content in the file (markdown or canvas) to persist the state
- **Lifecycle Management**:
  - Store component instance, watched note path, event listener, and DOM element references
  - Use `MarkdownRenderChild` for proper cleanup when code block is removed from DOM
  - Clean up event listeners and component instances on unload

#### 2. State Persistence Strategy

**Storage Mechanism**: Component state is stored directly in the code block content as properties. The specific properties depend on the component type (see individual component specifications).

**Generic Example:**
```note-insight-[type]
notePath: path/to/note.md
[state-property]: [value]
```

**Update Flow**:
1. User interacts with component (e.g., changes selected period/year/month)
2. Component invokes callback with new state value
3. Processor determines context (markdown file or canvas node)
4. **For Markdown Files**:
   - Read file content via Vault API
   - Locate code block using `ctx.getSectionInfo()`
   - Update or insert state property
   - Write modified content back to file
5. **For Canvas Text Nodes**:
   - Detect canvas context via empty `ctx.sourcePath`
   - Access active canvas view and canvas file via workspace API
   - Parse canvas JSON
   - Find matching node(s) by searching for `notePath` + code block type
   - Update state property in node's text content
   - Save modified canvas JSON
6. Set `isUpdatingCodeblock` flag during update to prevent metadata cache event from triggering refresh loop

**Duplicate Handling**:
- When multiple code blocks of the same type watch the same note in the same note or canvas:
  - All matching instances are updated simultaneously
  - User receives a notification: `⚠️ Multiple [component name]'s found for "Note Name" in this [context]. All X instances will be updated.`

**Infinite Loop Prevention**:
- `isUpdatingCodeblock` flag prevents refresh during code block content updates
- Flag is cleared after a 100ms delay to allow file processing to complete
- Metadata cache events skip processing when flag is set

#### 3. Editor Context Menu Integration (`NoteInsightContextMenuManager`)
Adds component insertion options to editor context menus that:

- Listen for `editor-menu` events to detect editor context menu openings
- Add menu items for each registered component type (e.g., "Add Yearly Tracker from Vault", "Add Monthly Tracker from Vault", "Add Backlink Counter from Vault")
- Present note selector modal when selected
- Insert appropriate code block at cursor position with initial configuration
- Work in both markdown editors and canvas text node editors

**Component Registration:**
Each component type is registered with the context menu manager, which generates the appropriate menu item and code block template. See individual component features for specific menu item labels and default configurations.

#### 4. Component Integration
Reuses existing note insight components without modification:

- Components accept a callback in their constructor for state change notifications
- All interactive features preserved (navigation, hover tooltips, data visualization)
- Components remain stateless - state selection managed by processor
- Each component implements the standard note insight component pattern (see [Adding Note Insight Components guide](../steering/adding-note-insight-components.md))

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
- Match criteria: node contains both the `notePath` AND the code block type marker
- This ensures correct node is found even when multiple code blocks watch the same note

**Update Process**:
1. Parse canvas JSON from canvas file
2. Find all matching text nodes (for duplicate detection)
3. Update period property in each node's text content
4. Save modified canvas JSON back to file
5. Single save operation after updating all duplicates

### User Workflow

1. User right-clicks in an editor (markdown or canvas text node) → selects a component insertion option (e.g., "Add Monthly Tracker from Vault")
2. Note selector modal appears (similar to native Obsidian file picker)
3. User selects source note
4. Code block is inserted at cursor position with default configuration (specific format depends on component type)
5. Component renders immediately with current backlink data
6. User can interact with component (e.g., navigate to different periods) - state changes are saved to code block automatically
7. When user adds/removes backlinks to the watched note from any note, all visible instances of that component for that note update automatically
8. Component state persists across Obsidian restarts and file/canvas changes

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
- Multiple instances of the same component type watching the same note in the same file/canvas will synchronize their state (this is intentional to maintain consistency)
- Canvas text node updates rely on the canvas being the active view in the most recent leaf

## Classes and Interfaces

**Core Classes:**

1. **BacklinkAnalysisService** (`src/services/backlink-analysis-service.ts`)
   - Centralized service providing note analysis data to code block processors
   - Used by both code block processors and Note Insight View
   - Eliminates duplication between canvas features and note insights panel
   - Provides consistent results across all components

2. **NoteInsightCodeBlockProcessor** (`src/features/note-insight-code-block-processor.ts`)
   - Registers and manages custom code block rendering for all note insight component types
   - Orchestrates component rendering, refresh logic, and state persistence
   - Delegates update operations to specialized utility classes
   - Manages component lifecycle and event listeners

4. **CanvasUpdater** (`src/utils/canvas-updater.ts`)
   - Specialized class for updating code blocks in canvas text nodes
   - Accesses canvas data via workspace API
   - Finds and updates matching nodes by content
   - Handles canvas JSON parsing and modification
   - Supports all registered component types

5. **NoteUpdater** (`src/utils/note-updater.ts`)
   - Specialized class for updating code blocks in markdown files
   - Scans entire file for matching code blocks
   - Handles line-based text manipulation
   - Manages range adjustments when inserting new properties
   - Supports all registered component types

6. **NoteInsightContextMenuManager** (`src/features/note-insight-context-menu-manager.ts`)
   - Integrates component insertion options into editor context menus
   - Handles note selection and code block insertion
   - Works in both markdown editors and canvas text node editors
   - Manages menu items for all registered component types

**UI Classes:**
All registered note insight components (no modifications required):
- Accept callbacks for state change notifications
- Remain stateless - state selection managed by processor
- Follow the standard component architecture pattern

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

## Notes

For the current list of available components and their capabilities, see the [Component Capabilities Matrix](component-capabilities-matrix.md).

Individual component specifications:
- [FEA002: Yearly Tracker](FEA002-yearly-tracker.md)
- [FEA003: Monthly Tracker](FEA003-monthly-tracker.md)
- [FEA005: Backlink Counter](FEA005-backlink-count-tracker.md)
