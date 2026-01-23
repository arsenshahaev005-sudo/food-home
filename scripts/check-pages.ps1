# Скрипт для проверки всех страниц сайта

$BASE_URL = "http://localhost:3000"
$REPORT_FILE = "FINAL_TEST_REPORT.md"

# Список всех страниц для проверки
$PAGES = @{
    # Основные страницы
    "/" = "Главная страница"
    "/dishes" = "Каталог блюд"
    "/cart" = "Корзина"
    "/profile" = "Профиль пользователя"
    "/favorites" = "Избранное"
    "/orders" = "Заказы"
    "/chat" = "Чат"
    "/producers" = "Производители"
    "/categories" = "Категории"
    # Контентные страницы
    "/blog" = "Блог"
    "/faq" = "FAQ"
    "/my-gifts" = "Мои подарки"
    # Юридические страницы
    "/legal/offer" = "Оферта"
    "/legal/privacy" = "Политика конфиденциальности"
    # Страницы аутентификации
    "/auth/login" = "Вход"
    "/auth/register" = "Регистрация"
    "/auth/forgot-password" = "Забыли пароль"
}

# Создаем отчет
$report = @"
# Финальный отчет о тестировании приложения

**Дата:** $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
**URL:** $BASE_URL

## Результаты проверки страниц

| Страница | Путь | HTTP статус | Статус |
|----------|------|-------------|--------|
"@

# Переменные для статистики
$TOTAL_PAGES = 0
$SUCCESS_PAGES = 0
$ERROR_PAGES = 0
$WARNING_PAGES = 0
$NOT_FOUND_PAGES = 0

# Проверяем каждую страницу
foreach ($path in $PAGES.Keys) {
    $name = $PAGES[$path]
    $TOTAL_PAGES++

    Write-Host "Проверка: $name ($path)"

    try {
        # Получаем HTTP статус
        $response = Invoke-WebRequest -Uri "$BASE_URL$path" -Method Head -TimeoutSec 10 -UseBasicParsing
        $status = $response.StatusCode

        # Определяем статус
        switch ($status) {
            200 {
                $statusText = "✅ Успешно"
                $SUCCESS_PAGES++
            }
            404 {
                $statusText = "❌ Не найдено"
                $NOT_FOUND_PAGES++
            }
            500 {
                $statusText = "❌ Ошибка сервера"
                $ERROR_PAGES++
            }
            429 {
                $statusText = "⚠️ Превышен лимит"
                $WARNING_PAGES++
            }
            default {
                $statusText = "⚠️ Статус: $status"
                $WARNING_PAGES++
            }
        }

        # Добавляем в таблицу
        $report += "`n| $name | ``$path`` | $status | $statusText |"

        # Сохраняем результат для детального анализа
        $script:pageResults[$path] = @{
            Name = $name
            Status = $status
            StatusText = $statusText
        }
    } catch {
        $status = 0
        $statusText = "❌ Ошибка соединения"
        $ERROR_PAGES++
        $report += "`n| $name | ``$path`` | Ошибка | $statusText |"
    }
}

# Добавляем статистику
$report += @"

## Статистика

- **Всего страниц:** $TOTAL_PAGES
- **Успешно:** $SUCCESS_PAGES
- **Не найдено:** $NOT_FOUND_PAGES
- **Ошибки сервера:** $ERROR_PAGES
- **Предупреждения:** $WARNING_PAGES
"@

# Добавляем вывод о работоспособности
$report += @"

## Общий вывод

"@

if ($ERROR_PAGES -eq 0 -and $NOT_FOUND_PAGES -eq 0) {
    $report += "✅ **Приложение работает стабильно.** Все страницы загружаются без критических ошибок."
} elseif ($ERROR_PAGES -gt 0) {
    $report += "❌ **Обнаружены критические ошибки.** Требуется немедленное исправление."
} else {
    $report += "⚠️ **Обнаружены проблемы.** Рекомендуется проверить страницы со статусом предупреждения."
}

# Добавляем рекомендации
$report += @"

## Рекомендации

"@

if ($NOT_FOUND_PAGES -gt 0) {
    $report += "- Проверьте маршрутизацию для страниц, возвращающих 404`n"
}

if ($ERROR_PAGES -gt 0) {
    $report += "- Проанализируйте логи сервера для страниц с ошибкой 500`n"
}

if ($WARNING_PAGES -gt 0) {
    $report += "- Проверьте страницы с предупреждениями на наличие проблем`n"
}

# Добавляем детальную информацию
$report += @"

## Детальная информация

"@

# Проверяем каждую страницу более детально
foreach ($path in $PAGES.Keys) {
    $name = $PAGES[$path]

    $report += "### $name (``$path``)`n`n"

    try {
        # Получаем HTML контент
        $response = Invoke-WebRequest -Uri "$BASE_URL$path" -TimeoutSec 10 -UseBasicParsing
        $content = $response.Content

        # Проверяем наличие контента
        if ($content.Length -gt 100) {
            $report += "- ✅ Страница содержит контент ($($content.Length) символов)`n"
        } else {
            $report += "- ⚠️ Недостаточно контента на странице ($($content.Length) символов)`n"
        }

        # Проверяем наличие основных элементов
        if ($content -match "<nav") {
            $report += "- ✅ Найден элемент навигации`n"
        } else {
            $report += "- ⚠️ Не найден элемент навигации`n"
        }

        if ($content -match "<header") {
            $report += "- ✅ Найден заголовок страницы`n"
        } else {
            $report += "- ⚠️ Не найден заголовок страницы`n"
        }

        if ($content -match "<footer") {
            $report += "- ✅ Найден футер страницы`n"
        } else {
            $report += "- ⚠️ Не найден футер страницы`n"
        }

        # Проверяем наличие ошибок в контенте
        if ($content -match "Error|error|Ошибка|ошибка") {
            $report += "- ⚠️ В контенте обнаружены сообщения об ошибках`n"
        }

        # Проверяем наличие скриптов
        if ($content -match "<script") {
            $scriptCount = ([regex]::Matches($content, "<script")).Count
            $report += "- ✅ Найдено скриптов: $scriptCount`n"
        }

        # Проверяем наличие стилей
        if ($content -match "<style" -or $content -match "stylesheet") {
            $report += "- ✅ Найдены стили`n"
        }

    } catch {
        $report += "- ❌ Ошибка при получении содержимого страницы`n"
    }

    $report += "`n"
}

# Сохраняем отчет
$report | Out-File -FilePath $REPORT_FILE -Encoding UTF8

Write-Host "Отчет сохранен в файл: $REPORT_FILE"
