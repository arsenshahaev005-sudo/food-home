/**
 * Компонент истории поиска.
 * 
 * Обоснование: Позволяет пользователям быстро находить ранее выполненные поисковые запросы.
 * Устраняет необходимость повторно вводить те же запросы.
 */

'use client';

import React, { useState, useEffect } from 'react';
import { getSearchHistory, saveSearchToHistory } from '../../lib/api/search';

interface SearchHistoryItem {
  id: string;
  query: string;
  results_count: number;
  created_at: string;
}

interface SearchHistoryProps {
  token: string;
  onSelect: (query: string) => void;
}

const SearchHistory: React.FC<SearchHistoryProps> = ({ token, onSelect }) => {
  const [history, setHistory] = useState<SearchHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Load search history on mount
  useEffect(() => {
    const loadHistory = async () => {
      if (!token) return;

      setLoading(true);
      try {
        const data = await getSearchHistory(token);
        setHistory(data);
      } catch (error) {
        console.error('Error loading search history:', error);
      } finally {
        setLoading(false);
      }
    };

    loadHistory();
  }, [token]);

  const handleSelectHistory = (item: SearchHistoryItem) => {
    onSelect(item.query);
    // Save to history again to update timestamp
    saveSearchToHistory(item.query, token).catch(console.error);
  };

  const handleClearHistory = async () => {
    // TODO: Implement clear history API
    setHistory([]);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Только что';
    if (diffMins < 60) return `${diffMins} мин. назад`;
    if (diffHours < 24) return `${diffHours} ч. назад`;
    if (diffDays < 7) return `${diffDays} дн. назад`;
    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
  };

  if (loading) {
    return (
      <div className="p-4">
        <div className="animate-pulse flex space-y-3">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold text-lg">История поиска</h3>
        {history.length > 0 && (
          <button
            onClick={handleClearHistory}
            className="text-sm text-gray-500 hover:text-red-500 transition-colors"
            aria-label="Очистить историю поиска"
          >
            Очистить
          </button>
        )}
      </div>

      {history.length === 0 ? (
        <p className="text-gray-500 text-center py-4">История поиска пуста</p>
      ) : (
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {history.map((item) => (
            <div
              key={item.id}
              className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 flex justify-between items-center group cursor-pointer transition-colors"
              onClick={() => handleSelectHistory(item)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  handleSelectHistory(item);
                }
              }}
            >
              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-900 truncate">
                  {item.query}
                </div>
                <div className="text-xs text-gray-500 mt-1 flex items-center gap-2">
                  <span>{item.results_count} результатов</span>
                  <span>•</span>
                  <span>{formatDate(item.created_at)}</span>
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect(item.query);
                }}
                className="ml-2 text-gray-400 hover:text-orange-600 transition-colors opacity-0 group-hover:opacity-100"
                aria-label={`Повторить поиск: ${item.query}`}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 0116 0zm-1-13a1 1 0 00-.707.293l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414l3-3a1 1 0 00.293-.707zM9.5 7a1.5 1.5 0 100-3 1.5 1.5 0 013 0z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SearchHistory;
