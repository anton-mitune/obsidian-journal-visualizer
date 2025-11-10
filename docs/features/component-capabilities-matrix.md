# Component Capabilities Matrix

This document provides a quick reference for all note insight components and their capabilities across different contexts.

## Available Components

| Component | Feature Doc | Note Insights Panel | Code Blocks (Markdown) | Canvas Text Nodes | Context Menu | Code Block Type | Visualization modes | Multiple Notes Support |
|-----------|-------------|---------------------|------------------------|-------------------|--------------|-----------------|---------------------|------------------------|
| Yearly Tracker | [FEA002](FEA002-yearly-tracker.md) | ✅ | ✅ | ✅ | ✅ | `note-insight-yearly` | | ❌  |
| Monthly Tracker | [FEA003](FEA003-monthly-tracker.md) | ✅ | ✅ | ✅ | ✅ | `note-insight-monthly` | | ❌ |
| Backlink Counter | [FEA005](FEA005-backlink-count-tracker.md) | ✅ | ✅ | ✅ | ✅ | `note-insight-counter` | Pie Chart (FEA006), Top Items (FEA007), Evolution (FEA008) | ✅ [FEA009](FEA009-multiple-notes-watching.md) |


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

### Multiple Notes Watching (FEA009)
Components can be configured to watch multiple notes or entire folders. See [FEA009](FEA009-multiple-notes-watching.md) for details.

