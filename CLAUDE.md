# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a TypeScript-based project configured with strict type checking and modern tooling. The project uses:
- **Package Manager**: pnpm (v10.19.0+)
- **Node Version**: >=22.0.0
- **TypeScript**: Configured with strictest settings via `@tsconfig/strictest` and `@tsconfig/node22`
- **Code Quality**: Biome for linting and formatting
- **Module System**: ES modules (`"type": "module"`)

## Development Commands

### Linting and Formatting
```bash
# Run all linters
pnpm lint

# Auto-fix all issues
pnpm fix

# Individual linting
pnpm lint:biome-format    # Check formatting
pnpm lint:biome-lint      # Check linting

# Individual fixing
pnpm fix:biome-format     # Auto-fix formatting
pnpm fix:biome-lint       # Auto-fix linting (including unsafe fixes)
```

### Type Checking
```bash
pnpm typecheck    # Run TypeScript compiler without emitting files
```

## Code Style

### Biome Configuration
- **Formatter**: Enabled with space indentation
- **Quote Style**: Double quotes for JavaScript/TypeScript
- **Import Organization**: Automatic import organizing enabled
- **JSON**: Allows comments in JSON files

### TypeScript Configuration
- Extends `@tsconfig/node22` and `@tsconfig/strictest`
- `noEmit: true` - Type checking only, no compilation output
- `exactOptionalPropertyTypes: false` - Relaxed from strictest preset
- Source files located in `src/` directory

## Architecture Notes

This appears to be an early-stage project with minimal implementation (only a dummy export in `src/index.ts`). The project is set up with a robust foundation for TypeScript development with strict quality controls.
