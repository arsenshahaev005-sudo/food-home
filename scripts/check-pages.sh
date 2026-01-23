#!/bin/bash

# Скрипт для проверки всех страниц сайта

BASE_URL="http://localhost:3000"
REPORT_FILE="FINAL_TEST_REPORT.md"

# Список всех страниц для проверки
declare -A PAGES=(
  # Основные страницы
  ["/"]="Главная страница"
  ["/dishes"]="Каталог блюд"
  ["/cart"]="Корзина"
  ["/profile"]="Профиль пользователя"
  ["/favorites"]="Избранное"
  ["/orders"]="Заказы"
  ["/chat"]="Чат"
  ["/producers"]="Производители"
  ["/categories"]="Категории"
  # Контентные страницы
  ["/blog"]="Блог"
  ["/faq"]="FAQ"
  ["/my-gifts"]="Мои подарки"
  # Юридические страницы
  ["/legal/offer"]="Оферта"
  ["/legal/privacy"]="Политика конфиденциальности"
  # Страницы аутентификации
  ["/auth/login"]="Вход"
  ["/auth/register"]="Регистрация"
  ["/auth/forgot-password"]="Забыли пароль"
)

# Создаем отчет
echo "# Финальный отчет о тестировании приложения" > "$REPORT_FILE"
echo "" >> "$REPORT_FILE"
echo "**Дата:** $(date '+%Y-%m-%d %H:%M:%S')" >> "$REPORT_FILE"
echo "**URL:** $BASE_URL" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"
echo "## Результаты проверки страниц" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"
echo "| Страница | Путь | HTTP статус | Статус |" >> "$REPORT_FILE"
echo "|----------|------|-------------|--------|" >> "$REPORT_FILE"

# Переменные для статистики
TOTAL_PAGES=0
SUCCESS_PAGES=0
ERROR_PAGES=0
WARNING_PAGES=0
NOT_FOUND_PAGES=0

# Проверяем каждую страницу
for path in "${!PAGES[@]}"; do
  name="${PAGES[$path]}"
  TOTAL_PAGES=$((TOTAL_PAGES + 1))

  echo "Проверка: $name ($path)"

  # Получаем HTTP статус
  status=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL$path" --max-time 10)

  # Определяем статус
  if [ "$status" = "200" ]; then
    status_text="✅ Успешно"
    SUCCESS_PAGES=$((SUCCESS_PAGES + 1))
  elif [ "$status" = "404" ]; then
    status_text="❌ Не найдено"
    NOT_FOUND_PAGES=$((NOT_FOUND_PAGES + 1))
  elif [ "$status" = "500" ]; then
    status_text="❌ Ошибка сервера"
    ERROR_PAGES=$((ERROR_PAGES + 1))
  elif [ "$status" = "429" ]; then
    status_text="⚠️ Превышен лимит"
    WARNING_PAGES=$((WARNING_PAGES + 1))
  else
    status_text="⚠️ Статус: $status"
    WARNING_PAGES=$((WARNING_PAGES + 1))
  fi

  # Добавляем в таблицу
  echo "| $name | \`$path\` | $status | $status_text |" >> "$REPORT_FILE"
done

# Добавляем статистику
echo "" >> "$REPORT_FILE"
echo "## Статистика" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"
echo "- **Всего страниц:** $TOTAL_PAGES" >> "$REPORT_FILE"
echo "- **Успешно:** $SUCCESS_PAGES" >> "$REPORT_FILE"
echo "- **Не найдено:** $NOT_FOUND_PAGES" >> "$REPORT_FILE"
echo "- **Ошибки сервера:** $ERROR_PAGES" >> "$REPORT_FILE"
echo "- **Предупреждения:** $WARNING_PAGES" >> "$REPORT_FILE"

# Добавляем вывод о работоспособности
echo "" >> "$REPORT_FILE"
echo "## Общий вывод" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

if [ $ERROR_PAGES -eq 0 ] && [ $NOT_FOUND_PAGES -eq 0 ]; then
  echo "✅ **Приложение работает стабильно.** Все страницы загружаются без критических ошибок." >> "$REPORT_FILE"
elif [ $ERROR_PAGES -gt 0 ]; then
  echo "❌ **Обнаружены критические ошибки.** Требуется немедленное исправление." >> "$REPORT_FILE"
else
  echo "⚠️ **Обнаружены проблемы.** Рекомендуется проверить страницы со статусом предупреждения." >> "$REPORT_FILE"
fi

# Добавляем рекомендации
echo "" >> "$REPORT_FILE"
echo "## Рекомендации" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

if [ $NOT_FOUND_PAGES -gt 0 ]; then
  echo "- Проверьте маршрутизацию для страниц, возвращающих 404" >> "$REPORT_FILE"
fi

if [ $ERROR_PAGES -gt 0 ]; then
  echo "- Проанализируйте логи сервера для страниц с ошибкой 500" >> "$REPORT_FILE"
fi

if [ $WARNING_PAGES -gt 0 ]; then
  echo "- Проверьте страницы с предупреждениями на наличие проблем" >> "$REPORT_FILE"
fi

echo "" >> "$REPORT_FILE"
echo "## Детальная информация" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

# Проверяем каждую страницу более детально
for path in "${!PAGES[@]}"; do
  name="${PAGES[$path]}"

  echo "### $name (\`$path\`)" >> "$REPORT_FILE"
  echo "" >> "$REPORT_FILE"

  # Получаем HTML контент
  content=$(curl -s "$BASE_URL$path" --max-time 10)

  # Проверяем наличие контента
  if [ ${#content} -gt 100 ]; then
    echo "- ✅ Страница содержит контент (${#content} символов)" >> "$REPORT_FILE"
  else
    echo "- ⚠️ Недостаточно контента на странице (${#content} символов)" >> "$REPORT_FILE"
  fi

  # Проверяем наличие основных элементов
  if echo "$content" | grep -q "<nav"; then
    echo "- ✅ Найден элемент навигации" >> "$REPORT_FILE"
  else
    echo "- ⚠️ Не найден элемент навигации" >> "$REPORT_FILE"
  fi

  if echo "$content" | grep -q "<header"; then
    echo "- ✅ Найден заголовок страницы" >> "$REPORT_FILE"
  else
    echo "- ⚠️ Не найден заголовок страницы" >> "$REPORT_FILE"
  fi

  if echo "$content" | grep -q "<footer"; then
    echo "- ✅ Найден футер страницы" >> "$REPORT_FILE"
  else
    echo "- ⚠️ Не найден футер страницы" >> "$REPORT_FILE"
  fi

  echo "" >> "$REPORT_FILE"
done

echo "Отчет сохранен в файл: $REPORT_FILE"
