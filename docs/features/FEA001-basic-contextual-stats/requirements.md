# Requirements Document

## Introduction
This feature adds a small contextual statistic to the backlink pane shown by Obsidian when viewing a note: a count of how many backlinks to the current note originate from daily notes in the current calendar month. 

### Assumptions
- Daily notes are identified as notes that live in the Daily note folder.
- The Daily note folder is configured in obsidian "Daily notes" core plugin settings.
- the daily note file name contains a date in format YYYY-MM-DD
- multiple Backlinks to same note from a single daily note count as many times as they occur.
- "Current month" uses the user's local timezone and calendar month containing today's date as defined in obsiidian settings.

## Requirements

### Requirement 1 — Show current-month daily-note backlink count
**User Story:** As a note author, I want to see how many of my current-month daily notes link to this note, so that I can quickly understand its recent relevance in my journaling.

#### Acceptance Criteria
1. WHEN a user opens a note (or focuses an open note) AND the backlink pane is shown THEN the system SHALL display a numeric badge labeled "Daily notes (this month)" whose value is the count of distinct daily notes in the current month that contain at least one link to the opened note.
2. IF there are zero daily notes linking to the note in the current month THEN the system SHALL display the badge with value 0 and an optional dimmed style to indicate no recent references.

---
End of requirements for FEA001 (basic contextual stats — current-month daily-note backlink count).

