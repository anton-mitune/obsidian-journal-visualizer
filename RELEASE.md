# Releasing & Publishing

## Automatic Releases

This project uses GitHub Actions to automatically create releases when you push to the `master` branch.

**Important:** Only push to `master` after bumping the version number. Each release is tagged with the version from `manifest.json`, and duplicate tags will cause the workflow to fail.

## How to Release

1. **Bump the version:**
   ```bash
   npm version patch  # or minor, major
   ```
   This updates `package.json` and creates a git tag.

2. **Sync to manifest.json:**
   ```bash
   npm run version
   git add manifest.json versions.json
   git commit --amend --no-edit  # amend the version commit
   ```

3. **Push to master:**
   ```bash
   git push -u origin master
   ```

The GitHub Actions workflow will then:
- Build the plugin
- Generate the demo vault
- Create zip files for both
- Create a GitHub release with the following assets:
  - `main.js` - Compiled plugin
  - `manifest.json` - Plugin metadata
  - `styles.css` - Plugin styles
  - `journal-visualizer-demo-vault.zip` - Demo vault

You can download the release artifacts from the [Releases](../../releases) page.

## Obsidian Plugin Submission

The release process follows [Obsidian's plugin submission requirements](https://docs.obsidian.md/Plugins/Releasing/Submit+your+plugin):
- Versions follow [Semantic Versioning](https://semver.org/) (format: x.y.z)
- Release tag matches the version in `manifest.json`
- Individual plugin files are uploaded as release assets (not zipped)
- `versions.json` tracks compatibility with different Obsidian versions
