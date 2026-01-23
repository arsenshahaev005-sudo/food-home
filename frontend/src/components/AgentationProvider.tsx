'use client';

import { ReactNode } from 'react';
import { Agentation } from 'agentation';

// Типизация пропсов компонента
interface AgentationProviderProps {
  children: ReactNode;
}

/**
 * Провайдер для инициализации Agentation.dev
 * Инициализируется только в development окружении
 */
export const AgentationProvider = ({ children }: AgentationProviderProps) => {
  // В development режиме рендерим Agentation компонент
  if (process.env.NODE_ENV === 'development') {
    return (
      <>
        <Agentation />
        {children}
      </>
    );
  }

  // В production режиме возвращаем только children
  return <>{children}</>;
};
