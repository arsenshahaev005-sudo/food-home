import { Dish } from '../../types/api';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// Helper function for authenticated GET requests
async function apiGetAuth<T>(path: string, token: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      'Accept': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  });
  
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: `API Error ${res.status}` }));
    throw new Error(errorData.detail || `API Error ${res.status}`);
  }
  
  const json = await res.json();
  return json as T;
}

// Helper function for authenticated POST requests
async function apiPost<T>(path: string, body: unknown, token: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: `API Error ${res.status}` }));
    throw new Error(errorData.detail || `API Error ${res.status}`);
  }

  const json = await res.json();
  return json as T;
}

// Helper function for authenticated DELETE requests
async function apiDelete(path: string, token: string): Promise<void> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: `API Error ${res.status}` }));
    throw new Error(errorData.detail || `API Error ${res.status}`);
  }
}

// Get all favorite dishes
export async function getFavorites(token: string) {
  return apiGetAuth<Dish[]>(`/api/favorites/`, token);
}

// Add dish to favorites
export async function addToFavorites(dishId: string, token: string) {
  return apiPost(`/api/favorites/`, { dish: dishId }, token);
}

// Remove dish from favorites
export async function removeFromFavorites(favoriteId: string, token: string) {
  return apiDelete(`/api/favorites/${favoriteId}/`, token);
}

// Toggle favorite status for a dish
export async function toggleFavorite(dishId: string, token: string) {
  return apiPost(`/api/favorites/${dishId}/toggle/`, {}, token);
}