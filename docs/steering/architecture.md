# Architecture

## Runtime Environment
- Browser context inside Obsidian (Electron desktop / mobile WebView).
- No Node core modules relied upon (keeps mobile compatibility).
- Single bundled file `main.js` loaded by Obsidian per `manifest.json`.

## Folder / File Layout (Current)
```
src/
  main.ts                    # Plugin entry point, lifecycle management
  types.ts                   # TypeScript interfaces and enums
  
  features/
    backlink-watcher.ts                    # Monitors workspace events, triggers updates
    note-insight-code-block-processor.ts   # Renders note insight components in code blocks
    note-insight-context-menu-manager.ts   # Editor context menu integration
  
  services/
    backlink-analysis-service.ts           # Centralized backlink analysis and data queries
  
  utils/
    daily-note-classifier.ts               # Identifies daily notes, date range queries
    canvas-updater.ts                      # Updates code blocks in canvas nodes
    note-updater.ts                        # Updates code blocks in markdown files
    user-notifier.ts                       # User notifications
  
  ui/
    note-insights-view.ts                  # Custom ItemView for right sidebar
    view-manager.ts                        # Manages view lifecycle and registration
    yearly-tracker-component.ts            # Yearly heatmap visualization
    monthly-tracker-component.ts           # Monthly calendar visualization
    backlink-counter-component.ts          # Backlink count by time period
    note-selector.ts                       # Modal for selecting notes

styles.css                   # All component styling (note-insights-*, component-specific)
main.ts                      # Root entry point (imports from src/main.ts)
manifest.json               # Plugin metadata
```

## Component Architecture

### Core Plugin Components
- **VaultVisualizerPlugin**: Main plugin class, orchestrates all features
- **BacklinkAnalysisService**: Centralized service for querying and analyzing backlinks
- **DailyNoteClassifier**: Utility for identifying daily notes and filtering by date ranges
- **BacklinkWatcher**: Event-driven component monitoring file changes

### View System
- **ViewManager**: Manages custom view registration, activation, and lifecycle
- **NoteInsightsView**: Custom Obsidian `ItemView` displayed in right sidebar
  - Shows active note's title
  - Embeds note insight components (yearly tracker, monthly tracker, counter)
  - Updates automatically when active note changes

### Note Insight Components
Modular, reusable UI components that provide analytics about notes. Each component:
- Receives `BacklinkInfo[]` as primary data source
- Filters and processes data internally using `DailyNoteClassifier`
- Renders visualization in provided container
- Notifies parent of state changes via callback

**Current Components:**
- **YearlyTrackerComponent** (FEA002): Git-style heatmap showing daily note backlinks by day for a selected year
- **MonthlyTrackerComponent** (FEA003): Calendar-style grid showing daily note backlinks for a selected month
- **BacklinkCounterComponent** (FEA005): Displays total backlink count for a selected time period (past 7 days, this month, etc.)

### Code Block Rendering System (FEA004)
Allows embedding note insight components anywhere via code blocks:

**NoteInsightCodeBlockProcessor**:
- Registers markdown code block processors (`note-insight-yearly`, `note-insight-monthly`, `note-insight-counter`)
- Parses code block configuration (notePath, state)
- Instantiates components and manages their lifecycle
- Auto-refreshes components when watched note's backlinks change
- Persists component state (e.g., selected year) back to code block content

**State Persistence Flow**:
1. User interacts with component (e.g., changes year)
2. Component invokes callback with new state
3. Processor updates code block content in file (markdown or canvas JSON)
4. Uses `isUpdatingCodeblock` flag to prevent infinite refresh loops

**Updater Utilities**:
- **CanvasUpdater**: Updates code blocks in canvas text nodes (parses/modifies canvas JSON)
- **NoteUpdater**: Updates code blocks in markdown files (line-by-line parsing)
- Both handle duplicate detection and user notification

### Context Menu Integration
**NoteInsightContextMenuManager**:
- Adds editor context menu items for inserting note insight code blocks
- Presents note selector modal
- Inserts properly formatted code block at cursor position
- Works in both markdown editors and canvas text node editors

## Data Flow

### View Panel Update Flow
1. **Event Trigger**: User opens/switches notes → workspace events fired
2. **Detection**: BacklinkWatcher detects via `active-leaf-change`/`file-open`
3. **Analysis**: BacklinkAnalysisService queries `app.metadataCache.resolvedLinks`
4. **Processing**: DailyNoteClassifier filters to daily notes and date ranges
5. **Display**: ViewManager updates NoteInsightsView with new data
6. **Component Rendering**: Each component receives `BacklinkInfo[]` and renders

### Code Block Update Flow
1. **Initial Render**: 
   - Processor parses code block configuration
   - Gets backlinks via BacklinkAnalysisService
   - Creates component instance with data
   - Registers metadata cache listener

2. **Auto-Refresh** (on backlink changes):
   - Metadata cache fires `resolved` event
   - Processor re-queries backlinks for watched note
   - Calls `component.updateData()` to re-render

3. **State Persistence** (user interaction):
   - User changes component state (e.g., selects different period)
   - Component callback notifies processor
   - Processor determines context (markdown vs canvas)
   - CanvasUpdater or NoteUpdater modifies file
   - `isUpdatingCodeblock` flag prevents refresh loop

## Key Design Decisions

### Proper Obsidian Views
Uses `ItemView` and `registerView()` instead of DOM manipulation for the sidebar panel.

### Event-Driven Architecture
Leverages `plugin.registerEvent()` for automatic cleanup and proper lifecycle management.

### Centralized Data Service
BacklinkAnalysisService provides single source of truth for backlink queries, used by both view panel and code blocks.

### Component Independence
Each note insight component is self-contained and doesn't depend on Obsidian APIs directly - receives data through parameters.

### Link Count Accuracy
Uses `resolvedLinks` API to get actual link counts per file (handles multiple links from same source).

### Modular Code Block System
Single processor handles all component types, with shared infrastructure for state persistence and auto-refresh.

### Canvas Support
Treats canvas text nodes as first-class citizens alongside markdown files for embedding components.

## Extension Points

To add a new note insight component, follow the pattern in `/docs/steering/adding-note-insight-components.md`:
1. Create component class in `src/ui/`
2. Add code block processor in `note-insight-code-block-processor.ts`
3. Update CanvasUpdater and NoteUpdater type unions
4. Add context menu item in `note-insight-context-menu-manager.ts`
5. Integrate into NoteInsightsView
6. Add CSS styling

End of architecture overview.
