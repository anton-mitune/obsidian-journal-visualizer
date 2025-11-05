Abandonned for now

## Ideation
- A generic and reusable date range picker component.
- Modern, sleek, and user-friendly interface for selecting date ranges.
- Provides shorthands for common ranges: last week, last month, last quarter, last semester, last year, and all time.

### References:
- Screenshot references in `../assets/period-picker-reference/screenshots/` folder.
- code of such picker from an other project complying to web component standards in `../assets/period-picker-reference/code/` folder.

Make sure to checkout the references before proceeding as they provide important disambiguation on the desired functionality and example implementations (though for a different tech stack).

## Requirements

### Requirement 1 — Date Range Selection
**User Story:** As a user, I want to select a custom date range by picking a start and end date from a calendar, so that I can analyze data for specific periods.

### Requirement 2 — Predefined Range Shorthands
**User Story:** As a user, I want to quickly select common date ranges like "Last Week" or "Last Month" using shorthands, so that I don't have to manually pick the dates each time.
**Expected Shorthands:**
- Current Week
- Current Month
- Current Quarter
- Current Year
- All Time

### Requirement 3 — Compact and Expanded Views
**User Story:** As a user, I want the component to have a compact "closed" state that displays the current range and an "open" state with a full calendar, so that it doesn't clutter the UI when not in use.

### Requirement 3 — Dynamic filtering
**User Story:** As a user, I want the component to dynamically filter the result of other components that are affected by date range (like yearly/monthly trackers), so that I can see data only for the selected period. See [periods and components](..//references/period-components.md)

### Assumptions and Rules
- The component will have two states: a compact "closed" view and a full "open" pop-in view.
- **Closed View**:
    - Displays `[<] Start Date - End Date [>]`.
    - Clicking `<` or `>` shifts the entire date range backward or forward by its current duration.
    - Clicking the date display opens the calendar pop-in.
- **Open View**:
    - A pop-in appears with a backdrop; clicking the backdrop closes it.
    - A list of predefined shorthands is on the left.
    - A calendar month view is on the right, with its own month navigation that does not alter the selected range.
- **Date Selection Logic**:
    - Clicking a date in the calendar sets the start date. A subsequent click on a later date sets the end date.
    - If a range is already selected, the next click resets the range and selects a new start date.
- The component will emit a `date-range-selected` custom event with the start and end dates whenever a complete range is selected.

## Design

High-level flow:
- The component will be rendered in the Note Insights view.
- It will manage its own state (open/closed, selected dates).
- On user interaction (clicking dates, shorthands), it updates its internal state.
- When a valid date range is selected, it fires a `date-range-selected` event.
- Other components, like the yearly/monthly trackers, may listen for this event and update their displays accordingly. (not part of this feature spec)

**Implementation Architecture:**
- **PeriodPickerComponent**: A new UI component class responsible for rendering the date picker and handling its logic.
- **State Management**: The component will manage its own UI state. The selected date range will be communicated to the rest of the application via custom events.

**Technology & API rationale:**
- The component will be built using TypeScript and the standard DOM API, without external libraries for date management to keep the plugin lightweight.
- It will be integrated into the existing `NoteInsightsView` and will not require any new Obsidian API dependencies beyond what is already in use.

## Components and Interfaces
- **PeriodPickerComponent**: A class that renders the date range picker UI and manages its state and interactions.

## CHANGELOG
2025-11-04 20:31 - Initial feature specification for the period picker component.
