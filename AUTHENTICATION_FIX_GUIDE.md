# Руководство по исправлению и тестированию системы аутентификации

## Обзор

Этот документ описывает исправления, внесённые в систему аутентификации проекта, и содержит инструкции по их тестированию.

## Исправленные проблемы

### 1. Backend исправления

#### 1.1. Настройки JWT (SIMPLE_JWT)
**Проблема:** Отсутствовала конфигурация `SIMPLE_JWT` для управления JWT токенами.

**Решение:** Добавлена полная конфигурация JWT в файл настроек Django:

```python
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=60),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'UPDATE_LAST_LOGIN': True,
    'ALGORITHM': 'HS256',
    'SIGNING_KEY': SECRET_KEY,
    'VERIFYING_KEY': None,
    'AUDIENCE': None,
    'ISSUER': None,
    'JWK_URL': None,
    'LEEWAY': 0,
    'AUTH_HEADER_TYPES': ('Bearer',),
    'AUTH_HEADER_NAME': 'HTTP_AUTHORIZATION',
    'USER_ID_FIELD': 'id',
    'USER_ID_CLAIM': 'user_id',
    'USER_AUTHENTICATION_RULE': 'rest_framework_simplejwt.authentication.default_user_authentication_rule',
    'AUTH_TOKEN_CLASSES': ('rest_framework_simplejwt.tokens.AccessToken',),
    'TOKEN_TYPE_CLAIM': 'token_type',
    'TOKEN_USER_CLASS': 'rest_framework_simplejwt.models.TokenUser',
    'JTI_CLAIM': 'jti',
    'SLIDING_TOKEN_REFRESH_EXP_CLAIM': 'refresh_exp',
    'SLIDING_TOKEN_LIFETIME': timedelta(minutes=60),
    'SLIDING_TOKEN_REFRESH_LIFETIME': timedelta(days=1),
}
```

**Преимущества:**
- Автоматическое обновление refresh токенов при каждом запросе
- Чёрный список для отозванных токенов
- Управление временем жизни токенов
- Обновление времени последнего входа пользователя

#### 1.2. Конфигурация CORS
**Проблема:** Неполная конфигурация CORS для работы с фронтендом.

**Решение:** Обновлена конфигурация CORS:

```python
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

CORS_ALLOW_CREDENTIALS = True

CORS_ALLOW_HEADERS = [
    'accept',
    'accept-encoding',
    'authorization',
    'content-type',
    'dnt',
    'origin',
    'user-agent',
    'x-csrftoken',
    'x-requested-with',
]
```

**Преимущества:**
- Поддержка работы с cookies (важно для refresh токенов)
- Разрешённые заголовки для JWT аутентификации
- Безопасная конфигурация для локальной разработки

#### 1.3. Добавление приложений в INSTALLED_APPS
**Проблема:** Отсутствовали необходимые приложения для JWT аутентификации.

**Решение:** Добавлены следующие приложения:

```python
INSTALLED_APPS = [
    ...
    'rest_framework_simplejwt',
    'rest_framework_simplejwt.token_blacklist',
    'apps.users',
]
```

**Миграции:** Применены миграции для `token_blacklist`:
- `0001_initial` - Создание таблиц для чёрного списка токенов
- `0002-0013` - Обновления структуры и оптимизации

### 2. Frontend исправления

#### 2.1. Утилита для работы с cookies (`cookieUtils.ts`)
**Проблема:** Отсутствовала централизованная утилита для управления cookies.

**Решение:** Создан файл `frontend/src/lib/utils/cookieUtils.ts`:

```typescript
export const getCookie = (name: string): string | undefined => {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift();
  return undefined;
};

export const setCookie = (
  name: string,
  value: string,
  days: number = 7
): void => {
  const expires = new Date();
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/`;
};

export const removeCookie = (name: string): void => {
  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/`;
};
```

**Функции:**
- `getCookie()` - Получение значения cookie по имени
- `setCookie()` - Установка cookie с указанием срока действия
- `removeCookie()` - Удаление cookie

#### 2.2. Утилита для автоматического обновления токенов (`tokenRefresh.ts`)
**Проблема:** Отсутствовал механизм автоматического обновления токенов.

**Решение:** Создан файл `frontend/src/lib/utils/tokenRefresh.ts`:

```typescript
import { getCookie, removeCookie } from './cookieUtils';

const REFRESH_TOKEN_COOKIE = 'refresh_token';
const ACCESS_TOKEN_COOKIE = 'access_token';

export const getAccessToken = (): string | undefined => {
  return getCookie(ACCESS_TOKEN_COOKIE);
};

export const getRefreshToken = (): string | undefined => {
  return getCookie(REFRESH_TOKEN_COOKIE);
};

export const setTokens = (accessToken: string, refreshToken: string): void => {
  setCookie(ACCESS_TOKEN_COOKIE, accessToken, 1 / 24); // 1 час
  setCookie(REFRESH_TOKEN_COOKIE, refreshToken, 7); // 7 дней
};

export const clearTokens = (): void => {
  removeCookie(ACCESS_TOKEN_COOKIE);
  removeCookie(REFRESH_TOKEN_COOKIE);
};

export const refreshAccessToken = async (): Promise<string | null> => {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    clearTokens();
    return null;
  }

  try {
    const response = await fetch('http://localhost:8000/api/v1/users/token/refresh/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ refresh: refreshToken }),
    });

    if (!response.ok) {
      clearTokens();
      return null;
    }

    const data = await response.json();
    setTokens(data.access, data.refresh);
    return data.access;
  } catch (error) {
    console.error('Ошибка обновления токена:', error);
    clearTokens();
    return null;
  }
};
```

**Функции:**
- `getAccessToken()` - Получение access токена из cookies
- `getRefreshToken()` - Получение refresh токена из cookies
- `setTokens()` - Сохранение обоих токенов в cookies
- `clearTokens()` - Очистка всех токенов
- `refreshAccessToken()` - Автоматическое обновление access токена

#### 2.3. Axios interceptor для автоматического обновления
**Проблема:** Отсутствовал механизм автоматического обновления токенов при истечении срока действия.

**Решение:** Создан файл `frontend/src/lib/api/axiosConfig.ts`:

```typescript
import axios from 'axios';
import { getAccessToken, refreshAccessToken, clearTokens } from '../utils/tokenRefresh';

const api = axios.create({
  baseURL: 'http://localhost:8000/api/v1',
  withCredentials: true,
});

api.interceptors.request.use(
  (config) => {
    const token = getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      const newToken = await refreshAccessToken();
      if (newToken) {
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } else {
        window.location.href = '/login';
      }
    }
    
    return Promise.reject(error);
  }
);

export default api;
```

**Функциональность:**
- Автоматическое добавление токена в заголовки запросов
- Перехват ошибок 401 (Unauthorized)
- Автоматическое обновление токена и повтор запроса
- Перенаправление на страницу входа при невозможности обновить токен

## Инструкции по тестированию

### Предварительные требования

1. **Backend:**
   - Python 3.9+
   - Django 4.2+
   - PostgreSQL или SQLite для разработки

2. **Frontend:**
   - Node.js 18+
   - React 18+
   - Axios для HTTP запросов

### Шаг 1: Запуск backend

```bash
cd backend

# Создание виртуального окружения (если не создано)
python -m venv venv

# Активация виртуального окружения
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# Установка зависимостей
pip install -r requirements.txt

# Применение миграций
python manage.py migrate

# Создание суперпользователя (для тестирования)
python manage.py createsuperuser

# Запуск сервера разработки
python manage.py runserver
```

Backend будет доступен по адресу: `http://localhost:8000`

### Шаг 2: Запуск frontend

```bash
cd frontend

# Установка зависимостей (если не установлены)
npm install

# Запуск сервера разработки
npm run dev
```

Frontend будет доступен по адресу: `http://localhost:3000`

### Шаг 3: Тестирование аутентификации

#### 3.1. Регистрация нового пользователя

**Метод:** POST `/api/v1/users/register/`

**Тело запроса:**
```json
{
  "phone": "+79001234567",
  "password": "securepassword123",
  "role": "customer"
}
```

**Ожидаемый ответ (200 OK):**
```json
{
  "success": true,
  "message": "Пользователь успешно зарегистрирован",
  "data": {
    "user": {
      "id": 1,
      "phone": "+79001234567",
      "role": "customer"
    },
    "tokens": {
      "access": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
      "refresh": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
    }
  }
}
```

**Проверка:**
- ✅ Пользователь создан в базе данных
- ✅ В ответе получены access и refresh токены
- ✅ Cookies установлены в браузере

#### 3.2. Вход в систему

**Метод:** POST `/api/v1/users/login/`

**Тело запроса:**
```json
{
  "phone": "+79001234567",
  "password": "securepassword123"
}
```

**Ожидаемый ответ (200 OK):**
```json
{
  "success": true,
  "message": "Вход выполнен успешно",
  "data": {
    "user": {
      "id": 1,
      "phone": "+79001234567",
      "role": "customer"
    },
    "tokens": {
      "access": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
      "refresh": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
    }
  }
}
```

**Проверка:**
- ✅ Успешная аутентификация
- ✅ Получены новые токены
- ✅ Cookies обновлены

#### 3.3. Доступ к защищённым ресурсам

**Метод:** GET `/api/v1/users/profile/`

**Заголовки:**
```
Authorization: Bearer <access_token>
```

**Ожидаемый ответ (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "phone": "+79001234567",
    "role": "customer",
    "first_name": "Иван",
    "last_name": "Иванов"
  }
}
```

**Проверка:**
- ✅ Доступ к защищённому ресурсу получен
- ✅ Данные пользователя возвращены корректно

#### 3.4. Тест автоматического обновления токена

1. Подождите 60 минут (или измените `ACCESS_TOKEN_LIFETIME` на 1 минуту для тестирования)
2. Попробуйте получить доступ к защищённому ресурсу
3. Система должна автоматически обновить токен и выполнить запрос

**Проверка:**
- ✅ Токен автоматически обновлён
- ✅ Запрос выполнен успешно без прерывания пользователя
- ✅ В консоли браузера нет ошибок аутентификации

#### 3.5. Выход из системы

**Метод:** POST `/api/v1/users/logout/`

**Заголовки:**
```
Authorization: Bearer <access_token>
```

**Тело запроса:**
```json
{
  "refresh": "<refresh_token>"
}
```

**Ожидаемый ответ (200 OK):**
```json
{
  "success": true,
  "message": "Выход выполнен успешно"
}
```

**Проверка:**
- ✅ Refresh токен добавлен в чёрный список
- ✅ Cookies удалены из браузера
- ✅ Попытка доступа к защищённым ресурсам возвращает 401

### Шаг 4: Тестирование с помощью Postman

#### 4.1. Настройка окружения в Postman

Создайте новое окружение со следующими переменными:
- `base_url`: `http://localhost:8000/api/v1`
- `access_token`: `{{access_token}}`
- `refresh_token`: `{{refresh_token}}`

#### 4.2. Тестирование через Postman

**Запрос 1: Регистрация**
```
POST {{base_url}}/users/register/
Content-Type: application/json

{
  "phone": "+79001234567",
  "password": "securepassword123",
  "role": "customer"
}
```

**Запрос 2: Вход**
```
POST {{base_url}}/users/login/
Content-Type: application/json

{
  "phone": "+79001234567",
  "password": "securepassword123"
}
```

**Запрос 3: Получение профиля**
```
GET {{base_url}}/users/profile/
Authorization: Bearer {{access_token}}
```

**Запрос 4: Обновление токена**
```
POST {{base_url}}/users/token/refresh/
Content-Type: application/json

{
  "refresh": "{{refresh_token}}"
}
```

**Запрос 5: Выход**
```
POST {{base_url}}/users/logout/
Authorization: Bearer {{access_token}}
Content-Type: application/json

{
  "refresh": "{{refresh_token}}"
}
```

### Шаг 5: Проверка чёрного списка токенов

1. Выполните выход из системы
2. Попробуйте использовать refresh токен для получения нового access токена

**Ожидаемый результат:**
- ✅ Запрос возвращает 401 Unauthorized
- ✅ Токен находится в чёрном списке в базе данных

**Проверка через Django Admin:**
1. Войдите в админку: `http://localhost:8000/admin/`
2. Перейдите в раздел "Token blacklist"
3. Проверьте наличие отозванных токенов

## Проверка после деплоя

### 1. Проверка конфигурации

- [ ] Проверить, что `SIMPLE_JWT` настроен в production
- [ ] Проверить, что `CORS_ALLOWED_ORIGINS` содержит домен production
- [ ] Проверить, что `SECRET_KEY` уникален для production
- [ ] Проверить, что `DEBUG = False` в production

### 2. Проверка миграций

```bash
python manage.py migrate
```

- [ ] Все миграции применены успешно
- [ ] Нет ошибок в выводе

### 3. Проверка работы токенов

- [ ] Регистрация работает корректно
- [ ] Вход работает корректно
- [ ] Обновление токена работает автоматически
- [ ] Выход работает корректно
- [ ] Чёрный список токенов работает

### 4. Проверка безопасности

- [ ] Токены хранятся в HttpOnly cookies
- [ ] Refresh токены вращаются (rotate)
- [ ] Отозванные токены находятся в чёрном списке
- [ ] CORS настроен правильно
- [ ] CSRF защита включена

### 5. Проверка производительности

- [ ] Время ответа API < 200ms
- [ ] Обновление токена происходит без задержек для пользователя
- [ ] Нет лишних запросов к базе данных

### 6. Мониторинг

- [ ] Настроен логирование ошибок аутентификации
- [ ] Настроен мониторинг неудачных попыток входа
- [ ] Настроены оповещения о проблемах с токенами

## Решение проблем

### Проблема: CORS ошибки

**Симптомы:**
- Ошибка в консоли браузера: `Access to XMLHttpRequest at '...' from origin '...' has been blocked by CORS policy`

**Решение:**
1. Проверьте `CORS_ALLOWED_ORIGINS` в настройках Django
2. Убедитесь, что домен фронтенда добавлен в список
3. Проверьте, что `CORS_ALLOW_CREDENTIALS = True`

### Проблема: Токен не обновляется автоматически

**Симптомы:**
- Пользователь вылетает из системы через час
- Ошибка 401 при попытке доступа к защищённым ресурсам

**Решение:**
1. Проверьте, что axios interceptor настроен правильно
2. Убедитесь, что `refreshAccessToken()` возвращает новый токен
3. Проверьте, что cookies доступны для чтения/записи

### Проблема: Refresh токен не работает после выхода

**Симптомы:**
- После выхода refresh токен всё ещё работает

**Решение:**
1. Проверьте, что `BLACKLIST_AFTER_ROTATION = True` в `SIMPLE_JWT`
2. Убедитесь, что endpoint `/logout/` добавляет токен в чёрный список
3. Проверьте, что `token_blacklist` приложение добавлено в `INSTALLED_APPS`

### Проблема: Ошибки миграций

**Симптомы:**
- Ошибка при выполнении `python manage.py migrate`

**Решение:**
1. Проверьте, что все зависимости установлены: `pip install -r requirements.txt`
2. Убедитесь, что `token_blacklist` добавлен в `INSTALLED_APPS`
3. Попробуйте сделать миграции заново:
   ```bash
   python manage.py migrate token_blacklist zero
   python manage.py migrate token_blacklist
   ```

## Дополнительные ресурсы

- [Django REST Framework Simple JWT Documentation](https://django-rest-framework-simplejwt.readthedocs.io/)
- [Django CORS Headers Documentation](https://pypi.org/project/django-cors-headers/)
- [Axios Interceptors Documentation](https://axios-http.com/docs/interceptors)

## Контакты

При возникновении проблем с аутентификацией обращайтесь к разработчику backend или создайте issue в репозитории проекта.

---

**Дата создания:** 2025-01-25  
**Версия:** 1.0  
**Статус:** ✅ Исправления применены, миграции выполнены
