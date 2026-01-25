/**
 * API клиент для работы с отзывами.
 * 
 * Обоснование: Отзывы сильно влияют на решение о покупке.
 * Фотоотзывы, видеоотзывы, детализация и ответ продавца
 * повышают доверие пользователей.
 */

import { BASE_URL } from '../api';

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
  // Extract data field if response has format { success: true, data: ... }
  if (json && typeof json === 'object' && 'success' in json && 'data' in json) {
    return json.data as T;
  }
  return json as T;
}

// Helper function for authenticated POST requests
async function apiPost<T>(path: string, body: any, token: string): Promise<T> {
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
  // Extract data field if response has format { success: true, data: ... }
  if (json && typeof json === 'object' && 'success' in json && 'data' in json) {
    return json.data as T;
  }
  return json as T;
}

// Helper function for authenticated POST requests with multipart/form-data
async function apiPostMultipart<T>(path: string, formData: FormData, token: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: formData
  });
  
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: `API Error ${res.status}` }));
    throw new Error(errorData.detail || `API Error ${res.status}`);
  }
  
  const json = await res.json();
  // Extract data field if response has format { success: true, data: ... }
  if (json && typeof json === 'object' && 'success' in json && 'data' in json) {
    return json.data as T;
  }
  return json as T;
}

// Helper function for authenticated PATCH requests
async function apiPatch<T>(path: string, body: any, token: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'PATCH',
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
  // Extract data field if response has format { success: true, data: ... }
  if (json && typeof json === 'object' && 'success' in json && 'data' in json) {
    return json.data as T;
  }
  return json as T;
}

export interface Review {
  id: string;
  order: string;
  dish_name: string;
  dish_photo?: string;
  rating_taste: number;
  rating_appearance: number;
  rating_service: number;
  rating_portion?: number;
  rating_packaging?: number;
  comment: string;
  created_at: string;
  is_updated: boolean;
  photo?: string;
  video?: string;
  dish_additional_photos?: string[];
  seller_response?: string;
  seller_response_created_at?: string;
  seller_answer?: string;
  user?: {
    id: string;
    first_name: string;
    last_name: string;
  };
  finished_photo?: string;
}

export interface ReviewFormData {
  order: string;
  rating_taste: number;
  rating_appearance: number;
  rating_service: number;
  rating_portion?: number;
  rating_packaging?: number;
  comment?: string;
  photo?: File;
  video?: File;
  dish_additional_photos?: File[];
}

export interface SellerResponseFormData {
  response: string;
}

/**
 * Получить отзывы по производителю
 */
export async function getProducerReviews(token: string, producerId: string, params?: {
  sort_by?: 'created_at' | 'rating_taste' | 'rating_appearance' | 'rating_service';
  sort_order?: 'asc' | 'desc';
}): Promise<Review[]> {
  const searchParams = new URLSearchParams();
  if (params?.sort_by) {
    searchParams.append('sort_by', params.sort_by);
  }
  if (params?.sort_order) {
    searchParams.append('sort_order', params.sort_order);
  }
  const query = searchParams.toString();
  return apiGetAuth<Review[]>(`/api/reviews/?producer=${producerId}${query ? `&${query}` : ''}`, token);
}

/**
 * Получить отзывы по блюду
 */
export async function getDishReviews(token: string, dishId: string, params?: {
  sort_by?: 'created_at' | 'rating_taste' | 'rating_appearance' | 'rating_service';
  sort_order?: 'asc' | 'desc';
}): Promise<Review[]> {
  const searchParams = new URLSearchParams();
  if (params?.sort_by) {
    searchParams.append('sort_by', params.sort_by);
  }
  if (params?.sort_order) {
    searchParams.append('sort_order', params.sort_order);
  }
  const query = searchParams.toString();
  return apiGetAuth<Review[]>(`/api/reviews/?dish=${dishId}${query ? `&${query}` : ''}`, token);
}

/**
 * Получить отзыв по ID
 */
export async function getReview(token: string, reviewId: string): Promise<Review> {
  return apiGetAuth<Review>(`/api/reviews/${reviewId}/`, token);
}

/**
 * Создать отзыв
 */
export async function createReview(token: string, data: ReviewFormData): Promise<Review> {
  const formData = new FormData();
  formData.append('order', data.order);
  formData.append('rating_taste', data.rating_taste.toString());
  formData.append('rating_appearance', data.rating_appearance.toString());
  formData.append('rating_service', data.rating_service.toString());
  
  if (data.rating_portion !== undefined) {
    formData.append('rating_portion', data.rating_portion.toString());
  }
  if (data.rating_packaging !== undefined) {
    formData.append('rating_packaging', data.rating_packaging.toString());
  }
  if (data.comment) {
    formData.append('comment', data.comment);
  }
  if (data.photo) {
    formData.append('photo', data.photo);
  }
  if (data.video) {
    formData.append('video', data.video);
  }
  if (data.dish_additional_photos && data.dish_additional_photos.length > 0) {
    data.dish_additional_photos.forEach((photo, index) => {
      formData.append(`dish_additional_photos`, photo);
    });
  }

  return apiPostMultipart<Review>('/api/reviews/', formData, token);
}

/**
 * Обновить отзыв
 */
export async function updateReview(token: string, reviewId: string, data: Partial<ReviewFormData>): Promise<Review> {
  const formData = new FormData();
  
  if (data.rating_taste !== undefined) {
    formData.append('rating_taste', data.rating_taste.toString());
  }
  if (data.rating_appearance !== undefined) {
    formData.append('rating_appearance', data.rating_appearance.toString());
  }
  if (data.rating_service !== undefined) {
    formData.append('rating_service', data.rating_service.toString());
  }
  if (data.rating_portion !== undefined) {
    formData.append('rating_portion', data.rating_portion.toString());
  }
  if (data.rating_packaging !== undefined) {
    formData.append('rating_packaging', data.rating_packaging.toString());
  }
  if (data.comment !== undefined) {
    formData.append('comment', data.comment);
  }
  if (data.photo !== undefined) {
    formData.append('photo', data.photo);
  }
  if (data.video !== undefined) {
    formData.append('video', data.video);
  }
  if (data.dish_additional_photos !== undefined) {
    data.dish_additional_photos.forEach((photo, index) => {
      formData.append(`dish_additional_photos`, photo);
    });
  }

  return apiPostMultipart<Review>(`/api/reviews/${reviewId}/`, formData, token);
}

/**
 * Добавить ответ продавца на отзыв
 */
export async function addSellerResponse(token: string, reviewId: string, data: SellerResponseFormData): Promise<Review> {
  return apiPost<Review>(`/api/reviews/${reviewId}/seller-response/`, data, token);
}
