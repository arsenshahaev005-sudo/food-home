# Отчет об исправлении ошибки запуска Django сервера

**Дата:** 23 января 2026  
**Задача:** Исправить ошибку запуска Django сервера, связанную с импортом из api.v1

---

## Описание проблемы

### Исходная ошибка
```
ImportError: cannot import name 'UserViewSet' from 'api.v1.users.views'
```

### Корневая причина
Django пытался импортировать ViewSets из `api/v1/`, но они еще не реализованы (файлы содержат только заглушки). Это происходило из-за того, что:

1. В [`backend/backend/urls.py`](backend/backend/urls.py:13) был активен роутинг `api/v1/`
2. В [`backend/api/v1/__init__.py`](backend/api/v1/__init__.py) были активны импорты всех модулей
3. Модули `api/v1/*/urls.py` пытались импортировать несуществующие ViewSets

### Дополнительная проблема (обнаружена при исправлении)
```
SystemCheckError: auth.User.groups: (fields.E304) Reverse accessor 'Group.user_set' for 'auth.User.groups' clashes with reverse accessor for 'users.User.groups'.
```

Конфликт между Django встроенной моделью `auth.User` и моделью `users.User` из приложения `apps.users`, которое было добавлено в `INSTALLED_APPS`.

---

## Выполненные исправления

### 1. Отключение api/v1/ роутинга

**Файл:** [`backend/backend/urls.py`](backend/backend/urls.py)

**Изменение:** Закомментирован роутинг для API v1
```python
urlpatterns = [
    path('admin/', admin.site.urls),
    # Keep old API routes for backward compatibility during migration
    path('api/', include('api.urls')),
    path('api/auth/', include('api.auth_urls')),
    # New API v1 structure - TODO: Раскомментировать после миграции
    # path('api/v1/', include('api.v1.urls')),
]
```

**Обоснование:** API v1 находится в разработке и не готов к использованию. Текущий API работает через существующие routes в `api/urls.py`.

---

### 2. Обновление документации api/v1/__init__.py

**Файл:** [`backend/api/v1/__init__.py`](backend/api/v1/__init__.py)

**Изменение:** Заменены активные импорты на документацию с примечанием о разработке
```python
"""
API v1 endpoints - В РАЗРАБОТКЕ

TODO: Эти endpoints будут активированы после завершения миграции.
См. docs/plans/architecture-reorganization-plan.md для деталей.

Новая структура api/v1/ создана как foundation для будущей миграции.
Она временно отключена в backend/backend/urls.py и будет активирована после:
- Переноса моделей в apps/
- Реализации serializers и views
- Миграции существующих endpoints

Текущий API работает через существующие routes в api/urls.py
"""

# Импорты временно закомментированы до завершения миграции
# from api.v1.users.urls import router as users_router
# ...
```

**Обоснование:** Документация явно указывает статус разработки и условия активации API v1.

---

### 3. Отключение apps.users из INSTALLED_APPS

**Файл:** [`backend/backend/settings.py`](backend/backend/settings.py)

**Изменение:** Закомментировано приложение `apps.users`
```python
INSTALLED_APPS = [
    # ... существующие приложения ...
    'api',
    # New domain-based apps - TODO: Раскомментировать после миграции
    # 'apps.users',  # Конфликт с auth.User - требует настройки AUTH_USER_MODEL
    'apps.catalog',
    'apps.orders',
    'apps.producers',
    'apps.cart',
    'apps.payments',
    'apps.gifts',
]
```

**Обоснование:** Модель `User` в `apps.users` конфликтует с Django встроенной моделью `auth.User`. Для использования кастомной модели пользователя необходимо настроить `AUTH_USER_MODEL` и выполнить полную миграцию, что является частью этапа 2 архитектурной реорганизации.

---

### 4. Обновление PROJECT_OPTIMIZATION_SUMMARY.md

**Файл:** [`PROJECT_OPTIMIZATION_SUMMARY.md`](PROJECT_OPTIMIZATION_SUMMARY.md)

**Изменение:** Добавлен раздел "Важно" с примечанием о api/v1/
```markdown
## Важно

### ⚠️ Важное примечание о api/v1/

Новая структура api/v1/ создана как foundation для будущей миграции.
Она временно отключена в urls.py и будет активирована после:
- Переноса моделей в apps/
- Реализации serializers и views
- Миграции существующих endpoints

Текущий API работает через существующие routes в api/urls.py

**Статус:** api/v1/ находится в разработке и не используется в production.
```

**Обоснование:** Документация должна явно указывать текущий статус компонентов проекта.

---

## Результаты

### Сервер запускается успешно

```
System check identified 11 issues (0 silenced).
```

**Примечание:** Остались только предупреждения (warnings) о `DEFAULT_AUTO_FIELD`, которые не критичны для запуска сервера.

### Flake8 проверка пройдена

```
flake8 backend/settings.py backend/urls.py api/v1/__init__.py --max-line-length=120
# Нет ошибок или предупреждений
```

---

## Измененные файлы

| Файл | Тип изменения | Описание |
|------|---------------|----------|
| [`backend/backend/urls.py`](backend/backend/urls.py) | Модификация | Закомментирован роутинг api/v1/ |
| [`backend/api/v1/__init__.py`](backend/api/v1/__init__.py) | Модификация | Добавлена документация, импорты закомментированы |
| [`backend/backend/settings.py`](backend/backend/settings.py) | Модификация | Закомментировано apps.users |
| [`PROJECT_OPTIMIZATION_SUMMARY.md`](PROJECT_OPTIMIZATION_SUMMARY.md) | Модификация | Добавлен раздел "Важно" |

---

## Следующие шаги

Для активации API v1 и `apps.users` необходимо:

1. **Настроить AUTH_USER_MODEL** в `settings.py`:
   ```python
   AUTH_USER_MODEL = 'users.User'
   ```

2. **Выполнить миграцию моделей** в `apps/` (Этап 2 архитектурной реорганизации)

3. **Реализовать serializers и views** в `api/v1/` (Этап 4 архитектурной реорганизации)

4. **Раскомментировать импорты** в соответствующих файлах после завершения миграции

---

## Заключение

Ошибка запуска Django сервера успешно исправлена. Сервер запускается и работает с существующим API через `api/urls.py`. Новая структура `api/v1/` подготовлена как foundation для будущей миграции и будет активирована после завершения соответствующих этапов архитектурной реорганизации.

**Статус:** ✅ Завершено  
**Сервер:** ✅ Запускается успешно  
**Lint:** ✅ Flake8 проверка пройдена
