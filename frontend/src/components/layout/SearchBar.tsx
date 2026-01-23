'use client';

import { useState, useRef, useEffect } from 'react';
import { Search, X } from 'lucide-react';

export interface SearchBarProps {
  onSearch?: (query: string) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
}

const SearchBar = ({ 
  onSearch, 
  placeholder = 'Поиск блюд...',
  className = '',
  autoFocus = false
}: SearchBarProps) => {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  const handleSearch = () => {
    if (onSearch && query.trim()) {
      onSearch(query.trim());
    }
  };

  const handleClear = () => {
    setQuery('');
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleKeyDown = (event: { key: string }) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleSearch();
    }
    if (event.key === 'Escape') {
      setIsFocused(false);
      inputRef.current?.blur();
    }
  };

  return (
    <div className={`relative ${className}`}>
      <div className={`relative flex items-center transition-all duration-300 ${
        isFocused ? 'ring-2 ring-primary ring-offset-2' : ''
      }`}>
        {/* Search Icon */}
        <div className="absolute left-3 text-gray-400 pointer-events-none" aria-hidden="true">
          <Search className="w-5 h-5" />
        </div>

        {/* Search Input */}
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full pl-10 pr-24 py-2.5 text-base text-gray-900 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:bg-white focus:border-primary transition-all duration-200"
          aria-label={placeholder}
          aria-autocomplete="list"
          aria-controls="search-results"
        />

        {/* Clear Button */}
        {query && (
          <button
            onClick={handleClear}
            className="absolute right-12 text-gray-400 hover:text-gray-600 transition-colors focus:outline-none focus:text-gray-600"
            aria-label="Очистить поиск"
            type="button"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        )}

        {/* Search Button */}
        <button
          onClick={handleSearch}
          className="absolute right-1 px-3 py-1.5 bg-primary text-white rounded-md hover:bg-primary-dark active:scale-95 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          aria-label="Найти"
          type="button"
        >
          <Search className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>

      {/* Search Status */}
      {isFocused && query.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 p-3 bg-white rounded-lg shadow-lg border border-gray-200 z-50 animate-fade-in-down">
          <p className="text-sm text-gray-600">
            Нажмите <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-xs font-mono">Enter</kbd> для поиска
            <span className="mx-1">или</span>
            <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-xs font-mono">Esc</kbd> для отмены
          </p>
        </div>
      )}
    </div>
  );
};

export default SearchBar;
