## Ideation
- adds a new obsidian *note insight* view available in right sidebar
- view shows the title of active note, and other note insight components available in this context (implemented in other features)

## Requirements

### Assumptions
- Daily notes are identified as notes that live in the Daily note folder.
- The Daily note folder is configured in obsidian "Daily notes" core plugin settings.
- the daily note file name contains a date in format YYYY-MM-DD

### Requirement 1 — Currently active note title display
**User Story:** As a note author, I want to see the title of the currently active note displayed at the top of the Note Insights panel, so that I can easily confirm which note's insights I am viewing.

## Design

**Implementation Architecture:**
- **Custom Obsidian View**: Uses `ItemView` to create a proper "Note insights" panel in the right sidebar, replacing DOM manipulation approach
- **Event-driven Updates**: Listens for `active-leaf-change` and `file-open` events to trigger backlink recalculation

Technology & API rationale:
- Use Obsidian plugin APIs exclusively. No external network or Node modules.
- Keep all logic in small modules (utilities) to make unit testing straightforward.
- Uses proper Obsidian view architecture (`ItemView`, `registerView`) to build foundation for future interactivity and external libraries like Chart.js
- Follows Obsidian plugin best practices with proper event registration and cleanup via `plugin.registerEvent()`

Useful resources:
- [Obsidian Developers doc](https://docs.obsidian.md/Home)
- [Obsidian Views API](https://docs.obsidian.md/Plugins/User+interface/Views)
- [Obsidian guide to use react in a plugin](https://docs.obsidian.md/Plugins/Getting+started/Use+React+in+your+plugin)

## Components and Interfaces

1) **BacklinkWatcher** - Monitors workspace events and triggers backlink count updates
2) **DailyNoteClassifier** - Identifies daily notes and counts links from current month
3) **NoteInsightsView** - Custom Obsidian view that displays the insights in right sidebar
4) **ViewManager** - Manages view lifecycle, registration, and updates
