'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Star, Clock, TrendingUp } from 'lucide-react';

interface DishCardProps {
  id: string;
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  image: string;
  rating: number;
  reviewCount: number;
  cookingTime: number;
  ingredients: string[];
  isTop?: boolean;
  isPopular?: boolean;
  producerName?: string;
  producerId?: string;
  discountPercentage?: number;
}

const StarRating: React.FC<{ rating: number; reviewCount: number }> = ({ rating, reviewCount }) => {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

  return (
    <div className="flex items-center gap-1">
      {[...Array(fullStars)].map((_, i) => (
        <Star key={`full-${i}`} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
      ))}
      {hasHalfStar && <Star className="w-4 h-4 fill-yellow-400/50 text-yellow-400" />}
      {[...Array(emptyStars)].map((_, i) => (
        <Star key={`empty-${i}`} className="w-4 h-4 text-gray-300" />
      ))}
      <span className="text-sm text-gray-600 ml-1">({reviewCount})</span>
    </div>
  );
};

const DishCard: React.FC<DishCardProps> = ({
  id,
  name,
  description,
  price,
  originalPrice,
  image,
  rating,
  reviewCount,
  cookingTime,
  ingredients,
  isTop = false,
  isPopular = false,
  producerName,
  producerId,
  discountPercentage,
}) => {
  const handleCardClick = (): void => {
    // Navigation handled by Link component
  };

  const handleAddToCart = (e: React.MouseEvent): void => {
    e.preventDefault();
    e.stopPropagation();
    // Add to cart logic here
  };

  const displayIngredients = ingredients.slice(0, 3);
  const hasMoreIngredients = ingredients.length > 3;

  return (
    <Link
      href={`/dishes/${id}`}
      onClick={handleCardClick}
      className="group block focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-xl"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          window.location.href = `/dishes/${id}`;
        }
      }}
    >
      <article 
        className="dish-card relative bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
        role="article"
        aria-label={`Блюдо: ${name}`}
      >
        {/* Image Container */}
        <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
          <Image
            src={image}
            alt={name}
            fill
            className="object-cover group-hover:scale-110 transition-transform duration-500 ease-out"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
            loading="lazy"
          />
          
          {/* Badges */}
          <div className="absolute top-3 left-3 flex flex-col gap-2 z-10">
            {isTop && (
              <span className="badge badge-primary flex items-center gap-1 shadow-sm" role="status" aria-label="Топовое блюдо">
                <TrendingUp className="w-3 h-3" aria-hidden="true" />
                Топ
              </span>
            )}
            {isPopular && (
              <span className="badge badge-secondary shadow-sm" role="status" aria-label="Популярное блюдо">
                Популярное
              </span>
            )}
            {discountPercentage && (
              <span className="badge badge-danger shadow-sm" role="status" aria-label={`Скидка ${discountPercentage}%`}>
                -{discountPercentage}%
              </span>
            )}
          </div>

          {/* Quick Add Button */}
          <button
            onClick={handleAddToCart}
            className="absolute bottom-3 right-3 w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-primary hover:scale-110 active:scale-95 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            aria-label={`Добавить "${name}" в корзину`}
            type="button"
            tabIndex={0}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-primary transition-colors group-hover:text-white"
              aria-hidden="true"
            >
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="dish-card-content p-4 transition-colors duration-300">
          {/* Producer Name */}
          {producerName && producerId && (
            <Link
              href={`/producers/${producerId}`}
              className="text-xs text-gray-500 hover:text-primary transition-colors mb-2 block focus:outline-none focus:text-primary focus:underline"
              onClick={(e) => e.stopPropagation()}
              aria-label={`Перейти к производителю ${producerName}`}
              tabIndex={0}
            >
              {producerName}
            </Link>
          )}

          {/* Title */}
          <h3 className="dish-card-title text-lg font-semibold text-gray-900 mb-2 line-clamp-2 group-hover:text-primary transition-colors duration-300">
            {name}
          </h3>

          {/* Meta Information */}
          <div className="dish-card-meta flex items-center gap-3 mb-3">
            <StarRating rating={rating} reviewCount={reviewCount} />
            <div className="dish-card-cooking-time flex items-center gap-1 text-gray-500 text-sm" aria-label={`Время приготовления: ${cookingTime} минут`}>
              <Clock className="w-4 h-4" aria-hidden="true" />
              <span>{cookingTime} мин</span>
            </div>
          </div>

          {/* Ingredients */}
          <div className="dish-card-ingredients flex flex-wrap gap-2 mb-3">
            {displayIngredients.map((ingredient, index) => (
              <span
                key={index}
                className="dish-card-ingredient text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full hover:bg-gray-200 transition-colors duration-200"
              >
                {ingredient}
              </span>
            ))}
            {hasMoreIngredients && (
              <span className="dish-card-ingredient text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full">
                +{ingredients.length - 3}
              </span>
            )}
          </div>

          {/* Price */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="dish-card-price text-xl font-bold text-primary transition-colors duration-300">
                {price} ₽
              </span>
              {originalPrice && originalPrice > price && (
                <span className="text-sm text-gray-400 line-through" aria-label={`Старая цена: ${originalPrice} рублей`}>
                  {originalPrice} ₽
                </span>
              )}
            </div>
            <button
              onClick={handleAddToCart}
              className="btn-primary px-4 py-2 text-sm font-medium rounded-lg hover:bg-primary-dark hover:shadow-md active:scale-95 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              type="button"
              aria-label={`Добавить "${name}" в корзину`}
            >
              В корзину
            </button>
          </div>
        </div>
      </article>
    </Link>
  );
};

export default DishCard;
