'use client';

import React from 'react';

export type CheckoutStep = 'delivery' | 'payment' | 'review';

interface CheckoutStepsProps {
  currentStep: CheckoutStep;
  onStepChange?: (step: CheckoutStep) => void;
  completedSteps?: CheckoutStep[];
}

interface StepConfig {
  id: CheckoutStep;
  label: string;
  number: number;
}

const steps: StepConfig[] = [
  { id: 'delivery', label: 'Доставка', number: 1 },
  { id: 'payment', label: 'Оплата', number: 2 },
  { id: 'review', label: 'Проверка', number: 3 },
];

const CheckoutSteps: React.FC<CheckoutStepsProps> = ({
  currentStep,
  onStepChange,
  completedSteps = [],
}) => {
  const handleStepClick = (step: CheckoutStep): void => {
    // Only allow clicking on completed steps or the next step
    const currentStepIndex = steps.findIndex((s) => s.id === currentStep);
    const clickedStepIndex = steps.findIndex((s) => s.id === step);
    
    if (clickedStepIndex <= currentStepIndex || completedSteps.includes(step)) {
      onStepChange?.(step);
    }
  };

  const getStepStatus = (stepId: CheckoutStep): 'completed' | 'active' | 'pending' => {
    if (completedSteps.includes(stepId)) {
      return 'completed';
    }
    if (currentStep === stepId) {
      return 'active';
    }
    return 'pending';
  };

  return (
    <div className="checkout-progress" role="navigation" aria-label="Этапы оформления заказа">
      {steps.map((step, index) => {
        const status = getStepStatus(step.id);
        const isClickable = status === 'completed' || (status === 'pending' && index === steps.findIndex((s) => s.id === currentStep) + 1);
        
        return (
          <div key={step.id} className="flex flex-col items-center flex-1">
            <button
              onClick={() => handleStepClick(step.id)}
              disabled={!isClickable}
              className={`
                checkout-step-indicator
                ${status === 'completed' ? 'completed' : ''}
                ${status === 'active' ? 'active' : ''}
                ${isClickable ? 'cursor-pointer hover:border-orange-400' : 'cursor-not-allowed'}
              `}
              aria-current={status === 'active' ? 'step' : undefined}
              aria-label={`${step.label} - ${status === 'completed' ? 'завершено' : status === 'active' ? 'текущий этап' : 'следующий этап'}`}
              type="button"
            >
              {status === 'completed' ? (
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              ) : (
                step.number
              )}
            </button>
            <span
              className={`
                text-xs font-medium mt-2
                ${status === 'active' ? 'text-orange-600' : status === 'completed' ? 'text-gray-700' : 'text-gray-400'}
              `}
            >
              {step.label}
            </span>
          </div>
        );
      })}
    </div>
  );
};

export default CheckoutSteps;
