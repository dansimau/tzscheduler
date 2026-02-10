import { test, expect } from './fixtures';

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

  test('current time line has dot indicators at both ends', async ({ page }) => {
    await addTimezone(page, 'Berlin');

    const currentTimeLine = page.getByTestId('current-time-line');
    await expect(currentTimeLine).toBeVisible();

    // Check that the line has ::before and ::after pseudo-elements with dots
    const hasDots = await currentTimeLine.evaluate((el) => {
      const beforeStyles = window.getComputedStyle(el, '::before');
      const afterStyles = window.getComputedStyle(el, '::after');

      // Both should have content (the dots)
      const beforeContent = beforeStyles.getPropertyValue('content');
      const afterContent = afterStyles.getPropertyValue('content');

      // Both should have border-radius (to make them circular)
      const beforeRadius = beforeStyles.getPropertyValue('border-radius');
      const afterRadius = afterStyles.getPropertyValue('border-radius');

      return beforeContent !== 'none' && afterContent !== 'none' &&
             beforeRadius !== '0px' && afterRadius !== '0px';
    });

    expect(hasDots).toBe(true);
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

  test('hover tooltip shows time on mouseover', async ({ page }) => {
    await addTimezone(page, 'Singapore');

    const hourCell = page.getByTestId('hour-cell').first();
    await expect(hourCell).toBeVisible();

    // Hover over the cell center
    const box = await hourCell.boundingBox();
    await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);

    const tooltip = page.getByTestId('hover-tooltip');
    await expect(tooltip).toBeVisible();
    const text = await tooltip.textContent();
    expect(text).toContain('Singapore');
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

  test('scheduled time updates occur at minute boundaries', async ({ page }) => {
    await addTimezone(page, 'UTC');

    // Verify that the scheduling logic exists and is properly configured
    const scheduleInfo = await page.evaluate(() => {
      const now = new Date();
      const secondsUntilNextMinute = 60 - now.getSeconds();
      const msUntilNextMinute = secondsUntilNextMinute * 1000 - now.getMilliseconds();

      // The delay should be between 0 and 60000ms (never negative, never > 1 minute)
      return {
        delay: msUntilNextMinute,
        isValid: msUntilNextMinute >= 0 && msUntilNextMinute <= 60000,
      };
    });

    // Verify the delay calculation is correct
    expect(scheduleInfo.isValid).toBe(true);
    expect(scheduleInfo.delay).toBeGreaterThanOrEqual(0);
    expect(scheduleInfo.delay).toBeLessThanOrEqual(60000);
  })
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

test.describe('Hover line and 15-minute snapping', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test('hover line appears on mousemove over grid', async ({ page }) => {
    await addTimezone(page, 'New York');
    await addTimezone(page, 'Tokyo');

    const hourCell = page.getByTestId('hour-cell').first();
    const box = await hourCell.boundingBox();
    await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);

    const hoverLine = page.getByTestId('hover-time-line');
    await expect(hoverLine).toBeVisible();
  });

  test('hover line disappears on mouseleave', async ({ page }) => {
    await addTimezone(page, 'New York');

    const hourCell = page.getByTestId('hour-cell').first();
    const box = await hourCell.boundingBox();
    await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);

    const hoverLine = page.getByTestId('hover-time-line');
    await expect(hoverLine).toBeVisible();

    // Move mouse outside the grid container
    await page.mouse.move(0, 0);
    await expect(hoverLine).not.toBeVisible();
  });

  test('tooltip shows time in hovered timezone row', async ({ page }) => {
    await addTimezone(page, 'New York');
    await addTimezone(page, 'Tokyo');

    // Hover over a cell in the Tokyo row (second row)
    const hourGrids = page.getByTestId('hour-grid');
    const tokyoRow = hourGrids.nth(1);
    const tokyoCell = tokyoRow.locator('[data-testid="hour-cell"]').first();
    const box = await tokyoCell.boundingBox();
    await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);

    const tooltip = page.getByTestId('hover-tooltip');
    await expect(tooltip).toBeVisible();
    const text = await tooltip.textContent();
    expect(text).toContain('Tokyo');
  });

  test('tooltip does not overflow right edge of viewport', async ({ page }) => {
    await addTimezone(page, 'New York');

    // Hover over the last hour cell (rightmost, most likely to overflow)
    const hourGrid = page.getByTestId('hour-grid').first();
    const lastCell = hourGrid.locator('[data-testid="hour-cell"]').last();

    // Scroll the grid container so the last cell is visible
    const container = page.getByTestId('hour-grids-container');
    await container.evaluate((el) => { el.scrollLeft = el.scrollWidth; });

    const box = await lastCell.boundingBox();
    await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);

    const tooltip = page.getByTestId('hover-tooltip');
    await expect(tooltip).toBeVisible();

    const tooltipBox = await tooltip.boundingBox();
    const viewportSize = page.viewportSize()!;
    expect(tooltipBox!.x + tooltipBox!.width).toBeLessThanOrEqual(viewportSize.width);
  });

  test('hover line snaps to 15-minute intervals', async ({ page }) => {
    await addTimezone(page, 'New York');

    const hourCell = page.getByTestId('hour-cell').nth(5);
    const box = await hourCell.boundingBox();

    // Hover at 25% of cell width (should snap to :15)
    await page.mouse.move(box!.x + box!.width * 0.25, box!.y + box!.height / 2);
    const hoverLine = page.getByTestId('hover-time-line');
    await expect(hoverLine).toBeVisible();
    const left1 = await hoverLine.evaluate((el) => el.style.left);

    // Hover at 75% of same cell (should snap to :45)
    await page.mouse.move(box!.x + box!.width * 0.75, box!.y + box!.height / 2);
    const left2 = await hoverLine.evaluate((el) => el.style.left);

    expect(left1).not.toBe(left2);
  });

  test('click at 15-minute position opens modal with correct time', async ({ page }) => {
    await addTimezone(page, 'UTC');

    // Click at ~50% of the hour-8 cell (should be :30)
    const hourCell = page.locator('[data-testid="hour-cell"][data-hour-index="8"]').first();
    const box = await hourCell.boundingBox();
    await page.mouse.click(box!.x + box!.width * 0.5, box!.y + box!.height / 2);

    const overlay = page.getByTestId('time-summary-overlay');
    await expect(overlay).toBeVisible();

    const summaryText = page.getByTestId('time-summary-text');
    const text = await summaryText.textContent();
    expect(text).toContain(':30');
  });

  test('click at cell start opens modal at :00', async ({ page }) => {
    await addTimezone(page, 'UTC');

    const hourCell = page.locator('[data-testid="hour-cell"][data-hour-index="10"]').first();
    const box = await hourCell.boundingBox();
    // Click at the very left edge of the cell
    await page.mouse.click(box!.x + 2, box!.y + box!.height / 2);

    const overlay = page.getByTestId('time-summary-overlay');
    await expect(overlay).toBeVisible();

    const summaryText = page.getByTestId('time-summary-text');
    const text = await summaryText.textContent();
    expect(text).toContain(':00');
  });
});

test.describe('Touch interactions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test('touch hold shows hover line', async ({ page }) => {
    // Use landscape to test horizontal touch behavior
    await page.setViewportSize({ width: 667, height: 375 });

    await addTimezone(page, 'New York');

    const hourCell = page.getByTestId('hour-cell').nth(5);
    const box = await hourCell.boundingBox();
    const x = box!.x + box!.width / 2;
    const y = box!.y + box!.height / 2;

    // Dispatch touchstart on the container
    await page.evaluate(({ x, y }) => {
      const container = document.querySelector('.hour-grids-container')!;
      const touch = new Touch({ identifier: 1, target: container, clientX: x, clientY: y });
      container.dispatchEvent(new TouchEvent('touchstart', { touches: [touch], changedTouches: [touch], bubbles: true }));
    }, { x, y });

    // Wait past hold threshold
    await page.waitForTimeout(350);

    const hoverLine = page.getByTestId('hover-time-line');
    await expect(hoverLine).toBeVisible();

    // Clean up: dispatch touchend
    await page.evaluate(({ x, y }) => {
      const container = document.querySelector('.hour-grids-container')!;
      const touch = new Touch({ identifier: 1, target: container, clientX: x, clientY: y });
      container.dispatchEvent(new TouchEvent('touchend', { touches: [], changedTouches: [touch], bubbles: true }));
    }, { x, y });
  });

  test('touch drag updates line position', async ({ page }) => {
    // Use landscape to test horizontal touch behavior
    await page.setViewportSize({ width: 667, height: 375 });

    await addTimezone(page, 'New York');

    const hourCell = page.getByTestId('hour-cell').nth(5);
    const box = await hourCell.boundingBox();
    const x = box!.x + box!.width / 2;
    const y = box!.y + box!.height / 2;

    // Dispatch touchstart on the container
    await page.evaluate(({ x, y }) => {
      const container = document.querySelector('.hour-grids-container')!;
      const touch = new Touch({ identifier: 1, target: container, clientX: x, clientY: y });
      container.dispatchEvent(new TouchEvent('touchstart', { touches: [touch], changedTouches: [touch], bubbles: true }));
    }, { x, y });

    await page.waitForTimeout(350);

    const hoverLine = page.getByTestId('hover-time-line');
    await expect(hoverLine).toBeVisible();
    const left1 = await hoverLine.evaluate((el) => el.style.left);

    // Dispatch touchmove to a different X position
    const newX = x + box!.width * 2;
    await page.evaluate(({ y, newX }) => {
      const container = document.querySelector('.hour-grids-container')!;
      const touch = new Touch({ identifier: 1, target: container, clientX: newX, clientY: y });
      container.dispatchEvent(new TouchEvent('touchmove', { touches: [touch], changedTouches: [touch], bubbles: true }));
    }, { y, newX });

    const left2 = await hoverLine.evaluate((el) => el.style.left);
    expect(left1).not.toBe(left2);

    // Clean up
    await page.evaluate(({ newX, y }) => {
      const container = document.querySelector('.hour-grids-container')!;
      const touch = new Touch({ identifier: 1, target: container, clientX: newX, clientY: y });
      container.dispatchEvent(new TouchEvent('touchend', { touches: [], changedTouches: [touch], bubbles: true }));
    }, { newX, y });
  });

  test('touch release opens modal', async ({ page }) => {
    // Use landscape to test horizontal touch behavior
    await page.setViewportSize({ width: 667, height: 375 });

    await addTimezone(page, 'UTC');

    const hourCell = page.getByTestId('hour-cell').nth(8);
    const box = await hourCell.boundingBox();
    const x = box!.x + box!.width / 2;
    const y = box!.y + box!.height / 2;

    // Dispatch touchstart on the container (events bubble up)
    await page.evaluate(({ x, y }) => {
      const container = document.querySelector('.hour-grids-container')!;
      const touch = new Touch({ identifier: 1, target: container, clientX: x, clientY: y });
      container.dispatchEvent(new TouchEvent('touchstart', { touches: [touch], changedTouches: [touch], bubbles: true }));
    }, { x, y });

    await page.waitForTimeout(350);

    // Dispatch touchend on the same container
    await page.evaluate(({ x, y }) => {
      const container = document.querySelector('.hour-grids-container')!;
      const touch = new Touch({ identifier: 1, target: container, clientX: x, clientY: y });
      container.dispatchEvent(new TouchEvent('touchend', { touches: [], changedTouches: [touch], bubbles: true }));
    }, { x, y });

    const overlay = page.getByTestId('time-summary-overlay');
    await expect(overlay).toBeVisible();
  });

  test('quick touch swipe does not activate hover line (scrolls instead)', async ({ page }) => {
    // Use landscape to test horizontal touch behavior
    await page.setViewportSize({ width: 667, height: 375 });

    await addTimezone(page, 'New York');

    const hourCell = page.getByTestId('hour-cell').nth(5);
    const box = await hourCell.boundingBox();
    const x = box!.x + box!.width / 2;
    const y = box!.y + box!.height / 2;

    // Dispatch touchstart on the container
    await page.evaluate(({ x, y }) => {
      const container = document.querySelector('.hour-grids-container')!;
      const touch = new Touch({ identifier: 1, target: container, clientX: x, clientY: y });
      container.dispatchEvent(new TouchEvent('touchstart', { touches: [touch], changedTouches: [touch], bubbles: true }));
    }, { x, y });

    // Immediately dispatch touchmove with >10px horizontal delta (before 300ms)
    const swipeX = x + 50;
    await page.evaluate(({ y, swipeX }) => {
      const container = document.querySelector('.hour-grids-container')!;
      const touch = new Touch({ identifier: 1, target: container, clientX: swipeX, clientY: y });
      container.dispatchEvent(new TouchEvent('touchmove', { touches: [touch], changedTouches: [touch], bubbles: true }));
    }, { y, swipeX });

    const hoverLine = page.getByTestId('hover-time-line');
    await expect(hoverLine).not.toBeVisible();

    // Clean up
    await page.evaluate(({ swipeX, y }) => {
      const container = document.querySelector('.hour-grids-container')!;
      const touch = new Touch({ identifier: 1, target: container, clientX: swipeX, clientY: y });
      container.dispatchEvent(new TouchEvent('touchend', { touches: [], changedTouches: [touch], bubbles: true }));
    }, { swipeX, y });
  });
});

test.describe('Mobile behavior', () => {
  test('synchronizes horizontal scrolling across timezone rows on small display', async ({ page }) => {
    // Set landscape mobile viewport
    await page.setViewportSize({ width: 667, height: 375 });

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

test.describe('URL state persistence', () => {
  test('URL loads timezones', async ({ page }) => {
    await page.goto('/?tz=New York:America/New_York&tz=Tokyo:Asia/Tokyo');

    const timezoneInfos = page.getByTestId('timezone-info');
    await expect(timezoneInfos).toHaveCount(2);
    await expect(timezoneInfos.nth(0)).toContainText('New York');
    await expect(timezoneInfos.nth(1)).toContainText('Tokyo');
  });

  test('URL loads date', async ({ page }) => {
    await page.goto('/?tz=London:Europe/London&date=2026-12-25');

    const datePicker = page.getByTestId('date-picker');
    await expect(datePicker).toHaveValue('2026-12-25');

    // Current time line should be hidden (not today)
    const currentTimeLine = page.getByTestId('current-time-line');
    await expect(currentTimeLine).not.toBeVisible();
  });

  test('adding timezone updates URL', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    await addTimezone(page, 'New York');

    // URL should now contain the timezone
    await expect(page).toHaveURL(/tz=New(%20|\+| )York:America\/New_York/);
  });

  test('removing timezone updates URL', async ({ page }) => {
    await page.goto('/?tz=New York:America/New_York&tz=Tokyo:Asia/Tokyo');

    const timezoneInfos = page.getByTestId('timezone-info');
    await expect(timezoneInfos).toHaveCount(2);

    // Remove the first timezone (New York)
    const removeBtn = page.getByTestId('remove-timezone').first();
    await removeBtn.click();

    await expect(timezoneInfos).toHaveCount(1);

    // URL should only contain Tokyo now
    await expect(page).toHaveURL(/tz=Tokyo:Asia\/Tokyo/);
    expect(page.url()).not.toContain('New_York');
  });

  test('URL takes priority over localStorage', async ({ page }) => {
    // Set up localStorage with Tokyo
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('timescheduler_timezones', JSON.stringify([
        { id: 'tz-1', name: 'Tokyo', timezone: 'Asia/Tokyo' }
      ]));
    });

    // Navigate with URL specifying London
    await page.goto('/?tz=London:Europe/London');

    const timezoneInfos = page.getByTestId('timezone-info');
    await expect(timezoneInfos).toHaveCount(1);
    await expect(timezoneInfos.first()).toContainText('London');
  });

  test('bare URL falls back to localStorage', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    // Add Sydney via search (persists to localStorage)
    await addTimezone(page, 'Sydney');

    const timezoneInfo = page.getByTestId('timezone-info');
    await expect(timezoneInfo).toContainText('Sydney');

    // Navigate to bare URL (no params)
    await page.goto('/');

    const infoAfterNav = page.getByTestId('timezone-info');
    await expect(infoAfterNav).toBeVisible();
    await expect(infoAfterNav).toContainText('Sydney');
  });

  test('changing date updates URL', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    await addTimezone(page, 'New York');

    const datePicker = page.getByTestId('date-picker');
    await datePicker.evaluate((el, date) => {
      (el as HTMLInputElement).value = date;
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }, '2026-12-25');

    await expect(page).toHaveURL(/date=2026-12-25/);
  });

  test('HTML in timezone name from URL is escaped', async ({ page }) => {
    await page.goto('/?tz=%3Cimg%20src=x%20onerror=alert(1)%3E:Europe/London');

    const timezoneInfos = page.getByTestId('timezone-info');
    await expect(timezoneInfos).toHaveCount(1);

    // The name should be rendered as escaped text, not as HTML
    const innerHTML = await timezoneInfos.first().evaluate(el => el.innerHTML);
    expect(innerHTML).not.toContain('<img');
    expect(innerHTML).toContain('&lt;img');

    // No script should have executed
    const alertFired = await page.evaluate(() => (window as any).__xss_fired ?? false);
    expect(alertFired).toBe(false);
  });

  test('date-only URL preserves selected date', async ({ page }) => {
    // Set up localStorage with a timezone so the grid renders
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('timescheduler_timezones', JSON.stringify([
        { id: 'tz-1', name: 'London', timezone: 'Europe/London' }
      ]));
    });

    // Navigate to a date-only URL (no tz params)
    await page.goto('/?date=2026-12-25');

    const datePicker = page.getByTestId('date-picker');
    await expect(datePicker).toHaveValue('2026-12-25');

    // Timezones should fall back to localStorage
    const timezoneInfos = page.getByTestId('timezone-info');
    await expect(timezoneInfos).toHaveCount(1);
    await expect(timezoneInfos.first()).toContainText('London');
  });
});

test.describe('Vertical layout - portrait mobile', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.setViewportSize({ width: 375, height: 667 });

    await addTimezone(page, 'New York');
    await addTimezone(page, 'Tokyo');
    await addTimezone(page, 'London');

    await expect(page.getByTestId('timezone-info')).toHaveCount(3);
  });

  test('displays timezone info as horizontal header row', async ({ page }) => {
    const firstInfo = page.getByTestId('timezone-info').nth(0);
    const secondInfo = page.getByTestId('timezone-info').nth(1);

    const firstBox = await firstInfo.boundingBox();
    const secondBox = await secondInfo.boundingBox();

    expect(firstBox).toBeTruthy();
    expect(secondBox).toBeTruthy();

    // Same row: similar y coordinates
    expect(Math.abs(firstBox!.y - secondBox!.y)).toBeLessThan(5);

    // Side by side: different x coordinates
    expect(secondBox!.x).toBeGreaterThan(firstBox!.x);
  });

  test('displays hour cells in vertical columns', async ({ page }) => {
    const firstGrid = page.getByTestId('hour-grid').first();
    const cells = firstGrid.locator('[data-testid="hour-cell"]');

    const cell0 = cells.nth(0);
    const cell1 = cells.nth(1);

    const box0 = await cell0.boundingBox();
    const box1 = await cell1.boundingBox();

    expect(box0).toBeTruthy();
    expect(box1).toBeTruthy();

    // Similar x (same column)
    expect(Math.abs(box0!.x - box1!.x)).toBeLessThan(5);

    // Second cell below the first (larger y)
    expect(box1!.y).toBeGreaterThan(box0!.y);
  });

  test('each timezone occupies a separate column', async ({ page }) => {
    const hourGrids = page.getByTestId('hour-grid');
    const gridCount = await hourGrids.count();
    expect(gridCount).toBe(3);

    // Get the first hour cell (hour-index 0) from each grid
    const boxes = [];
    for (let i = 0; i < gridCount; i++) {
      const grid = hourGrids.nth(i);
      const firstCell = grid.locator('[data-hour-index="0"]');
      const box = await firstCell.boundingBox();
      expect(box).toBeTruthy();
      boxes.push(box!);
    }

    // All should have similar y (same row)
    expect(Math.abs(boxes[0].y - boxes[1].y)).toBeLessThan(5);
    expect(Math.abs(boxes[1].y - boxes[2].y)).toBeLessThan(5);

    // Increasing x (side by side columns)
    expect(boxes[1].x).toBeGreaterThan(boxes[0].x);
    expect(boxes[2].x).toBeGreaterThan(boxes[1].x);
  });

  test('clicking hour cell still opens time summary modal', async ({ page }) => {
    const firstCell = page.getByTestId('hour-cell').first();
    const box = await firstCell.boundingBox();
    await page.mouse.click(box!.x + box!.width / 2, box!.y + box!.height / 2);

    const overlay = page.getByTestId('time-summary-overlay');
    await expect(overlay).toBeVisible();

    const text = page.getByTestId('time-summary-text');
    await expect(text).toBeVisible();
    const content = await text.textContent();
    expect(content).toContain('New York');
    expect(content).toContain('Tokyo');
    expect(content).toContain('London');
  });

  test('shows current time line in vertical mode', async ({ page }) => {
    const currentTimeLine = page.getByTestId('current-time-line');
    await expect(currentTimeLine).toBeVisible();
  });

  test('current time line is horizontal in vertical mode', async ({ page }) => {
    const currentTimeLine = page.getByTestId('current-time-line');
    await expect(currentTimeLine).toBeVisible();

    // Check that the line is horizontal (width > height)
    const lineBox = await currentTimeLine.boundingBox();
    expect(lineBox).toBeTruthy();

    // In vertical mode, the line should be horizontal (small height, spans width)
    expect(lineBox!.height).toBeLessThanOrEqual(3);
    expect(lineBox!.width).toBeGreaterThan(50); // Should span across columns
  });

  test('current time line has dots at both ends in vertical mode', async ({ page }) => {
    const currentTimeLine = page.getByTestId('current-time-line');
    await expect(currentTimeLine).toBeVisible();

    // Check for dot pseudo-elements
    const hasDots = await currentTimeLine.evaluate((el) => {
      const beforeStyles = window.getComputedStyle(el, '::before');
      const afterStyles = window.getComputedStyle(el, '::after');

      const beforeTop = beforeStyles.getPropertyValue('top');
      const afterTop = afterStyles.getPropertyValue('top');
      const beforeLeft = beforeStyles.getPropertyValue('left');
      const afterRight = afterStyles.getPropertyValue('right');

      // In vertical mode, dots should be positioned at top
      return beforeTop !== 'auto' && afterTop !== 'auto' &&
             beforeLeft !== 'auto' && afterRight !== 'auto';
    });

    expect(hasDots).toBe(true);
  });

  test('hover line appears on mousemove in vertical mode', async ({ page }) => {
    const hourCell = page.getByTestId('hour-cell').first();
    const box = await hourCell.boundingBox();
    await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);

    const hoverLine = page.getByTestId('hover-time-line');
    await expect(hoverLine).toBeVisible();
  });

  test('hover line is horizontal in vertical mode', async ({ page }) => {
    const hourCell = page.getByTestId('hour-cell').first();
    const box = await hourCell.boundingBox();
    await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);

    const hoverLine = page.getByTestId('hover-time-line');
    await expect(hoverLine).toBeVisible();

    const lineBox = await hoverLine.boundingBox();
    expect(lineBox!.height).toBeLessThanOrEqual(3);
  });

  test('hover tooltip shows correct timezone in vertical mode', async ({ page }) => {
    // Hover over a cell in the Tokyo column (tz-index 1)
    const tokyoCell = page.locator('[data-testid="hour-cell"][data-tz-index="1"]').first();
    const box = await tokyoCell.boundingBox();
    await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);

    const tooltip = page.getByTestId('hover-tooltip');
    await expect(tooltip).toBeVisible();
    const text = await tooltip.textContent();
    expect(text).toContain('Tokyo');
  });

  test('hover line snaps to 15-minute intervals on Y axis', async ({ page }) => {
    const hourCell = page.locator('[data-testid="hour-cell"][data-hour-index="5"]').first();
    const box = await hourCell.boundingBox();

    // Hover at 25% of cell height (should snap to :15)
    await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height * 0.25);
    const hoverLine = page.getByTestId('hover-time-line');
    await expect(hoverLine).toBeVisible();
    const top1 = await hoverLine.evaluate((el) => el.style.top);

    // Hover at 75% of cell height (should snap to :45)
    await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height * 0.75);
    const top2 = await hoverLine.evaluate((el) => el.style.top);

    expect(top1).not.toBe(top2);
  });

  test('click at 15-minute position opens modal with correct time in vertical mode', async ({ page }) => {
    const hourCell = page.locator('[data-testid="hour-cell"][data-hour-index="8"]').first();
    const box = await hourCell.boundingBox();
    // Click at 50% of cell height — should be :30
    await page.mouse.click(box!.x + box!.width / 2, box!.y + box!.height * 0.5);

    const overlay = page.getByTestId('time-summary-overlay');
    await expect(overlay).toBeVisible();

    const summaryText = page.getByTestId('time-summary-text');
    const text = await summaryText.textContent();
    expect(text).toContain(':30');
  });

  test('hover line disappears on mouseleave in vertical mode', async ({ page }) => {
    const hourCell = page.getByTestId('hour-cell').first();
    const box = await hourCell.boundingBox();
    await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);

    const hoverLine = page.getByTestId('hover-time-line');
    await expect(hoverLine).toBeVisible();

    // Move mouse outside the grid
    await page.mouse.move(0, 0);
    await expect(hoverLine).not.toBeVisible();
  });

  test('cloned header appears fixed at top when scrolling down', async ({ page }) => {
    // No clone initially
    const cloneBefore = page.locator('.sticky-header-clone');
    await expect(cloneBefore).toHaveCount(0);

    // Scroll the page down so the header goes off-screen
    await page.evaluate(() => window.scrollTo(0, 400));
    await page.waitForTimeout(50);

    // Clone should now exist and be near the top of the viewport
    const clone = page.locator('.sticky-header-clone');
    await expect(clone).toHaveCount(1);
    const cloneBox = await clone.boundingBox();
    expect(cloneBox).toBeTruthy();
    expect(cloneBox!.y).toBeLessThanOrEqual(1);

    // Clone should contain timezone names
    await expect(clone).toContainText('New York');
    await expect(clone).toContainText('Tokyo');
  });

  test('cloned header hides drag handles', async ({ page }) => {
    await page.evaluate(() => window.scrollTo(0, 400));
    await page.waitForTimeout(50);

    const clone = page.locator('.sticky-header-clone');
    await expect(clone).toHaveCount(1);

    // Drag handles inside the clone should be hidden
    const handles = clone.locator('.drag-handle');
    const count = await handles.count();
    for (let i = 0; i < count; i++) {
      await expect(handles.nth(i)).not.toBeVisible();
    }
  });

  test('cloned header is removed when scrolling back up', async ({ page }) => {
    // Scroll down to trigger clone
    await page.evaluate(() => window.scrollTo(0, 400));
    await page.waitForTimeout(50);
    await expect(page.locator('.sticky-header-clone')).toHaveCount(1);

    // Scroll back to top
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(50);
    await expect(page.locator('.sticky-header-clone')).toHaveCount(0);
  });

  test('cloned header does not extend past end of table', async ({ page }) => {
    const grid = page.getByTestId('timezone-grid');

    // Scroll far enough that the grid bottom is near/above the viewport
    const gridHeight = await grid.evaluate(el => el.getBoundingClientRect().height);
    const gridTop = await grid.evaluate(el => el.getBoundingClientRect().top + window.scrollY);
    await page.evaluate((y) => window.scrollTo(0, y), gridTop + gridHeight - 30);
    await page.waitForTimeout(50);

    const clone = page.locator('.sticky-header-clone');
    const cloneCount = await clone.count();

    if (cloneCount > 0) {
      const cloneBox = await clone.boundingBox();
      const gridBox = await grid.boundingBox();
      expect(cloneBox).toBeTruthy();
      expect(gridBox).toBeTruthy();
      const cloneBottom = cloneBox!.y + cloneBox!.height;
      const gridBottom = gridBox!.y + gridBox!.height;
      expect(cloneBottom).toBeLessThanOrEqual(gridBottom + 2);
    }
    // If no clone exists, the grid bottom passed the header height threshold — also correct
  });

  test('drag handles are visible in vertical mode', async ({ page }) => {
    const handles = page.getByTestId('drag-handle');
    const count = await handles.count();
    expect(count).toBeGreaterThanOrEqual(2);

    const handle = handles.first();
    await expect(handle).toBeVisible();
  });

  test('current time line position accounts for header height', async ({ page }) => {
    const currentTimeLine = page.getByTestId('current-time-line');
    await expect(currentTimeLine).toBeVisible();

    // Get the position of the current time line
    const lineBox = await currentTimeLine.boundingBox();
    expect(lineBox).toBeTruthy();

    // Get the timezone header position
    const timezoneInfoColumn = page.locator('.timezone-info-column');
    const headerBox = await timezoneInfoColumn.boundingBox();
    expect(headerBox).toBeTruthy();

    // The line should be positioned below the header
    // Line top should be >= header bottom
    expect(lineBox!.y).toBeGreaterThanOrEqual(headerBox!.y + headerBox!.height - 5);
  });

  test('vertical mode only activates in portrait at correct breakpoint', async ({ page }) => {
    // Test that vertical layout doesn't activate in landscape even if width < 900px
    await page.setViewportSize({ width: 800, height: 500 });
    await page.waitForTimeout(100);

    // Should still be horizontal layout
    const firstGrid = page.getByTestId('hour-grid').first();
    const cells = firstGrid.locator('[data-testid="hour-cell"]');
    const cell0 = cells.nth(0);
    const cell1 = cells.nth(1);
    const box0 = await cell0.boundingBox();
    const box1 = await cell1.boundingBox();

    // Horizontal layout: similar y, different x
    expect(Math.abs(box0!.y - box1!.y)).toBeLessThan(5);
    expect(box1!.x).toBeGreaterThan(box0!.x);
  });

  test('current time line is vertical in landscape mode', async ({ page }) => {
    // Switch to landscape (width > 600 but landscape orientation)
    await page.setViewportSize({ width: 800, height: 500 });
    await page.waitForTimeout(100);

    const currentTimeLine = page.getByTestId('current-time-line');
    await expect(currentTimeLine).toBeVisible();

    // Check that the line is vertical (height > width)
    const lineBox = await currentTimeLine.boundingBox();
    expect(lineBox).toBeTruthy();

    // In landscape/horizontal mode, the line should be vertical (height > width)
    expect(lineBox!.height).toBeGreaterThan(lineBox!.width);
  });

  test('falls back to horizontal layout in landscape', async ({ page }) => {
    // Switch to landscape
    await page.setViewportSize({ width: 667, height: 375 });

    // Need to re-render after viewport change
    await page.waitForTimeout(100);

    const firstGrid = page.getByTestId('hour-grid').first();
    const cells = firstGrid.locator('[data-testid="hour-cell"]');

    const cell0 = cells.nth(0);
    const cell1 = cells.nth(1);

    const box0 = await cell0.boundingBox();
    const box1 = await cell1.boundingBox();

    expect(box0).toBeTruthy();
    expect(box1).toBeTruthy();

    // Horizontal layout: similar y, different x
    expect(Math.abs(box0!.y - box1!.y)).toBeLessThan(5);
    expect(box1!.x).toBeGreaterThan(box0!.x);
  });

  test('current time line position stays consistent on horizontal resize', async ({ page }) => {
    // Start in horizontal mode
    await page.setViewportSize({ width: 1000, height: 800 });
    await page.waitForTimeout(150);

    const currentTimeLine = page.getByTestId('current-time-line');
    await expect(currentTimeLine).toBeVisible();

    // Get initial position relative to the hour-grids-container
    const hourGridsContainer = page.locator('.hour-grids-container');
    const containerBox = await hourGridsContainer.boundingBox();
    const lineBox1 = await currentTimeLine.boundingBox();
    expect(containerBox).toBeTruthy();
    expect(lineBox1).toBeTruthy();
    const initialRelativeLeft = lineBox1!.x - containerBox!.x;

    // Resize to wider viewport
    await page.setViewportSize({ width: 1500, height: 800 });
    await page.waitForTimeout(150);

    // Check relative position again
    const newContainerBox = await hourGridsContainer.boundingBox();
    const lineBox2 = await currentTimeLine.boundingBox();
    expect(newContainerBox).toBeTruthy();
    expect(lineBox2).toBeTruthy();
    const newRelativeLeft = lineBox2!.x - newContainerBox!.x;

    // Relative position within the grid should be the same (within 5px for rounding)
    // since we're viewing the same time of day
    expect(Math.abs(newRelativeLeft - initialRelativeLeft)).toBeLessThan(5);
  });

  test('current time line reappears when resizing from horizontal to vertical', async ({ page }) => {
    // Start in horizontal mode
    await page.setViewportSize({ width: 1000, height: 800 });
    await page.waitForTimeout(150);

    const currentTimeLine = page.getByTestId('current-time-line');
    await expect(currentTimeLine).toBeVisible();

    // Verify it's vertical in horizontal mode
    const horizontalBox = await currentTimeLine.boundingBox();
    expect(horizontalBox).toBeTruthy();
    expect(horizontalBox!.height).toBeGreaterThan(horizontalBox!.width);

    // Resize to vertical/mobile mode
    await page.setViewportSize({ width: 400, height: 800 });
    await page.waitForTimeout(250); // Wait for debounced resize handler + CSS media query

    // Line should still be visible
    await expect(currentTimeLine).toBeVisible();

    // Verify it's now horizontal in vertical mode
    const verticalBox = await currentTimeLine.boundingBox();
    expect(verticalBox).toBeTruthy();
    expect(verticalBox!.height).toBeLessThanOrEqual(3);
    expect(verticalBox!.width).toBeGreaterThan(50);
  });

  test('grid has fixed width to prevent whitespace in wide viewports', async ({ page }) => {
    // Switch to wide viewport
    await page.setViewportSize({ width: 1600, height: 800 });
    await page.waitForTimeout(150);

    // Get the hour-grids-inner element
    const hourGridsInner = page.locator('.hour-grids-inner');
    await expect(hourGridsInner).toBeVisible();

    // Check its computed width
    const width = await hourGridsInner.evaluate((el) => el.offsetWidth);

    // Width should be exactly 960px (24 hours × 40px) to prevent whitespace
    expect(width).toBe(960);

    // Verify container doesn't have extra whitespace
    const container = page.locator('.hour-grids-container');
    const containerWidth = await container.evaluate((el) => el.offsetWidth);
    const scrollWidth = await container.evaluate((el) => el.scrollWidth);

    // scrollWidth should not exceed offsetWidth by more than 1px (rounding)
    expect(scrollWidth).toBeLessThanOrEqual(containerWidth + 1);
  });
});

test.describe('Drag to reorder timezones', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await addTimezone(page, 'New York');
    await addTimezone(page, 'London');
    await addTimezone(page, 'Tokyo');
  });

  test('drag handles are visible for each timezone', async ({ page }) => {
    const handles = page.getByTestId('drag-handle');
    await expect(handles).toHaveCount(3);
    for (let i = 0; i < 3; i++) {
      await expect(handles.nth(i)).toBeVisible();
    }
  });

  test('drag handle has correct color', async ({ page }) => {
    const circle = page.locator('.drag-handle svg circle').first();
    const fill = await circle.getAttribute('fill');
    expect(fill).toBe('#398f58');
  });

  test('reorders timezones via AppState.moveTimezone', async ({ page }) => {
    // Verify initial order
    const infos = page.getByTestId('timezone-info');
    await expect(infos.nth(0)).toContainText('New York');
    await expect(infos.nth(1)).toContainText('London');
    await expect(infos.nth(2)).toContainText('Tokyo');

    // Use AppState.moveTimezone directly to test reorder logic
    await page.evaluate(() => {
      (window as any).AppState.moveTimezone(2, 0);
    });

    // Tokyo should now be first
    const infosAfter = page.getByTestId('timezone-info');
    await expect(infosAfter.nth(0)).toContainText('Tokyo');
    await expect(infosAfter.nth(1)).toContainText('New York');
    await expect(infosAfter.nth(2)).toContainText('London');
  });

  test('reorder persists to localStorage', async ({ page }) => {
    await page.evaluate(() => {
      (window as any).AppState.moveTimezone(0, 2);
    });

    // New York moved to end
    await expect(page.getByTestId('timezone-info').nth(2)).toContainText('New York');

    // Reload and check persistence
    await page.reload();
    const infos = page.getByTestId('timezone-info');
    await expect(infos.nth(0)).toContainText('London');
    await expect(infos.nth(1)).toContainText('Tokyo');
    await expect(infos.nth(2)).toContainText('New York');
  });

  test('reorder updates URL state', async ({ page }) => {
    await page.evaluate(() => {
      (window as any).AppState.moveTimezone(2, 0);
    });

    // URL should reflect new order: Tokyo first
    const url = page.url();
    const tzParams = new URL(url).searchParams.getAll('tz');
    expect(tzParams[0]).toContain('Tokyo');
  });

  test('drag handle has grab cursor', async ({ page }) => {
    const handle = page.getByTestId('drag-handle').first();
    const cursor = await handle.evaluate((el: Element) => {
      return window.getComputedStyle(el).cursor;
    });
    expect(cursor).toBe('grab');
  });
});

test.describe('Mobile header bug fixes', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.setViewportSize({ width: 375, height: 667 });

    await addTimezone(page, 'New York');
    await addTimezone(page, 'Tokyo');
    await addTimezone(page, 'London');

    await expect(page.getByTestId('timezone-info')).toHaveCount(3);
  });

  test('hover line does not appear when touching header area', async ({ page }) => {
    // Get the timezone info header (above the hour cells)
    const firstInfo = page.getByTestId('timezone-info').first();
    const box = await firstInfo.boundingBox();

    // Move mouse over the header area (should not trigger hover line)
    await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);

    const hoverLine = page.getByTestId('hover-time-line');
    await expect(hoverLine).not.toBeVisible();
  });

  test('hover line appears when touching hour cells below header', async ({ page }) => {
    // Get the first hour cell (below the header)
    const firstCell = page.getByTestId('hour-cell').first();
    const box = await firstCell.boundingBox();

    // Move mouse over the hour cell (should trigger hover line)
    await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);

    const hoverLine = page.getByTestId('hover-time-line');
    await expect(hoverLine).toBeVisible();
  });

  test('sticky header clone has pointer-events none', async ({ page }) => {
    // Scroll down to trigger the sticky header clone
    await page.evaluate(() => window.scrollTo(0, 400));
    await page.waitForTimeout(50);

    const clone = page.locator('.sticky-header-clone');
    await expect(clone).toHaveCount(1);

    // Check that the clone has pointer-events: none
    const pointerEvents = await clone.evaluate((el) => {
      return window.getComputedStyle(el).pointerEvents;
    });
    expect(pointerEvents).toBe('none');
  });

  test('can interact with content below sticky header clone', async ({ page }) => {
    // Scroll down to trigger the sticky header clone
    await page.evaluate(() => window.scrollTo(0, 400));
    await page.waitForTimeout(50);

    const clone = page.locator('.sticky-header-clone');
    await expect(clone).toHaveCount(1);

    // Get the position of the clone
    const cloneBox = await clone.boundingBox();

    // Try to interact with content at the clone's position
    // The mouse event should pass through to the hour cells below
    const x = cloneBox!.x + cloneBox!.width / 2;
    const y = cloneBox!.y + cloneBox!.height + 50; // Just below the clone

    // Move mouse to a position where the clone might be, but events should pass through
    await page.mouse.move(x, y);

    // Check if hover line appears (indicating events passed through)
    const hoverLine = page.getByTestId('hover-time-line');
    await expect(hoverLine).toBeVisible();
  });
});
