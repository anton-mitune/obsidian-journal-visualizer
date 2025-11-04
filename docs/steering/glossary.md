# Glossary

## Core Concepts

**Daily Note** - A note that lives in the configured Daily Notes folder and has a filename containing a date in YYYY-MM-DD format. Used for daily journaling and time-based note organization.

**Daily Notes Folder** - The folder configured in Obsidian's "Daily notes" core plugin settings where daily notes are stored.

**Current Month** - The calendar month containing today's date, using the user's local timezone as defined in Obsidian settings.

**Backlink** - A link from one note to another. In Obsidian, these are tracked automatically and accessible via the metadata cache.

**Daily Note Backlink** - A backlink that originates from a daily note. These are the primary focus of FEA001's counting logic.

**Link Count** - The number of times one note links to another. Multiple links from the same source note are counted separately (e.g., if Note A links to Note B three times, the link count is 3, not 1).

**Current Month Daily Note Backlinks** - The total count of all links from daily notes in the current month that point to the active note. This includes multiple links from the same daily note file.

**Note Insights View** - A custom Obsidian view panel that displays analytical information about the currently active note, shown in the right sidebar.

**Active Note** - The note currently being viewed/edited in the Obsidian workspace.

**Resolved Links** - Obsidian's internal tracking of all links between notes, accessible via `app.metadataCache.resolvedLinks`. Includes count information for multiple links between the same files.
