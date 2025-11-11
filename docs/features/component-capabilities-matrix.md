# Component Capabilities Matrix

This document provides a quick reference for all note insight components and their capabilities across different contexts.

## Available Components

| Component | Feature Doc | Note Insights Panel | Code Blocks (Markdown) | Canvas Text Nodes | Context Menu | Code Block Type | Display Modes | Multiple Notes Support |
|-----------|-------------|---------------------|------------------------|-------------------|--------------|-----------------|---------------------|------------------------|
| Yearly Tracker | [FEA002](FEA002-yearly-tracker.md) | ✅ | ✅ | ✅ | ✅ | `note-insight-yearly` | Default only | ❌  |
| Monthly Tracker | [FEA003](FEA003-monthly-tracker.md) | ✅ | ✅ | ✅ | ✅ | `note-insight-monthly` | Default only | ❌ |
| Backlink Counter | [FEA005](FEA005-backlink-count-tracker.md) | ✅ | ✅ | ✅ | ✅ | `note-insight-counter` | Default, Pie ([FEA006](FEA006-pie-display-mode.md)), Top-N ([FEA007](FEA007-top-n-display-mode.md)), Time-Series ([FEA008](FEA008-time-series-display-mode.md)) | ✅ ([FEA009](FEA009-multiple-notes-watching.md)) |


## Where Components Appear

### Note Insights Panel (FEA001)
All registered note insight components automatically appear in the Note Insights View panel in the right sidebar. The panel shows components for the currently active note.

### Code Blocks in Markdown Notes (FEA004)
All components can be embedded in markdown notes using code block syntax. Each component has its own code block type.

### Canvas Text Nodes (FEA004)
All components work identically in canvas text nodes as they do in markdown notes.

### Editor Context Menu (FEA004)
All components can be inserted via editor context menus. Each option opens a note selector modal to choose the note to watch.

## Component Features

### Display Modes
Components that support multiple notes watching can display data in different visualization modes:

- **Default**: Standard single-metric display (suitable for single or multiple notes)
- **Pie** ([FEA006](FEA006-pie-display-mode.md)): Pie chart showing distribution across watched notes
- **Top-N** ([FEA007](FEA007-top-n-display-mode.md)): Horizontal bar chart ranking notes by backlink count
- **Time-Series** ([FEA008](FEA008-time-series-display-mode.md)): Line chart showing backlink evolution over time

Display modes are only available in code block embeds (markdown and canvas), not in the Note Insights Panel.

### Multiple Notes Watching (FEA009)
Components can be configured to watch multiple notes simultaneously. See [FEA009](FEA009-multiple-notes-watching.md) for details on:
- Adding/removing notes via UI controls
- Watching up to 50 notes per component
- Managing watched note lists

