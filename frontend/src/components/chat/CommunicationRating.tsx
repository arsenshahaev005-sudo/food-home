/**
 * Компонент оценки качества общения.
 * 
 * Обоснование: Оценка качества общения помогает
 * улучшить сервис и мотивирует продавцов
 * предоставлять качественную коммуникацию.
 */

import React, { useState } from 'react';
import { CommunicationRating as CommunicationRatingType } from '@/lib/api/chatApi';

interface CommunicationRatingProps {
  orderId: string; // eslint-disable-line no-unused-vars
  ratedUserId: string; // eslint-disable-line no-unused-vars
  ratedUserName?: string;
  onSubmit: (orderId: string, ratedUserId: string, rating: number, comment: string) => Promise<void>; // eslint-disable-line no-unused-vars
  existingRating?: CommunicationRatingType | null;
  isSubmitting?: boolean;
}

export const CommunicationRating: React.FC<CommunicationRatingProps> = ({
  orderId,
  ratedUserId,
  ratedUserName,
  onSubmit,
  existingRating = null,
  isSubmitting = false,
}) => {
  const [rating, setRating] = useState<number>(existingRating?.rating || 0);
  const [comment, setComment] = useState<string>(existingRating?.comment || '');
  const [hoveredRating, setHoveredRating] = useState<number>(0);

  const handleSubmit = async () => {
    if (rating < 1 || rating > 5) return;
    try {
      await onSubmit(orderId, ratedUserId, rating, comment);
    } catch (error) {
      console.error('Failed to submit rating:', error);
    }
  };

  const handleStarClick = (value: number) => {
    setRating(value);
  };

  const handleStarHover = (value: number) => {
    setHoveredRating(value);
  };

  const handleStarLeave = () => {
    setHoveredRating(0);
  };

  if (existingRating) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Ваша оценка</h3>
        <div className="flex items-center gap-4 mb-4">
          <div className="flex">
            {[1, 2, 3, 4, 5].map((value) => (
              <button
                key={value}
                disabled
                className="text-2xl cursor-default"
                aria-label={`${value} звезд`}
                type="button"
              >
                {value <= (existingRating.rating || 0) ? '⭐' : '☆'}
              </button>
            ))}
          </div>
          <span className="text-lg font-semibold text-gray-900">
            {existingRating.rating}/5
          </span>
        </div>
        {existingRating.comment && (
          <div className="bg-gray-50 rounded-md p-4">
            <p className="text-sm text-gray-600">
              <span className="font-semibold">Ваш комментарий:</span> {existingRating.comment}
            </p>
          </div>
        )}
        <p className="text-sm text-gray-500 mt-4">
          Оставлено: {new Date(existingRating.created_at).toLocaleDateString('ru-RU')}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="font-semibold text-gray-900 mb-2">
        Оцените качество общения
      </h3>
      {ratedUserName && (
        <p className="text-sm text-gray-600 mb-4">
          с {ratedUserName}
        </p>
      )}

      {/* Star rating */}
      <div className="flex items-center gap-4 mb-4">
        <div className="flex">
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              onClick={() => handleStarClick(value)}
              onMouseEnter={() => handleStarHover(value)}
              onMouseLeave={handleStarLeave}
              className="text-3xl transition-transform hover:scale-110 focus:outline-none"
              aria-label={`${value} звезд`}
              type="button"
            >
              {value <= (hoveredRating || rating) ? '⭐' : '☆'}
            </button>
          ))}
        </div>
        {rating > 0 && (
          <span className="text-lg font-semibold text-gray-900">
            {rating}/5
          </span>
        )}
      </div>

      {/* Rating labels */}
      <div className="flex justify-between text-xs text-gray-500 mb-4 px-1">
        <span>Плохо</span>
        <span>Отлично</span>
      </div>

      {/* Comment input */}
      <div className="mb-4">
        <label htmlFor="rating-comment" className="block text-sm font-medium text-gray-700 mb-2">
          Комментарий (необязательно)
        </label>
        <textarea
          id="rating-comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Расскажите подробнее о вашем опыте общения..."
          className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          rows={4}
          disabled={isSubmitting}
          aria-label="Комментарий к оценке"
        />
      </div>

      {/* Submit button */}
      <button
        onClick={handleSubmit}
        disabled={rating < 1 || rating > 5 || isSubmitting}
        className="w-full px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
        aria-label="Отправить оценку"
        type="button"
      >
        {isSubmitting ? '...' : 'Отправить оценку'}
      </button>
    </div>
  );
};
