## Ideation
- Extends on FEA009 to support additional display modes for components supporting multiple notes watching
- complements FEA007 that also adds top-n display mode.
- Provides UI controls for switching display mode watched notes without manual code block editing
- Enables presenting a pie chart representation of backlink distribution among watched notes
- it aims to be configurable with minimal effort from users


## Requirements

### Requirement 1 — Pie Chart Display Mode
**User Story:** As a note author, I want note insight components to support a "pie" display mode, so that I can visualize the repartition of backlinks counts from my journal to watched notes over selected period.
**Example:**
- GIVEN I have a backlink counter component watching the notes "Project Alpha", "Project Beta", and "Project Gamma" in default mode.
- AND I have 3  links from my journal note to "Project Alpha", 5 links to "Project Beta", and 2 links to "Project Gamma" over the past month
- AND I have set the period to "last month"
- WHEN I set the display mode to "pie"
- THEN instead of the normal counter, I see a pie chart with:
  - "Project Beta" representing 5 links
  - "Project Alpha" representing 3 links
  - "Project Gamma" representing 2 links
- AND the usual component UI controls (period selector, etc.) remain available


### Assumptions and Rules
- Same general rules as top-n mode from [FEA007](docs/features/FEA007-top-bars-visualization.md) apply here
- sections in the pie should be sorted by backlink count descending, starting at the top (12 o'clock position) and going clockwise.
- when two notes have the same backlink count, they are sorted alphabetically by note title.
- if a note has 0 backlinks in the selected period, it is still shown in legend, but will not be visible in the pie chart.
- Switching display modes happens via the display mode dropdown in the component UI, similar to period selector.

## Design

### Code Block Syntax

**default mode of component (current default):**
```note-insight-[component-type]
displayAs: default
```

**top mode of component:**
```note-insight-[component-type]
displayAs: pie
```

**Full Example**
```note-insight-backlink-counter
displayAs: pie
notePath: Projects/Alpha.md
notePath: Projects/Beta.md
notePath: Projects/Gamma.md
period: last-month
```

### Technical Implementation

**Rendering Approach:**
- Use vanilla CSS conic-gradient for pie chart visualization (similar to top-n's vanilla progress bar approach from FEA007)
- Follow the same pattern as TopNRenderer: dedicated PieRenderer class in `src/ui/pie-renderer.ts`
- Keep rendering logic self-contained and reusable for future components

**Implementation Details:**
- PieRenderer receives NoteCounterResult[] and periodLabel
- Sorts results by count descending, then alphabetically for ties (per requirements)
- Creates pie visual using CSS conic-gradient starting at -90deg (12 o'clock position)
- Renders legend with color indicators, note titles (truncated if needed), counts, and percentages
- Notes with 0 backlinks appear in legend but not in pie visual

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

