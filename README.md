# Time Scheduler

![Checks](https://github.com/dansimau/yas/actions/workflows/checks.yaml/badge.svg)
![Coverage](https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/dansimau/tzscheduler/badges/coverage.json)

A simple timezone comparison tool for scheduling meetings across multiple timezones. Add cities or timezones, and see a 24-hour grid showing work hours (highlighted in green) across all locations.

**URL:** https://dansimau.github.io/tzscheduler/

## Features

- Search by city name, timezone abbreviation (PST, CET, etc.), or IANA timezone
- Visual 24-hour grid with work hours (8am-5pm) highlighted
- Current time indicator
- Tap any hour to get a copyable summary of times in all timezones
- Synchronized scrolling on mobile devices
- Persists your timezones in localStorage

## Development

```bash
npm install
npm run serve    # Start local server on port 3000
npm test         # Run Playwright tests
```
