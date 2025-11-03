# TypeScript & Implementation Standards (Lean)

Bullet-point only (no inline code) high-level reminders:

## TypeScript Configuration
- Strict mode by default: keep `strictNullChecks`, avoid implicit `any`, acceptable in cases when using unofficial APIs
- Target modern but Obsidian-compatible (ES6/ES2018)
- Keep bundle external deps minimal (obsidian core only)

## Obsidian API Usage
- Keep `main.ts` lifecycle-only
- Always use `this.register*` for cleanup
- Never leave MutationObservers or intervals running after unload

## Code Organization
- Separate concerns: canvas interaction / workflow logic / utilities
- Avoid files > ~300 lines; split early
- Keep settings schema + defaults isolated

## Other Coding Standards
- DOM Safety

## Workflow Logic
- Keep execution synchronous unless needed; wrap async errors
- Named edge labels map to parameter names; unnamed become `input`
- Prevent circular traversal via visited set

## Error Handling
- Surface user-facing issues with concise `Notice` messages
- Log technical detail only in debug mode
- Provide fallback when Canvas unavailable

## Performance
- Minimize observer scope
- Short-circuit early when no relevant mutations
- Avoid large in-memory graphs; reuse structures

## Mobile Considerations
- Avoid desktop-only APIs if mobile supported
- Keep added UI elements tap-friendly
