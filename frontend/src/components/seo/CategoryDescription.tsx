'use client';

import { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, Loader2, AlertCircle } from 'lucide-react';
import { getCategoryBySlug, Category } from '@/lib/api/contentApi';

export interface CategoryDescriptionProps {
  categorySlug: string;
  token: string;
  className?: string;
}

const CategoryDescription = ({ categorySlug, token, className = '' }: CategoryDescriptionProps) => {
  const [category, setCategory] = useState<Category | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const loadCategory = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const categoryData = await getCategoryBySlug(categorySlug, token);
        setCategory(categoryData);
      } catch (err: any) {
        console.error('Error loading category:', err);
        setError('Не удалось загрузить описание категории. Пожалуйста, попробуйте позже.');
      } finally {
        setIsLoading(false);
      }
    };

    loadCategory();
  }, [categorySlug, token]);

  const handleToggle = () => {
    setIsExpanded(!isExpanded);
  };

  const handleKeyDown = (event: { key: string }) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleToggle();
    }
  };

  if (isLoading) {
    return (
      <div className={`bg-white rounded-xl shadow-sm ${className}`}>
        <div className="flex flex-col items-center justify-center p-12">
          <Loader2 className="w-8 h-8 text-orange-500 animate-spin mb-4" />
          <p className="text-gray-600">Загрузка описания...</p>
        </div>
      </div>
    );
  }

  if (error || !category) {
    return (
      <div className={`bg-white rounded-xl shadow-sm ${className}`}>
        <div className="p-6">
          <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error || 'Категория не найдена'}</p>
          </div>
        </div>
      </div>
    );
  }

  const description = category.description || '';
  const hasFullDescription = description.length > 200;

  return (
    <div className={`bg-white rounded-xl shadow-sm ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-100">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">{category.name}</h2>
        <p className="text-gray-600 leading-relaxed">
          {hasFullDescription && !isExpanded
            ? description.slice(0, 200) + '...'
            : description}
        </p>
      </div>

      {/* Expandable Content */}
      {hasFullDescription && (
        <div 
          className={`overflow-hidden transition-all duration-300 ease-in-out ${
            isExpanded ? 'max-h-96' : 'max-h-0'
          }`}
          aria-expanded={isExpanded}
        >
          <div className="p-6 prose prose-sm text-gray-700">
            {description}
          </div>
        </div>
      )}

      {/* Toggle Button */}
      {hasFullDescription && (
        <div className="p-4 bg-gray-50 border-t border-gray-100">
          <button
            onClick={handleToggle}
            onKeyDown={handleKeyDown}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 text-base font-medium text-gray-700 hover:text-orange-500 transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
            aria-expanded={isExpanded}
            aria-controls="category-description-content"
          >
            <span>{isExpanded ? 'Свернуть' : 'Читать подробнее'}</span>
            {isExpanded ? (
              <ChevronUp className="w-5 h-5" aria-hidden="true" />
            ) : (
              <ChevronDown className="w-5 h-5" aria-hidden="true" />
            )}
          </button>
        </div>
      )}
    </div>
  );
};

export default CategoryDescription;
