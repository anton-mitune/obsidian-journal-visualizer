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

## Design

**Selected Implementation Approach: Code Block Rendering**

After comprehensive research of available rendering methods, the **code block rendering approach** has been selected as the optimal solution. This approach uses custom markdown code blocks (e.g., ```note-insight-yearly) that render full interactive components within canvas text nodes.

**Implementation Architecture:**

1. **Code Block Processors**: Register custom markdown processors for `note-insight-yearly` and `note-insight-monthly` that render the existing tracker components with full interactivity

2. **Editor Context Menu Integration**: Add insight options to editor context menus that:
   - Present note selector modal when selected
   - Insert appropriate code block at cursor position
   - Work in both markdown editors and canvas text node editors

3. **Component Integration**: Reuse existing `YearlyTrackerComponent` and `MonthlyTrackerComponent` without modification, preserving all interactive features (navigation, hover tooltips, etc.)

**User Workflow:**
1. User right-clicks in an editor (markdown or canvas text node) → selects "Add Monthly Tracker from Vault"
2. Note selector modal appears (similar to native Obsidian file picker)
3. User selects source note
4. Code block is inserted at cursor position:
```note-insight-monthly
notePath: Vault/Path/to/SelectedNote.md
```
5. Component renders immediately with full functionality

**Technical Rationale:**
- **API Stability**: Uses official `registerMarkdownCodeBlockProcessor` API and editor events, ensuring future compatibility
- **Full Functionality**: Preserves 100% of existing component features and interactivity
- **Simple Integration**: Uses editor context menus which work consistently across markdown and canvas text editors
- **Clean Implementation**: Minimal complexity, focused on core functionality
- **Maintainability**: Reuses existing architecture without canvas-specific complexities

**Implementation Details:**
- Code block format:
```note-insight-[yearly|monthly]
notePath: [note-path]
```
- Editor integration using `editor-menu` events for consistent behavior
- Component lifecycle managed through existing container system
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
