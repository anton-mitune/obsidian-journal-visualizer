## Ideation
- adds a new obsidian *note insight* view available in right sidebar
- view shows the title of active note, and the count of daily notes in the current month that link to the currently open note

## Requirements

### Assumptions
- Daily notes are identified as notes that live in the Daily note folder.
- The Daily note folder is configured in obsidian "Daily notes" core plugin settings.
- the daily note file name contains a date in format YYYY-MM-DD
- multiple Backlinks to same note from a single daily note count as many times as they occur.
- "Current month" uses the user's local timezone and calendar month containing today's date as defined in obsiidian settings.

### Requirement 1 — Show current-month daily-note backlink count
**User Story:** As a note author, I want to see how many of my current-month daily notes link to the active note, so that I can quickly understand its recent relevance in my journaling.

### Requirement 2 - Links counting rule
**User Story:** As a note author, I want multiple backlinks from the same daily note to be counted multiple times, so that I can gauge the emphasis I placed on the active note in my daily journaling.
**Example 1 - simple:**
- Given the active note is "Meeting Notes"
- And the current month is November 2025
- And the following daily notes link to "Meeting Notes":
  - "2025-11-03.md" links once
  - "2025-10-04.md" links once
- When I view the note insight for "Meeting Notes"
- Then I should see a count of 1 (only the link from Nov 3 is counted because Oct 4 is outside the current month)

**Example 2 - advanced:**
- Given the active note is "Project Ideas"
- And the current month is November 2025
- And the following daily notes link to "Project Ideas":
  - "2025-11-01.md" links once
  - "2025-11-02.md" links three times
  - "2025-10-31.md" links twice
- When I view the note insight for "Project Ideas"
- Then I should see a count of 4 (1 from Nov 1 + 3 from Nov 2; links from Oct 31 are not counted)


## Design

High-level flow:
- On note open / focus, query Obsidian for backlinks to the current note using `app.metadataCache.resolvedLinks`
- Filter backlink sources to files that are inside the configured daily notes folder and whose filenames match YYYY-MM-DD for the current month
- Count the total number of links from qualifying daily notes (including multiple links from the same daily note file)
- Update the Note Insights view UI in the right sidebar

**Implementation Architecture:**
- **Custom Obsidian View**: Uses `ItemView` to create a proper "Note insights" panel in the right sidebar, replacing DOM manipulation approach
- **Event-driven Updates**: Listens for `active-leaf-change` and `file-open` events to trigger backlink recalculation
- **Link Count Tracking**: Leverages Obsidian's `resolvedLinks` API which provides actual link counts per file, not just binary "has links" information

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
