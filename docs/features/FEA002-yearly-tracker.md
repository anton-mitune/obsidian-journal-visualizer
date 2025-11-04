Version: 2.0

## Ideation
- adds a new component to the *note insight* panel 
- it should display a yearly tracker, git tracker style, or anilist tracker style, showing which days in the current year the active note was linked from a daily note
- it should display a monthly tracker in same fashion as yearly tracker.

![Reference screenshot of anilist tracker](../assets/reference-anilist-tracker.png)

## Requirements

### Requirement 1 — Yearly tracker display
**User Story:** As a note author, I want to see a yearly tracker in the note insights panel that highlights the days in the current year when the active note was linked from daily notes, so that I can quickly visualize its relevance over time.

### Requirement 2 - Additional info on hover
**User Story:** As a note author, I want to see a short summary about the backlinks when I hover over a day in the yearly tracker, so that I can understand how many backlinks were made from what line of daily notes on that specific day.

### Requirement 3 - Monthly tracker display
**User Story:** As a note author, I want to see a monthly tracker in the note insights panel that highlights the days in the current month when the active note was linked from daily notes, so that I can quickly visualize its relevance over the current month.

### Assumptions and rules
- the yearly tracker displays all days from January 1st to December 31st of the current year
- days that have at least one backlink from a daily note to the active note are highlighted (e.g., colored square)
- days without backlinks are shown in a neutral style (e.g., gray square)
- the colored square intensity or style can indicate the number of backlinks (e.g., darker color for more backlinks)
- the intensity scale is linear, with 1 backlink being the lightest color and the maximum backlinks in a single day being the darkest color
- the shade amplitude is capped at a reasonable maximum (e.g., 5 backlinks) to avoid overly dark squares


## Design

High-level flow:
- similar to FEA001, we only need to build a new component in the Note Insights view.
- If additional logic is deemed required during implementation, it should be encapsulated in new or existing core utility classes.

Useful ressources:
- [Obsidian Developers doc](https://docs.obsidian.md/Home)
- [Obsidian Views API](https://docs.obsidian.md/Plugins/Plugin+API)
- [Obsidian guide to use react in a plugin](https://docs.obsidian.md/Plugins/Getting+started/Use+React+in+your+plugin)

## Components and Interfaces
- **YearlyTrackerComponent**: A class that renders the yearly tracker UI in the Note Insights panel.


## CHANGELOG
2025-11-03 19:30 - Initial implementation of yearly tracker component in note insights panel.
2025-11-04 19:31 - Added monthly tracker component to note insights panel.
