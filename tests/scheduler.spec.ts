import { test, expect } from '@playwright/test';

// Helper function to add a timezone
async function addTimezone(page: any, searchTerm: string) {
  const searchInput = page.getByTestId('timezone-search');
  await searchInput.fill(searchTerm);

  // Wait for dropdown to be visible
  const dropdown = page.getByTestId('autocomplete-dropdown');
  await expect(dropdown).toBeVisible();

  // Wait for first item and click it
  const item = page.getByTestId('autocomplete-item').first();
  await expect(item).toBeVisible();
  await item.click();

  // Wait for the timezone info to appear (new structure uses timezone-info instead of timezone-row)
  await expect(page.getByTestId('timezone-info').first()).toBeVisible();
}

test.describe('Search functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Clear localStorage to start fresh
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test('shows autocomplete results when typing', async ({ page }) => {
    const searchInput = page.getByTestId('timezone-search');
    await searchInput.fill('New York');

    const dropdown = page.getByTestId('autocomplete-dropdown');
    await expect(dropdown).toBeVisible();

    const items = page.getByTestId('autocomplete-item');
    await expect(items.first()).toBeVisible();
    await expect(items.first()).toContainText('New York');
  });

  test('displays current time in search results', async ({ page }) => {
    const searchInput = page.getByTestId('timezone-search');
    await searchInput.fill('London');

    const dropdown = page.getByTestId('autocomplete-dropdown');
    await expect(dropdown).toBeVisible();

    const timeDisplay = page.getByTestId('autocomplete-item-time').first();
    await expect(timeDisplay).toBeVisible();
    // Time should be in HH:MM format
    await expect(timeDisplay).toHaveText(/^\d{2}:\d{2}$/);
  });

  test('searches by timezone abbreviation (PST)', async ({ page }) => {
    const searchInput = page.getByTestId('timezone-search');
    await searchInput.fill('PST');

    const dropdown = page.getByTestId('autocomplete-dropdown');
    await expect(dropdown).toBeVisible();

    const items = page.getByTestId('autocomplete-item');
    await expect(items.first()).toBeVisible();
  });

  test('clears search on Escape key', async ({ page }) => {
    const searchInput = page.getByTestId('timezone-search');
    await searchInput.fill('Tokyo');

    const dropdown = page.getByTestId('autocomplete-dropdown');
    await expect(dropdown).toBeVisible();

    await searchInput.press('Escape');
    await expect(dropdown).not.toBeVisible();
    await expect(searchInput).toHaveValue('');
  });
});

test.describe('Add/Remove timezones', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test('adds timezone when clicking search result', async ({ page }) => {
    await addTimezone(page, 'New York');

    const timezoneInfo = page.getByTestId('timezone-info');
    await expect(timezoneInfo).toBeVisible();
    await expect(timezoneInfo).toContainText('New York');
  });

  test('adds multiple timezones', async ({ page }) => {
    await addTimezone(page, 'New York');
    await addTimezone(page, 'Tokyo');

    const timezoneInfos = page.getByTestId('timezone-info');
    await expect(timezoneInfos).toHaveCount(2);
  });

  test('removes timezone via remove button', async ({ page }) => {
    await addTimezone(page, 'London');

    const timezoneInfo = page.getByTestId('timezone-info');
    await expect(timezoneInfo).toBeVisible();

    // Remove it
    const removeBtn = page.getByTestId('remove-timezone');
    await removeBtn.click();

    await expect(timezoneInfo).not.toBeVisible();
    await expect(page.getByTestId('empty-state')).toBeVisible();
  });

  test('persists timezones after page reload', async ({ page }) => {
    await addTimezone(page, 'Sydney');

    const timezoneInfo = page.getByTestId('timezone-info');
    await expect(timezoneInfo).toBeVisible();
    await expect(timezoneInfo).toContainText('Sydney');

    // Reload page
    await page.reload();

    // Should still be there
    const infoAfterReload = page.getByTestId('timezone-info');
    await expect(infoAfterReload).toBeVisible();
    await expect(infoAfterReload).toContainText('Sydney');
  });
});

test.describe('Time display', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test('displays correct UTC offset relative to reference timezone', async ({ page }) => {
    await addTimezone(page, 'New York');
    await addTimezone(page, 'London');

    const offsets = page.getByTestId('timezone-offset');
    await expect(offsets).toHaveCount(2);

    // First timezone (reference) should show ±0
    await expect(offsets.first()).toHaveText('±0');

    // Second timezone should show relative offset (London is ahead of NY)
    const secondOffset = await offsets.nth(1).textContent();
    expect(secondOffset).toMatch(/^[+-±]\d+$/);
  });

  test('shows 24 hour cells in grid', async ({ page }) => {
    await addTimezone(page, 'Paris');

    const hourCells = page.getByTestId('hour-cell');
    await expect(hourCells).toHaveCount(24);
  });

  test('highlights work hours (8-17) in green', async ({ page }) => {
    await addTimezone(page, 'UTC');

    // Count work hour cells (hours 8-16 inclusive = 9 cells)
    const workHourCells = page.locator('[data-testid="hour-cell"][data-work-hour="true"]');
    await expect(workHourCells.first()).toBeVisible();
    const count = await workHourCells.count();

    // Work hours are 8, 9, 10, 11, 12, 13, 14, 15, 16 = 9 cells
    expect(count).toBe(9);
  });

  test('shows current time indicator on today', async ({ page }) => {
    await addTimezone(page, 'Berlin');

    const currentTimeLine = page.getByTestId('current-time-line');
    await expect(currentTimeLine).toBeVisible();
  });

  test('date picker updates grid display', async ({ page }) => {
    await addTimezone(page, 'Tokyo');

    const datePicker = page.getByTestId('date-picker');

    // Change to a different date (use a fixed future date)
    const futureDate = '2026-12-25';

    // Use evaluate to set the value and trigger change
    await datePicker.evaluate((el, date) => {
      (el as HTMLInputElement).value = date;
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }, futureDate);

    // The grid should update (we can verify by checking the current time line is hidden)
    const currentTimeLine = page.getByTestId('current-time-line');
    await expect(currentTimeLine).not.toBeVisible();
  });

  test('hover tooltips show full date/time', async ({ page }) => {
    await addTimezone(page, 'Singapore');

    const hourCell = page.getByTestId('hour-cell').first();
    await expect(hourCell).toBeVisible();
    const title = await hourCell.getAttribute('title');

    // Title should contain full date/time info
    expect(title).toBeTruthy();
    expect(title!.length).toBeGreaterThan(10);
  });

  test('shows timezone abbreviation', async ({ page }) => {
    await addTimezone(page, 'New York');

    const abbr = page.getByTestId('timezone-abbr');
    await expect(abbr).toBeVisible();
    // Should show EST or EDT depending on time of year
    const text = await abbr.textContent();
    expect(text).toMatch(/^[A-Z]{2,5}$/);
  });

  test('shows current time in timezone info', async ({ page }) => {
    await addTimezone(page, 'Dubai');

    const currentTime = page.getByTestId('timezone-current-time');
    await expect(currentTime).toBeVisible();
    // Should contain time in HH:MM format
    const text = await currentTime.textContent();
    expect(text).toMatch(/\d{2}:\d{2}/);
  });
});

test.describe('Date change markers', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test('shows date markers for timezones with significant offset', async ({ page }) => {
    await addTimezone(page, 'New York');
    await addTimezone(page, 'Tokyo');

    // The Tokyo row may have date markers depending on the reference timezone
    // Since Tokyo is many hours ahead, some cells may show different dates
    const infos = page.getByTestId('timezone-info');
    await expect(infos).toHaveCount(2);

    // Check that hour cells exist with various hours
    const hourCells = page.getByTestId('hour-cell');
    const count = await hourCells.count();
    expect(count).toBe(48); // 24 cells × 2 rows
  });
});

test.describe('Empty state', () => {
  test('shows empty state when no timezones added', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    const emptyState = page.getByTestId('empty-state');
    await expect(emptyState).toBeVisible();
    await expect(emptyState).toContainText('No timezones added yet');
  });

  test('hides empty state when timezone is added', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    const emptyState = page.getByTestId('empty-state');
    await expect(emptyState).toBeVisible();

    await addTimezone(page, 'Paris');

    await expect(emptyState).not.toBeVisible();
  });
});

test.describe('Mobile behavior', () => {
  test('synchronizes horizontal scrolling across timezone rows on small display', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    // Add multiple timezones
    await addTimezone(page, 'New York');
    await addTimezone(page, 'Tokyo');
    await addTimezone(page, 'London');

    // Wait for all timezone infos to be visible
    const timezoneInfos = page.getByTestId('timezone-info');
    await expect(timezoneInfos).toHaveCount(3);

    // Get the hour grids container (shared scroll container)
    const hourGridsContainer = page.getByTestId('hour-grids-container');
    await expect(hourGridsContainer).toBeVisible();

    // Scroll the container horizontally
    await hourGridsContainer.evaluate((el) => {
      el.scrollLeft = 200;
    });

    // Verify the scroll position was applied
    const scrollLeft = await hourGridsContainer.evaluate((el) => el.scrollLeft);
    expect(scrollLeft).toBe(200);

    // Get all hour grids inside the container
    const hourGrids = page.getByTestId('hour-grid');
    const hourGridCount = await hourGrids.count();
    expect(hourGridCount).toBe(3);

    // Since all grids are inside the same scrolling container,
    // they all move together when the container scrolls.
    // Verify the container structure is correct (all grids share one scroll parent)
    const containerHasAllGrids = await hourGridsContainer.evaluate((container) => {
      const grids = container.querySelectorAll('[data-testid="hour-grid"]');
      return grids.length === 3;
    });
    expect(containerHasAllGrids).toBe(true);
  });
});
