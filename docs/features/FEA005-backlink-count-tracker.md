## Ideation
- adds the new "counter" component. it displays the total number of backlinks from daily notes to the watched note over the selected time period
- users should be able to select the time period for which they want to see the backlink count (e.g., current month, last 7 days, last 30 days etc...)

## Requirements

### Requirement 1 — Backlink count display
**User Story:** As a note author, I want to see a backlink count displayed in the note insight counter component for the watched note over the selected time period, so that I can quickly assess the note's relevance and connections within my vault.
**Example:**
- GIVEN that I have a counter watching "Project Alpha" note
- AND the selected time period is "past 30 days"
- AND there are 2 backlinks from todays daily note to "Project Alpha"
- AND there is 1 backlink from 3 days ago daily note to "Project Alpha"
- AND there is 1 backlink from 10 days ago daily note to "Project Alpha"
- WHEN I view the counter watching "Project Alpha"
- THEN I see the backlink count displayed as "4 backlinks in the past 30 days"
**Example tricky counting 1:**
- GIVEN that I have a counter watching "Project Alpha" note
- AND today is November 8, 2025 (Saturday)
- AND the selected time period is **"past 7 days"**
- AND there is 1 backlink from November 2, 2025 daily note to "Project Alpha" (Sunday)
- AND there is 1 backlink from November 5, 2025 daily note to "Project Alpha" (Wednesday)
- WHEN I view the counter watching "Project Alpha"
- THEN I see the backlink count displayed as "**2** backlinks in the past 7 days" (because past 7 days includes Nov 2 to Nov 8, regardless of week start day)
**Example tricky counting 2:**
- GIVEN that I have a counter watching "Project Alpha" note
- AND today is November 8, 2025 (Saturday)
- AND the week start day is configured as **Monday** in Obsidian settings
- AND the selected time period is **"this week"**
- AND there is 1 backlink from November 2, 2025 daily note to "Project Alpha" (Sunday - previous week)
- AND there is 1 backlink from November 5, 2025 daily note to "Project Alpha" (Wednesday - this week)
- WHEN I view the counter watching "Project Alpha"
- THEN I see the backlink count displayed as "**1** backlinks this week" (because "this week" is Nov 3-9 when week starts Monday, so only Nov 5 counts)

### Requirement 2 — Easy Time period selection
**User Story:** As a note author, I want to select the time period for which I want to see the backlink count (e.g., current month, last 7 days, last 30 days), without having to select date ranges manually, so that I can customize the note insight counter to my specific needs and analyze trends over different time frames easily.
**expected time periods:** past 24 hours, past 7 days, past 30 days, past 90 days, past year, today, this week, this month, this quarter, this year

### Assumptions and rules
- The default selected period is "past 30 days"

## Design

**Implementation Architecture:**
- **Counter Component**: `BacklinkCounterComponent` class following existing component pattern
- **Period Selection UI**: Dropdown for selecting time periods
- **Data Calculation**: Uses `DailyNoteClassifier` with `BacklinkInfo[]` pattern for date range queries
- **Display Format**: Clean, minimal UI showing count + period label
- **Integration Points**: Note Insights View panel, code blocks in markdown/canvas, editor context menu

### High-level Flow
1. Component receives `BacklinkInfo[]` from BacklinkAnalysisService
2. User selects time period from dropdown (defaults to "past 30 days")
3. Component filters backlinks to daily notes within selected date range
4. Count is calculated and displayed with contextual label
5. Updates automatically when backlinks change (via metadata cache events)
6. State persists to code block content when embedded

### Implementation Details

#### 1. Period Selection Interface
```typescript
export enum TimePeriod {
  PAST_24_HOURS = 'past-24-hours',
  PAST_7_DAYS = 'past-7-days',
  PAST_30_DAYS = 'past-30-days',
  PAST_90_DAYS = 'past-90-days',
  PAST_YEAR = 'past-year',
  TODAY = 'today',
  THIS_WEEK = 'this-week',
  THIS_MONTH = 'this-month',
  THIS_QUARTER = 'this-quarter',
  THIS_YEAR = 'this-year'
}

export interface CounterState {
  selectedPeriod: TimePeriod;
}

export interface DateRange {
  startDate: Date;
  endDate: Date;
}
```

#### 2. Component Structure (`BacklinkCounterComponent`)
**Location**: `src/ui/backlink-counter-component.ts`

**Constructor**:
```typescript
constructor(
  container: HTMLElement,
  classifier: DailyNoteClassifier,
  onPeriodChangeCallback?: (period: TimePeriod) => void
)
```

**Key Methods**:
- `updateData(backlinks: BacklinkInfo[])`: Receives backlink data and triggers recalculation
- `setSelectedPeriod(period: TimePeriod)`: Changes the time period and re-renders
- `clear()`: Resets component state
- `render()`: Builds UI with dropdown and count display

**Data Flow**:
1. Receives `BacklinkInfo[]` array
2. Filters to daily notes using `DailyNoteClassifier.isDailyNote()`
3. Extracts date from daily note filename
4. Checks if date falls within selected range
5. Sums link counts from matching daily notes

**DateRangeCalculator Utility**
**Location**: `src/utils/date-range-calculator.ts`

Converts `TimePeriod` enum to concrete `DateRange`:
- **Relative periods** (past X days/hours): Calculate from current timestamp
- **Absolute periods** (this week/month/quarter/year): Use calendar boundaries
- **Week start day**: Uses Obsidian's moment locale configuration via `window.moment.localeData().firstDayOfWeek()` (fallback to Monday if unavailable)
- Handles timezone via JavaScript Date object (uses local timezone)

**Methods**:
- `calculateDateRange(period: TimePeriod): DateRange`
- `getPeriodLabel(period: TimePeriod): string` - Human-readable labels
- `getAllPeriods()`: Returns array of all periods with labels for dropdown

#### 4. Code Block Integration
**Code block syntax**:

```note-insight-counter
notePath: Projects/MyNote.md
selectedPeriod: past-30-days
```

**Processor**: `NoteInsightCodeBlockProcessor.processCounterBlock()`
- Parses configuration from code block
- Gets backlinks via `BacklinkAnalysisService.getBacklinksForFile()`
- Creates component instance with callback
- Registers metadata cache listener for auto-refresh
- Persists period selection changes back to code block

#### 5. Note Insights View Integration
**Location**: `src/ui/note-insights-view.ts`

Counter section added after title, before monthly tracker:
- Creates component with `DailyNoteClassifier` instance
- Gets backlinks for active note via `BacklinkAnalysisService`
- Updates when active note changes (via BacklinkWatcher)
- No state persistence needed (view panel doesn't persist state)

#### 6. Context Menu Integration
**Location**: `src/features/note-insight-context-menu-manager.ts`

Adds "Add Counter from Vault" menu item:
- Icon: `hash`
- Presents note selector modal
- Inserts `note-insight-counter` code block at cursor

#### 7. UI Layout

```
┌─────────────────────────────────┐
│  Counter               │
├─────────────────────────────────┤
│  [Period Selector Dropdown ▾]   │
│                                 │
│         42                      │
│      backlinks in the           │
│      past 30 days               │
└─────────────────────────────────┘
```

**CSS Classes** (in `styles.css`):
- `.backlink-counter-component` - Main container
- `.backlink-counter-dropdown` - Period selector dropdown
- `.backlink-counter-display` - Count display container
- `.backlink-counter-number` - Large count number
- `.backlink-counter-label` - Descriptive text below count

### Technical Considerations
- **Performance**: Date filtering is efficient (single pass through backlinks array)
- **Timezone Handling**: Uses JavaScript Date object with local timezone
- **State Persistence**: Code blocks persist `selectedPeriod` as string enum value
- **Auto-refresh**: Metadata cache listener triggers updateData() on backlink changes
- **Styling**: Uses Obsidian theme variables for consistent appearance
- **Accessibility**: Dropdown is keyboard-navigable (native select element)

### Key Design Decisions
1. **Enum-based periods**: Predefined time periods ensure consistency and simpler UX
2. **BacklinkInfo[] pattern**: Follows existing component architecture for consistency
3. **Component independence**: Counter operates independently, no shared state with trackers
4. **Default period**: "Past 30 days" provides useful default granularity
5. **No custom ranges**: Keeps UI simple; can be added later if needed
6. **Theme integration**: CSS variables ensure compatibility with all Obsidian themes
7. **View panel + code blocks**: Available in both contexts for maximum flexibility

### Integration Points Summary
1. **Note Insights View** (right sidebar): Automatically shows for active note
2. **Markdown code blocks**: Embed via `` ```note-insight-counter `` syntax
3. **Canvas text nodes**: Same code block syntax works in canvas
4. **Editor context menu**: Right-click → "Add Counter from Vault"
5. **Auto-refresh**: All instances update when watched note's backlinks change

## Components and Interfaces
- **BacklinkCounterComponent** (`src/ui/backlink-counter-component.ts`): Main component class
- **DateRangeCalculator** (`src/utils/date-range-calculator.ts`): Utility for period-to-range conversion
- **TimePeriod** (`src/types.ts`): Enum defining all available time periods
- **CounterState** (`src/types.ts`): Interface for component state
- **DateRange** (`src/types.ts`): Interface representing start/end dates
- **NoteInsightCodeBlockProcessor** (`src/features/note-insight-code-block-processor.ts`): Code block rendering
- **NoteInsightContextMenuManager** (`src/features/note-insight-context-menu-manager.ts`): Context menu integration
