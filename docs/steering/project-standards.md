# Obsidian Plugin Project Standards and Guidelines

## Code Quality Standards

### Important context
- This is a personal project. While quality is important, pragmatism and progress take precedence.
- The codebase is expected to evolve rapidly, especially in the early stages. Refactoring and improvements are encouraged as understanding deepens.
- Focus on delivering value to users quickly, while maintaining a reasonable level of code quality.

### TypeScript Best Practices
- Use strict TypeScript configuration as defined in `tsconfig.json`
- Enable `strictNullChecks` and `noImplicitAny` for robust type safety
- Define proper interfaces for all plugin settings and data structures
- Use proper typing for Obsidian API interactions (App, Plugin, WorkspaceLeaf, etc.)
- Avoid `any` types except when interfacing with untyped Canvas API internals

### Obsidian Plugin Conventions
- Keep `main.ts` focused on plugin lifecycle (onload, onunload, settings)
- Use `this.register*` helpers for all event listeners and DOM modifications
- Always clean up observers, intervals, and DOM elements in `onunload`
- Follow Obsidian's plugin naming conventions and manifest structure
- Implement proper error handling with user-friendly notices

### General coding conventions
- write testable code: use dependency injection and avoid global state
- Extract core business logic into pure functions or classes that are easy to test and have no dependencies on Obsidian APIs
- follow SOLID principles for maintainable and extensible code, core business logic should adhere to these principles. Running inside an Obsidian plugin is just an implementation detail.

### Methodology
- Follow Agile development practices with iterative feature delivery
- Use Git for version control with clear commit messages
- Follow the specs-driven development approach: implement features based on detailed specifications and user stories
- Follow the Test-Driven Development (TDD) approach: write unit tests for core business logic before implementing the functionality
- When writing documentation, ensure it is clear, concise, and up-to-date with the latest features and changes
- When writing tests, always ensure they are useful, valuable, and in accordance with both technical and function requirements
- When writing code, ensure it adheres to the defined coding standards and best practices outlined in this document
- Success is defined by delivering high-quality, maintainable code that meets user needs and passes all tests, while also being well-documented and easy to understand for future developers.
- See the documentation as a natural language executable specification that guides development and ensures alignment with user needs and project goals. (Ideation > Requirements > Design > Testing > Implementation)
