## Ideation
- Allow adding note insight components from existing notes as code blocks in editors
- Users can add insights to markdown notes or canvas text nodes via editor context menus
- Provides a simple way to embed note metadata and visualizations where users are actively working

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

### Requirement 2 - Component refresh on file open
**User Story:** As a knowledge worker, I want the embedded note insight components to update when I open or switch to a note containing them, so that I see current backlink data.

**Example:**
- GIVEN that I have a note containing a yearly tracker code block for Note A
- AND Note A currently has 2 backlinks from daily notes in current year
- WHEN I open today's daily note and add a backlink to Note A
- AND I switch back to the note with the yearly tracker code block
- THEN the yearly tracker component updates to reflect the new backlink count (3 backlinks)



## Design

**Selected Implementation Approach: Code Block Rendering with Self-Managed Lifecycle**

After comprehensive research of available rendering methods, the **code block rendering approach** has been selected as the optimal solution. This approach uses custom markdown code blocks (e.g., ```note-insight-yearly) that render full interactive components within editors, with each component managing its own refresh lifecycle.

**Implementation Architecture:**

1. **Code Block Processors**: Register custom markdown processors for `note-insight-yearly` and `note-insight-monthly` that:
   - Render the existing tracker components with full interactivity
   - Register a `file-open` event listener for the containing file
   - Store component and event listener references for cleanup
   - Use `MarkdownPostProcessorContext` to detect when to clean up
   - When the container file is opened, re-query backlink data via `BacklinkAnalysisService` and call the component's `updateData()` method to refresh the visualization
   - Clean up event listeners when the code block is removed from DOM

2. **Editor Context Menu Integration**: Add insight options to editor context menus that:
   - Present note selector modal when selected
   - Insert appropriate code block at cursor position
   - Work in both markdown editors and canvas text node editors

3. **Component Integration**: Reuse existing `YearlyTrackerComponent` and `MonthlyTrackerComponent` without modification, preserving all interactive features (navigation, hover tooltips, etc.)

**Refresh Strategy:**
- **Trigger**: When user opens/switches to the file containing the embedded component (via `file-open` event)
- **Action**: Each code block processor instance independently:
  1. Detects that its container file was opened
  2. Queries latest backlink data from `BacklinkAnalysisService`
  3. Calls the component's `updateData()` method with fresh data
  4. Component re-renders itself with new counts/visualizations
- **Simplicity**: No global registry needed - each code block processor instance manages its own component's lifecycle

**User Workflow:**
1. User right-clicks in an editor (markdown or canvas text node) → selects "Add Monthly Tracker from Vault"
2. Note selector modal appears (similar to native Obsidian file picker)
3. User selects source note
4. Code block is inserted at cursor position:
```note-insight-monthly
notePath: Vault/Path/to/SelectedNote.md
```
5. Component renders immediately
6. When user switches back to this file, component refreshes to show current data

**Technical Rationale:**
- **API Stability**: Uses official `registerMarkdownCodeBlockProcessor` API and editor events, ensuring future compatibility
- **Full Functionality**: Preserves 100% of existing component features and interactivity
- **Simple Lifecycle**: Each code block processor instance manages its component's refresh independently
- **Clean Implementation**: Standard pattern for code block processors that need to react to events
- **Maintainability**: Reuses existing architecture and analysis service; no duplication

**Implementation Details:**
- Code block format:
```note-insight-[yearly|monthly]
notePath: [note-path]
```
- Editor integration using `editor-menu` events for consistent behavior
- Each processor stores: component instance, event listener reference, container file path
- Event listener checks if opened file matches container file before refreshing
- Use `MarkdownPostProcessorContext` for cleanup detection
- No command palette registration - context menu only

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

## CHANGELOG
2025-11-05 12:41 - Initial specification created, more research required about rendering methods for note insight components on canvas nodes.
2025-11-06 14:30 - Research completed, design finalized using code block rendering approach with context menu integration.
2025-11-06 15:45 - Canvas context menu integration implemented using direct DOM listening approach, technical documentation created.
2025-11-06 20:00 - Simplified implementation, removed command palette registration, dropped direct canvas integration for technical reasons, focused on editor context menu integration only.
2025-11-07 - Added requirement about component refresh on file open

## Future Considerations

### Requirement 3 — Slash command support for inserting note insight components
**User Story:** As a knowledge worker, I want to use an obsidian slash command in the editor to quickly insert note insight components from existing notes.
**Example:**
- GIVEN that I have a markdown editor or canvas text node editor active
- WHEN I type "/" to open the slash command palette
- THEN I see options for "Insert Yearly Tracker from Vault" and every other note insight component available
- WHEN I select one of these options
- THEN I am prompted to select a source note via a note selector modal
- WHEN I select the note
- THEN the corresponding note insight code block is inserted at the cursor position, it is rendered into a note insight component displaying the insight data for that note exactly as it appears in the note insights panel

### Others
- Current implementation is not real-time. it requires reopening the file to refresh the data. And backlink changes take a few seconds to reflect in Obsidian metadata cache. Consider real-time updates in future with a centralized events registration system
