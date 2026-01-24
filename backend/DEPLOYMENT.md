# Deployment Guide

Инструкция по развертыванию и настройке проекта Food Home.

---

## Содержание

1. [Требования](#требования)
2. [Установка](#установка)
3. [Настройка переменных окружения](#настройка-переменных-окружения)
4. [Применение миграций](#применение-миграций)
5. [Настройка cron для management команд](#настройка-cron-для-management-команд)
6. [Запуск сервера](#запуск-сервера)
7. [Рекомендации по безопасности](#рекомендации-по-безопасности)
8. [Мониторинг и логирование](#мониторинг-и-логирование)
9. [Резервное копирование](#резервное-копирование)

---

## Требования

### Системные требования

- **Операционная система:** Linux (Ubuntu 20.04+ рекомендовано)
- **Python:** 3.10+
- **PostgreSQL:** 14+
- **Redis:** 6+ (для кэширования и очередей задач)
- **Nginx:** 1.18+ (для обратного прокси и статических файлов)

### Программные зависимости

```bash
# Python зависимости
pip install -r requirements.txt

# Системные зависимости (Ubuntu/Debian)
sudo apt-get update
sudo apt-get install -y python3.10 python3.10-venv python3-pip
sudo apt-get install -y postgresql postgresql-contrib
sudo apt-get install -y redis-server
sudo apt-get install -y nginx
sudo apt-get install -y supervisor
```

---

## Установка

### 1. Клонирование репозитория

```bash
cd /var/www
git clone https://github.com/your-repo/food-home.git
cd food-home
```

### 2. Создание виртуального окружения

```bash
cd backend
python3.10 -m venv venv
source venv/bin/activate
```

### 3. Установка зависимостей

```bash
pip install --upgrade pip
pip install -r requirements.txt
```

### 4. Настройка PostgreSQL

```bash
# Создание базы данных
sudo -u postgres psql
```

```sql
CREATE DATABASE food_home;
CREATE USER food_home_user WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE food_home TO food_home_user;
\q
```

### 5. Настройка Redis

```bash
# Проверка статуса Redis
sudo systemctl status redis-server

# Запуск Redis
sudo systemctl start redis-server

# Автозапуск Redis
sudo systemctl enable redis-server
```

---

## Настройка переменных окружения

### Создание файла `.env`

Создайте файл `.env` в директории `backend/`:

```bash
cd backend
nano .env
```

### Пример файла `.env`

```env
# Django
SECRET_KEY=your-super-secret-key-change-this-in-production
DEBUG=False
ALLOWED_HOSTS=food-home.com,www.food-home.com,localhost

# Database
DB_ENGINE=django.db.backends.postgresql
DB_NAME=food_home
DB_USER=food_home_user
DB_PASSWORD=secure_password
DB_HOST=localhost
DB_PORT=5432

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0

# Email
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-email-password
DEFAULT_FROM_EMAIL=noreply@food-home.com

# Payment (Tinkoff)
TINKOFF_TERMINAL_KEY=your-terminal-key
TINKOFF_SECRET_KEY=your-secret-key
TINKOFF_API_URL=https://securepay.tinkoff.ru/v2

# SMS (Twilio или другой провайдер)
TWILIO_ACCOUNT_SID=your-account-sid
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_PHONE_NUMBER=+1234567890

# Storage (S3 или другой)
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_STORAGE_BUCKET_NAME=food-home-bucket
AWS_S3_REGION_NAME=eu-central-1

# Security
CORS_ALLOWED_ORIGINS=https://food-home.com,https://www.food-home.com
CSRF_TRUSTED_ORIGINS=https://food-home.com,https://www.food-home.com

# Logging
LOG_LEVEL=INFO
SENTRY_DSN=your-sentry-dsn
```

### Загрузка переменных окружения

```bash
# Для Linux/Mac
export $(cat .env | xargs)

# Или используйте python-dotenv (уже в requirements.txt)
# Django автоматически загрузит переменные из .env
```

---

## Применение миграций

### 1. Создание миграций

```bash
python manage.py makemigrations
```

### 2. Применение миграций

```bash
python manage.py migrate
```

### 3. Создание суперпользователя

```bash
python manage.py createsuperuser
```

### 4. Загрузка начальных данных (опционально)

```bash
# Загрузка категорий
python manage.py seed_categories

# Создание тестового администратора
python create_admin.py
```

### 5. Сбор статических файлов

```bash
python manage.py collectstatic --noinput
```

### 6. Резервное копирование миграций

```bash
# Создание бэкапа миграций
tar -czf migrations_backup_$(date +%Y%m%d).tar.gz api/migrations/
```

---

## Настройка cron для management команд

### 1. Редактирование crontab

```bash
crontab -e
```

### 2. Добавление задач в crontab

```bash
# Обработка просроченных заказов (каждые 5 минут)
*/5 * * * * cd /var/www/food-home/backend && source venv/bin/activate && python manage.py process_order_timeouts >> /var/log/food-home/order_timeouts.log 2>&1

# Обработка опозданий доставки (каждые 10 минут)
*/10 * * * * cd /var/www/food-home/backend && source venv/bin/activate && python manage.py process_late_deliveries >> /var/log/food-home/late_deliveries.log 2>&1

# Обновление статистики повторных покупок (каждую ночь в 2:00)
0 2 * * * cd /var/www/food-home/backend && source venv/bin/activate && python manage.py update_repeat_purchase_stats >> /var/log/food-home/repeat_purchase.log 2>&1

# Обработка истёкших подарков (каждый час)
0 * * * * cd /var/www/food-home/backend && source venv/bin/activate && python manage.py expire_gifts >> /var/log/food-home/expire_gifts.log 2>&1

# Очистка событий Outbox (каждый час)
0 * * * * cd /var/www/food-home/backend && source venv/bin/activate && python manage.py cleanup_outbox_events >> /var/log/food-home/cleanup_outbox.log 2>&1

# Принудительная отмена истёкших заказов (каждые 15 минут)
*/15 * * * * cd /var/www/food-home/backend && source venv/bin/activate && python manage.py auto_cancel_expired_orders >> /var/log/food-home/auto_cancel.log 2>&1

# Принудительное соблюдение SLA приготовления (каждые 5 минут)
*/5 * * * * cd /var/www/food-home/backend && source venv/bin/activate && python manage.py enforce_cooking_sla >> /var/log/food-home/cooking_sla.log 2>&1

# Принудительное соблюдение SLA доставки (каждые 5 минут)
*/5 * * * * cd /var/www/food-home/backend && source venv/bin/activate && python manage.py enforce_delivery_sla >> /var/log/food-home/delivery_sla.log 2>&1

# Очистка idempotency ключей подарков (каждый день в 3:00)
0 3 * * * cd /var/www/food-home/backend && source venv/bin/activate && python manage.py cleanup_gift_idempotency >> /var/log/food-home/cleanup_idempotency.log 2>&1

# Резервное копирование базы данных (каждый день в 4:00)
0 4 * * * pg_dump -U food_home_user food_home | gzip > /backups/food_home_$(date +\%Y\%m\%d).sql.gz
```

### 3. Создание директории для логов

```bash
sudo mkdir -p /var/log/food-home
sudo chown $USER:$USER /var/log/food-home
sudo chmod 755 /var/log/food-home
```

### 4. Создание директории для бэкапов

```bash
sudo mkdir -p /backups
sudo chown $USER:$USER /backups
sudo chmod 755 /backups
```

### 5. Проверка cron задач

```bash
# Просмотр списка задач
crontab -l

# Просмотр логов
tail -f /var/log/food-home/order_timeouts.log
```

---

## Запуск сервера

### 1. Запуск с Gunicorn (Production)

```bash
# Установка Gunicorn
pip install gunicorn

# Запуск сервера
gunicorn config.wsgi:application --bind 0.0.0.0:8000 --workers 4 --timeout 120
```

### 2. Настройка Supervisor

Создайте файл конфигурации:

```bash
sudo nano /etc/supervisor/conf.d/food-home.conf
```

```ini
[program:food-home]
command=/var/www/food-home/backend/venv/bin/gunicorn config.wsgi:application --bind 0.0.0.0:8000 --workers 4 --timeout 120
directory=/var/www/food-home/backend
user=www-data
autostart=true
autorestart=true
redirect_stderr=true
stdout_logfile=/var/log/food-home/gunicorn.log
environment=PATH="/var/www/food-home/backend/venv/bin"
```

Запуск Supervisor:

```bash
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl start food-home
```

### 3. Настройка Nginx

Создайте файл конфигурации:

```bash
sudo nano /etc/nginx/sites-available/food-home
```

```nginx
upstream food_home {
    server 127.0.0.1:8000;
}

server {
    listen 80;
    server_name food-home.com www.food-home.com;

    # Перенаправление на HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name food-home.com www.food-home.com;

    # SSL сертификаты (Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/food-home.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/food-home.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Логи
    access_log /var/log/nginx/food-home-access.log;
    error_log /var/log/nginx/food-home-error.log;

    # Статические файлы
    location /static/ {
        alias /var/www/food-home/backend/static/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # Media файлы
    location /media/ {
        alias /var/www/food-home/backend/media/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # API
    location /api/ {
        proxy_pass http://food_home;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 120s;
        proxy_send_timeout 120s;
        proxy_read_timeout 120s;
    }

    # Health check
    location /health/ {
        proxy_pass http://food_home;
        access_log off;
    }
}
```

Активация конфигурации:

```bash
sudo ln -s /etc/nginx/sites-available/food-home /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 4. Получение SSL сертификата (Let's Encrypt)

```bash
sudo apt-get install certbot python3-certbot-nginx
sudo certbot --nginx -d food-home.com -d www.food-home.com
```

Автоматическое обновление сертификата:

```bash
sudo certbot renew --dry-run
```

---

## Рекомендации по безопасности

### 1. Защита SECRET_KEY

```bash
# Генерация случайного SECRET_KEY
python -c 'from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())'
```

### 2. Настройка HTTPS

- Используйте HTTPS для всех соединений
- Настройте HSTS (HTTP Strict Transport Security)
- Используйте актуальные SSL/TLS протоколы

### 3. Защита от CSRF и XSS

```python
# settings.py
CSRF_COOKIE_SECURE = True
CSRF_COOKIE_HTTPONLY = True
CSRF_COOKIE_SAMESITE = 'Strict'

SESSION_COOKIE_SECURE = True
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = 'Strict'
```

### 4. Ограничение CORS

```python
# settings.py
CORS_ALLOWED_ORIGINS = [
    'https://food-home.com',
    'https://www.food-home.com',
]

CORS_ALLOW_CREDENTIALS = True
```

### 5. Настройка брандмауэра (UFW)

```bash
# Разрешить SSH
sudo ufw allow 22/tcp

# Разрешить HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Включить брандмауэр
sudo ufw enable

# Проверка статуса
sudo ufw status
```

### 6. Защита от DDoS

```nginx
# nginx.conf
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=general_limit:10m rate=30r/s;

server {
    # ... остальные настройки ...

    # Ограничение для API
    location /api/ {
        limit_req zone=api_limit burst=20 nodelay;
        # ... остальные настройки ...
    }

    # Ограничение для остальных запросов
    location / {
        limit_req zone=general_limit burst=50 nodelay;
        # ... остальные настройки ...
    }
}
```

### 7. Настройка безопасности PostgreSQL

```bash
# /etc/postgresql/14/main/pg_hba.conf
# Замените "trust" на "scram-sha-256" или "md5"

# Перезапуск PostgreSQL
sudo systemctl restart postgresql
```

### 8. Регулярное обновление

```bash
# Обновление системы
sudo apt-get update
sudo apt-get upgrade -y

# Обновление Python зависимостей
pip install --upgrade pip
pip install --upgrade -r requirements.txt
```

### 9. Резервное копирование

```bash
# Скрипт бэкапа базы данных
#!/bin/bash
BACKUP_DIR="/backups"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="food_home"
DB_USER="food_home_user"

pg_dump -U $DB_USER $DB_NAME | gzip > $BACKUP_DIR/food_home_$DATE.sql.gz

# Удаление старых бэкапов (старше 7 дней)
find $BACKUP_DIR -name "food_home_*.sql.gz" -mtime +7 -delete
```

### 10. Мониторинг безопасности

```bash
# Установка fail2ban
sudo apt-get install fail2ban

# Настройка fail2ban
sudo nano /etc/fail2ban/jail.local
```

```ini
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[nginx-http-auth]
enabled = true
filter = nginx-http-auth
port = http,https
logpath = /var/log/nginx/error.log
```

---

## Мониторинг и логирование

### 1. Настройка логирования Django

```python
# settings.py
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'file': {
            'level': 'INFO',
            'class': 'logging.FileHandler',
            'filename': '/var/log/food-home/django.log',
            'formatter': 'verbose',
        },
    },
    'root': {
        'handlers': ['file'],
        'level': 'INFO',
    },
}
```

### 2. Настройка Sentry для отслеживания ошибок

```python
# settings.py
import sentry_sdk
from sentry_sdk.integrations.django import DjangoIntegration

sentry_sdk.init(
    dsn=os.environ.get('SENTRY_DSN'),
    integrations=[DjangoIntegration()],
    traces_sample_rate=0.1,
    send_default_pii=False
)
```

### 3. Мониторинг с Prometheus

```bash
# Установка django-prometheus
pip install django-prometheus
```

```python
# settings.py
INSTALLED_APPS = [
    # ...
    'django_prometheus',
    # ...
]

MIDDLEWARE = [
    'django_prometheus.middleware.PrometheusBeforeMiddleware',
    # ...
    'django_prometheus.middleware.PrometheusAfterMiddleware',
]

# urls.py
from django.urls import path, include

urlpatterns = [
    # ...
    path('', include('django_prometheus.urls')),
]
```

### 4. Проверка логов

```bash
# Django логи
tail -f /var/log/food-home/django.log

# Gunicorn логи
tail -f /var/log/food-home/gunicorn.log

# Nginx логи
tail -f /var/log/nginx/food-home-access.log
tail -f /var/log/nginx/food-home-error.log

# Cron задачи
tail -f /var/log/food-home/order_timeouts.log
tail -f /var/log/food-home/late_deliveries.log
```

---

## Резервное копирование

### 1. Бэкап базы данных

```bash
# Полный бэкап
pg_dump -U food_home_user food_home | gzip > food_home_backup.sql.gz

# Бэкап только схемы
pg_dump -U food_home_user --schema-only food_home > food_home_schema.sql

# Бэкап только данных
pg_dump -U food_home_user --data-only food_home > food_home_data.sql
```

### 2. Восстановление базы данных

```bash
# Создание новой базы данных
createdb -U food_home_user food_home_restored

# Восстановление из бэкапа
gunzip -c food_home_backup.sql.gz | psql -U food_home_user food_home_restored
```

### 3. Бэкап медиа файлов

```bash
# Бэкап медиа файлов
tar -czf media_backup_$(date +%Y%m%d).tar.gz media/
```

### 4. Автоматический бэкап (cron)

```bash
# Добавить в crontab
0 4 * * * cd /var/www/food-home/backend && pg_dump -U food_home_user food_home | gzip > /backups/food_home_$(date +\%Y\%m\%d).sql.gz
0 5 * * * cd /var/www/food-home/backend && tar -czf /backups/media_$(date +\%Y\%m\%d).tar.gz media/
```

### 5. Удаление старых бэкапов

```bash
# Удаление бэкапов старше 30 дней
find /backups -name "food_home_*.sql.gz" -mtime +30 -delete
find /backups -name "media_*.tar.gz" -mtime +30 -delete
```

---

## Дополнительные рекомендации

### 1. Оптимизация производительности

```python
# settings.py
# Кэширование
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.redis.RedisCache',
        'LOCATION': 'redis://127.0.0.1:6379/1',
    }
}

# Оптимизация базы данных
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': 'food_home',
        'USER': 'food_home_user',
        'PASSWORD': 'secure_password',
        'HOST': 'localhost',
        'PORT': '5432',
        'CONN_MAX_AGE': 600,
        'OPTIONS': {
            'connect_timeout': 10,
        }
    }
}
```

### 2. Настройка Celery для фоновых задач

```bash
# Установка Celery
pip install celery redis

# Запуск Celery worker
celery -A config worker -l info

# Запуск Celery beat
celery -A config beat -l info
```

### 3. Настройка CDN для статических файлов

```python
# settings.py
AWS_S3_OBJECT_PARAMETERS = {
    'CacheControl': 'max-age=86400',
}
```

### 4. Тестирование перед развертыванием

```bash
# Запуск тестов
python manage.py test

# Проверка миграций
python manage.py check --deploy

# Проверка конфигурации
python manage.py check
```

---

## Контакты

Для вопросов по развертыванию обращайтесь:
- Email: devops@food-home.com
- Документация обновлена: 2024-01-24
