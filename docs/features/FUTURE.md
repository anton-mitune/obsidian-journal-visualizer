## FEA004 - Embed Note Insight Component in Editor and Canvas Nodes

### Requirement X - Persistent component configuration
**User Story:** As a note author, I want any component, in insight view, or embedded in markdown or canvas, to remember its configuration (e.g., selected year for yearly tracker) across Obsidian restarts, so that I don't have to reconfigure it each time I open Obsidian.
--> Where should I store this info? In component? in registry? in codeblock instance? in itemView instance? should I have component unique IDs mapped to note IDs?

### Requirement X — Slash command support for inserting note insight components
**User Story:** As a knowledge worker, I want to use an obsidian slash command in the editor to quickly insert note insight components from existing notes.
**Example:**
- GIVEN that I have a markdown editor or canvas text node editor active
- WHEN I type "/" to open the slash command palette
- THEN I see options for "Insert Yearly Tracker from Vault" and every other note insight component available
- WHEN I select one of these options
- THEN I am prompted to select a source note via a note selector modal
- WHEN I select the note
- THEN the corresponding note insight code block is inserted at the cursor position, it is rendered into a note insight component displaying the insight data for that note exactly as it appears in the note insights panel

### Performance Optimizations
- Current implementation creates one event listener per code block instance. For vaults with many embedded note insights, consider implementing a centralized event manager that dispatches to relevant components
- Implement debouncing for rapid successive metadata changes to avoid redundant re-renders
- Add caching layer to BacklinkAnalysisService to avoid re-computing unchanged data

## Minor bugs
- note insight Style "glitches" when editing a text node in canvas. Probably a css selector mismatch, that only match itemView, or editorView, but not canvas text node view. affects only to monthly tracker, yearly tracker is unaffected.



// TODO later, add a settings page for the plugin to let user explicitly set week start day if needed.

use a proper logging system instead of console.log for debug/info/warn/error messages.
