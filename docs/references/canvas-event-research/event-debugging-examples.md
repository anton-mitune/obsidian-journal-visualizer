# Canvas Event Debugging Examples

## Event Debugging Code

This code was used to research and discover working canvas event patterns:

```typescript
/**
 * Debug helper to listen for all possible menu events
 */
private debugAllMenuEvents(): void {
    const possibleEvents = [
        'editor-menu',
        'file-menu', 
        'files-menu',
        'canvas:menu',
        'canvas:background-menu',
        'canvas:node-menu',
        'canvas:selection-menu',
        'canvas:context-menu',
        'canvas:right-click',
        'canvas:background-click',
        'canvas:background-context-menu',
        'context-menu',
        'menu',
        'canvas-menu',
        'canvas-context',
        'canvas-background',
        'workspace:context-menu',
        'workspace:right-click'
    ];

    possibleEvents.forEach(eventName => {
        try {
            this.plugin.registerEvent(
                this.app.workspace.on(eventName as any, (...args: any[]) => {
                    console.log(`🎯 Event captured: ${eventName}`, args);
                    
                    // Try to detect if this is a canvas-related menu
                    const hasCanvasContext = args.some(arg => 
                        typeof arg === 'string' && arg.includes('canvas') ||
                        arg && typeof arg === 'object' && (arg.canvas || arg.type === 'canvas')
                    );
                    
                    if (hasCanvasContext) {
                        console.log(`🎨 Canvas-related menu detected in ${eventName}:`, args);
                    }
                })
            );
        } catch (error) {
            console.debug(`Event '${eventName}' not available:`, error);
        }
    });
}

/**
 * Direct canvas listening for research
 */
private researchDirectCanvasListening(): void {
    setTimeout(() => {
        const canvasElements = document.querySelectorAll('.canvas-wrapper, .canvas-container, .canvas');
        console.log(`Found ${canvasElements.length} canvas elements for research`);
        
        canvasElements.forEach((element, index) => {
            element.addEventListener('contextmenu', (event) => {
                console.log(`🎯 Direct canvas contextmenu detected on element ${index}:`, event);
                
                const target = event.target as HTMLElement;
                const isBackgroundClick = target.classList.contains('canvas-wrapper') || 
                                        target.classList.contains('canvas-container') ||
                                        target.classList.contains('canvas');
                
                if (isBackgroundClick) {
                    console.log(`🎨 Canvas background right-click detected!`);
                }
            });
        });
    }, 1000);
}
```

## Successful Event Patterns Discovered

### Working Events
- `canvas:node-menu` - Reliable for node context menus
- `canvas:node-connection-drop-menu` - For edge drop menus
- `canvas:selection-menu` - Only when 2+ items selected

### Console Output Examples

```
🎯 Event captured: canvas:node-menu (2) [Menu, Node]
🎨 Canvas-related menu detected in canvas:node-menu: (2) [Menu, Node]

🎯 Direct canvas contextmenu detected on element 0: PointerEvent
🎨 Canvas background right-click detected!
```

## Research Findings Summary

1. **Direct DOM listening is required** for canvas background context menus
2. **Official Obsidian events work** for node and edge interactions
3. **Canvas selection menu is limited** to multi-selection scenarios
4. **Background clicks don't trigger** any official Obsidian events
