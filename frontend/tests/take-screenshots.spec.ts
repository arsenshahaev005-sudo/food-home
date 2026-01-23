import { test } from '@playwright/test';

/**
 * Создание скриншотов после исправлений
 */

test.describe('Создание скриншотов после исправлений', () => {
  test('Desktop screenshot', async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    await page.screenshot({ path: 'screenshots/after-fixes/desktop-homepage.png', fullPage: true });
  });

  test('Mobile screenshot', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    await page.screenshot({ path: 'screenshots/after-fixes/mobile-homepage.png', fullPage: true });
  });

  test('Header close-up', async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    const header = page.locator('header').first();
    await header.screenshot({ path: 'screenshots/after-fixes/header-closeup.png' });
  });

  test('Footer close-up', async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    const footer = page.locator('footer').first();
    await footer.screenshot({ path: 'screenshots/after-fixes/footer-closeup.png' });
  });
});
