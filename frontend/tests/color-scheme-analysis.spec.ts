import { test, expect } from '@playwright/test';

/**
 * Анализ цветовой схемы всех страниц приложения
 * Извлекает computed styles для ключевых элементов
 * Создает скриншоты и документирует цветовую палитру
 */

interface ColorData {
  element: string;
  selector: string;
  backgroundColor: string;
  color: string;
  borderColor?: string;
}

interface PageColorScheme {
  page: string;
  url: string;
  colors: ColorData[];
  timestamp: string;
}

const pagesToAnalyze = [
  { name: 'Главная страница', url: '/' },
  { name: 'Профиль', url: '/profile' },
  { name: 'Категории', url: '/categories' },
  { name: 'Блюда', url: '/dishes' },
  { name: 'Корзина', url: '/cart' },
  { name: 'Заказы', url: '/orders' },
  { name: 'Избранное', url: '/favorites' },
  { name: 'Продавцы', url: '/producers' },
  { name: 'Блог', url: '/blog' },
  { name: 'FAQ', url: '/faq' },
  { name: 'Чат', url: '/chat' },
  { name: 'Мои подарки', url: '/my-gifts' },
  { name: 'Seller Dashboard', url: '/seller' },
  { name: 'Вход', url: '/auth/login' },
  { name: 'Регистрация', url: '/auth/register' },
];

const keyElements = [
  { name: 'Body', selector: 'body' },
  { name: 'Header', selector: 'header' },
  { name: 'Navigation', selector: 'nav' },
  { name: 'Main Content', selector: 'main' },
  { name: 'Footer', selector: 'footer' },
  { name: 'Primary Button', selector: 'button:has-text("Войти"), button:has-text("В корзину"), button:has-text("Оформить")' },
  { name: 'Card', selector: '.card, [class*="card"]' },
  { name: 'Link', selector: 'a' },
  { name: 'Input', selector: 'input[type="text"], input[type="email"], input[type="password"]' },
  { name: 'Text Heading', selector: 'h1, h2, h3' },
  { name: 'Text Paragraph', selector: 'p' },
];

test.describe('Анализ цветовой схемы', () => {
  const colorSchemes: PageColorScheme[] = [];

  test.beforeAll(async () => {
    console.log('Начало анализа цветовой схемы...');
  });

  for (const pageData of pagesToAnalyze) {
    test(`Анализ страницы: ${pageData.name}`, async ({ page }) => {
      console.log(`Анализ страницы: ${pageData.name} (${pageData.url})`);

      try {
        await page.goto(`http://localhost:3000${pageData.url}`, {
          waitUntil: 'networkidle',
          timeout: 30000,
        });

        // Ждем загрузки контента
        await page.waitForTimeout(1000);

        // Создаем директорию для скриншотов
        const screenshotDir = `screenshots/color-analysis/${pageData.name.replace(/\s+/g, '-').toLowerCase()}`;
        
        // Делаем полный скриншот страницы
        await page.screenshot({
          path: `${screenshotDir}/full-page.png`,
          fullPage: true,
        });

        // Делаем скриншот viewport
        await page.screenshot({
          path: `${screenshotDir}/viewport.png`,
        });

        // Извлекаем цвета для ключевых элементов
        const colors: ColorData[] = [];

        for (const element of keyElements) {
          try {
            const elementHandle = await page.locator(element.selector).first();
            const isVisible = await elementHandle.isVisible().catch(() => false);

            if (isVisible) {
              const computedStyle = await elementHandle.evaluate((el) => {
                const styles = window.getComputedStyle(el);
                return {
                  backgroundColor: styles.backgroundColor,
                  color: styles.color,
                  borderColor: styles.borderColor,
                };
              });

              colors.push({
                element: element.name,
                selector: element.selector,
                backgroundColor: computedStyle.backgroundColor,
                color: computedStyle.color,
                borderColor: computedStyle.borderColor,
              });
            }
          } catch (error) {
            // Элемент не найден на странице - пропускаем
            console.log(`  Элемент не найден: ${element.name}`);
          }
        }

        // Дополнительно извлекаем глобальные цвета из CSS переменных
        const cssVariables = await page.evaluate(() => {
          const styles = window.getComputedStyle(document.body);
          return {
            primaryColor: styles.getPropertyValue('--primary')?.trim() || 'N/A',
            secondaryColor: styles.getPropertyValue('--secondary')?.trim() || 'N/A',
            accentColor: styles.getPropertyValue('--accent')?.trim() || 'N/A',
            backgroundColor: styles.backgroundColor,
            textColor: styles.color,
          };
        });

        // Сохраняем данные о цветовой схеме
        colorSchemes.push({
          page: pageData.name,
          url: pageData.url,
          colors: colors,
          timestamp: new Date().toISOString(),
        });

        // Сохраняем данные в JSON файл для каждой страницы
        await page.evaluate((data) => {
          const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `color-scheme-${pageData.name.replace(/\s+/g, '-').toLowerCase()}.json`;
          a.click();
        }, {
          page: pageData.name,
          url: pageData.url,
          colors: colors,
          cssVariables: cssVariables,
          timestamp: new Date().toISOString(),
        });

        console.log(`  Проанализировано ${colors.length} элементов`);
        console.log(`  CSS переменные:`, cssVariables);

      } catch (error) {
        console.error(`Ошибка при анализе страницы ${pageData.name}:`, error);
        // Продолжаем анализ других страниц
      }
    });
  }

  test.afterAll(async () => {
    console.log('\n=== ИТОГОВЫЙ ОТЧЕТ ПО ЦВЕТОВОЙ СХЕМЕ ===\n');
    
    colorSchemes.forEach((scheme) => {
      console.log(`\nСтраница: ${scheme.page}`);
      console.log(`URL: ${scheme.url}`);
      console.log(`Время: ${scheme.timestamp}`);
      console.log(`Количество элементов: ${scheme.colors.length}`);
      
      scheme.colors.forEach((color) => {
        console.log(`  ${color.element}:`);
        console.log(`    Background: ${color.backgroundColor}`);
        console.log(`    Color: ${color.color}`);
        if (color.borderColor) {
          console.log(`    Border: ${color.borderColor}`);
        }
      });
    });

    console.log('\n=== АНАЛИЗ ЗАВЕРШЕН ===\n');
  });
});

test.describe('Сравнение цветов с оригиналом', () => {
  test('Извлечение цветов из globals.css', async ({ page }) => {
    await page.goto('http://localhost:3000/');

    const tailwindColors = await page.evaluate(() => {
      const styles = window.getComputedStyle(document.body);
      return {
        bodyBackground: styles.backgroundColor,
        bodyColor: styles.color,
      };
    });

    console.log('\n=== ЦВЕТА ИЗ TAILWIND/GLOBALS.CSS ===');
    console.log('Body Background:', tailwindColors.bodyBackground);
    console.log('Body Color:', tailwindColors.bodyColor);
  });
});
