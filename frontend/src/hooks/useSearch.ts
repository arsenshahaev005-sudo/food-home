/**
 * Custom hook для работы с поиском.
 * 
 * Обоснование: Устраняет проблему необходимости повторно вводить те же поисковые запросы.
 * Позволяет пользователям быстро находить ранее выполненные поисковые запросы.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  getSearchAutocomplete,
  getSearchHistory,
  saveSearchToHistory,
  getSavedSearches,
  saveSearch,
  deleteSavedSearch,
} from '../lib/api/search';

interface SearchHistoryItem {
  id: string;
  query: string;
  results_count: number;
  created_at: string;
}

interface SavedSearchItem {
  id: string;
  name: string;
  query_params: Record<string, any>;
  created_at: string;
}

interface UseSearchOptions {
  debounceDelay?: number;
  saveHistory?: boolean;
}

interface UseSearchReturn {
  query: string;
  setQuery: (query: string) => void;
  suggestions: string[];
  history: SearchHistoryItem[];
  savedSearches: SavedSearchItem[];
  loading: boolean;
  error: string | null;
  handleSearch: () => void;
  handleSaveSearch: () => Promise<void>;
  handleDeleteSavedSearch: () => Promise<void>;
  loadHistory: () => Promise<void>;
  loadSavedSearches: () => Promise<void>;
}

export function useSearch(
  token: string | undefined,
  options: UseSearchOptions = {}
): UseSearchReturn {
  const { debounceDelay = 300, saveHistory = true } = options;

  const [query, setQuery] = useState<string>('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [history, setHistory] = useState<SearchHistoryItem[]>([]);
  const [savedSearches, setSavedSearches] = useState<SavedSearchItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [debounceTimeout, setDebounceTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);

  // Debounced search function
  const handleSearch = useCallback(async (searchQuery: string) => {
    setQuery(searchQuery);
    setError(null);

    // Clear previous timeout
    if (debounceTimeout) {
      clearTimeout(debounceTimeout);
    }

    if (!searchQuery.trim()) {
      setSuggestions([]);
      return;
    }

    setLoading(true);

    // Set new timeout for debounced search
    const timeout = setTimeout(async () => {
      try {
        const results = await getSearchAutocomplete(searchQuery, token);
        const suggestions = results.map((item: any) => item.query || item.name || item);
        setSuggestions(suggestions);
      } catch (err: any) {
        setError(err.message || 'Ошибка при поиске');
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, debounceDelay);

    setDebounceTimeout(timeout);
  }, [token, debounceDelay, debounceTimeout]);

  // Save search to history
  const handleSaveSearch = useCallback(async (name: string, queryParams: Record<string, any>) => {
    if (!token || !queryParams.trim()) return;

    try {
      // Save to history
      if (saveHistory) {
        await saveSearchToHistory(query, token);
      }

      // Save to saved searches
      await saveSearch(JSON.stringify(queryParams), name, token);
      
      // Reload history and saved searches
      await loadHistory();
      await loadSavedSearches();
    } catch (err: any) {
      setError(err.message || 'Ошибка при сохранении поиска');
    }
  }, [token, query, saveHistory]);

  // Delete saved search
  const handleDeleteSavedSearch = useCallback(async (id: string) => {
    if (!token) return;

    try {
      await deleteSavedSearch(id, token);
      await loadSavedSearches();
    } catch (err: any) {
      setError(err.message || 'Ошибка при удалении сохраненного поиска');
    }
  }, [token]);

  // Load search history
  const loadHistory = useCallback(async () => {
    if (!token) return;

    try {
      const data = await getSearchHistory(token);
      setHistory(data);
    } catch (err: any) {
      setError(err.message || 'Ошибка при загрузке истории поиска');
    }
  }, [token]);

  // Load saved searches
  const loadSavedSearches = useCallback(async () => {
    if (!token) return;

    try {
      const data = await getSavedSearches(token);
      setSavedSearches(data);
    } catch (err: any) {
      setError(err.message || 'Ошибка при загрузке сохраненных поисков');
    }
  }, [token]);

  // Load history and saved searches on mount
  useEffect(() => {
    if (token) {
      loadHistory();
      loadSavedSearches();
    }
  }, [token, loadHistory, loadSavedSearches]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeout) {
        clearTimeout(debounceTimeout);
      }
    };
  }, [debounceTimeout]);

  return {
    query,
    setQuery,
    suggestions,
    history,
    savedSearches,
    loading,
    error,
    handleSearch,
    handleSaveSearch,
    handleDeleteSavedSearch,
    loadHistory,
    loadSavedSearches,
  };
}

export default useSearch;
