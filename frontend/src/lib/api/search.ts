import { apiGetAuth, apiPost, apiDelete } from '../api';
import { SearchHistoryItem, SavedSearch } from '../../types/api';

// Autocomplete search
export async function getSearchAutocomplete(query: string, token?: string) {
  const url = `/api/dishes/autocomplete/?q=${encodeURIComponent(query)}`;
  if (token) {
    // Use apiGetAuth if we have a token
    return fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}${url}`, {
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    }).then(r => r.json());
  } else {
    // Use fetch without auth if no token
    return fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}${url}`).then(r => r.json());
  }
}

// Search history
export async function getSearchHistory(token: string) {
  return apiGetAuth<SearchHistoryItem[]>(`/api/search-history/`, token);
}

export async function saveSearchToHistory(query: string, token: string) {
  return apiPost(`/api/search-history/`, { query }, token);
}

// Saved searches
export async function getSavedSearches(token: string) {
  return apiGetAuth<SavedSearch[]>(`/api/saved-searches/`, token);
}

export async function saveSearch(query: string, name: string, token: string) {
  return apiPost(`/api/saved-searches/`, { query, name }, token);
}

export async function deleteSavedSearch(id: string, token: string) {
  return apiDelete(`/api/saved-searches/${id}/`, token);
}