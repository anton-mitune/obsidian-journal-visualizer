import { App, PluginSettingTab, Setting } from 'obsidian';
import type VaultVisualizerPlugin from '../../main';
import { ColorPalette, COLOR_PALETTES } from '../types';

/**
 * SettingsTab - Plugin settings page
 * FEA010: Plugin Settings
 * 
 * Provides UI for configuring global plugin settings
 */
export class VaultVisualizerSettingTab extends PluginSettingTab {
	plugin: VaultVisualizerPlugin;

	constructor(app: App, plugin: VaultVisualizerPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		containerEl.createEl('h2', { text: 'Vault Visualizer Settings' });

		// First Day of Week Setting
		new Setting(containerEl)
			.setName('First day of week')
			.setDesc('Select the first day of the week for weekly period calculations.')
			.addDropdown(dropdown => dropdown
				.addOption('0', 'Sunday')
				.addOption('1', 'Monday')
				.addOption('2', 'Tuesday')
				.addOption('3', 'Wednesday')
				.addOption('4', 'Thursday')
				.addOption('5', 'Friday')
				.addOption('6', 'Saturday')
				.setValue(String(this.plugin.settings.firstDayOfWeek))
				.onChange(async (value) => {
					this.plugin.settings.firstDayOfWeek = parseInt(value) as 0 | 1 | 2 | 3 | 4 | 5 | 6;
					await this.plugin.saveSettings();
				}));

		// Max Watched Notes Setting
		new Setting(containerEl)
			.setName('Max watched notes')
			.setDesc('Set the maximum number of notes that can be watched by backlink counter components (no more than 50 recommended).')
			.addText(text => text
				.setPlaceholder('50')
				.setValue(String(this.plugin.settings.maxWatchedNotes))
				.onChange(async (value) => {
					const num = parseInt(value);
					if (!isNaN(num) && num > 0) {
						this.plugin.settings.maxWatchedNotes = num;
						await this.plugin.saveSettings();
					}
				}));

		// Series Colors Section
		containerEl.createEl('h3', { text: 'Default Series Colors' });
		containerEl.createEl('p', { 
			text: 'Set default colors for up to 10 series in visualizations.',
			cls: 'setting-item-description'
		});

		// Suggested Color Palette Setting (FEA010 Requirement 5)
		new Setting(containerEl)
			.setName('Suggested color palette')
			.setDesc('You can also customize individual series colors below by using the color picker.')
			.addDropdown(dropdown => dropdown
				.addOption(ColorPalette.VIBRANT, 'Vibrant')
				.addOption(ColorPalette.PASTEL, 'Pastel Dreamland')
				.setValue(this.plugin.settings.suggestedColorPalette)
				.onChange(async (value) => {
					const palette = value as ColorPalette;
					this.plugin.settings.suggestedColorPalette = palette;
					
					// Apply the palette colors to series colors
					const paletteColors = COLOR_PALETTES[palette];
					for (let i = 0; i < 10; i++) {
						const colorKey = `series${i + 1}Color` as keyof typeof this.plugin.settings;
						(this.plugin.settings[colorKey] as string) = paletteColors[i];
					}
					
					await this.plugin.saveSettings();
					
					// Refresh the display to show updated colors
					this.display();
				}));

		// Series 1-10 Color Settings
		for (let i = 1; i <= 10; i++) {
			const colorKey = `series${i}Color` as keyof typeof this.plugin.settings;
			new Setting(containerEl)
				.setName(`Series ${i} color`)
				.addColorPicker(color => color
					.setValue(this.plugin.settings[colorKey] as string)
					.onChange(async (value) => {
						(this.plugin.settings[colorKey] as string) = value;
						await this.plugin.saveSettings();
					}));
		}

		// Reload Obsidian Button
		containerEl.createEl('h3', { text: 'Troubleshooting' });
		new Setting(containerEl)
			.setName('Reload Obsidian')
			.setDesc('If some changes are not taking effect, you can reload Obsidian to apply them.')
			.addButton(button => button
				.setButtonText('Reload')
				.onClick(() => {
					// @ts-ignore - undocumented API
					this.app.commands.executeCommandById('app:reload');
				}));

		// Advanced Settings Section (collapsed by default)
		containerEl.createEl('h3', { text: 'Advanced Settings' });
		const advancedContainer = containerEl.createEl('details', { cls: 'vault-visualizer-advanced-settings' });
		const summary = advancedContainer.createEl('summary', { text: 'Show advanced settings' });

		// Log Level Setting
		new Setting(advancedContainer)
			.setName('Log level')
			.setDesc('Set the minimum log level for console output. Lower levels show more messages. Requires reload. You should not need to change this unless you are a developper troubleshooting an issue. Setting this to "Debug", or "Info" may produce a large volume of log messages and impact performance.')
			.addDropdown(dropdown => dropdown
				.addOption('0', 'Debug (all messages)')
				.addOption('1', 'Info')
				.addOption('2', 'Warning')
				.addOption('3', 'Error (default)')
				.addOption('4', 'None (silent)')
				.setValue(String(this.plugin.settings.logLevel))
				.onChange(async (value) => {
					this.plugin.settings.logLevel = parseInt(value);
					await this.plugin.saveSettings();
				}));


	}
}
