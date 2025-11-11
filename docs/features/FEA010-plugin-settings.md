## ideation
- create the obsidian settings page for the plugin
- allow users to configure global settings that affect plugin behavior
- settings should be easy to understand and modify
- series default colors, first day of week, date format, max watched notes, etc.
- settings should be persisted across sessions
- provide tooltips or descriptions for each setting to guide users

## Requirements

### Requirement 1 — Settings Page
**User Story:** As a user of the Vault Visualizer plugin, I want to access a settings page within Obsidian, so that I can configure global settings for the plugin, as per obsidian plugin standards.

### Requirement 2 - First day of week setting
**User Story:** As a user, I want to set the first day of the week so that weekly periods align with my personal or regional preferences.
**Example:**
- GIVEN I am on the plugin settings page
- AND today is 11th November 2025 (Tuesday)
- WHEN I select "Monday" as the first day of the week
- THEN "this week" period should cover 10th November 2025 (Monday) to 16th November 2025 (Sunday)
- WHEN I select "Sunday" as the first day of the week
- THEN "this week" period should cover 9th November 2025 (Sunday) to 15th November 2025 (Saturday)

### Requirement 3 - Max Watched Notes Setting
**User Story:** As a user, I want to set the maximum number of notes that can be watched by backlink counter components, so that I can manage performance and usability.
**Example:**
- GIVEN I am on the plugin settings page
- WHEN I set the "Max Watched Notes" to 30
- THEN any backlink counter component should allow watching up to 30 notes
- AND if I try to add more than 30 notes, I should see a warning message
- WHEN I set the "Max Watched Notes" to 10
- THEN any backlink counter component should allow watching up to 10 notes
- AND if I try to add more than 10 notes, I should see a warning message

### Requirement 4 - Default Series Colors Setting
**User Story:** As a user, I want to set up to 10 default colors for series in visualizations, so that I can customize the appearance of charts according to my preferences.

### Requirement 5 - color palette suggestions
**User Story:** As a user, I want the plugin to suggest a color palette for the default series colors, so that I configure beautiful colors for my visualizations easily.

### Assumptions and Rules
- Settings page should be accessible from Obsidian's plugin settings interface
- Changes to settings should take effect immediately without requiring a restart
- Provide sensible default values for all settings
- provide easy-to-understand and actionable descriptions for each setting (in tab button to reload obsidian is acceptable)

## Design
### Settings Page Layout
- Use Obsidian's built-in settings tab framework to create a new tab for Vault Visualizer settings
- Organize settings into sections with clear headings
- Each setting should have a label, input control (dropdown, text box, etc.), and a brief description or tooltip

List of expected settings:
1. First Day of Week
   - Control Type: Dropdown (monday, tuesday, wednesday, thursday, friday, saturday, sunday)
   - Description: "Select the first day of the week for weekly period calculations."
   - technical name: firstDayOfWeek
2. Max Watched Notes
   - Control Type: Number Input
   - Description: "Set the maximum number of notes that can be watched by backlink counter components (no more than 50 recommended)."
   - technical name: maxWatchedNotes
3. Suggested Color Palettes
   - Control Type: Dropdown (e.g., "Vibrant", "Pastel", "Monochrome", etc.)
   - Description: "Choose a suggested color palette for default series colors."
   - technical name: suggestedColorPalette
4. Default Series Colors:
   - Description: "Set default colors for up to 10 series in visualizations."
   - Series 1 Color
	 - Control Type: Color Picker
	 - technical name: series1Color
   - Series 2 Color
	 - Control Type: Color Picker
	 - technical name: series2Color
   - etc... up to Series 10 Color

- Reload obsidian button
	- Control Type: Button
	- Description: "If some changes are not taking effect, you can reload Obsidian to apply them."

### Technical Implementation
- Create a `SettingsTab` class that extends Obsidian's `PluginSettingTab`
- Define settings schema and default values in a `settings.ts` file
- Use Obsidian's `Setting` class to create individual settings controls
- Implement methods to load and save settings using Obsidian's `loadData` and `saveData` APIs
- Ensure settings are validated (e.g., max watched notes should be a positive integer)
- Implement color picker controls for default series colors, allowing users to select and preview colors
- create a `SettingsService` to manage settings state and provide subscription capabilities for other components to react to settings changes

### Mapping of components and reactions

- Monthly Tracker --> reacts to firstDayOfWeek setting
- Yearly Tracker --> reacts to firstDayOfWeek setting
- Backlink Counter Component --> reacts to firstDayOfWeek, maxWatchedNotes, and every series color settings

### Color paletes:
Pastel Dreamland adventure:
- #cdb4db (pastel purple)
- #ffc8dd (pastel pink)
- #ffafcc (light pastel pink)
- #bde0fe (light pastel blue)
- #a2d2ff (pastel blue)
- #9bf6ff (light pastel cyan)
- #fdffb6 (pastel yellow)
- #caffbf (pastel green)
- #9ae6b4 (light pastel green)
- #d0f4de (very light pastel green)

Default Vibrant:
- #8b5cf6 (purple)
- #3b82f6 (blue)
- #10b981 (green)
- #f59e0b (amber)
- #ef4444 (red)
- #ec4899 (pink)
- #14b8a6 (teal)
- #f97316 (orange)
- #6366f1 (indigo)
- #84cc16 (lime)

### Integration points

- Integrate settings management into existing components that require configuration
- Ensure components subscribe to settings changes and update their behavior accordingly
- make sure to purge any remaining hardcoded values related to these settings in the codebase (max watched notes, colors, first day of week, etc.)
- make sure to subscribe to changes at only one place per component to avoid performance issues. (components architecture is hierarchical. There are 2 possible hierarchies)
	- Code Block Processor -> component -> renderer
	- Note Insights View Panel -> component -> renderer
- reaction to settings changes should happen at component level, not renderer level

## Ressources
- Obsidian Settings page tutorial: https://docs.obsidian.md/Plugins/User+interface/Settings
