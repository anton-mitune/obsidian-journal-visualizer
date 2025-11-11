# Vault Visualizer

Turn your notes into insight. Get contextual stats, dashboards, and smart suggestions for your vault.

This plugin assumes you are journaling using daily notes, and using links from your daily notes to other notes in your vault to log activities, moods, tasks, projects, etc...
When you do, it provides different ways to visualize those links as insights about your notes.

## Features - what

Get additional contextual stats about active note in the `note insight view`, available in the right sidebar by default.
![alt text](image.png)

Embed note insight module in markdown notes or canvas text nodes using the dedicated contextual menu.
![alt text](image-1.png)
![alt text](image-2.png)
![alt text](image-3.png)

Available modules:
- Monthly tracker (seen above)
![alt text](image-4.png)
- yearly tracker
![alt text](image-5.png)
- counter
![alt text](image-6.png)

Counter are special, they have multiple display modes (pie chart, top items, time series) and can track multiple notes at once.
![alt text](image-7.png)

With those you can build nice dashboards to visualize your vault data.
![alt text](image-8.png)

Every module is a codeblock, meaning you *can* write them by hand if you want to, but it's easier to insert them using the context menu, and configure them using the knobs and buttons provided.
Also, colors among other things are customizable via plugin settings.

## The problem this plugin solves - why

If you're like me, and use Obsidian for personal journaling, knowledge management, or project planning, you probably have hundreds or thousands of notes. Obsidian is great for linking notes together, and helping you find specific piece of information, as long as you or organize it in a way that works for you.

However, as your vault grows, it becomes harder to get a high-level overview of your notes, and how they relate to each other. You might have notes that are linked together, but you don't know how often you link them, or what the most important notes are. You might have tags that you use frequently, but you don't know how they relate to each other.

This plugin is an attempt at solving this problem, by providing different ways to get a higher-level overview of your Vault.

---


# Legacy README from obsidian sample plugin

This is a sample plugin for Obsidian (https://obsidian.md).

This project uses TypeScript to provide type checking and documentation.
The repo depends on the latest plugin API (obsidian.d.ts) in TypeScript Definition format, which contains TSDoc comments describing what it does.

This sample plugin demonstrates some of the basic functionality the plugin API can do.
- Adds a ribbon icon, which shows a Notice when clicked.
- Adds a command "Open Sample Modal" which opens a Modal.
- Adds a plugin setting tab to the settings page.
- Registers a global click event and output 'click' to the console.
- Registers a global interval which logs 'setInterval' to the console.

## First time developing plugins?

Quick starting guide for new plugin devs:

- Check if [someone already developed a plugin for what you want](https://obsidian.md/plugins)! There might be an existing plugin similar enough that you can partner up with.
- Make a copy of this repo as a template with the "Use this template" button (login to GitHub if you don't see it).
- Clone your repo to a local development folder. For convenience, you can place this folder in your `.obsidian/plugins/your-plugin-name` folder.
- Install NodeJS, then run `npm i` in the command line under your repo folder.
- Run `npm run dev` to compile your plugin from `main.ts` to `main.js`.
- Make changes to `main.ts` (or create new `.ts` files). Those changes should be automatically compiled into `main.js`.
- Reload Obsidian to load the new version of your plugin.
- Enable plugin in settings window.
- For updates to the Obsidian API run `npm update` in the command line under your repo folder.

## Releasing new releases

- Update your `manifest.json` with your new version number, such as `1.0.1`, and the minimum Obsidian version required for your latest release.
- Update your `versions.json` file with `"new-plugin-version": "minimum-obsidian-version"` so older versions of Obsidian can download an older version of your plugin that's compatible.
- Create new GitHub release using your new version number as the "Tag version". Use the exact version number, don't include a prefix `v`. See here for an example: https://github.com/obsidianmd/obsidian-sample-plugin/releases
- Upload the files `manifest.json`, `main.js`, `styles.css` as binary attachments. Note: The manifest.json file must be in two places, first the root path of your repository and also in the release.
- Publish the release.

> You can simplify the version bump process by running `npm version patch`, `npm version minor` or `npm version major` after updating `minAppVersion` manually in `manifest.json`.
> The command will bump version in `manifest.json` and `package.json`, and add the entry for the new version to `versions.json`

## Adding your plugin to the community plugin list

- Check the [plugin guidelines](https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines).
- Publish an initial version.
- Make sure you have a `README.md` file in the root of your repo.
- Make a pull request at https://github.com/obsidianmd/obsidian-releases to add your plugin.

## How to use

- Clone this repo.
- Make sure your NodeJS is at least v16 (`node --version`).
- `npm i` or `yarn` to install dependencies.
- `npm run dev` to start compilation in watch mode.

## Manually installing the plugin

- Copy over `main.js`, `styles.css`, `manifest.json` to your vault `VaultFolder/.obsidian/plugins/your-plugin-id/`.

## Improve code quality with eslint (optional)
- [ESLint](https://eslint.org/) is a tool that analyzes your code to quickly find problems. You can run ESLint against your plugin to find common bugs and ways to improve your code. 
- To use eslint with this project, make sure to install eslint from terminal:
  - `npm install -g eslint`
- To use eslint to analyze this project use this command:
  - `eslint main.ts`
  - eslint will then create a report with suggestions for code improvement by file and line number.
- If your source code is in a folder, such as `src`, you can use eslint with this command to analyze all files in that folder:
  - `eslint ./src/`

## Funding URL

You can include funding URLs where people who use your plugin can financially support it.

The simple way is to set the `fundingUrl` field to your link in your `manifest.json` file:

```json
{
    "fundingUrl": "https://buymeacoffee.com"
}
```

If you have multiple URLs, you can also do:

```json
{
    "fundingUrl": {
        "Buy Me a Coffee": "https://buymeacoffee.com",
        "GitHub Sponsor": "https://github.com/sponsors",
        "Patreon": "https://www.patreon.com/"
    }
}
```

## API Documentation

See https://github.com/obsidianmd/obsidian-api
