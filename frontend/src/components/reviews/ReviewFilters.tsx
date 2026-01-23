'use client';

import { useState } from 'react';
import { Filter, X, ChevronDown } from 'lucide-react';

export interface ReviewFiltersProps {
  minRating?: number;
  maxRating?: number;
  withPhotos?: boolean;
  withVideos?: boolean;
  withResponse?: boolean;
  dateRange?: 'all' | 'week' | 'month' | 'year';
  onFiltersChange?: (filters: ReviewFiltersState) => void;
  className?: string;
}

export interface ReviewFiltersState {
  minRating: number;
  maxRating: number;
  withPhotos: boolean;
  withVideos: boolean;
  withResponse: boolean;
  dateRange: 'all' | 'week' | 'month' | 'year';
}

const ReviewFilters = ({
  minRating = 0,
  maxRating = 5,
  withPhotos: initialWithPhotos = false,
  withVideos: initialWithVideos = false,
  withResponse: initialWithResponse = false,
  dateRange: initialDateRange = 'all',
  onFiltersChange,
  className = ''
}: ReviewFiltersProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [filters, setFilters] = useState<ReviewFiltersState>({
    minRating,
    maxRating,
    withPhotos: initialWithPhotos,
    withVideos: initialWithVideos,
    withResponse: initialWithResponse,
    dateRange: initialDateRange
  });

  const handleFilterChange = (key: keyof ReviewFiltersState, value: any) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    if (onFiltersChange) {
      onFiltersChange(newFilters);
    }
  };

  const handleClearFilters = () => {
    const clearedFilters: ReviewFiltersState = {
      minRating: 0,
      maxRating: 5,
      withPhotos: false,
      withVideos: false,
      withResponse: false,
      dateRange: 'all'
    };
    setFilters(clearedFilters);
    if (onFiltersChange) {
      onFiltersChange(clearedFilters);
    }
  };

  const handleKeyDown = (event: { key: string }, action: () => void) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      action();
    }
  };

  const activeFiltersCount = Object.values(filters).filter((v) => 
    v !== 0 && v !== 5 && v !== 'all' && v === true
  ).length;

  return (
    <div className={`relative ${className}`}>
      {/* Filter Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={(e) => handleKeyDown(e, () => setIsOpen(!isOpen))}
        className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
          isOpen 
            ? 'bg-primary text-white' 
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        }`}
        aria-label="Фильтры отзывов"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <Filter className="w-4 h-4" aria-hidden="true" />
        <span>Фильтры</span>
        {activeFiltersCount > 0 && (
          <span className="ml-1 px-1.5 py-0.5 bg-white text-primary text-xs font-bold rounded-full">
            {activeFiltersCount}
          </span>
        )}
        <ChevronDown 
          className={`w-4 h-4 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
          aria-hidden="true"
        />
      </button>

      {/* Filter Dropdown */}
      {isOpen && (
        <div 
          className="absolute top-full right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-200 p-4 z-50 animate-fade-in-down"
          role="dialog"
          aria-label="Фильтры отзывов"
        >
          {/* Rating Filter */}
          <div className="mb-4">
            <label className="text-sm font-semibold text-gray-900 mb-2 block">
              Рейтинг
            </label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">от</span>
              <input
                type="range"
                min="0"
                max="5"
                step="0.5"
                value={filters.minRating}
                onChange={(e) => handleFilterChange('minRating', parseFloat(e.target.value))}
                className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary"
                aria-label="Минимальный рейтинг"
              />
              <span className="text-sm text-gray-600 w-8 text-center">{filters.minRating}</span>
              <span className="text-sm text-gray-600">до</span>
              <input
                type="range"
                min="0"
                max="5"
                step="0.5"
                value={filters.maxRating}
                onChange={(e) => handleFilterChange('maxRating', parseFloat(e.target.value))}
                className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary"
                aria-label="Максимальный рейтинг"
              />
              <span className="text-sm text-gray-600 w-8 text-center">{filters.maxRating}</span>
            </div>
          </div>

          {/* Media Filters */}
          <div className="mb-4">
            <label className="text-sm font-semibold text-gray-900 mb-2 block">
              Медиа
            </label>
            <div className="flex flex-wrap gap-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.withPhotos}
                  onChange={(e) => handleFilterChange('withPhotos', e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-2 focus:ring-primary focus:ring-offset-2 cursor-pointer"
                  aria-label="Только с фото"
                />
                <span className="text-sm text-gray-700">С фото</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.withVideos}
                  onChange={(e) => handleFilterChange('withVideos', e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-2 focus:ring-primary focus:ring-offset-2 cursor-pointer"
                  aria-label="Только с видео"
                />
                <span className="text-sm text-gray-700">С видео</span>
              </label>
            </div>
          </div>

          {/* Response Filter */}
          <div className="mb-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.withResponse}
                onChange={(e) => handleFilterChange('withResponse', e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-2 focus:ring-primary focus:ring-offset-2 cursor-pointer"
                aria-label="Только с ответом продавца"
              />
              <span className="text-sm text-gray-700">С ответом продавца</span>
            </label>
          </div>

          {/* Date Range Filter */}
          <div className="mb-4">
            <label className="text-sm font-semibold text-gray-900 mb-2 block">
              Период
            </label>
            <select
              value={filters.dateRange}
              onChange={(e) => handleFilterChange('dateRange', e.target.value as ReviewFiltersState['dateRange'])}
              className="w-full px-3 py-2 text-sm text-gray-700 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 cursor-pointer transition-all duration-200"
              aria-label="Период отзывов"
            >
              <option value="all">За все время</option>
              <option value="week">За неделю</option>
              <option value="month">За месяц</option>
              <option value="year">За год</option>
            </select>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-4 border-t border-gray-100">
            <button
              onClick={handleClearFilters}
              onKeyDown={(e) => handleKeyDown(e, handleClearFilters)}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
              aria-label="Очистить фильтры"
            >
              <X className="w-4 h-4" aria-hidden="true" />
              <span>Очистить</span>
            </button>
            <button
              onClick={() => setIsOpen(false)}
              onKeyDown={(e) => handleKeyDown(e, () => setIsOpen(false))}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary-dark rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              aria-label="Применить фильтры"
            >
              Применить
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReviewFilters;
