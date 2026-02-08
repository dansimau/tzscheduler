# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

tzscheduler is a single-file web application (index.html) for comparing timezones and scheduling meetings across multiple locations. Deployed to GitHub Pages at https://dansimau.github.io/tzscheduler/. There is no build step — all HTML, CSS, and JavaScript live in `index.html`.

## Commands

```bash
npm run serve          # Start dev server on port 3000
npm test               # Run Playwright E2E tests (auto-starts server)
npm run test:ui        # Run tests in interactive Playwright UI
npm run test:headed    # Run tests with visible browser
```

To run a single test by name:
```bash
npx playwright test -g "test name"
```

There is no linter or TypeScript compilation for the main app.

## Architecture

All application code is in `index.html` using the IIFE module pattern. Each module returns a public API object:

- **TimezoneData** — City/timezone mapping, abbreviation aliases, search logic (max 10 results)
- **TimezoneUtils** — Date/time formatting, UTC offset calculation, all using the browser `Intl` API
- **AppState** — Reactive state with observer pattern (`subscribe`/`notify`). Stores timezones list, selected date, work hours (8-17), selected hour index. Persists to localStorage under key `timescheduler_timezones`
- **SearchComponent** — Autocomplete search input for adding timezones
- **GridRenderer** — Renders 24-hour timezone grid with work-hour highlighting, current-time indicator, and synchronized horizontal scrolling. Subscribes to AppState and re-renders on changes
- **DatePickerComponent** — HTML5 date input wired to AppState
- **TimeSummaryModal** — Shows meeting times across all timezones for a selected hour, with copy-to-clipboard

Data flow: User interaction → Component → AppState mutation → `notify()` → GridRenderer re-render.

The first timezone in the list is always the reference timezone.

## Testing

Tests are in `tests/scheduler.spec.ts` using Playwright (Chromium only). Tests use `data-testid` attributes for element selection — the same attributes are used by both tests and application JS. The Playwright config auto-starts a dev server on port 3000.
