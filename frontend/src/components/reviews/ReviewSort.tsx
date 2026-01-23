'use client';

import { ArrowUpDown } from 'lucide-react';

export type ReviewSortOption = 'newest' | 'oldest' | 'highest' | 'lowest' | 'mostHelpful';

export interface ReviewSortProps {
  value: ReviewSortOption;
  onChange: (value: ReviewSortOption) => void;
  className?: string;
}

const ReviewSort = ({ value, onChange, className = '' }: ReviewSortProps) => {
  const sortOptions: { value: ReviewSortOption; label: string }[] = [
    { value: 'newest', label: 'Сначала новые' },
    { value: 'oldest', label: 'Сначала старые' },
    { value: 'highest', label: 'По рейтингу (высокий)' },
    { value: 'lowest', label: 'По рейтингу (низкий)' },
    { value: 'mostHelpful', label: 'По полезности' }
  ];

  const handleKeyDown = (event: { key: string }, optionValue: ReviewSortOption) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onChange(optionValue);
    }
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <ArrowUpDown className="w-4 h-4 text-gray-500" aria-hidden="true" />
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value as ReviewSortOption)}
          className="appearance-none pl-8 pr-10 py-2 text-sm text-gray-700 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 cursor-pointer transition-all duration-200"
          aria-label="Сортировка отзывов"
        >
          {sortOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {/* Custom Arrow */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-gray-500"
            aria-hidden="true"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </div>
    </div>
  );
};

export default ReviewSort;
