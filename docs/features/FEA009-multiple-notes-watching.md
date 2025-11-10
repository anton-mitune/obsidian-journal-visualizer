# FEA009: Multiple Notes Watching

## Ideation
- Extends note insight components to support watching multiple notes or entire folders simultaneously
- Provides UI controls for adding/removing watched notes without manual code block editing
- Enables comparing metrics across multiple notes in a single component instance
- Makes folder-based monitoring easy with automatic inclusion of new notes

## Requirements

### Requirement 1 — Multiple Individual Notes Watching
**User Story:** As a note author, I want note insight components to support watching multiple specific notes simultaneously, so that I can monitor and compare metrics across various notes within my vault at the same time.

**Example:**
- GIVEN I have a counter component watching "Project Alpha" and "Project Beta"
- WHEN I view the component
- THEN I see metrics for both notes displayed separately
- AND each note's metrics are calculated independently

### Requirement 2 — Add Note UI (Code Block Embeds Only)
**User Story:** As a note author, when viewing a component code block watching multiple notes, I want to click an "Add Note" button to easily add another note to watch, so that I can build my watched list without manually editing code blocks.

**Example:**
- GIVEN I have a component code block watching "Project Alpha" and "Project Beta"
- WHEN I click the "Add Note" button (+ icon)
- THEN a note selector modal appears
- AND when I select "Project Gamma"
- THEN "Project Gamma" is added to the watched list
- AND the code block is updated automatically
- AND "Project Gamma"'s metrics appear in the component display

### Requirement 3 — Remove Note UI (Code Block Embeds Only)
**User Story:** As a note author, when viewing a component code block watching multiple notes, I want to remove a specific note from the watched list by clicking a remove button that appears on hover, so that I can easily manage my watched list without manually editing code blocks.

**Example:**
- GIVEN I have a component code block watching "Project Alpha", "Project Beta", and "Project Gamma"
- WHEN I hover over "Project Beta" in the component list
- THEN a remove button (×) appears
- AND when I click the remove button
- THEN "Project Beta" is removed from the watched list
- AND the code block is updated automatically
- AND only "Project Alpha" and "Project Gamma" remain displayed

### Assumptions and Rules
- Add/remove UI controls are only available in code block embeds (markdown files), not in the Note Insights View panel
- Note Insights View panel always shows metrics for the currently active note only
- Components switch display layout based on number of watched items (single note vs. multiple notes list)

## Design

### Code Block Syntax

**Single note (legacy):**
```note-insight-[component-type]
notePath: path/to/note.md
```

**Multiple specific notes:**
```note-insight-[component-type]
notePath: Projects/Alpha.md
notePath: Projects/Beta.md
notePath: Work/Tasks.md
```

### Technical Implementation

**Component Architecture:**
- Components accept optional `onNoteAdded`, `onNoteRemoved`
- Callbacks control whether UI controls are rendered (only present in code block context)
- Components manage `notePath`  in their state
- Display layout adapts based on number of watched items

**Code Block Processor:**
- Parses `notePath:` (multiple lines) from code blocks
- Provides callbacks to components that update code block content
- Handles persistence to the codeblock itself
- Prevents infinite refresh loops with `isUpdatingCodeblock` flag

**UI Controls:**
- Add Note button: Opens `NoteSelector` modal, triggers `onNoteAdded` callback
- Remove Note button: Appears on hover, triggers `onNoteRemoved` callback

### Components Supporting This Feature

See [Component Capabilities Matrix](component-capabilities-matrix.md) for complete list.

**Currently Implemented:**
- Backlink Counter (FEA005) - Shows individual backlink counts for each watched note

## Integration Points

### Note Insights View Panel
Not applicable - view panel is contextual to active note only.

### Code Blocks in Markdown Notes (FEA004)
Primary use case with full UI support for add/remove operations.

### Canvas Text Nodes (FEA004)
Full support with UI controls and automatic persistence.

### Editor Context Menu (FEA004)
Initial insertion shows note selector for single note. Users can manually edit to add multiple notes or use UI controls after insertion.
