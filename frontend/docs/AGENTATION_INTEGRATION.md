# Интеграция Agentation.dev

Agentation.dev — это инструмент для разработки приложений с использованием искусственного интеллекта. Он позволяет анализировать кодовую базу, понимать структуру проекта и предоставлять интеллектуальные подсказки для ускорения разработки.

## Установка

Пакет `agentation` версии 1.3.1 установлен в проект как dev-зависимость:

```json
{
  "devDependencies": {
    "agentation": "^1.3.1"
  }
}
```

Для установки пакета используйте команду:

```bash
npm install --save-dev agentation@1.3.1
```

## Конфигурация

Интеграция Agentation настроена в проекте следующим образом:

1. **Компонент провайдера**: Создан компонент [`AgentationProvider`](../src/components/AgentationProvider.tsx:1) в директории `frontend/src/components/`

2. **Инициализация**: Agentation инициализируется автоматически только в режиме development через вызов `agentation.init()`

3. **Интеграция в приложение**: Компонент импортирован в [`layout.tsx`](../src/app/layout.tsx:4) для обёртки всего приложения

## Использование

Интеграция работает автоматически только в development режиме:

- При запуске приложения с `npm run dev` Agentation инициализируется автоматически
- В production режиме Agentation не загружается, что обеспечивает безопасность и производительность
- Никаких дополнительных действий от разработчика не требуется

## Компоненты

### AgentationProvider

Компонент [`AgentationProvider`](../src/components/AgentationProvider.tsx:1) отвечает за инициализацию Agentation:

```tsx
'use client';

import { useEffect } from 'react';
import { ReactNode } from 'react';
import agentation from 'agentation';

interface AgentationProviderProps {
  children: ReactNode;
}

export const AgentationProvider = ({ children }: AgentationProviderProps) => {
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      try {
        agentation.init();
      } catch (error) {
        console.error('Ошибка при инициализации Agentation:', error);
      }
    }
  }, []);

  return <>{children}</>;
};
```

**Особенности:**
- Использует `'use client'` директиву для работы на клиентской стороне
- Инициализирует Agentation только при `NODE_ENV === 'development'`
- Обрабатывает возможные ошибки при инициализации
- Не добавляет дополнительную обёртку в DOM

## Важные замечания

1. **Только для development**: Agentation не загружается в production окружении для обеспечения безопасности и производительности

2. **Автоматическая инициализация**: Никаких дополнительных вызовов не требуется — инициализация происходит автоматически при запуске dev сервера

3. **Безопасность**: В production код Agentation полностью исключается из сборки

4. **Требования**: Для работы необходимо, чтобы `NODE_ENV` был установлен в `'development'`

## Ссылки

- Официальный сайт: https://agentation.dev/
- Документация: https://agentation.dev/docs
