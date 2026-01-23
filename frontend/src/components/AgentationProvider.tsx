'use client';

import { useEffect } from 'react';
import { ReactNode } from 'react';
import agentation from 'agentation';

// Типизация пропсов компонента
interface AgentationProviderProps {
  children: ReactNode;
}

/**
 * Провайдер для инициализации Agentation.dev
 * Инициализируется только в development окружении
 */
export const AgentationProvider = ({ children }: AgentationProviderProps) => {
  useEffect(() => {
    // Инициализируем Agentation только в development окружении
    if (process.env.NODE_ENV === 'development') {
      try {
        agentation.init();
      } catch (error) {
        console.error('Ошибка при инициализации Agentation:', error);
      }
    }
  }, []);

  // Возвращаем children без дополнительной обёртки
  return <>{children}</>;
};
