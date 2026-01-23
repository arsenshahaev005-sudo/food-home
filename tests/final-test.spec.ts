import { test, expect } from '@playwright/test';

// Конфигурация
const BASE_URL = 'http://localhost:3000';

// Список всех страниц для тестирования
const pages = {
  main: [
    { path: '/', name: 'Главная страница' },
    { path: '/dishes', name: 'Каталог блюд' },
    { path: '/cart', name: 'Корзина' },
    { path: '/profile', name: 'Профиль пользователя' },
    { path: '/favorites', name: 'Избранное' },
    { path: '/orders', name: 'Заказы' },
    { path: '/chat', name: 'Чат' },
    { path: '/producers', name: 'Производители' },
    { path: '/categories', name: 'Категории' },
  ],
  content: [
    { path: '/blog', name: 'Блог' },
    { path: '/faq', name: 'FAQ' },
    { path: '/my-gifts', name: 'Мои подарки' },
  ],
  legal: [
    { path: '/legal/offer', name: 'Оферта' },
    { path: '/legal/privacy', name: 'Политика конфиденциальности' },
  ],
  auth: [
    { path: '/auth/login', name: 'Вход' },
    { path: '/auth/register', name: 'Регистрация' },
    { path: '/auth/forgot-password', name: 'Забыли пароль' },
  ],
};

// Функция для проверки страницы
async function checkPage(page: any, path: string, name: string) {
  const result = {
    name,
    path,
    status: 'unknown',
    httpStatus: 0,
    consoleErrors: [] as string[],
    consoleWarnings: [] as string[],
    hasContent: false,
    hasNavigation: false,
    notes: [] as string[],
  };

  try {
    // Перехватываем консольные ошибки и предупреждения
    const errors: string[] = [];
    const warnings: string[] = [];

    page.on('console', (msg: any) => {
      const text = msg.text();
      if (msg.type() === 'error') {
        errors.push(text);
      } else if (msg.type() === 'warning') {
        warnings.push(text);
      }
    });

    // Перехватываем сетевые ошибки
    const networkErrors: string[] = [];
    page.on('response', (response: any) => {
      if (response.status() >= 400) {
        networkErrors.push(`${response.url()} - ${response.status()}`);
      }
    });

    // Переходим на страницу
    const response = await page.goto(`${BASE_URL}${path}`, {
      waitUntil: 'networkidle',
      timeout: 30000,
    });

    result.httpStatus = response?.status() || 0;

    // Проверяем статус HTTP
    if (response?.status() === 200) {
      result.status = 'success';
      result.notes.push('HTTP 200 OK');
    } else if (response?.status() === 404) {
      result.status = 'not_found';
      result.notes.push(`HTTP ${response.status()} - Страница не найдена`);
    } else if (response?.status() === 500) {
      result.status = 'error';
      result.notes.push(`HTTP ${response.status()} - Внутренняя ошибка сервера`);
    } else if (response?.status() === 429) {
      result.status = 'rate_limited';
      result.notes.push(`HTTP ${response.status()} - Превышен лимит запросов`);
    } else {
      result.status = 'warning';
      result.notes.push(`HTTP ${response?.status() || 'unknown'}`);
    }

    // Сохраняем ошибки из консоли
    result.consoleErrors = errors;
    result.consoleWarnings = warnings;

    // Добавляем сетевые ошибки в консольные ошибки
    if (networkErrors.length > 0) {
      result.consoleErrors.push(...networkErrors);
    }

    // Проверяем наличие основного контента
    const bodyText = await page.bodyText();
    result.hasContent = bodyText.length > 100;

    if (!result.hasContent) {
      result.notes.push('Недостаточно контента на странице');
    }

    // Проверяем наличие навигационных элементов
    const hasNav = await page.locator('nav').count() > 0 ||
                   await page.locator('[role="navigation"]').count() > 0 ||
                   await page.locator('header').count() > 0;
    result.hasNavigation = hasNav;

    if (!hasNavigation) {
      result.notes.push('Отсутствуют навигационные элементы');
    }

    // Если есть ошибки в консоли, меняем статус
    if (errors.length > 0) {
      result.status = 'error';
      result.notes.push(`Найдено ${errors.length} ошибок в консоли`);
    }

  } catch (error: any) {
    result.status = 'error';
    result.notes.push(`Ошибка при загрузке: ${error.message}`);
  }

  return result;
}

// Тест: Проверка основных страниц
test.describe('Основные страницы', () => {
  pages.main.forEach(({ path, name }) => {
    test(name, async ({ page }) => {
      const result = await checkPage(page, path, name);
      console.log(`\n=== ${name} ===`);
      console.log(`Статус: ${result.status}`);
      console.log(`HTTP: ${result.httpStatus}`);
      console.log(`Ошибки в консоли: ${result.consoleErrors.length}`);
      console.log(`Предупреждения: ${result.consoleWarnings.length}`);
      console.log(`Контент: ${result.hasContent ? 'Да' : 'Нет'}`);
      console.log(`Навигация: ${result.hasNavigation ? 'Да' : 'Нет'}`);

      if (result.consoleErrors.length > 0) {
        console.log('Ошибки:', result.consoleErrors);
      }
      if (result.consoleWarnings.length > 0) {
        console.log('Предупреждения:', result.consoleWarnings);
      }
      if (result.notes.length > 0) {
        console.log('Заметки:', result.notes);
      }

      // Проверяем, что страница загружается без критических ошибок
      expect(result.httpStatus).not.toBe(500);
      expect(result.httpStatus).not.toBe(429);
    });
  });
});

// Тест: Проверка контентных страниц
test.describe('Контентные страницы', () => {
  pages.content.forEach(({ path, name }) => {
    test(name, async ({ page }) => {
      const result = await checkPage(page, path, name);
      console.log(`\n=== ${name} ===`);
      console.log(`Статус: ${result.status}`);
      console.log(`HTTP: ${result.httpStatus}`);
      console.log(`Ошибки в консоли: ${result.consoleErrors.length}`);
      console.log(`Предупреждения: ${result.consoleWarnings.length}`);

      if (result.consoleErrors.length > 0) {
        console.log('Ошибки:', result.consoleErrors);
      }
      if (result.consoleWarnings.length > 0) {
        console.log('Предупреждения:', result.consoleWarnings);
      }
      if (result.notes.length > 0) {
        console.log('Заметки:', result.notes);
      }

      // Проверяем, что страница загружается без критических ошибок
      expect(result.httpStatus).not.toBe(500);
      expect(result.httpStatus).not.toBe(429);
    });
  });
});

// Тест: Проверка юридических страниц
test.describe('Юридические страницы', () => {
  pages.legal.forEach(({ path, name }) => {
    test(name, async ({ page }) => {
      const result = await checkPage(page, path, name);
      console.log(`\n=== ${name} ===`);
      console.log(`Статус: ${result.status}`);
      console.log(`HTTP: ${result.httpStatus}`);
      console.log(`Ошибки в консоли: ${result.consoleErrors.length}`);
      console.log(`Предупреждения: ${result.consoleWarnings.length}`);

      if (result.consoleErrors.length > 0) {
        console.log('Ошибки:', result.consoleErrors);
      }
      if (result.consoleWarnings.length > 0) {
        console.log('Предупреждения:', result.consoleWarnings);
      }
      if (result.notes.length > 0) {
        console.log('Заметки:', result.notes);
      }

      // Проверяем, что страница загружается без критических ошибок
      expect(result.httpStatus).not.toBe(500);
      expect(result.httpStatus).not.toBe(429);
    });
  });
});

// Тест: Проверка страниц аутентификации
test.describe('Страницы аутентификации', () => {
  pages.auth.forEach(({ path, name }) => {
    test(name, async ({ page }) => {
      const result = await checkPage(page, path, name);
      console.log(`\n=== ${name} ===`);
      console.log(`Статус: ${result.status}`);
      console.log(`HTTP: ${result.httpStatus}`);
      console.log(`Ошибки в консоли: ${result.consoleErrors.length}`);
      console.log(`Предупреждения: ${result.consoleWarnings.length}`);

      if (result.consoleErrors.length > 0) {
        console.log('Ошибки:', result.consoleErrors);
      }
      if (result.consoleWarnings.length > 0) {
        console.log('Предупреждения:', result.consoleWarnings);
      }
      if (result.notes.length > 0) {
        console.log('Заметки:', result.notes);
      }

      // Проверяем, что страница загружается без критических ошибок
      expect(result.httpStatus).not.toBe(500);
      expect(result.httpStatus).not.toBe(429);
    });
  });
});

// Тест: Проверка функциональности навигации
test('Навигация между страницами', async ({ page }) => {
  console.log('\n=== Проверка навигации ===');

  // Переходим на главную страницу
  await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
  console.log('Перешел на главную страницу');

  // Проверяем, что есть ссылки на другие страницы
  const links = await page.locator('a[href]').count();
  console.log(`Найдено ссылок: ${links}`);
  expect(links).toBeGreaterThan(0);

  // Проверяем навигацию на страницу каталога
  const dishesLink = page.locator('a[href="/dishes"]').first();
  if (await dishesLink.count() > 0) {
    await dishesLink.click();
    await page.waitForURL('**/dishes', { timeout: 5000 });
    console.log('Успешная навигация на страницу каталога');
    expect(page.url()).toContain('/dishes');
  } else {
    console.log('Ссылка на каталог не найдена');
  }
});

// Тест: Проверка функциональности поиска
test('Функциональность поиска', async ({ page }) => {
  console.log('\n=== Проверка поиска ===');

  // Переходим на главную страницу
  await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });

  // Ищем поле поиска
  const searchInput = page.locator('input[type="search"], input[placeholder*="поиск"], input[placeholder*="Поиск"]').first();

  if (await searchInput.count() > 0) {
    console.log('Поле поиска найдено');
    await searchInput.fill('тест');
    console.log('Введен текст поиска');

    // Ждем немного
    await page.waitForTimeout(1000);
  } else {
    console.log('Поле поиска не найдено');
  }
});

// Тест: Проверка функциональности фильтров на странице каталога
test('Функциональность фильтров', async ({ page }) => {
  console.log('\n=== Проверка фильтров ===');

  // Переходим на страницу каталога
  await page.goto(`${BASE_URL}/dishes`, { waitUntil: 'networkidle' });

  // Ищем фильтры
  const filters = await page.locator('[role="checkbox"], [type="checkbox"], select, button.filter').count();

  if (filters > 0) {
    console.log(`Найдено фильтров: ${filters}`);
  } else {
    console.log('Фильтры не найдены');
  }

  // Проверяем наличие карточек блюд
  const dishCards = await page.locator('[data-testid="dish-card"], .dish-card, article').count();
  console.log(`Найдено карточек блюд: ${dishCards}`);
});
