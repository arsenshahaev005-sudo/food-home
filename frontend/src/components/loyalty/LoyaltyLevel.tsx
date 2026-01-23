import React from 'react';
import { CheckCircle, Lock, Star, Award } from 'lucide-react';
import { LoyaltyLevel as LoyaltyLevelType } from '@/lib/api/loyaltyApi';

interface LoyaltyLevelProps {
  level: LoyaltyLevelType;
  isCurrent?: boolean;
  isLocked?: boolean;
  onClick?: () => void;
}

const LoyaltyLevel = ({ level, isCurrent = false, isLocked = false, onClick }: LoyaltyLevelProps) => {
  const handleClick = () => {
    if (onClick && !isLocked) {
      onClick();
    }
  };

  const handleKeyDown = (event: { key: string }) => {
    if ((event.key === 'Enter' || event.key === ' ') && !isLocked && onClick) {
      event.preventDefault();
      onClick();
    }
  };

  return (
    <div
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={`relative p-6 rounded-xl border-2 transition-all duration-200 ${
        isCurrent
          ? 'border-orange-500 bg-orange-50 shadow-lg'
          : isLocked
          ? 'border-gray-200 bg-gray-50 opacity-60'
          : 'border-gray-200 bg-white hover:border-orange-300 hover:shadow-md cursor-pointer'
      }`}
      role="button"
      tabIndex={isLocked ? -1 : 0}
      aria-label={`Уровень лояльности: ${level.name}`}
    >
      {/* Status Badge */}
      <div className="absolute top-4 right-4">
        {isCurrent && (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-orange-500 text-white text-xs font-medium rounded-full">
            <Star className="w-3 h-3 fill-current" />
            Текущий
          </span>
        )}
        {isLocked && (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-gray-400 text-white text-xs font-medium rounded-full">
            <Lock className="w-3 h-3" />
            Недоступно
          </span>
        )}
      </div>

      {/* Icon */}
      <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${
        isCurrent
          ? 'bg-orange-500'
          : isLocked
          ? 'bg-gray-300'
          : 'bg-orange-200'
      }`}>
        <Award className={`w-8 h-8 ${isCurrent ? 'text-white' : isLocked ? 'text-gray-500' : 'text-orange-600'}`} />
      </div>

      {/* Level Name */}
      <h3 className={`text-xl font-bold mb-2 ${
        isCurrent ? 'text-orange-700' : isLocked ? 'text-gray-500' : 'text-gray-900'
      }`}>
        {level.name}
      </h3>

      {/* Points Range */}
      <div className="mb-4">
        <p className="text-sm text-gray-600 mb-1">
          {level.min_points.toLocaleString('ru-RU')} - {level.max_points ? level.max_points.toLocaleString('ru-RU') : '∞'} баллов
        </p>
      </div>

      {/* Discount */}
      <div className="mb-4 p-3 bg-white rounded-lg">
        <div className="flex items-center gap-2">
          <Star className={`w-5 h-5 ${isCurrent ? 'fill-orange-500 text-orange-500' : isLocked ? 'text-gray-400' : 'text-orange-400'}`} />
          <span className={`text-lg font-bold ${isCurrent ? 'text-orange-700' : isLocked ? 'text-gray-500' : 'text-gray-900'}`}>
            Скидка {level.discount_percentage}%
          </span>
        </div>
      </div>

      {/* Benefits */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-gray-700 mb-2">Преимущества:</p>
        {level.benefits.map((benefit, index) => (
          <div key={index} className="flex items-start gap-2">
            <CheckCircle className={`w-4 h-4 flex-shrink-0 mt-0.5 ${
              isCurrent ? 'text-orange-500' : isLocked ? 'text-gray-400' : 'text-green-500'
            }`} />
            <span className={`text-sm ${isLocked ? 'text-gray-500' : 'text-gray-700'}`}>
              {benefit}
            </span>
          </div>
        ))}
      </div>

      {/* Click Hint */}
      {!isLocked && !isCurrent && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center">
            Нажмите для просмотра деталей
          </p>
        </div>
      )}
    </div>
  );
};

export default LoyaltyLevel;
