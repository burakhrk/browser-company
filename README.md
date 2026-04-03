# Browser Buddy

Chrome extension concept for a draggable on-page browser pet with a secondary popup for stats and customization.

## Project structure

- `docs/` product notes and non-runtime references
- `public/` static extension assets copied as-is
- `src/background/` service worker and background-only logic
- `src/content/` webpage-injected UI and activity tracking
- `src/popup/` popup UI for stats and customization
- `src/shared/` code shared across extension surfaces
- `src/assets/` source images, icons, and design assets

## Current status

- concept exploration
- early visual preview
- extension scaffolding

## Publishing goals

- Chrome Manifest V3
- minimal and explainable permissions
- clear privacy story
- stable injected UI with dismiss and customization controls
