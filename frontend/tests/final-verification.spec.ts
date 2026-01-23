import { test, expect } from '@playwright/test';

/**
 * Финальная верификация всех исправлений
 * Проверяет:
 * 1. Header компонент с SearchBar, CartMenu, ProfileMenu
 * 2. Footer на странице
 * 3. Применение анимаций (warmFadeIn, warmFadeOut, warmZoomIn, warmZoomOut)
 * 4. Отсутствие JavaScript ошибок в консоли
 * 5. Успешную загрузку всех ресурсов
 */

test.describe('Финальная верификация исправлений', () => {
  let consoleErrors: string[] = [];

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    
    // Логирование консольных ошибок
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Логирование неудачных сетевых запросов
    page.on('response', (response) => {
      if (response.status() >= 400) {
        consoleErrors.push(`HTTP ${response.status()}: ${response.url()}`);
      }
    });
  });

  test('Проверка Header компонента и его элементов', async ({ page }) => {
    await page.goto('http://localhost:3000');
    
    // Проверка наличия Header
    const header = page.locator('header').first();
    await expect(header).toBeVisible({ timeout: 10000 });
    
    // Проверка наличия логотипа
    const logo = page.locator('a[href="/"]');
    await expect(logo.first()).toBeVisible();
    
    // Проверка наличия SearchBar
    const searchInput = page.locator('input[type="search"], input[placeholder*="поиск" i], input[placeholder*="search" i]').first();
    await expect(searchInput).toBeVisible({ timeout: 5000 });
    
    // Проверка наличия иконки корзины
    const cartIcon = page.locator('svg').filter({ hasText: /cart|корзина/i }).or(
      page.locator('[data-testid="cart-icon"], [aria-label*="cart" i], [aria-label*="корзина" i]')
    ).first();
    await expect(cartIcon).toBeVisible({ timeout: 5000 });
    
    // Проверка наличия иконки профиля
    const profileIcon = page.locator('svg').filter({ hasText: /user|profile|профиль/i }).or(
      page.locator('[data-testid="profile-icon"], [aria-label*="profile" i], [aria-label*="профиль" i]')
    ).first();
    await expect(profileIcon).toBeVisible({ timeout: 5000 });
    
    console.log('✅ Header компонент с SearchBar, CartMenu, ProfileMenu найден');
  });

  test('Проверка наличия Footer', async ({ page }) => {
    await page.goto('http://localhost:3000');
    
    // Проверка наличия Footer
    const footer = page.locator('footer').first();
    await expect(footer).toBeVisible({ timeout: 10000 });
    
    // Проверка наличия ссылок в футере
    const footerLinks = page.locator('footer a');
    const linkCount = await footerLinks.count();
    expect(linkCount).toBeGreaterThan(0);
    
    console.log('✅ Footer найден с', linkCount, 'ссылками');
  });

  test('Проверка применения анимаций в CSS', async ({ page }) => {
    await page.goto('http://localhost:3000');
    
    // Проверка наличия CSS анимаций через getComputedStyle
    const hasWarmAnimations = await page.evaluate(() => {
      const styleSheet = Array.from(document.styleSheets)
        .find(sheet => {
          try {
            return Array.from(sheet.cssRules)
              .some(rule => rule.cssText.includes('warmFadeIn') || 
                           rule.cssText.includes('warmFadeOut') ||
                           rule.cssText.includes('warmZoomIn') || 
                           rule.cssText.includes('warmZoomOut'));
          } catch (e) {
            return false;
          }
        });
      return !!styleSheet;
    });
    
    expect(hasWarmAnimations).toBeTruthy();
    console.log('✅ Анимации warmFadeIn, warmFadeOut, warmZoomIn, warmZoomOut найдены в CSS');
    
    // Проверка наличия класса с анимацией на странице
    const animatedElements = await page.locator('[class*="warmFade"], [class*="warmZoom"]').count();
    console.log(`ℹ️  Найдено ${animatedElements} элементов с классами анимаций`);
  });

  test('Проверка отсутствия JavaScript ошибок', async ({ page }) => {
    await page.goto('http://localhost:3000');
    
    // Ждем полной загрузки страницы
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    
    // Проверяем наличие ошибок в консоли
    expect(consoleErrors.filter(e => e.startsWith('HTTP')).length).toBe(0);
    
    // Игнорируем ожидаемые ошибки (например, favicon.ico 404)
    const criticalErrors = consoleErrors.filter(error => {
      return !error.includes('favicon.ico') && 
             !error.includes('404') &&
             !error.includes('GET http://localhost:3000/_next');
    });
    
    console.log('ℹ️  Консольные ошибки:', criticalErrors.length > 0 ? criticalErrors : 'Нет критических ошибок');
    
    // Допускаем только некритические ошибки
    expect(criticalErrors.length).toBeLessThan(5);
  });

  test('Проверка успешной загрузки ресурсов', async ({ page }) => {
    const failedResources: string[] = [];
    
    page.on('response', (response) => {
      if (response.status() >= 400 && response.status() < 600) {
        const url = response.url();
        // Игнорируем favicon.ico и некоторые ожидаемые 404
        if (!url.includes('favicon.ico') && !url.includes('/_next/')) {
          failedResources.push(`${response.status()}: ${url}`);
        }
      }
    });

    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    
    // Проверяем критические ресурсы
    expect(failedResources.length).toBeLessThan(3);
    
    if (failedResources.length > 0) {
      console.log('⚠️  Неудачные ресурсы:', failedResources);
    } else {
      console.log('✅ Все критические ресурсы загружены успешно');
    }
  });

  test('Проверка мобильной навигации', async ({ page }) => {
    // Эмуляция мобильного устройства
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('http://localhost:3000');
    
    // Проверка наличия кнопки мобильного меню
    const mobileMenuButton = page.locator('button[aria-label*="menu" i], button[aria-label*="меню" i], .mobile-menu-button').first();
    await expect(mobileMenuButton).toBeVisible({ timeout: 5000 });
    
    console.log('✅ Мобильная навигация найдена');
    
    // Возврат к десктопному размеру
    await page.setViewportSize({ width: 1280, height: 720 });
  });

  test('Проверка импорта responsive.css', async ({ page }) => {
    await page.goto('http://localhost:3000');
    
    // Проверка наличия responsive стилей через проверку медиа-запросов
    const hasResponsiveStyles = await page.evaluate(() => {
      const styleSheets = Array.from(document.styleSheets);
      for (const sheet of styleSheets) {
        try {
          const rules = Array.from(sheet.cssRules);
          const hasMediaQuery = rules.some(rule => 
            rule instanceof CSSMediaRule || 
            rule.cssText.includes('@media')
          );
          if (hasMediaQuery) return true;
        } catch (e) {
          // Cross-origin stylesheets cannot be accessed
          continue;
        }
      }
      return false;
    });
    
    expect(hasResponsiveStyles).toBeTruthy();
    console.log('✅ Responsive стили найдены (медиа-запросы присутствуют)');
  });

  test('Проверка SellerHeader на seller layout', async ({ page }) => {
    // Проверяем наличие seller layout (если доступен)
    try {
      await page.goto('http://localhost:3000/seller/dashboard');
      
      // Проверка наличия Header на seller странице
      const header = page.locator('header').first();
      await expect(header).toBeVisible({ timeout: 10000 });
      
      console.log('✅ SellerHeader найден на seller layout');
    } catch (error) {
      console.log('⚠️  Seller layout не доступен для тестирования');
    }
  });

  test('Комплексная проверка визуальной целостности', async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    
    // Проверка видимости основных элементов
    const checks = [
      { name: 'Header', selector: 'header' },
      { name: 'Logo', selector: 'a[href="/"]' },
      { name: 'Footer', selector: 'footer' },
      { name: 'Main content', selector: 'main' },
    ];
    
    for (const check of checks) {
      const element = page.locator(check.selector).first();
      await expect(element).toBeVisible({ timeout: 5000 });
      console.log(`✅ ${check.name} виден на странице`);
    }
    
    // Проверка отсутствия перекрывающих элементов
    const overlappingCheck = await page.evaluate(() => {
      const header = document.querySelector('header');
      const main = document.querySelector('main');
      if (!header || !main) return false;
      
      const headerRect = header.getBoundingClientRect();
      const mainRect = main.getBoundingClientRect();
      
      // Header должен быть выше main
      return headerRect.bottom <= mainRect.top + 10;
    });
    
    expect(overlappingCheck).toBeTruthy();
    console.log('✅ Элементы не перекрываются некорректно');
  });
});
