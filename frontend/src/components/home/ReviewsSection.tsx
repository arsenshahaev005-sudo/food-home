'use client';

import React, { useState } from 'react';
import Image from 'next/image';

interface Review {
  id: string;
  name: string;
  avatar: string;
  rating: number;
  text: string;
  date: string;
  dishName?: string;
  dishImage?: string;
}

interface ReviewsSectionProps {
  reviews?: Review[];
  title?: string;
  subtitle?: string;
}

const StarRating: React.FC<{ rating: number }> = ({ rating }) => {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

  return (
    <div className="flex gap-1">
      {[...Array(fullStars)].map((_, i) => (
        <svg
          key={`full-${i}`}
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="text-yellow-400"
        >
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
      {hasHalfStar && (
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="text-yellow-400"
        >
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" opacity="0.5" />
        </svg>
      )}
      {[...Array(emptyStars)].map((_, i) => (
        <svg
          key={`empty-${i}`}
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-gray-300"
        >
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
    </div>
  );
};

const defaultReviews: Review[] = [
  {
    id: '1',
    name: 'Анна Петрова',
    avatar: '/hero-user.jpg',
    rating: 5,
    text: 'Вкуснейшая домашняя еда! Заказывала борщ и котлеты, всё было свежее и горячее. Доставка приехала вовремя.',
    date: '2 дня назад',
    dishName: 'Борщ с пампушками',
    dishImage: '/hero-user.jpg',
  },
  {
    id: '2',
    name: 'Михаил Иванов',
    avatar: '/hero-user.jpg',
    rating: 5,
    text: 'Отличный сервис и качество еды. Повара настоящие профессионалы! Буду заказывать ещё.',
    date: '5 дней назад',
    dishName: 'Пельмени домашние',
    dishImage: '/hero-user.jpg',
  },
  {
    id: '3',
    name: 'Елена Смирнова',
    avatar: '/hero-user.jpg',
    rating: 4,
    text: 'Очень вкусно и быстро. Единственный минус - не хватило соуса, но в целом всё супер!',
    date: '1 неделю назад',
    dishName: 'Плов узбекский',
    dishImage: '/hero-user.jpg',
  },
];

const ReviewsSection: React.FC<ReviewsSectionProps> = ({
  reviews = defaultReviews,
  title = 'Что говорят наши клиенты',
  subtitle = 'Отзывы реальных людей, которые уже попробовали нашу домашнюю еду',
}) => {
  const [expandedReview, setExpandedReview] = useState<string | null>(null);

  const handleExpandReview = (reviewId: string): void => {
    setExpandedReview(expandedReview === reviewId ? null : reviewId);
  };

  return (
    <section className="py-8 bg-gray-50" aria-labelledby="reviews-title">
      <div className="container">
        {/* Section Header */}
        <div className="text-center mb-12">
          <h2
            id="reviews-title"
            className="text-3xl md:text-4xl font-bold text-gray-900 mb-4"
          >
            {title}
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            {subtitle}
          </p>
        </div>

        {/* Reviews Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reviews.map((review) => {
            const isExpanded = expandedReview === review.id;
            const shouldTruncate = review.text.length > 150 && !isExpanded;

            return (
              <article
                key={review.id}
                className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow duration-300"
              >
                {/* Reviewer Info */}
                <div className="flex items-start gap-4 mb-4">
                  <div className="relative w-12 h-12 flex-shrink-0">
                    <Image
                      src={review.avatar}
                      alt={review.name}
                      fill
                      className="object-cover rounded-full"
                      sizes="48px"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 mb-1">
                      {review.name}
                    </h3>
                    <div className="flex items-center gap-2">
                      <StarRating rating={review.rating} />
                      <span className="text-sm text-gray-500">{review.date}</span>
                    </div>
                  </div>
                </div>

                {/* Review Text */}
                <p className="text-gray-600 mb-4">
                  {shouldTruncate ? `${review.text.slice(0, 150)}...` : review.text}
                </p>

                {review.text.length > 150 && (
                  <button
                    onClick={() => handleExpandReview(review.id)}
                    className="font-medium hover:text-orange-700 transition-colors text-sm"
                    style={{ color: '#CD845B' }}
                    type="button"
                  >
                    {isExpanded ? 'Свернуть' : 'Читать далее'}
                  </button>
                )}

                {/* Dish Info */}
                {review.dishName && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <div className="flex items-center gap-3">
                      {review.dishImage && (
                        <div className="relative w-16 h-16 flex-shrink-0">
                          <Image
                            src={review.dishImage}
                            alt={review.dishName}
                            fill
                            className="object-cover rounded-lg"
                            sizes="64px"
                          />
                        </div>
                      )}
                      <div>
                        <p className="text-sm text-gray-500 mb-1">Заказывал(а):</p>
                        <p className="font-medium text-gray-900">{review.dishName}</p>
                      </div>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>

        {/* CTA */}
        <div className="mt-12 text-center">
          <button
            type="button"
            className="px-8 py-3 text-white rounded-xl font-semibold transition-colors shadow-lg hover:shadow-xl"
            style={{ backgroundColor: '#CD845B' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#B86E48'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#CD845B'}
          >
            Оставить отзыв
          </button>
        </div>

        {/* Social Proof Stats */}
        <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="text-center">
            <div className="text-4xl font-bold mb-2" style={{ color: '#CD845B' }}>4.9</div>
            <div className="text-gray-600">Средний рейтинг</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold mb-2" style={{ color: '#CD845B' }}>2000+</div>
            <div className="text-gray-600">Отзывов</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold mb-2" style={{ color: '#CD845B' }}>95%</div>
            <div className="text-gray-600">Довольных клиентов</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold mb-2" style={{ color: '#CD845B' }}>150+</div>
            <div className="text-gray-600">Поваров</div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ReviewsSection;
