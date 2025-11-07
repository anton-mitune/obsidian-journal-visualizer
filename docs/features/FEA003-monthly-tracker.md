## Ideation
- adds a new note insight component that displays a monthly tracker of backlinks from daily notes to the active note
- it should display a monthly tracker in same fashion as yearly tracker for a selected month made in FEA002
- users should be able to navigate between different months to see historical monthly tracking data



## Requirements

### Requirement 1 — Monthly tracker display
**User Story:** As a note author, I want to see a monthly tracker in the note insights panel that highlights the days in a selected month when the active note was linked from daily notes, so that I can quickly visualize its relevance over time for any month.

### Requirement 2 — Month navigation controls
**User Story:** As a note author, I want to navigate between different months in the monthly tracker (previous/next month buttons), so that I can view historical monthly tracking data and see how my note's relevance has changed over time across different months and years.

### Requirement 3 — Independent operation from yearly tracker
**User Story:** As a note author, I want the monthly tracker to operate independently from the yearly tracker, so that I can examine different time periods simultaneously (e.g., monthly tracker showing March 2024 while yearly tracker shows 2025).

### Requirement 4 - Additional info on hover
**User Story:** As a note author, I want to see a short summary about the backlinks when I hover over a day in the monthly tracker, so that I can understand how many backlinks were made from what line of daily notes on that specific day.

### Assumptions and rules
- the monthly tracker displays all days from the 1st to the last day of the selected month/year (defaults to current month)
- users can navigate between months using previous/next month buttons
- navigation should have reasonable bounds (e.g., from when daily notes first appeared in the vault to current month + 1)
- days that have at least one backlink from a daily note to the active note are highlighted (e.g., colored square)
- days without backlinks are shown in a neutral style (e.g., gray square)
- the colored square intensity or style can indicate the number of backlinks (e.g., darker color for more backlinks)
- the intensity scale is linear, with 1 backlink being the lightest color and the maximum backlinks in a single day being the darkest color
- the shade amplitude is capped at a reasonable maximum (e.g., 5 backlinks) to avoid overly dark squares
- when switching months, the tracker should maintain the same visual style and hover functionality
- the monthly tracker state is completely independent from the yearly tracker state
- month navigation can cross year boundaries (e.g., December 2023 → January 2024)
- the monthly tracker operates independently from the yearly tracker (can show different months/years)
- the colors used for highlight should rely exclusively on Obsidian theme variables to ensure proper theming support

## Design

High-level flow:
- similar to FEA002, we build a component in the Note Insights view with month navigation capabilities
- the monthly tracker component maintains its own navigation state independent from the yearly tracker
- month navigation includes previous/next buttons and displays the current month/year
- if additional logic is deemed required during implementation, it should be encapsulated in new or existing core utility classes

Key design considerations:
- **Month Navigation Logic**: Handle month boundaries and year transitions (Dec → Jan with year increment)
- **Data Fetching**: Query daily note data for the specific selected month/year combination
- **UI Layout**: Similar to yearly tracker but with month-specific grid layout (calendar-style)
- **Bounds Calculation**: Determine valid month range based on available daily notes across all years

Technical approach:
- Extend the existing DailyNoteClassifier to support month-specific queries
- Create month navigation state management similar to yearly tracker
- Implement month boundary logic for navigation (handle year transitions)
- Create calendar-style grid layout for the selected month

Useful resources:
- [Obsidian Developers doc](https://docs.obsidian.md/Home)
- [Obsidian Views API](https://docs.obsidian.md/Plugins/Plugin+API)
- [Obsidian guide to use react in a plugin](https://docs.obsidian.md/Plugins/Getting+started/Use+React+in+your+plugin)

## Components and Interfaces
- **MonthlyTrackerComponent**: A class that renders the monthly tracker UI in the Note Insights panel with month navigation capabilities.
- **MonthBounds**: Interface for defining valid month range based on available daily note data

