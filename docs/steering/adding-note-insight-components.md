# Adding New Note Insight Components - Developer Guide

This guide explains how to add a new note insight component to the Vault Visualizer plugin. Follow this pattern to ensure consistency with existing components (yearly tracker, monthly tracker, counter).

## Overview

Note insight components are modular UI elements that provide analytics about notes. They can be displayed in three ways:
1. **Note Insights View Panel** (right sidebar)
2. **Code blocks in markdown notes** (e.g., `` ```note-insight-yearly ``)
3. **Code blocks in canvas text nodes**

## Component Architecture Pattern

### 1. Component Class (`src/ui/`)

Create a self-contained component class that:
- Takes a container element and data dependencies in constructor
- Uses `BacklinkInfo[]` as primary data source (via BacklinkAnalysisService)
- Accepts an optional callback for state changes (e.g., period selection)
- Provides `updateData()`, `clear()`, and `render()` methods

**Example structure:**
```typescript
export class MyInsightComponent {
    private container: HTMLElement;
    private classifier: DailyNoteClassifier;
    private backlinks: BacklinkInfo[] = [];
    private onStateChangeCallback?: (newState: any) => void;

    constructor(
        container: HTMLElement, 
        classifier: DailyNoteClassifier,
        onStateChangeCallback?: (newState: any) => void
    ) {
        this.container = container;
        this.classifier = classifier;
        this.onStateChangeCallback = onStateChangeCallback;
    }

    updateData(backlinks: BacklinkInfo[]): void {
        this.backlinks = backlinks;
        this.render();
    }

    clear(): void {
        this.backlinks = [];
        this.container.empty();
    }

    private render(): void {
        this.container.empty();
        // Build your UI here
    }
}
```

**Key principles:**
- Component receives `BacklinkInfo[]` and filters/processes it internally
- Component does NOT call Obsidian APIs directly (uses provided classifier/services)
- State changes notify parent via callback (for persistence to code blocks)
- CSS classes follow pattern: `component-name-element` (e.g., `backlink-counter-number`)

### 2. Code Block Processor (`src/features/note-insight-code-block-processor.ts`)

Add three things to the existing processor:

#### a. Configuration interface
```typescript
interface MyComponentCodeBlockConfig {
    notePath: string;
    myState?: string; // Optional saved state
}
```

#### b. Update type union
```typescript
interface CodeBlockInstance {
    component: YearlyTrackerComponent | MonthlyTrackerComponent | MyInsightComponent;
    // ...
    type: 'yearly' | 'monthly' | 'mytype';
    lastKnownPeriod: number | string | MyStateType;
    // ...
}
```

#### c. Register processor in `register()` method
```typescript
this.plugin.registerMarkdownCodeBlockProcessor(
    'note-insight-mytype',
    this.processMyTypeBlock.bind(this)
);
```

#### d. Process method (follow existing pattern)
```typescript
private async processMyTypeBlock(
    source: string,
    el: HTMLElement,
    ctx: MarkdownPostProcessorContext
): Promise<void> {
    try {
        const config = this.parseMyTypeConfig(source);
        if (!config) {
            el.createEl('div', { text: 'Error: notePath not specified', cls: 'note-insight-error' });
            return;
        }

        const file = this.app.vault.getAbstractFileByPath(config.notePath);
        if (!file) {
            el.createEl('div', { text: `Error: Note not found: ${config.notePath}`, cls: 'note-insight-error' });
            return;
        }

        const backlinks = this.analysisService.getBacklinksForFile(file as TFile);
        const instanceId = `mytype-${ctx.sourcePath}-${Date.now()}-${Math.random()}`;

        const container = el.createEl('div', { cls: 'note-insight-code-block mytype' });
        container.createEl('h4', { text: file.name.replace(/\.md$/, ''), cls: 'note-insight-title' });

        const componentContainer = container.createEl('div', { cls: 'my-component-wrapper' });
        const component = new MyInsightComponent(
            componentContainer,
            this.analysisService.getClassifier(),
            (newState) => this.updateCodeBlockSource(ctx, instanceId, newState)
        );

        component.updateData(backlinks);
        if (config.myState) {
            component.setMyState(config.myState);
        }

        // Register auto-refresh on backlink changes
        const eventRef = this.app.metadataCache.on('resolved', () => {
            const instance = this.instances.get(instanceId);
            if (!instance || instance.isUpdatingCodeblock) return;

            const updatedFile = this.app.vault.getAbstractFileByPath(config.notePath);
            if (updatedFile) {
                const updatedBacklinks = this.analysisService.getBacklinksForFile(updatedFile as TFile);
                component.updateData(updatedBacklinks);
            }
        });

        this.plugin.registerEvent(eventRef);

        this.instances.set(instanceId, {
            component,
            notePath: config.notePath,
            eventRef,
            type: 'mytype',
            ctx,
            el,
            lastKnownPeriod: config.myState ?? 'default',
            isUpdatingCodeblock: false
        });

        const renderChild = new MarkdownRenderChild(container);
        renderChild.onunload = () => {
            const instance = this.instances.get(instanceId);
            if (instance) {
                this.app.workspace.offref(instance.eventRef);
                this.instances.delete(instanceId);
            }
        };
        ctx.addChild(renderChild);

    } catch (error) {
        console.error('Error processing note-insight-mytype block:', error);
        el.createEl('div', { text: `Error: ${error.message}`, cls: 'note-insight-error' });
    }
}
```

#### e. Parse method
```typescript
private parseMyTypeConfig(source: string): MyComponentCodeBlockConfig | null {
    const lines = source.trim().split('\n');
    let notePath: string | null = null;
    let myState: string | undefined = undefined;

    for (const line of lines) {
        const trimmedLine = line.trim();
        if (trimmedLine.startsWith('notePath:')) {
            notePath = trimmedLine.substring('notePath:'.length).trim();
        } else if (trimmedLine.startsWith('myState:')) {
            myState = trimmedLine.substring('myState:'.length).trim();
        }
    }

    return notePath ? { notePath, myState } : null;
}
```

### 3. Update Canvas & Note Updaters (`src/utils/`)

Both `canvas-updater.ts` and `note-updater.ts` need updates:

#### CanvasUpdater
```typescript
export interface CanvasCodeblockUpdate {
    trackerType: 'yearly' | 'monthly' | 'counter' | 'mytype';
    newPeriod: number | string | TimePeriod | MyStateType;
    // ...
}

// In updateNodeText method:
const codeblockType = update.trackerType === 'yearly' ? 'note-insight-yearly' : 
                       update.trackerType === 'monthly' ? 'note-insight-monthly' :
                       update.trackerType === 'counter' ? 'note-insight-counter' :
                       'note-insight-mytype';

// Add state handling:
} else if (update.trackerType === 'mytype' && line.trim().startsWith('myState:')) {
    lines[i] = `myState: ${update.newPeriod}`;
    updatedLines = true;
    break;
}
```

#### NoteUpdater
Same pattern - update type union and add state handling in `updateCodeblockInRange()`.

### 4. Context Menu Integration (`src/features/note-insight-context-menu-manager.ts`)

Add menu item and handler:

```typescript
// In addMenuItems():
menu.addItem((item) => {
    item
        .setTitle('Add My Insight from Vault')
        .setIcon('icon-name')
        .onClick(() => this.showNoteSelectorForMyType(editor));
});

// Handler method:
private showNoteSelectorForMyType(editor: Editor): void {
    const modal = new NoteSelector(this.app, (file) => {
        const codeBlock = `\`\`\`note-insight-mytype\nnotePath: ${file.path}\n\`\`\`\n`;
        editor.replaceSelection(codeBlock);
    });
    modal.open();
}
```

### 5. Note Insights View Panel Integration (`src/ui/note-insights-view.ts`)

Add component to the right sidebar view:

```typescript
// In renderNoteInsights():
const mySection = container.createEl('div', { cls: 'note-insights-section' });
mySection.createEl('div', { text: 'My Insight', cls: 'note-insights-label' });
const myContainer = mySection.createEl('div', { cls: 'note-insights-my-component' });

this.myComponent = new MyInsightComponent(myContainer, this.classifier);
const activeFile = this.app.workspace.getActiveFile();
if (activeFile && this.analysisService) {
    const backlinks = this.analysisService.getBacklinksForFile(activeFile);
    this.myComponent.updateData(backlinks);
}
```

Don't forget to clear it in `clearNoteInfo()` and `onClose()`.

### 6. Styling (`styles.css`)

Add component-specific styles following the existing pattern:

```css
/* My Insight Component Styles */
.my-component-wrapper {
    margin-top: 8px;
}

.my-component-element {
    /* Your styles here */
    /* Use Obsidian theme variables: var(--text-normal), var(--background-primary), etc. */
}
```

### 7. UserNotifier Update (`src/utils/user-notifier.ts`)

Update type union for duplicate notifications:

```typescript
notifyDuplicateCodeblocks(
    trackerType: 'yearly' | 'monthly' | 'counter' | 'mytype',
    // ...
) {
    const trackerTypeName = trackerType === 'yearly' ? 'yearly tracker' : 
                             trackerType === 'monthly' ? 'monthly tracker' :
                             trackerType === 'counter' ? 'counter' :
                             'my insight';
    // ...
}
```

## Checklist for New Components

- [ ] Component class created in `src/ui/` with proper data flow
- [ ] Config interface added to code block processor
- [ ] Type unions updated (CodeBlockInstance, CanvasCodeblockUpdate, NoteCodeblockUpdate)
- [ ] Code block processor registered and implemented
- [ ] Parse method added for code block configuration
- [ ] CanvasUpdater updated with new type handling
- [ ] NoteUpdater updated with new type handling
- [ ] Context menu item added
- [ ] Note Insights View integration added
- [ ] CSS styles added
- [ ] UserNotifier type updated
- [ ] Feature specification document created/updated
- [ ] Architecture documentation updated

## Common Pitfalls to Avoid

1. **Don't call Obsidian APIs directly in components** - Use provided services/classifiers
2. **Don't use direct note paths** - Use BacklinkInfo[] pattern for consistency
3. **Always register event cleanup** - Use MarkdownRenderChild for proper cleanup
4. **State persistence** - Always use the callback pattern to notify code block processor
5. **Infinite loops** - Use `isUpdatingCodeblock` flag when updating code block content
6. **Type safety** - Update ALL type unions when adding new component types
7. **Canvas context detection** - Empty `ctx.sourcePath` indicates canvas, not markdown

## Testing Your Component

1. **View Panel**: Open note, check right sidebar
2. **Markdown Code Block**: Create `` ```note-insight-mytype `` block, verify rendering and state persistence
3. **Canvas Code Block**: Add to canvas text node, verify rendering and state persistence  
4. **Context Menu**: Right-click in editor, verify menu item appears and inserts correct code block
5. **Auto-refresh**: Modify backlinks, verify component updates automatically
6. **Duplicate Handling**: Add multiple instances, verify all update when state changes
7. **Theme Compatibility**: Test with different Obsidian themes

## Example: Counter (FEA005)

Reference `BacklinkCounterComponent` for a complete working example following all these patterns.
