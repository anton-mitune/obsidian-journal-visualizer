# Architecture

## Runtime Environment
- Browser context inside Obsidian (Electron desktop / mobile WebView).
- No Node core modules relied upon (keeps mobile compatibility).
- Single bundled file `main.js` loaded by Obsidian per `manifest.json`.

## Folder / File Layout (Current)
```
src/
  main.ts                    # Plugin entry point, lifecycle management
  types.ts                   # TypeScript interfaces (BacklinkInfo, DailyNoteBacklinkInfo)
  
  features/
    backlink-watcher.ts      # Monitors workspace events, triggers updates
  
  utils/
    daily-note-classifier.ts # Identifies daily notes, counts monthly links
  
  ui/
    note-insights-view.ts    # Custom ItemView for right sidebar
    view-manager.ts          # Manages view lifecycle and registration

styles.css                   # View styling (note-insights-* classes)
main.ts                      # Root entry point (imports from src/main.ts)
manifest.json               # Plugin metadata
```

## Component Architecture

### Core Components
- **VaultVisualizerPlugin**: Main plugin class, handles lifecycle and component orchestration
- **ViewManager**: Manages custom view registration, activation, and updates
- **NoteInsightsView**: Custom Obsidian `ItemView` displayed in right sidebar
- **BacklinkWatcher**: Event-driven component that monitors file changes and triggers updates
- **DailyNoteClassifier**: Utility for identifying daily notes and counting current-month backlinks

### Data Flow
1. **Event Trigger**: User opens/switches notes → workspace events fired
2. **Detection**: BacklinkWatcher detects events via `active-leaf-change`/`file-open`
3. **Analysis**: Queries `app.metadataCache.resolvedLinks` for backlink data
4. **Classification**: DailyNoteClassifier filters to current-month daily notes
5. **Counting**: Sums total link counts (including multiple links from same file)
6. **Display**: ViewManager updates NoteInsightsView with new counts

### Key Design Decisions
- **Proper Obsidian Views**: Uses `ItemView` and `registerView()` instead of DOM manipulation
- **Event-Driven Architecture**: Leverages `plugin.registerEvent()` for automatic cleanup
- **Link Count Accuracy**: Uses `resolvedLinks` API to get actual link counts per file
- **Modular Design**: Separate concerns across focused classes for testability


End of architecture overview.
