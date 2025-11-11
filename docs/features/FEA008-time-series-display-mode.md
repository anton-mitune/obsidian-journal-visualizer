## Ideation
- Extends on FEA009 to support additional display modes for components supporting multiple notes watching
- complements FEA007 that also adds top-n display mode.
- Provides UI controls for switching display mode watched notes without manual code block editing
- Enables presenting a time-series chart representation of backlink distribution among watched notes over time
- it aims to be configurable with minimal effort from users


## Requirements

### Requirement 1 — Evolution Display Mode
**User Story:** As a note author, I want note insight components to support time-series display mode, so that I can visualize how backlinks from my journal to watched notes evolve over selected period.
**Example:**
- GIVEN I have a backlink counter component watching the notes "Project Alpha", "Project Beta", and "Project Gamma" in default mode.
- AND I have 3 links from my journal note to "Project Alpha", 5 links to "Project Beta", and 2 links to "Project Gamma" over the past month
- AND I have set the period to "last month"
- WHEN I set the display mode to "evolution"
- THEN instead of the normal counter, I see a line chart with:
  - A line for "Project Alpha" showing backlink count evolution over the past month
  - A line for "Project Beta" showing backlink count evolution over the past month
  - A line for "Project Gamma" showing backlink count evolution over the past month
- AND the usual component UI controls (period selector, etc.) remain available


### Assumptions and Rules
- Same general rules as top-n mode from [FEA007](docs/features/FEA007-top-bars-visualization.md) apply here
- Switching display modes happens via the display mode dropdown in the component UI, similar to period selector.
- time granularity always defaults to daily and is not user-configurable.
- start and end dates of the chart correspond to the selected period in the component UI.
- each watched note gets its own line in the chart, with distinct colors, as a seperate series.
- if a note has 0 backlinks on a given day, then the line should reflect that (0 value point).

## Design

### Code Block Syntax

**default mode of component (current default):**
```note-insight-[component-type]
displayAs: default
```

**top mode of component:**
```note-insight-[component-type]
displayAs: time-series
```

**Full Example**
```note-insight-backlink-counter
displayAs: time-series
notePath: Projects/Alpha.md
notePath: Projects/Beta.md
notePath: Projects/Gamma.md
period: last-month
```

### Technical Implementation

**Rendering Approach:**
- Use vanilla SVG for line chart visualization (similar to top-n's vanilla progress bar approach from FEA007)
- Follow the same pattern as TopNRenderer: dedicated TimeSeriesRenderer class in `src/ui/time-series-renderer.ts`
- Keep rendering logic self-contained and reusable for future components

**Implementation Details:**
- TimeSeriesRenderer receives NoteCounterResult[] and periodLabel
- Creates time series chart visual using SVG elements for axes, lines, points, and labels
- Renders legend with color indicators, note titles (truncated if needed), counts, and percentages
- Notes with 0 backlinks appear in legend but not in  visual

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

