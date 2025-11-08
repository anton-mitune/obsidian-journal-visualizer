## Ideation
- adds a new obsidian *note insight* view available in right sidebar
- view shows the title of active note, and other note insight components available in this context (implemented in other features)
- provides the infrastructure for displaying all registered note insight components in a dedicated panel
- components automatically update when switching between notes

## Requirements

### Assumptions
- Daily notes are identified as notes that live in the Daily note folder.
- The Daily note folder is configured in obsidian "Daily notes" core plugin settings.
- the daily note file name contains a date in format YYYY-MM-DD

### Requirement 1 — Currently active note title display
**User Story:** As a note author, I want to see the title of the currently active note displayed at the top of the Note Insights panel, so that I can easily confirm which note's insights I am viewing.

### Requirement 2 — Component display infrastructure
**User Story:** As a note author, I want all registered note insight components to appear automatically in the Note Insights panel for the active note, so that I can view all available insights in one place without manual configuration.

**Note:** This feature provides the infrastructure only. Individual components are specified in their respective feature documents (see [Component Capabilities Matrix](component-capabilities-matrix.md)).

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

## Classes and Interfaces

1) **BacklinkWatcher** - Monitors workspace events and triggers backlink count updates
2) **DailyNoteClassifier** - Identifies daily notes and counts links from current month
3) **NoteInsightsView** - Custom Obsidian view that displays the insights in right sidebar
4) **ViewManager** - Manages view lifecycle, registration, and updates

## Available Components

The Note Insights panel displays all registered note insight components. For the current list of available components and their capabilities, see the [Component Capabilities Matrix](component-capabilities-matrix.md).

Individual component specifications:
- [FEA002: Yearly Tracker](FEA002-yearly-tracker.md)
- [FEA003: Monthly Tracker](FEA003-monthly-tracker.md)
- [FEA005: Backlink Counter](FEA005-backlink-count-tracker.md)
