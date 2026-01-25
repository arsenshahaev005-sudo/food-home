'use client';

import { useState, useEffect } from 'react';
import { DeliveryStatus } from '../../lib/types';
import { api } from '../../lib/api';

interface DeliveryTrackerProps {
  orderId: string;
  token: string;
}

export default function DeliveryTracker({ orderId, token }: DeliveryTrackerProps) {
  const [status, setStatus] = useState<DeliveryStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 30000); // Poll every 30 seconds
    return () => clearInterval(interval);
  }, [orderId, token]);

  const fetchStatus = async () => {
    try {
      const response = await api.orders.getDeliveryStatus(orderId);
      
      if (!response.ok) {
        throw new Error('Не удалось загрузить статус доставки');
      }
      
      const data: DeliveryStatus = await response.json();
      setStatus(data);
      setError(null);
    } catch (err) {
      setError('Не удалось загрузить статус доставки');
      console.error('Error fetching delivery status:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusInfo = () => {
    if (!status) return null;
    
    switch (status.status) {
      case 'COOKING':
        return {
          label: 'Готовится',
          color: 'text-orange-600',
          bg: 'bg-orange-50',
          border: 'border-orange-200',
          icon: '🍳'
        };
      case 'READY_FOR_DELIVERY':
        return {
          label: 'Готов к доставке',
          color: 'text-blue-600',
          bg: 'bg-blue-50',
          border: 'border-blue-200',
          icon: '📦'
        };
      case 'DELIVERING':
        return {
          label: 'В пути',
          color: 'text-purple-600',
          bg: 'bg-purple-50',
          border: 'border-purple-200',
          icon: '🚚'
        };
      case 'ARRIVED':
        return {
          label: 'Доставлен',
          color: 'text-green-600',
          bg: 'bg-green-50',
          border: 'border-green-200',
          icon: '✅'
        };
      case 'COMPLETED':
        return {
          label: 'Завершен',
          color: 'text-green-600',
          bg: 'bg-green-50',
          border: 'border-green-200',
          icon: '✅'
        };
      case 'LATE':
        return {
          label: 'Опоздание',
          color: 'text-red-600',
          bg: 'bg-red-50',
          border: 'border-red-200',
          icon: '⚠️'
        };
      default:
        return {
          label: status.status,
          color: 'text-gray-600',
          bg: 'bg-gray-50',
          border: 'border-gray-200',
          icon: '📍'
        };
    }
  };

  const steps = [
    { key: 'cooking', label: 'Приготовление', time: status?.cooking_started_at },
    { key: 'ready', label: 'Готов к доставке', time: status?.delivery_started_at },
    { key: 'delivering', label: 'В пути', time: status?.delivery_started_at },
    { key: 'arrived', label: 'Доставлен', time: status?.arrived_at },
    { key: 'completed', label: 'Завершен', time: status?.completed_at },
  ];

  const getCurrentStep = () => {
    if (!status) return -1;
    
    switch (status.status) {
      case 'COOKING':
        return 0;
      case 'READY_FOR_DELIVERY':
        return 1;
      case 'DELIVERING':
        return 2;
      case 'ARRIVED':
        return 3;
      case 'COMPLETED':
        return 4;
      default:
        return -1;
    }
  };

  const getStepStatus = (stepIndex: number) => {
    const currentStep = getCurrentStep();
    if (currentStep === -1) return 'pending';
    if (stepIndex < currentStep) return 'completed';
    if (stepIndex === currentStep) return 'active';
    return 'pending';
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex flex-col items-center justify-center py-8 space-y-4">
          <div className="w-12 h-12 border-4 border-[#c9825b] border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">Загрузка...</p>
        </div>
      </div>
    );
  }

  const statusInfo = getStatusInfo();

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className={`px-6 py-4 border-b ${statusInfo?.border || 'border-gray-200'} ${statusInfo?.bg || 'bg-gray-50'}`}>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm">
            <span className="text-2xl">{statusInfo?.icon || '📍'}</span>
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-lg">Статус доставки</h3>
            <p className={`font-medium ${statusInfo?.color || 'text-gray-600'}`}>
              {statusInfo?.label || 'Неизвестно'}
            </p>
          </div>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="p-6 bg-red-50">
          <p className="text-red-600 text-center">{error}</p>
          <button
            onClick={fetchStatus}
            className="mt-4 mx-auto block px-4 py-2 text-sm font-medium text-red-700 hover:underline"
          >
            Попробовать снова
          </button>
        </div>
      )}

      {/* Late Delivery Warning */}
      {status?.status === 'LATE' && (
        <div className="p-4 bg-red-50 border-b border-red-200">
          <div className="flex items-start gap-2">
            <span className="text-xl">⚠️</span>
            <div>
              <p className="font-medium text-red-900">Доставка задерживается!</p>
              <p className="text-sm text-red-700 mt-1">
                {status.late_reason || 'Превышено время доставки'}
              </p>
              {status.minutes_late && (
                <p className="text-sm text-red-600 mt-1">
                  Опоздание: {status.minutes_late} минут
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Timeline */}
      <div className="p-6">
        <h4 className="font-bold text-gray-900 mb-6">Хронология доставки</h4>
        
        <div className="relative">
          {/* Vertical Line */}
          <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200" />
          
          {/* Steps */}
          <div className="space-y-8">
            {steps.map((step, index) => {
              const stepStatus = getStepStatus(index);
              const isActive = stepStatus === 'active';
              const isCompleted = stepStatus === 'completed';
              
              return (
                <div key={step.key} className="relative flex items-start gap-4">
                  {/* Step Circle */}
                  <div className={`relative z-10 w-12 h-12 rounded-full flex items-center justify-center border-2 ${
                    isActive
                      ? 'bg-[#c9825b] border-[#c9825b] text-white shadow-lg shadow-[#c9825b]/30'
                      : isCompleted
                      ? 'bg-green-500 border-green-500 text-white'
                      : 'bg-white border-gray-300 text-gray-400'
                  }`}>
                    {isCompleted ? (
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 0116 0zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd"
                        />
                      </svg>
                    ) : isActive ? (
                      <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
                    ) : (
                      <div className="w-3 h-3 bg-gray-300 rounded-full" />
                    )}
                  </div>

                  {/* Step Content */}
                  <div className="flex-1 pt-1">
                    <p className={`font-medium ${isActive ? 'text-[#c9825b]' : isCompleted ? 'text-green-600' : 'text-gray-500'}`}>
                      {step.label}
                    </p>
                    {step.time && (
                      <p className="text-sm text-gray-600 mt-1">
                        {new Date(step.time).toLocaleString('ru-RU', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Info Box */}
      <div className="px-6 pb-6">
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <h4 className="font-bold text-blue-900 mb-2">💡 Информация</h4>
          <ul className="space-y-2 text-blue-800 text-sm">
            <li className="flex items-start gap-2">
              <span className="text-blue-600">•</span>
              <span>Статус обновляется автоматически каждые 30 секунд</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600">•</span>
              <span>Если доставка задерживается, вы получите уведомление</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600">•</span>
              <span>При опоздании может быть наложен штраф</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
