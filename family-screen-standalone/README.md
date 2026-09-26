# Family Screen Standalone

This is a standalone, self-contained version of the Family Screen web app, optimized for v0.dev compatibility.

## What was changed

This version removes all monorepo dependencies to make it compatible with v0.dev's "select directory" import:

- **Removed workspace dependencies**: All `workspace:*` protocol references replaced with direct package imports
- **Replaced catalog versions**: All `catalog:` version strings replaced with pinned versions from the original workspace
- **Inlined api-client-react**: The shared library is now included directly in `src/lib/api-client-react`
- **Fixed TypeScript config**: Removed monorepo references and external dependencies
- **Updated Vite config**: Uses `fileURLToPath` instead of `import.meta.dirname` for broader Node compatibility

## Installation

```bash
npm install
```

## Development

```bash
npm run dev
```

## Build

```bash
npm run build
```

## Usage with v0.dev

This folder can be directly imported into v0.dev. Simply select this directory when using v0.dev's "select directory" feature.

## Note

This is a standalone export for v0.dev compatibility. Changes made here won't automatically sync back to the main monorepo. For ongoing development, work in the main repository and manually copy changes as needed.