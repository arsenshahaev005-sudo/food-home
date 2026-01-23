'use client';

import React, { useState, useEffect, useRef, KeyboardEvent } from 'react';
import { getSearchAutocomplete, getSearchHistory, saveSearchToHistory } from '../lib/api/search';

interface SearchAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  placeholder?: string;
}

interface SearchSuggestion {
  id?: string;
  query: string;
  type: 'autocomplete' | 'history';
}

// Helper function to get cookie value
function getCookie(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift();
  return undefined;
}

const SearchAutocomplete: React.FC<SearchAutocompleteProps> = ({ 
  value, 
  onChange, 
  onSubmit, 
  placeholder = "Поиск блюд..." 
}) => {
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [isLoading, setIsLoading] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const token = getCookie('accessToken'); // Get token from cookies
  
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  
  // Debounced search function
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    if (value.trim().length > 0) {
      setIsLoading(true);
      
      timeoutId = setTimeout(async () => {
        try {
          // Fetch autocomplete suggestions
          const autocompleteResults = await getSearchAutocomplete(value, token);
          
          // Format autocomplete results
          const formattedAutocomplete = autocompleteResults.map((item: any) => ({
            query: item.query || item.name || item,
            type: 'autocomplete' as const
          }));
          
          // Combine with search history
          const historyWithTypes = searchHistory.slice(0, 5).map(query => ({
            query,
            type: 'history' as const
          }));
          
          setSuggestions([...formattedAutocomplete, ...historyWithTypes]);
          setShowSuggestions(true);
          setActiveIndex(-1);
        } catch (error) {
          console.error('Error fetching autocomplete:', error);
          setSuggestions([]);
        } finally {
          setIsLoading(false);
        }
      }, 300); // Debounce for 300ms
    } else {
      // Show only history when input is empty
      const historyWithTypes = searchHistory.slice(0, 10).map(query => ({
        query,
        type: 'history' as const
      }));
      setSuggestions(historyWithTypes);
      setShowSuggestions(true);
    }
    
    return () => clearTimeout(timeoutId);
  }, [value, token, searchHistory]);

  // Load search history on mount
  useEffect(() => {
    const loadHistory = async () => {
      if (token) {
        try {
          const history = await getSearchHistory(token);
          setSearchHistory(history.map(item => item.query));
        } catch (error) {
          console.error('Error loading search history:', error);
        }
      }
    };
    
    loadHistory();
  }, [token]);

  // Handle clicks outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        inputRef.current && 
        !inputRef.current.contains(event.target as Node) &&
        suggestionsRef.current && 
        !suggestionsRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (suggestion: SearchSuggestion) => {
    onChange(suggestion.query);
    setShowSuggestions(false);
    onSubmit(suggestion.query);
    
    // Save to history if not already saved
    if (token && suggestion.type === 'autocomplete') {
      saveSearchToHistory(suggestion.query, token).catch(console.error);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(prev => Math.min(prev + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(prev => Math.max(prev - 1, -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex >= 0 && suggestions[activeIndex]) {
        handleSelect(suggestions[activeIndex]);
      } else if (value.trim()) {
        onSubmit(value);
        setShowSuggestions(false);
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  const handleSaveCurrentSearch = () => {
    if (value.trim() && token) {
      saveSearchToHistory(value, token)
        .then(() => {
          // Refresh history
          getSearchHistory(token).then(history => {
            setSearchHistory(history.map(item => item.query));
          }).catch(console.error);
        })
        .catch(console.error);
    }
  };

  return (
    <div className="relative w-full">
      <div className="relative">
        <input
          ref={inputRef}
          type="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (value.trim().length > 0 || searchHistory.length > 0) {
              setShowSuggestions(true);
            }
          }}
          placeholder={placeholder}
          className="w-full px-4 py-3 pr-10 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          aria-autocomplete="list"
          aria-expanded={showSuggestions}
          autoComplete="off"
        />
        
        {isLoading && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-orange-500"></div>
          </div>
        )}
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <div 
          ref={suggestionsRef}
          className="absolute z-10 mt-1 w-full bg-white shadow-lg rounded-md border border-gray-200 max-h-80 overflow-y-auto"
        >
          <ul className="py-1">
            {suggestions.map((suggestion, index) => (
              <li
                key={`${suggestion.type}-${index}`}
                className={`px-4 py-2 cursor-pointer hover:bg-gray-100 ${
                  index === activeIndex ? 'bg-orange-50' : ''
                }`}
                onClick={() => handleSelect(suggestion)}
                onMouseEnter={() => setActiveIndex(index)}
              >
                <div className="flex justify-between items-center">
                  <span>{suggestion.query}</span>
                  <span className="text-xs text-gray-500 capitalize">
                    {suggestion.type === 'history' ? 'История' : 'Поиск'}
                  </span>
                </div>
              </li>
            ))}
          </ul>
          
          {value.trim() && (
            <div className="border-t border-gray-200 p-2">
              <button
                onClick={handleSaveCurrentSearch}
                className="w-full text-left px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded"
              >
                💾 Сохранить этот поиск
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchAutocomplete;