import { test, expect, Page } from '@playwright/test';

// Список всех страниц для проверки
const pages = [
  { path: '/', name: 'Главная страница' },
  { path: '/auth/login', name: 'Вход в систему' },
  { path: '/auth/register', name: 'Регистрация' },
  { path: '/auth/forgot-password', name: 'Восстановление пароля' },
  { path: '/blog', name: 'Блог' },
  { path: '/cart', name: 'Корзина' },
  { path: '/categories', name: 'Категории' },
  { path: '/chat', name: 'Чат' },
  { path: '/dishes', name: 'Блюда' },
  { path: '/faq', name: 'FAQ' },
  { path: '/favorites', name: 'Избранное' },
  { path: '/my-gifts', name: 'Мои подарки' },
  { path: '/orders', name: 'Заказы' },
  { path: '/producers', name: 'Производители' },
  { path: '/profile', name: 'Профиль' },
  { path: '/legal/offer', name: 'Оферта' },
  { path: '/legal/privacy', name: 'Политика конфиденциальности' },
  { path: '/seller/seller', name: 'Панель продавца' },
];

// Размеры экранов для тестирования
const viewports = {
  desktop: { width: 1920, height: 1080 },
  tablet: { width: 768, height: 1024 },
  mobile: { width: 375, height: 667 },
};

// Функция для проверки наличия контейнера
async function checkContainerStructure(page: Page, path: string, viewportName: string) {
  const viewport = viewports[viewportName as keyof typeof viewports];
  await page.setViewportSize(viewport);

  // Ждем загрузки страницы
  await page.waitForLoadState('networkidle');

  // Получаем информацию о структуре страницы
  const pageInfo = await page.evaluate(() => {
    const body = document.body;
    const main = document.querySelector('main');
    const viewportWidth = window.innerWidth;

    // Проверяем наличие основных элементов
    const hasMain = !!main;
    
    // Проверяем наличие классов контейнера
    const mainClasses = main?.className || '';
    const hasContainerClass = mainClasses.includes('container') || 
                              mainClasses.includes('max-w-') ||
                              mainClasses.includes('mx-auto');
    
    // Проверяем наличие контейнера внутри main
    const containerInMain = main?.querySelector('.container, [class*="max-w-"], [class*="mx-auto"]');
    const hasContainerInMain = !!containerInMain;

    // Проверяем ширину контента
    const mainWidth = main?.getBoundingClientRect().width || 0;
    const contentWidthRatio = mainWidth / viewportWidth;

    // Находим элементы без контейнера
    const elementsWithoutContainer: { tag: string; classes: string; width: number; }[] = [];
    
    if (main) {
      const directChildren = Array.from(main.children);
      directChildren.forEach(child => {
        const rect = child.getBoundingClientRect();
        const classes = (child as HTMLElement).className;
        const hasContainer = classes.includes('container') || 
                            classes.includes('max-w-') ||
                            classes.includes('mx-auto');
        
        if (!hasContainer && rect.width > viewportWidth * 0.9) {
          elementsWithoutContainer.push({
            tag: child.tagName.toLowerCase(),
            classes: classes || 'no-classes',
            width: rect.width,
          });
        }
      });
    }

    // Получаем структуру DOM для анализа
    const domStructure = main?.outerHTML.substring(0, 500) || 'No main element';

    return {
      viewportWidth,
      hasMain,
      mainClasses,
      hasContainerClass,
      hasContainerInMain,
      mainWidth,
      contentWidthRatio,
      elementsWithoutContainer,
      domStructure,
      containerClasses: containerInMain?.className || 'none',
    };
  });

  return pageInfo;
}

// Функция для создания скриншота
async function takeScreenshot(page: Page, path: string, viewportName: string) {
  const viewport = viewports[viewportName as keyof typeof viewports];
  await page.setViewportSize(viewport);
  await page.waitForLoadState('networkidle');

  // Создаем безопасное имя файла
  const safePath = path.replace(/\//g, '-').replace(/^-/, '').replace(/-$/, '') || 'home';
  const filename = `screenshots/container-issues/${safePath}-${viewportName}.png`;

  // Создаем директорию если не существует
  await page.screenshot({
    path: filename,
    fullPage: true,
  });

  return filename;
}

test.describe('Container Layout Inspection', () => {
  // Создаем директорию для скриншотов перед запуском тестов
  test.beforeAll(async () => {
    const fs = require('fs');
    const path = require('path');
    const dir = path.join(process.cwd(), 'screenshots', 'container-issues');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });

  // Основной тест для проверки всех страниц
  test('Inspect all pages for container issues', async ({ page }) => {
    const results: any[] = [];

    for (const pageInfo of pages) {
      console.log(`\n=== Проверка страницы: ${pageInfo.name} (${pageInfo.path}) ===`);

      try {
        await page.goto(`http://localhost:3000${pageInfo.path}`, { waitUntil: 'networkidle' });

        // Проверяем структуру для каждого разрешения
        const viewportResults: any = {};
        
        for (const [viewportName] of Object.entries(viewports)) {
          console.log(`  Проверка для ${viewportName}...`);
          
          const info = await checkContainerStructure(page, pageInfo.path, viewportName);
          viewportResults[viewportName] = info;

          // Создаем скриншот
          const screenshotPath = await takeScreenshot(page, pageInfo.path, viewportName);
          console.log(`    Скриншот создан: ${screenshotPath}`);
        }

        // Сохраняем результаты для страницы
        results.push({
          path: pageInfo.path,
          name: pageInfo.name,
          viewports: viewportResults,
        });

      } catch (error) {
        console.error(`Ошибка при проверке страницы ${pageInfo.path}:`, error);
        results.push({
          path: pageInfo.path,
          name: pageInfo.name,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // Сохраняем результаты в JSON файл
    const fs = require('fs');
    const path = require('path');
    const resultsPath = path.join(process.cwd(), 'screenshots', 'container-issues', 'inspection-results.json');
    fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
    console.log(`\nРезультаты сохранены в: ${resultsPath}`);
  });

  // Детальный тест для каждой страницы с анализом DOM
  pages.forEach(pageInfo => {
    test(`Detailed analysis: ${pageInfo.name}`, async ({ page }) => {
      await page.goto(`http://localhost:3000${pageInfo.path}`, { waitUntil: 'networkidle' });

      // Desktop
      await page.setViewportSize(viewports.desktop);
      await page.waitForLoadState('networkidle');

      const desktopAnalysis = await page.evaluate(() => {
        const main = document.querySelector('main');
        if (!main) return { error: 'No main element found' };

        // Анализируем структуру
        const analysis = {
          mainTag: main.tagName,
          mainClasses: main.className,
          mainId: main.id,
          directChildrenCount: main.children.length,
          directChildren: Array.from(main.children).map(child => ({
            tag: child.tagName,
            classes: child.className,
            id: child.id,
            hasContainer: (child.className || '').includes('container') || 
                         (child.className || '').includes('max-w-') ||
                         (child.className || '').includes('mx-auto'),
            width: child.getBoundingClientRect().width,
          })),
          // Проверяем наличие контейнера
          hasContainer: main.querySelector('.container, [class*="max-w-"], [class*="mx-auto"]'),
          // Проверяем ширину
          mainWidth: main.getBoundingClientRect().width,
          viewportWidth: window.innerWidth,
        };

        return analysis;
      });

      console.log(`\n=== Анализ ${pageInfo.name} (Desktop) ===`);
      console.log(JSON.stringify(desktopAnalysis, null, 2));

      // Создаем скриншот с подсветкой проблемных зон
      await page.evaluate(() => {
        const main = document.querySelector('main');
        if (!main) return;

        // Подсвечиваем элементы без контейнера
        Array.from(main.children).forEach(child => {
          const classes = (child as HTMLElement).className || '';
          const hasContainer = classes.includes('container') || 
                              classes.includes('max-w-') ||
                              classes.includes('mx-auto');
          
          if (!hasContainer) {
            (child as HTMLElement).style.outline = '3px solid red';
            (child as HTMLElement).style.outlineOffset = '-3px';
          }
        });
      });

      const safePath = pageInfo.path.replace(/\//g, '-').replace(/^-/, '').replace(/-$/, '') || 'home';
      await page.screenshot({
        path: `screenshots/container-issues/${safePath}-desktop-highlighted.png`,
        fullPage: true,
      });
    });
  });

  // Проверка layout файлов
  test('Analyze layout structure', async ({ page }) => {
    // Проверяем главную страницу для анализа layout
    await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });

    const layoutAnalysis = await page.evaluate(() => {
      const body = document.body;
      const main = document.querySelector('main');
      const header = document.querySelector('header');
      const footer = document.querySelector('footer');

      return {
        bodyClasses: body.className,
        mainExists: !!main,
        mainClasses: main?.className || '',
        mainChildren: main ? Array.from(main.children).map(c => ({
          tag: c.tagName,
          classes: c.className,
          hasContainer: (c.className || '').includes('container') ||
                       (c.className || '').includes('max-w-') ||
                       (c.className || '').includes('mx-auto'),
        })) : [],
        headerClasses: header?.className || '',
        footerClasses: footer?.className || '',
        hasFooterContainer: footer?.querySelector('.container, [class*="max-w-"], [class*="mx-auto"]'),
      };
    });

    console.log('\n=== Анализ Layout ===');
    console.log(JSON.stringify(layoutAnalysis, null, 2));
  });
});
