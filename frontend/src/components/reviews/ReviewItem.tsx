'use client';

import { useState } from 'react';
import { Star, ThumbsUp, ThumbsDown, Image as ImageIcon } from 'lucide-react';
import { ReviewWithCorrections } from '../../lib/types';

interface ReviewItemProps {
  review: ReviewWithCorrections;
  isSeller?: boolean;
  onProposeCorrection?: (_reviewId: string, _correction: { // eslint-disable-line no-unused-vars
    refund_amount?: number;
    partial_refund?: number;
    message: string;
  }) => Promise<void>;
  onAcceptCorrection?: (_reviewId: string) => Promise<void>; // eslint-disable-line no-unused-vars
  onRejectCorrection?: (_reviewId: string) => Promise<void>; // eslint-disable-line no-unused-vars
  onHelpful?: (_reviewId: string) => void; // eslint-disable-line no-unused-vars
  onNotHelpful?: (_reviewId: string) => void; // eslint-disable-line no-unused-vars
  helpfulCount?: number;
  notHelpfulCount?: number;
}

export default function ReviewItem({
  review,
  isSeller = false,
  onProposeCorrection,
  onAcceptCorrection,
  onRejectCorrection,
  onHelpful,
  onNotHelpful,
  helpfulCount = 0,
  notHelpfulCount = 0,
}: ReviewItemProps) {
  const [hasVoted, setHasVoted] = useState<'helpful' | 'notHelpful' | null>(null);
  const [showCorrectionForm, setShowCorrectionForm] = useState(false);
  const [correctionMessage, setCorrectionMessage] = useState('');
  const [correctionRefund, setCorrectionRefund] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleHelpful = () => {
    if (hasVoted !== 'helpful') {
      setHasVoted('helpful');
      onHelpful?.(review.id);
    }
  };

  const handleNotHelpful = () => {
    if (hasVoted !== 'notHelpful') {
      setHasVoted('notHelpful');
      onNotHelpful?.(review.id);
    }
  };

  const handleProposeCorrection = async () => {
    if (!onProposeCorrection || !correctionMessage.trim()) return;

    setIsSubmitting(true);
    try {
      await onProposeCorrection(review.id, {
        message: correctionMessage.trim(),
        refund_amount: correctionRefund ? parseFloat(correctionRefund) : undefined,
      });
      setShowCorrectionForm(false);
      setCorrectionMessage('');
      setCorrectionRefund('');
    } catch (error) {
      console.error('Error proposing correction:', error);
      alert('Не удалось отправить предложение');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAcceptCorrection = async () => {
    if (!onAcceptCorrection) return;
    
    setIsSubmitting(true);
    try {
      await onAcceptCorrection(review.id);
    } catch (error) {
      console.error('Error accepting correction:', error);
      alert('Не удалось принять предложение');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRejectCorrection = async () => {
    if (!onRejectCorrection) return;
    
    setIsSubmitting(true);
    try {
      await onRejectCorrection(review.id);
    } catch (error) {
      console.error('Error rejecting correction:', error);
      alert('Не удалось отклонить предложение');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStars = (count: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${i < count ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
      />
    ));
  };

  const renderDetailedRating = (label: string, value: number | undefined) => {
    if (value === undefined || value === 0) return null;
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600">{label}:</span>
        <div className="flex gap-0.5">
          {renderStars(value)}
        </div>
      </div>
    );
  };

  const hasDetailedRatings = review.rating_taste || review.rating_appearance || review.rating_service;

  // Get correction status
  const getCorrectionStatus = () => {
    if (review.correction_status === 'applied') {
      return { label: 'Исправлено', color: 'text-green-600', bg: 'bg-green-50' };
    }
    if (review.correction_status === 'requested') {
      return { label: 'Ожидает решения', color: 'text-yellow-600', bg: 'bg-yellow-50' };
    }
    return null;
  };

  const correctionStatus = getCorrectionStatus();
  const latestCorrection = review.correction_requests?.[0];

  return (
    <article className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow duration-200">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-red-500 rounded-full flex items-center justify-center text-white font-semibold">
              {review.user?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">
                {review.user || 'Анонимный пользователь'}
              </h3>
              <p className="text-sm text-gray-500">
                {new Date(review.created_at).toLocaleDateString('ru-RU', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
            </div>
          </div>
        </div>
        <div className="flex gap-0.5">
          {renderStars(Math.round((review.rating_taste + review.rating_appearance + review.rating_service) / 3))}
        </div>
      </div>

      {/* Correction Status Badge */}
      {correctionStatus && (
        <div className={`mb-4 px-3 py-2 rounded-full ${correctionStatus.bg} ${correctionStatus.color} text-sm font-medium`}>
          {correctionStatus.label}
        </div>
      )}

      {/* Detailed Ratings */}
      {hasDetailedRatings && (
        <div className="mb-4 p-3 bg-gray-50 rounded-lg space-y-2">
          {renderDetailedRating('Вкус', review.rating_taste)}
          {renderDetailedRating('Внешний вид', review.rating_appearance)}
          {renderDetailedRating('Сервис', review.rating_service)}
        </div>
      )}

      {/* Review Text */}
      <p
        className="text-gray-700 mb-4 leading-relaxed"
        tabIndex={0}
        role="article"
        aria-label={`Отзыв с рейтингом`}
      >
        {review.comment}
      </p>

      {/* Latest Correction Proposal */}
      {latestCorrection && review.correction_status !== 'applied' && (
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-2 mb-2">
            <span className="text-blue-700 font-semibold">💬 Предложение продавца</span>
            <span className="text-xs text-blue-600 ml-auto">
              {new Date(latestCorrection.created_at).toLocaleDateString('ru-RU')}
            </span>
          </div>
          <p className="text-sm text-gray-700 mb-3">{latestCorrection.message}</p>
          
          {latestCorrection.proposed_refund && (
            <div className="mb-2 p-2 bg-green-50 border border-green-200 rounded">
              <p className="text-sm font-medium text-green-700">
                💰 Предложен возврат: {latestCorrection.proposed_refund} ₽
              </p>
            </div>
          )}

          {!isSeller && review.correction_status === 'available' && (
            <div className="flex gap-2 mt-3">
              <button
                onClick={handleAcceptCorrection}
                disabled={isSubmitting}
                className="flex-1 px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
              >
                {isSubmitting ? 'Принятие...' : 'Принять'}
              </button>
              <button
                onClick={handleRejectCorrection}
                disabled={isSubmitting}
                className="flex-1 px-3 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
              >
                {isSubmitting ? 'Отклонение...' : 'Отклонить'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Media */}
      {(review.photo || review.dish_photo || review.dish_additional_photos?.length) && (
        <div className="mb-4 space-y-2">
          {review.photo && (
            <div className="relative group">
              <img
                src={review.photo}
                alt="Фото отзыва"
                className="w-full h-48 object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                loading="lazy"
              />
              <div className="absolute bottom-2 right-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-xs flex items-center gap-1">
                <ImageIcon className="w-3 h-3" />
                Фото
              </div>
            </div>
          )}
          {review.dish_photo && (
            <div className="relative group">
              <img
                src={review.dish_photo}
                alt="Фото блюда"
                className="w-full h-48 object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                loading="lazy"
              />
              <div className="absolute bottom-2 right-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-xs flex items-center gap-1">
                <ImageIcon className="w-3 h-3" />
                Фото блюда
              </div>
            </div>
          )}
          {review.dish_additional_photos && review.dish_additional_photos.length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              {review.dish_additional_photos.map((photo, index) => (
                <div key={index} className="relative group">
                  <img
                    src={photo}
                    alt={`Дополнительное фото ${index + 1}`}
                    className="w-full h-32 object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                    loading="lazy"
                  />
                  <div className="absolute bottom-2 right-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-xs flex items-center gap-1">
                    <ImageIcon className="w-3 h-3" />
                    Фото {index + 2}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Seller Correction Form */}
      {isSeller && review.correction_status === 'available' && !latestCorrection && (
        <div className="mb-4">
          {!showCorrectionForm ? (
            <button
              onClick={() => setShowCorrectionForm(true)}
              className="w-full px-4 py-3 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium transition-colors"
            >
              💬 Предложить исправление оценки
            </button>
          ) : (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-3">Предложить компенсацию</h4>
              
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Сумма возврата (опционально)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={correctionRefund}
                    onChange={(e) => setCorrectionRefund(e.target.value)}
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    className="w-full px-3 py-2 pr-12 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={isSubmitting}
                  />
                  <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                    ₽
                  </span>
                </div>
              </div>

              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Сообщение покупателю *
                </label>
                <textarea
                  value={correctionMessage}
                  onChange={(e) => setCorrectionMessage(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Напишите сообщение покупателю..."
                  disabled={isSubmitting}
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleProposeCorrection}
                  disabled={isSubmitting || !correctionMessage.trim()}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {isSubmitting ? 'Отправка...' : 'Отправить'}
                </button>
                <button
                  onClick={() => {
                    setShowCorrectionForm(false);
                    setCorrectionMessage('');
                    setCorrectionRefund('');
                  }}
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  Отмена
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Helpful Actions */}
      <div className="flex items-center gap-4 pt-4 border-t border-gray-100">
        <button
          onClick={handleHelpful}
          disabled={hasVoted === 'helpful'}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-colors ${
            hasVoted === 'helpful'
              ? 'bg-green-100 text-green-700'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
          aria-label="Отзыв полезен"
        >
          <ThumbsUp className={`w-4 h-4 ${hasVoted === 'helpful' ? 'fill-current' : ''}`} />
          <span>{helpfulCount}</span>
        </button>
        <button
          onClick={handleNotHelpful}
          disabled={hasVoted === 'notHelpful'}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-colors ${
            hasVoted === 'notHelpful'
              ? 'bg-red-100 text-red-700'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
          aria-label="Отзыв не полезен"
        >
          <ThumbsDown className={`w-4 h-4 ${hasVoted === 'notHelpful' ? 'fill-current' : ''}`} />
          <span>{notHelpfulCount}</span>
        </button>
      </div>
    </article>
  );
}
