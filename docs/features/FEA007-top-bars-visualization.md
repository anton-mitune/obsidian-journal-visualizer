## Ideation
- Extends on FEA009 to support additional display modes for components supporting multiple notes watching
- Provides UI controls for switching display mode watched notes without manual code block editing
- Enables presenting multiple top-N backlink counts
- it aims to be configurable with minimal effort from users


## Requirements

### Requirement 1 — Top-N Display Mode
**User Story:** As a note author, I want note insight components to support a "top-n" display mode, so that I can visualize the top N backlinks from my journal to watched notes over selected period.
**Example:**
- GIVEN I have a backlink counter component watching the notes "Project Alpha", "Project Beta", and "Project Gamma" in default mode.
- AND I have 3  links from my journal note to "Project Alpha", 5 links to "Project Beta", and 2 links to "Project Gamma" over the past month
- AND I have set the period to "last month"
- WHEN I set the display mode to "top-n"
- THEN instead of the normal counter, I see a horizontal bar chart with:
  - "Project Beta" at the top with a count of 5
  - "Project Alpha" in the middle with a count of 3
  - "Project Gamma" at the bottom with a count of 2
- AND the usual component UI controls (period selector, etc.) remain available


### Assumptions and Rules
- Top-N mode is only available in code block embeds (markdown files), not in the Note Insights View panel
- Note Insights View panel always shows the default mode for the currently active note only
- in top-n, n refers to the actual number of watched notes. If 20 notes are watched, all 20 are shown in descending backlink count order.
- when two notes have the same backlink count, they are sorted alphabetically by note title.
- if a note has 0 backlinks in the selected period, it is still shown with a count of 0.
- Switching display modes happens by clicking the display mode dropdown in the component UI, similar to period selector.
- no hard spec on visuals, inspire from obsidian visuals and aesthetics.
- very long note names should be truncated with ellipsis to prevent layout breaking.
- default mode value is "default", meaning existing behavior is preserved unless user explicitly switches to "top-n" mode.


## Design

### Code Block Syntax

**default mode of component (current default):**
```note-insight-[component-type]
displayAs: default
```

**top mode of component:**
```note-insight-[component-type]
displayAs: top-n
```

**Full Example**
```note-insight-backlink-counter
displayAs: top-n
notePath: Projects/Alpha.md
notePath: Projects/Beta.md
notePath: Projects/Gamma.md
period: last-month
```

### Technical Implementation

**Rendering Approach:**
- Use vanilla CSS with HTML progress bar elements for visualization
- Dedicated TopNRenderer class in `src/ui/top-n-renderer.ts` for separation of concerns
- Keep rendering logic self-contained and reusable for future components

**Component Rendering Logic:**
- Add UI logic to toggle display modes, update codeblock, and re-render component accordingly, leveraging existing code block update mechanisms from FEA009 (parent codeblock-processor class, and counter component)
- Separate the 2 display modes rendering logic into separate methods for clarity and maintainability: renderDefaultMode() and renderTopNMode()
- Extract current rendering logic into renderDefaultMode() to keep existing behavior intact
- renderTopNMode() delegates to TopNRenderer class to maintain single responsibility principle

**Implementation Details:**
- TopNRenderer receives NoteCounterResult[] and periodLabel
- Sorts results by count descending, then alphabetically for ties
- Creates horizontal bar visualization using CSS and HTML elements
- Truncates long note titles with ellipsis to prevent layout breaking
- Shows all watched notes including those with 0 backlinks

**Other Technical Info:**
- New enum for display types (default, top-n, pie)
- Update types to include display mode in codeblocks that support it (e.g., backlink counter)
- CodeblockProcessor should only face minor changes

**Future Enhancement:**
- Chart.js integration may be considered for improved interactivity and visual polish in future iterations


### Components Supporting This Feature

See [Component Capabilities Matrix](component-capabilities-matrix.md) for complete list.

**Currently Implemented:**
- Backlink Counter (FEA005) - Shows individual backlink counts for each watched note

## Integration Points

### Note Insights View Panel
Not applicable, viewing top-n in the context of a single active note does bring any value.

### Code Blocks in Markdown Notes (FEA004)
Primary use case with full UI support for switching display modes.

### Canvas Text Nodes (FEA004)
same as code blocks in markdown notes.


## Implementation log
2025-11-11: chartJS was not integrated yet because first implementation with simple progress bars was deemed good enough by PO. future iterations may consider integrating chartJS for better visuals. and interactivity.
