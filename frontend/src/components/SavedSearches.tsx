'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { getSavedSearches, saveSearch, deleteSavedSearch } from '../lib/api/search';
import { SavedSearch } from '../types/api';

interface SavedSearchesProps {
  token: string;
  onSelect: (search: SavedSearch) => void;
}

const SavedSearches: React.FC<SavedSearchesProps> = ({ token, onSelect }) => {
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newSearchName, setNewSearchName] = useState('');
  const [showSaveForm, setShowSaveForm] = useState(false);

  const loadSavedSearches = useCallback(async () => {
    try {
      setLoading(true);
      const searches = await getSavedSearches(token);
      setSavedSearches(searches);
    } catch (error) {
      console.error('Error loading saved searches:', error);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadSavedSearches();
  }, [loadSavedSearches]);

  const handleSaveCurrentSearch = async () => {
    if (!newSearchName.trim()) {
      alert('Пожалуйста, введите название для сохраненного поиска');
      return;
    }

    try {
      setSaving(true);
      // Get current URL parameters to save as query_params
      const queryParams = new URLSearchParams(window.location.search);
      const paramsObject: Record<string, unknown> = {};

      for (const [key, value] of queryParams.entries()) {
        paramsObject[key] = value;
      }

      await saveSearch(JSON.stringify(paramsObject), newSearchName, token);
      await loadSavedSearches();
      setNewSearchName('');
      setShowSaveForm(false);
    } catch (error) {
      console.error('Error saving search:', error);
      alert('Ошибка при сохранении поиска');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSearch = async (id: string) => {
    if (!confirm('Вы уверены, что хотите удалить этот сохраненный поиск?')) {
      return;
    }

    try {
      await deleteSavedSearch(id, token);
      await loadSavedSearches();
    } catch (error) {
      console.error('Error deleting saved search:', error);
      alert('Ошибка при удалении поиска');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="p-4">
        <div className="animate-pulse flex space-x-4">
          <div className="flex-1 space-y-4 py-1">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold text-lg">Сохраненные поиски</h3>
        <button
          onClick={() => setShowSaveForm(!showSaveForm)}
          className="px-3 py-1 bg-orange-500 text-white rounded hover:bg-orange-600 transition-colors"
        >
          + Сохранить
        </button>
      </div>

      {showSaveForm && (
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <div className="flex gap-2">
            <input
              type="text"
              value={newSearchName}
              onChange={(e) => setNewSearchName(e.target.value)}
              placeholder="Название поиска..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
            <button
              onClick={handleSaveCurrentSearch}
              disabled={saving}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
            >
              {saving ? 'Сохранение...' : 'Сохранить'}
            </button>
            <button
              onClick={() => setShowSaveForm(false)}
              className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
            >
              Отмена
            </button>
          </div>
        </div>
      )}

      {savedSearches.length === 0 ? (
        <p className="text-gray-500 text-center py-4">Нет сохраненных поисков</p>
      ) : (
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {Array.isArray(savedSearches) && savedSearches.map((search) => (
            <div
              key={search.id}
              className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 flex justify-between items-center group"
            >
              <div className="flex-1 min-w-0">
                <div 
                  className="font-medium truncate cursor-pointer hover:text-orange-600"
                  onClick={() => onSelect(search)}
                >
                  {search.name}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {formatDate(search.created_at)}
                </div>
              </div>
              <button
                onClick={() => handleDeleteSearch(search.id)}
                className="ml-2 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label="Удалить сохраненный поиск"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SavedSearches;