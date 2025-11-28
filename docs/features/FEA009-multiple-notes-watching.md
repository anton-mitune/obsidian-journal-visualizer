# FEA009: Multiple Notes Watching

## Ideation
- Extends note insight components to support watching multiple notes or entire folders simultaneously
- Provides UI controls for adding/removing watched items without manual code block editing
- Enables comparing metrics across multiple notes in a single component instance
- Makes folder-based monitoring easy with automatic inclusion of new notes
- Simple mode toggle provides clear separation between note watching and folder watching

## Requirements

### Requirement 1 — Empty State with Mode Selection
**User Story:** As a note author, when I embed a new component that supports multiple notes watching, I want to see a clear empty state that prompts me to add a folder or notes to start showing stats, so that I understand what action to take next.

**Example:**
- GIVEN I insert a new counter component code block
- WHEN I view the component
- THEN I see an empty state with a mode toggle (Folder/Note) defaulted to Folder mode
- AND I see a "[folder icon] +" button
- AND I see placeholder text "Add a folder or note to start showing stats"

### Requirement 2 — Mode Toggle Behavior
**User Story:** As a note author, I want to toggle between Folder and Note watching modes before adding any items, so that I can choose the appropriate monitoring strategy for my needs.

**Example:**
- GIVEN I have an empty counter component
- WHEN I click the mode toggle to switch from Folder to Note mode
- THEN the toggle updates to show Note mode selected
- AND the add button changes to "[note icon] +"
- AND the placeholder text updates to "Add a folder or note to start showing stats"

**Behavior Rules:**
- Toggle is enabled only when the component is empty (no folder or notes selected)
- Once a folder or note is added, the toggle becomes disabled/locked to that mode
- Toggle is visually distinct (different color, clearly visible but not flashy)
- Default mode is Folder

### Requirement 3 — Folder Watching
**User Story:** As a note author, I want to watch all notes within a specific folder, so that I can monitor metrics for an entire category of notes that dynamically updates as I add or remove notes from that folder.

**Example:**
- GIVEN I have an empty counter component in Folder mode
- AND I have a folder "Projects" containing notes "Project Alpha", "Project Beta", and "Project Gamma"
- WHEN I add a folder
- THEN a folder selector modal appears
- AND when I select the "Projects" folder
- THEN the folder is added to the watched list
- AND the mode toggle becomes disabled
- AND I see "📁 Projects/" with a remove button (×)
- AND I see metrics for all notes within Projects ("Project Alpha", "Project Beta", "Project Gamma") provided by the counter component
- AND each note's metrics are calculated independently
- WHEN I create a new note "Project Delta" in the Projects folder
- THEN "Project Delta" automatically appears in the metrics list

**Constraints:**
- Folder watching is dynamic—notes are automatically included/excluded as folder contents change

### Requirement 4 — Multiple Individual Notes Watching
**User Story:** As a note author, I want to watch multiple specific notes simultaneously, so that I can monitor and compare metrics across a curated set of notes from anywhere in my vault.

**Example:**
- GIVEN I have an empty counter component in Note mode
- WHEN I add a note
- THEN a note selector modal appears
- AND when I select "Project Alpha"
- THEN "Project Alpha" is added to the watched list
- AND the mode toggle becomes disabled
- AND I see "Project Alpha" with a remove button (×) on hover
- AND I see metrics for "Project Alpha"
- WHEN I click "+ Add Note" again and select "Project Beta"
- THEN "Project Beta" is added to the list
- AND I see metrics for both notes displayed separately

### Requirement 5 — Remove Item UI (Code Block Embeds Only)
**User Story:** As a note author, when viewing a component with watched items, I want to remove the folder or specific notes from the watched list by clicking a remove button, so that I can easily manage my watched list without manually editing code blocks.

**Example (Folder Mode):**
- GIVEN I have a counter component watching the folder "Projects"
- WHEN I hover over "📁 Projects/"
- THEN a remove button (×) appears
- AND when I click the remove button
- THEN the folder is removed from the watched list
- AND the component returns to empty state
- AND the mode toggle becomes enabled again

**Example (Note Mode):**
- GIVEN I have a counter component watching "Project Alpha", "Project Beta", and "Project Gamma"
- WHEN I hover over "Project Beta" in the component list
- THEN a remove button (×) appears
- AND when I click the remove button
- THEN "Project Beta" is removed from the watched list
- AND the code block is updated automatically
- AND only "Project Alpha" and "Project Gamma" remain displayed
- WHEN I remove all notes
- THEN the component returns to empty state
- AND the mode toggle becomes enabled again

### Requirement 6 — Display Limit
**User Story:** As a note author, when watching a folder or notes that would result in too many items being displayed, I want the component to limit the display to the top 50 notes by backlink count, so that the UI remains performable and readable.

**Example:**
- GIVEN I have a counter component watching a folder "Archive" containing 150 notes
- WHEN I view the component
- THEN metrics are computed for all 150 notes
- BUT only the top 50 notes by backlink count are displayed
- AND I see a text "Showing top 50 of 150 notes"

**Behavior Rules:**
- Hard limit of 50 notes displayed per component (configured in plugin settings)
- All notes are computed for accuracy, but only top 50 by metric value are shown
- Display limit applies to both folder and multi-note watching modes

### Assumptions and Rules
- Add/remove UI controls are only available in code block embeds (markdown and canvas), not in the Note Insights View panel
- Note Insights View panel always shows metrics for the currently active note only
- Components cannot watch both folders and individual notes simultaneously (mode is exclusive)
- Mode toggle is disabled once items are added; to switch mode, user must clear all items first
- In folder mode, only one folder can be watched at a time
- In note mode, multiple notes can be watched
- Display layout adapts based on number of watched items (single note vs. multiple notes list)

## Design

### Code Block Syntax

**Note watching mode (single note):**
```note-insight-[component-type]
watchMode: note
notePath: path/to/note.md
```

**Note watching mode (multiple notes):**
```note-insight-[component-type]
watchMode: note
notePath: Projects/Alpha.md
notePath: Projects/Beta.md
notePath: Work/Tasks.md
```

**Folder watching mode:**
```note-insight-[component-type]
watchMode: folder
folderPath: Projects
```

### UI Design

**Empty State (Folder Mode - Default):**
```
┌─────────────────────────────────────┐
│  Counter Component                  │
│                      [Folder | Note]│ ← Toggle (enabled, visually distinct color)
├─────────────────────────────────────┤
│                                     │
│  [+] Add a folder to start          │ ← Button adapts to mode
│      showing stats                  │
│                                     │
└─────────────────────────────────────┘
```

**Folder Mode (Populated):**
```
┌─────────────────────────────────────┐
│  Counter Component                  │
│                      [Folder | Note]│ ← Toggle disabled/locked
├─────────────────────────────────────┤
│  📁 Projects/                    [×]│ ← Folder with remove button
│                                     │
│  • Project Alpha         →    5     │
│  • Project Beta          →    3     │
│  • Project Gamma         →    8     │
└─────────────────────────────────────┘
```

**Note Mode (Populated):**
```
┌─────────────────────────────────────┐
│  Counter Component                  │
│                      [Folder | Note]│ ← Toggle disabled/locked
├─────────────────────────────────────┤
│  [+] Add Note                       │
│                                     │
│  • Project Alpha      [×]   →    5  │ ← × appears on hover
│  • Project Beta       [×]   →    3  │
│  • Work Tasks         [×]   →    12 │
└─────────────────────────────────────┘
```

### Technical Implementation

**Component Architecture:**
- Components accept `watchMode` parameter: `'note'` | `'folder'`
- Components accept optional `onModeChange`, `onFolderAdded`, `onFolderRemoved`, `onNoteAdded`, `onNoteRemoved` callbacks
- Callbacks control whether UI controls are rendered (only present in code block context)
- Components manage `watchMode`, `folderPath[]`, and `notePath[]` in their state
- Mode toggle is enabled only when component is empty (no folder/notes selected)
- Add button label adapts to current mode: "[folder icon] +" or "[note icon] +"
- Display layout adapts based on number of watched items and mode

**Code Block Processor:**
- Parses `watchMode:`, `folderPath:`, and `notePath:` (multiple lines) from code blocks
- Defaults to `watchMode: note` if not specified (legacy compatibility)
- Provides callbacks to components that update code block content
- Handles persistence to the codeblock itself
- Prevents infinite refresh loops with `isUpdatingCodeblock` flag
- For folder mode, resolves folder contents to list of note paths for display

**UI Controls:**
- Mode Toggle: Switches between Folder/Note mode when component is empty, disabled when populated
- Add Folder button (Folder mode): Opens folder selector modal, triggers `onFolderAdded` callback
- Add Note button (Note mode): Opens `NoteSelector` modal, triggers `onNoteAdded` callback
- Remove buttons: Appear on hover, trigger `onFolderRemoved` or `onNoteRemoved` callbacks

**Folder Resolution:**
- When `mode: folder` is set, component queries all notes within `folderPath`
- Folder contents are resolved dynamically on each render
- New notes added to folder appear automatically without code block update
- Deleted notes are removed automatically
- Display is limited to top 50 notes by metric value if folder contains more than 50 notes

### Components Supporting This Feature

See [Component Capabilities Matrix](component-capabilities-matrix.md) for complete list.

**Currently Implemented:**
- Backlink Counter (FEA005) - Shows individual backlink counts for each watched note or folder contents

## Integration Points

### Note Insights View Panel
Not applicable - view panel is contextual to active note only and does not support multi-note or folder watching.

### Code Blocks in Markdown Notes (FEA004)
Primary use case with full UI support for mode toggle, add/remove operations, and automatic state persistence.

### Canvas Text Nodes (FEA004)
Full support with UI controls and automatic persistence to canvas JSON.

### Editor Context Menu (FEA004)
Initial insertion creates empty component in default Folder mode. Users interact with mode toggle and add buttons after insertion to configure watching behavior.

For complete details on component insertion patterns, see [FEA004: Embed Note Insight Component](FEA004-embed-note-insight-component.md).
