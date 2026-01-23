const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

// Список всех страниц для проверки
const pages = [
  // Основные страницы
  { path: '/', name: 'Главная страница' },
  { path: '/dishes', name: 'Каталог блюд' },
  { path: '/cart', name: 'Корзина' },
  { path: '/profile', name: 'Профиль пользователя' },
  { path: '/favorites', name: 'Избранное' },
  { path: '/orders', name: 'Заказы' },
  { path: '/chat', name: 'Чат' },
  { path: '/producers', name: 'Производители' },
  { path: '/categories', name: 'Категории' },

  // Контентные страницы
  { path: '/blog', name: 'Блог' },
  { path: '/faq', name: 'FAQ' },
  { path: '/my-gifts', name: 'Мои подарки' },

  // Юридические страницы
  { path: '/legal/offer', name: 'Оферта' },
  { path: '/legal/privacy', name: 'Политика конфиденциальности' },

  // Страницы аутентификации
  { path: '/auth/login', name: 'Вход' },
  { path: '/auth/register', name: 'Регистрация' },
  { path: '/auth/forgot-password', name: 'Забыли пароль' },
];

// Результаты тестирования
const results = {
  timestamp: new Date().toISOString(),
  baseUrl: 'http://localhost:3000',
  pages: [],
  summary: {
    total: 0,
    passed: 0,
    failed: 0,
    warnings: 0,
    criticalErrors: 0,
    seriousErrors: 0,
    minorErrors: 0
  }
};

// Классификация ошибок
function classifyError(error) {
  const message = error.message || error.toString().toLowerCase();

  // Критические ошибки - блокирующие использование сайта
  if (message.includes('500') || 
      message.includes('internal server error') ||
      message.includes('network error') ||
      message.includes('failed to fetch') ||
      message.includes('connection refused') ||
      message.includes('timeout') ||
      message.includes('chunkload') ||
      message.includes('loading chunk')) {
    return 'critical';
  }

  // Серьезные ошибки - влияющие на функциональность
  if (message.includes('404') ||
      message.includes('401') ||
      message.includes('403') ||
      message.includes('429') ||
      message.includes('undefined is not') ||
      message.includes('cannot read') ||
      message.includes('cannot access') ||
      message.includes('is not a function') ||
      message.includes('is not defined')) {
    return 'serious';
  }

  // Некритические ошибки
  if (message.includes('warning') ||
      message.includes('deprecated') ||
      message.includes('react')) {
    return 'minor';
  }

  return 'minor';
}

// Проверка страницы
async function checkPage(page, pageInfo) {
  const url = `${results.baseUrl}${pageInfo.path}`;
  const pageResult = {
    path: pageInfo.path,
    name: pageInfo.name,
    url: url,
    httpStatus: null,
    loadTime: null,
    consoleErrors: [],
    consoleWarnings: [],
    networkErrors: [],
    hasCriticalContent: false,
    navigationElements: [],
    interactiveElements: [],
    errors: [],
    warnings: [],
    status: 'unknown'
  };

  console.log(`\n🔍 Проверка: ${pageInfo.name} (${pageInfo.path})`);

  try {
    // Ловим консольные ошибки и предупреждения
    const consoleMessages = [];
    page.on('console', msg => {
      const type = msg.type();
      const text = msg.text();
      const location = msg.location();

      consoleMessages.push({
        type: type,
        text: text,
        location: location ? `${location.url}:${location.lineNumber}` : 'unknown'
      });

      if (type === 'error') {
        pageResult.consoleErrors.push({
          text: text,
          location: location ? `${location.url}:${location.lineNumber}` : 'unknown'
        });
      } else if (type === 'warning') {
        pageResult.consoleWarnings.push({
          text: text,
          location: location ? `${location.url}:${location.lineNumber}` : 'unknown'
        });
      }
    });

    // Ловим сетевые ошибки
    page.on('response', response => {
      if (response.status() >= 400) {
        pageResult.networkErrors.push({
          url: response.url(),
          status: response.status(),
          statusText: response.statusText()
        });
      }
    });

    // Ловим ошибки страницы
    page.on('pageerror', error => {
      pageResult.errors.push({
        message: error.message,
        stack: error.stack
      });
    });

    // Замеряем время загрузки
    const startTime = Date.now();

    // Переходим на страницу
    const response = await page.goto(url, {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    const loadTime = Date.now() - startTime;
    pageResult.loadTime = loadTime;

    // Проверяем HTTP статус
    if (response) {
      pageResult.httpStatus = response.status();
      console.log(`   HTTP Статус: ${response.status()} ${response.statusText()}`);
    }

    // Ждем полной загрузки страницы
    await page.waitForLoadState('domcontentloaded', { timeout: 10000 }).catch(() => {});

    // Проверяем наличие основного контента
    const bodyContent = await page.textContent('body');
    pageResult.hasCriticalContent = bodyContent && bodyContent.length > 100;

    // Проверяем навигационные элементы
    try {
      const navLinks = await page.locator('nav a, header a').all();
      pageResult.navigationElements = navLinks.length;
      console.log(`   Навигационных элементов: ${navLinks.length}`);
    } catch (e) {
      console.log(`   Не удалось найти навигационные элементы`);
    }

    // Проверяем интерактивные элементы
    try {
      const buttons = await page.locator('button, a').all();
      pageResult.interactiveElements = buttons.length;
      console.log(`   Интерактивных элементов: ${buttons.length}`);
    } catch (e) {
      console.log(`   Не удалось найти интерактивные элементы`);
    }

    // Ждем немного для сбора всех консольных сообщений
    await page.waitForTimeout(2000);

    // Анализируем результаты
    const hasCriticalErrors = pageResult.consoleErrors.some(err => 
      classifyError({ message: err.text }) === 'critical'
    );
    const hasSeriousErrors = pageResult.consoleErrors.some(err => 
      classifyError({ message: err.text }) === 'serious'
    );
    const hasNetworkErrors = pageResult.networkErrors.length > 0;
    const hasPageErrors = pageResult.errors.length > 0;

    // Определяем статус страницы
    if (hasCriticalErrors || hasNetworkErrors || pageResult.httpStatus >= 500) {
      pageResult.status = 'failed';
      results.summary.failed++;
      results.summary.criticalErrors++;
      console.log(`   ❌ СТАТУС: FAILED (критические ошибки)`);
    } else if (hasSeriousErrors || hasPageErrors || pageResult.httpStatus >= 400) {
      pageResult.status = 'failed';
      results.summary.failed++;
      results.summary.seriousErrors++;
      console.log(`   ❌ СТАТУС: FAILED (серьезные ошибки)`);
    } else if (pageResult.consoleWarnings.length > 0) {
      pageResult.status = 'warning';
      results.summary.warnings++;
      results.summary.minorErrors++;
      console.log(`   ⚠️  СТАТУС: WARNING`);
    } else {
      pageResult.status = 'passed';
      results.summary.passed++;
      console.log(`   ✅ СТАТУС: PASSED`);
    }

    // Выводим ошибки и предупреждения
    if (pageResult.consoleErrors.length > 0) {
      console.log(`   📋 Ошибки в консоли (${pageResult.consoleErrors.length}):`);
      pageResult.consoleErrors.forEach(err => {
        const classification = classifyError({ message: err.text });
        console.log(`      [${classification.toUpperCase()}] ${err.text}`);
        if (err.location !== 'unknown') {
          console.log(`         📍 ${err.location}`);
        }
      });
    }

    if (pageResult.consoleWarnings.length > 0) {
      console.log(`   📋 Предупреждения в консоли (${pageResult.consoleWarnings.length}):`);
      pageResult.consoleWarnings.forEach(warn => {
        console.log(`      ${warn.text}`);
      });
    }

    if (pageResult.networkErrors.length > 0) {
      console.log(`   🌐 Сетевые ошибки (${pageResult.networkErrors.length}):`);
      pageResult.networkErrors.forEach(err => {
        console.log(`      ${err.status} ${err.statusText}: ${err.url}`);
      });
    }

    if (pageResult.errors.length > 0) {
      console.log(`   ⚠️  Ошибки страницы (${pageResult.errors.length}):`);
      pageResult.errors.forEach(err => {
        console.log(`      ${err.message}`);
      });
    }

    console.log(`   ⏱️  Время загрузки: ${loadTime}ms`);

  } catch (error) {
    pageResult.status = 'failed';
    pageResult.errors.push({
      message: error.message,
      stack: error.stack
    });
    results.summary.failed++;
    results.summary.criticalErrors++;
    console.log(`   ❌ СТАТУС: FAILED (ошибка загрузки)`);
    console.log(`   Ошибка: ${error.message}`);
  }

  results.pages.push(pageResult);
  results.summary.total++;
}

// Основная функция
async function runDiagnostics() {
  console.log('🚀 Начало диагностики сайта...\n');
  console.log(`📅 Дата: ${results.timestamp}`);
  console.log(`🌐 Базовый URL: ${results.baseUrl}\n`);

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });

  const page = await context.newPage();

  // Проверяем каждую страницу
  for (const pageInfo of pages) {
    await checkPage(page, pageInfo);
  }

  await browser.close();

  // Сохраняем результаты в файл
  const resultsPath = path.join(__dirname, 'diagnostic-results.json');
  fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
  console.log(`\n💾 Результаты сохранены в: ${resultsPath}`);

  // Выводим итоговую статистику
  console.log('\n' + '='.repeat(80));
  console.log('📊 ИТОГОВАЯ СТАТИСТИКА');
  console.log('='.repeat(80));
  console.log(`Всего проверено страниц: ${results.summary.total}`);
  console.log(`✅ Успешно: ${results.summary.passed}`);
  console.log(`❌ С ошибками: ${results.summary.failed}`);
  console.log(`⚠️  С предупреждениями: ${results.summary.warnings}`);
  console.log('');
  console.log('Классификация ошибок:');
  console.log(`   🔴 Критические: ${results.summary.criticalErrors}`);
  console.log(`   🟠 Серьезные: ${results.summary.seriousErrors}`);
  console.log(`   🟡 Некритические: ${results.summary.minorErrors}`);
  console.log('='.repeat(80));

  // Создаем текстовый отчет
  createTextReport(results);

  return results;
}

// Создание текстового отчета
function createTextReport(results) {
  let report = `
================================================================================
                    ОТЧЕТ О ДИАГНОСТИКЕ САЙТА
================================================================================

Дата проверки: ${results.timestamp}
Базовый URL: ${results.baseUrl}

================================================================================
                          СВОДНАЯ СТАТИСТИКА
================================================================================

Всего проверено страниц: ${results.summary.total}
✅ Успешно: ${results.summary.passed}
❌ С ошибками: ${results.summary.failed}
⚠️  С предупреждениями: ${results.summary.warnings}

Классификация ошибок:
   🔴 Критические (блокирующие): ${results.summary.criticalErrors}
   🟠 Серьезные (влияющие на функциональность): ${results.summary.seriousErrors}
   🟡 Некритические (не влияющие на основную функциональность): ${results.summary.minorErrors}

================================================================================
                      ДЕТАЛЬНЫЙ РЕЗУЛЬТАТЫ ПО СТРАНИЦАМ
================================================================================
`;

  results.pages.forEach((page, index) => {
    report += `
${index + 1}. ${page.name}
   URL: ${page.url}
   HTTP Статус: ${page.httpStatus || 'N/A'}
   Время загрузки: ${page.loadTime || 'N/A'}ms
   Статус: ${page.status.toUpperCase()}
   Навигационных элементов: ${page.navigationElements}
   Интерактивных элементов: ${page.interactiveElements}
`;

    if (page.consoleErrors.length > 0) {
      report += `   Ошибки в консоли (${page.consoleErrors.length}):\n`;
      page.consoleErrors.forEach(err => {
        const classification = classifyError({ message: err.text });
        report += `      [${classification.toUpperCase()}] ${err.text}\n`;
        if (err.location !== 'unknown') {
          report += `         📍 ${err.location}\n`;
        }
      });
    }

    if (page.consoleWarnings.length > 0) {
      report += `   Предупреждения в консоли (${page.consoleWarnings.length}):\n`;
      page.consoleWarnings.forEach(warn => {
        report += `      ${warn.text}\n`;
      });
    }

    if (page.networkErrors.length > 0) {
      report += `   Сетевые ошибки (${page.networkErrors.length}):\n`;
      page.networkErrors.forEach(err => {
        report += `      ${err.status} ${err.statusText}: ${err.url}\n`;
      });
    }

    if (page.errors.length > 0) {
      report += `   Ошибки страницы (${page.errors.length}):\n`;
      page.errors.forEach(err => {
        report += `      ${err.message}\n`;
        if (err.stack) {
          report += `         Stack: ${err.stack.split('\n')[0]}\n`;
        }
      });
    }

    report += '\n' + '-'.repeat(80) + '\n';
  });

  report += `
================================================================================
                          ОБЩИЙ ВЫВОД
================================================================================
`;

  if (results.summary.criticalErrors > 0) {
    report += `❌ НАЙДЕНЫ КРИТИЧЕСКИЕ ОШИБКИ, БЛОКИРУЮЩИЕ ИСПОЛЬЗОВАНИЕ САЙТА
Необходимо срочно исправить следующие проблемы:\n\n`;
    
    results.pages.filter(p => p.status === 'failed').forEach(page => {
      const criticalErrors = page.consoleErrors.filter(err => 
        classifyError({ message: err.text }) === 'critical'
      );
      if (criticalErrors.length > 0) {
        report += `   • ${page.name} (${page.path}):\n`;
        criticalErrors.forEach(err => {
          report += `     - ${err.text}\n`;
        });
      }
    });
  } else if (results.summary.seriousErrors > 0) {
    report += `⚠️  НАЙДЕНЫ СЕРЬЕЗНЫЕ ОШИБКИ, ВЛИЯЮЩИЕ НА ФУНКЦИОНАЛЬНОСТЬ
Рекомендуется исправить следующие проблемы:\n\n`;
    
    results.pages.filter(p => p.status === 'failed').forEach(page => {
      const seriousErrors = page.consoleErrors.filter(err => 
        classifyError({ message: err.text }) === 'serious'
      );
      if (seriousErrors.length > 0) {
        report += `   • ${page.name} (${page.path}):\n`;
        seriousErrors.forEach(err => {
          report += `     - ${err.text}\n`;
        });
      }
    });
  } else if (results.summary.warnings > 0) {
    report += `✅ САЙТ РАБОТАЕТ СТАБИЛЬНО, НО ЕСТЬ ПРЕДУПРЕЖДЕНИЯ
Рекомендуется обратить внимание на следующие моменты:\n\n`;
    
    results.pages.filter(p => p.status === 'warning').forEach(page => {
      report += `   • ${page.name} (${page.path}):\n`;
      page.consoleWarnings.forEach(warn => {
        report += `     - ${warn.text}\n`;
      });
    });
  } else {
    report += `✅ САЙТ РАБОТАЕТ ИДЕАЛЬНО
Ошибок и предупреждений не обнаружено. Все страницы загружаются корректно.
`;
  }

  report += `
================================================================================
`;
  
  const reportPath = path.join(__dirname, 'diagnostic-report.txt');
  fs.writeFileSync(reportPath, report);
  console.log(`📄 Текстовый отчет сохранен в: ${reportPath}`);
}

// Запуск диагностики
runDiagnostics().catch(console.error);
