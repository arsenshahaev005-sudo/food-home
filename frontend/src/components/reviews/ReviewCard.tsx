import React, { useState } from 'react';
import { Star, ThumbsUp, ThumbsDown, Image as ImageIcon, Video as VideoIcon } from 'lucide-react';

interface ReviewCardProps {
  id: string;
  dishId?: string;
  producerId?: string;
  userName: string;
  rating: number;
  text: string;
  createdAt: string;
  photo?: string;
  video?: string;
  helpfulCount?: number;
  notHelpfulCount?: number;
  producerResponse?: string;
  sellerResponseCreatedAt?: string;
  ratingTaste?: number;
  ratingAppearance?: number;
  ratingService?: number;
  ratingPortion?: number;
  ratingPackaging?: number;
  onHelpful?: (reviewId: string) => void;
  onNotHelpful?: (reviewId: string) => void;
}

const ReviewCard: React.FC<ReviewCardProps> = ({
  id,
  dishId,
  producerId,
  userName,
  rating,
  text,
  createdAt,
  photo,
  video,
  helpfulCount = 0,
  notHelpfulCount = 0,
  producerResponse,
  sellerResponseCreatedAt,
  ratingTaste,
  ratingAppearance,
  ratingService,
  ratingPortion,
  ratingPackaging,
  onHelpful,
  onNotHelpful,
}) => {
  const [hasVoted, setHasVoted] = useState<'helpful' | 'notHelpful' | null>(null);

  const handleHelpful = () => {
    if (hasVoted !== 'helpful') {
      setHasVoted('helpful');
      onHelpful?.(id);
    }
  };

  const handleNotHelpful = () => {
    if (hasVoted !== 'notHelpful') {
      setHasVoted('notHelpful');
      onNotHelpful?.(id);
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

  const hasDetailedRatings = ratingTaste || ratingAppearance || ratingService || ratingPortion || ratingPackaging;

  return (
    <article className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow duration-200">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-red-500 rounded-full flex items-center justify-center text-white font-semibold">
              {userName.charAt(0).toUpperCase()}
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{userName}</h3>
              <p className="text-sm text-gray-500">
                {new Date(createdAt).toLocaleDateString('ru-RU', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
            </div>
          </div>
        </div>
        <div className="flex gap-0.5">
          {renderStars(rating)}
        </div>
      </div>

      {/* Detailed Ratings */}
      {hasDetailedRatings && (
        <div className="mb-4 p-3 bg-gray-50 rounded-lg space-y-2">
          {renderDetailedRating('Вкус', ratingTaste)}
          {renderDetailedRating('Внешний вид', ratingAppearance)}
          {renderDetailedRating('Сервис', ratingService)}
          {renderDetailedRating('Порция', ratingPortion)}
          {renderDetailedRating('Упаковка', ratingPackaging)}
        </div>
      )}

      {/* Review Text */}
      <p
        className="text-gray-700 mb-4 leading-relaxed"
        tabIndex={0}
        role="article"
        aria-label={`Отзыв от ${userName} с рейтингом ${rating} из 5`}
      >
        {text}
      </p>

      {/* Seller Response */}
      {producerResponse && (
        <div className="mb-4 p-4 bg-green-50 rounded-lg border-l-4 border-green-200">
          <div className="flex items-start gap-2 mb-2">
            <span className="text-green-700 font-semibold">💬 Ответ продавца</span>
            {sellerResponseCreatedAt && (
              <span className="text-xs text-green-600 ml-2">
                {new Date(sellerResponseCreatedAt).toLocaleDateString('ru-RU')}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-700">{producerResponse}</p>
        </div>
      )}

      {/* Media */}
      {(photo || video) && (
        <div className="mb-4 space-y-2">
          {photo && (
            <div className="relative group">
              <img
                src={photo}
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
          {video && (
            <div className="relative group">
              <video
                src={video}
                controls
                className="w-full h-48 object-cover rounded-lg"
                loading="lazy"
              >
                Ваш браузер не поддерживает видео
              </video>
              <div className="absolute bottom-2 right-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-xs flex items-center gap-1">
                <VideoIcon className="w-3 h-3" />
                Видео
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
};

export default ReviewCard;
