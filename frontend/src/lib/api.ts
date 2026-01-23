export const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// ==================== Retry Logic ====================

/**
 * Функция задержки для повторных попыток
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Интерфейс для конфигурации повторных попыток
 */
interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  retryableStatuses: number[];
}

/**
 * Конфигурация по умолчанию для повторных попыток
 */
const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000, // 1 секунда
  retryableStatuses: [429, 503, 502, 504], // Too Many Requests, Service Unavailable, Bad Gateway, Gateway Timeout
};

/**
 * Функция для выполнения запроса с повторными попытками
 */
async function fetchWithRetry<T>(
  fetchFn: () => Promise<Response>,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): Promise<Response> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      const response = await fetchFn();
      
      // Если запрос успешен или статус не подлежит повторению, возвращаем ответ
      if (response.ok || !config.retryableStatuses.includes(response.status)) {
        return response;
      }
      
      // Логируем попытку повтора
      console.warn(`API Error ${response.status} - Retry attempt ${attempt + 1}/${config.maxRetries}`);
      
      // Если это не последняя попытка, ждем перед повтором
      if (attempt < config.maxRetries) {
        const delay = config.baseDelay * Math.pow(2, attempt); // Экспоненциальная задержка
        console.log(`Waiting ${delay}ms before retry...`);
        await sleep(delay);
      } else {
        // Если все попытки исчерпаны, создаем ошибку
        let errorData: any = null;
        try {
          errorData = await response.json();
        } catch {
          errorData = { detail: `API Error ${response.status}` };
        }
        throw buildApiError(response, errorData);
      }
    } catch (error) {
      lastError = error as Error;
      
      // Если это не последняя попытка, ждем перед повтором
      if (attempt < config.maxRetries) {
        const delay = config.baseDelay * Math.pow(2, attempt);
        console.log(`Error occurred, waiting ${delay}ms before retry...`, error);
        await sleep(delay);
      }
    }
  }
  
  // Если все попытки исчерпаны и последняя ошибка существует, выбрасываем её
  if (lastError) {
    throw lastError;
  }
  
  // Это не должно произойти, но для TypeScript
  throw new Error('Max retries exceeded');
}

// ==================== Request Caching ====================

/**
 * Интерфейс для кэшированного ответа
 */
interface CachedResponse<T> {
  data: T;
  timestamp: number;
}

/**
 * Простая реализация кэша для GET запросов
 */
class RequestCache {
  private cache: Map<string, CachedResponse<any>>;
  private defaultTTL: number;
  
  constructor(defaultTTL: number = 60000) { // 1 минута по умолчанию
    this.cache = new Map();
    this.defaultTTL = defaultTTL;
  }
  
  /**
   * Получить данные из кэша
   */
  get<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (!cached) {
      return null;
    }
    
    // Проверяем, не истекло ли время жизни кэша
    const now = Date.now();
    if (now - cached.timestamp > this.defaultTTL) {
      this.cache.delete(key);
      return null;
    }
    
    console.log(`Cache hit for key: ${key}`);
    return cached.data as T;
  }
  
  /**
   * Сохранить данные в кэш
   */
  set<T>(key: string, data: T, ttl?: number): void {
    const cached: CachedResponse<T> = {
      data,
      timestamp: Date.now(),
    };
    this.cache.set(key, cached);
    console.log(`Cached data for key: ${key}`);
  }
  
  /**
   * Очистить кэш по ключу
   */
  delete(key: string): void {
    this.cache.delete(key);
  }
  
  /**
   * Очистить весь кэш
   */
  clear(): void {
    this.cache.clear();
  }
  
  /**
   * Очистить устаревшие записи
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, cached] of this.cache.entries()) {
      if (now - cached.timestamp > this.defaultTTL) {
        this.cache.delete(key);
      }
    }
  }
}

// Создаем экземпляр кэша
const requestCache = new RequestCache(60000); // 1 минута

// ==================== Rate Limiting ====================

/**
 * Простая реализация rate limiter
 */
class RateLimiter {
  private queue: Array<() => void>;
  private maxRequestsPerSecond: number;
  private lastRequestTime: number;
  private requestCount: number;
  
  constructor(maxRequestsPerSecond: number = 10) {
    this.queue = [];
    this.maxRequestsPerSecond = maxRequestsPerSecond;
    this.lastRequestTime = 0;
    this.requestCount = 0;
  }
  
  /**
   * Добавить запрос в очередь
   */
  async acquire(): Promise<void> {
    return new Promise((resolve) => {
      this.queue.push(resolve);
      this.processQueue();
    });
  }
  
  /**
   * Обработать очередь запросов
   */
  private async processQueue(): Promise<void> {
    if (this.queue.length === 0) {
      return;
    }
    
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    // Если прошло больше секунды, сбрасываем счетчик
    if (timeSinceLastRequest >= 1000) {
      this.requestCount = 0;
      this.lastRequestTime = now;
    }
    
    // Если не достигнут лимит, выполняем запрос
    if (this.requestCount < this.maxRequestsPerSecond) {
      this.requestCount++;
      const resolve = this.queue.shift();
      if (resolve) {
        resolve();
      }
      
      // Продолжаем обработку очереди
      if (this.queue.length > 0) {
        setTimeout(() => this.processQueue(), 100);
      }
    } else {
      // Если лимит достигнут, ждем и пробуем снова
      setTimeout(() => this.processQueue(), 100);
    }
  }
}

// Создаем экземпляр rate limiter (10 запросов в секунду)
const rateLimiter = new RateLimiter(10);

export function getFullImageUrl(path?: string | null): string {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  return `${BASE_URL}${path.startsWith("/") ? "" : "/"}${path}`;
}

function getCookie(name: string) {
  if (typeof document === "undefined") return "";
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(";").shift();
  return "";
}

async function apiRefreshToken(): Promise<string | null> {
  const refresh = getCookie("refreshToken");
  if (!refresh) return null;
  try {
    const res = await fetch(`${BASE_URL}/api/auth/token/refresh/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh })
    });
    if (!res.ok) throw new Error("Refresh failed");
    const data = await res.json();
    if (data.access) {
       // Update the access token cookie
       document.cookie = `accessToken=${data.access}; path=/; max-age=86400`;
       return data.access;
    }
    return null;
  } catch {
    return null;
  }
}

export type UUID = string;

function buildApiError(res: Response, data: any): Error {
  let message = "";
  if (data) {
    if (typeof data.detail === "string") {
      message = data.detail;
    } else if (Array.isArray(data)) {
      message = data.join(", ");
    } else if (typeof data === "object") {
      const values = Object.values(data);
      if (values.length > 0) {
        const first = values[0];
        if (Array.isArray(first)) {
          message = first.join(", ");
        } else if (typeof first === "string") {
          message = first;
        }
      }
    }
  }
  if (!message) {
    message = `API Error ${res.status}`;
  }
  const err = new Error(message);
  (err as any).detail = message;
  (err as any).data = data ?? { detail: message };
  (err as any).status = res.status;
  return err;
}

async function apiPostMultipart<T>(path: string, body: FormData, token?: string, options?: { useRateLimiter?: boolean; retryConfig?: Partial<RetryConfig> }): Promise<T> {
  const { useRateLimiter = true, retryConfig } = options || {};
  
  const fetchOptions = (t?: string) => ({
    method: 'POST',
    headers: {
      Accept: 'application/json',
      ...(t ? { Authorization: `Bearer ${t}` } : {}),
    },
    body,
  });
  
  // Применяем rate limiting
  if (useRateLimiter) {
    await rateLimiter.acquire();
  }
  
  // Выполняем запрос с повторными попытками
  let res = await fetchWithRetry(
    () => fetch(`${BASE_URL}${path}`, fetchOptions(token)),
    { ...DEFAULT_RETRY_CONFIG, ...retryConfig }
  );
  
  // Если статус 401 и есть токен, пробуем обновить токен
  if (res.status === 401 && token) {
    const newToken = await apiRefreshToken();
    if (newToken) {
      res = await fetchWithRetry(
        () => fetch(`${BASE_URL}${path}`, fetchOptions(newToken)),
        { ...DEFAULT_RETRY_CONFIG, ...retryConfig }
      );
    }
  }
  
  const json = await res.json();
  // Извлекаем поле data из ответа API, если ответ имеет формат { success: true, data: ... }
  if (json && typeof json === 'object' && 'success' in json && 'data' in json) {
    return json.data as T;
  }
  return json as T;
}



export interface Category {
  id: UUID;
  name: string;
  parent?: UUID | null;
  subcategories?: Category[];
}

export interface Producer {
  id: UUID;
  name: string;
  description: string;
  short_description?: string;
  rating: number;
  city: string;
  address?: string;
  logo_url?: string;
  opening_time?: string;
  closing_time?: string;
  delivery_radius_km?: number | string | null;
  delivery_price_to_building?: number | string | null;
  delivery_price_to_door?: number | string | null;
  delivery_time_minutes?: number | null;
  is_hidden?: boolean | null;
  weekly_schedule?: WeeklyScheduleDay[] | null;
  delivery_zones?: DeliveryZone[] | null;
  delivery_pricing_rules?: DeliveryPricingRule[] | null;
}

export interface Topping {
  id: number;
  name: string;
  price: number;
}

export interface Dish {
  id: UUID;
  name: string;
  description: string;
  price: string;
  category: UUID;
  producer: UUID;
  photo: string;
  is_available: boolean;
  is_archived: boolean;
  is_top?: boolean;
  weight: string;
  composition: string;
  manufacturing_time: string;
  shelf_life: string;
  storage_conditions: string;
  dimensions: string;
  fillings: string;
  cooking_time_minutes: number;
  calories: number;
  proteins: string;
  fats: string;
  carbs: string;
  in_cart_count: number;
  min_quantity: number;
  discount_percentage: number;
  max_quantity_per_order: number | null;
  start_sales_at: string | null;
  allow_preorder: boolean;
  images: { id: number; image: string }[];
  toppings: Topping[];
  sales_count?: number;
}

export interface CartItem {
  id: UUID;
  dish: Dish;
  quantity: number;
  price_at_the_moment: string;
  selected_toppings?: any[];
}

export interface Cart {
  id: UUID;
  user: UUID;
  items: CartItem[];
}

export interface Review {
  id: UUID;
  order: UUID;
  rating_taste: number;
  rating_appearance: number;
  rating_service: number;
  comment: string;
  created_at: string;
  is_updated: boolean;
  refund_offered_amount?: string | null;
  refund_accepted: boolean;
  user?: string;
  finished_photo?: string | null;
  dish_photo?: string | null;
  dish_additional_photos?: string[];
  photo?: string | null;
}

export type WeekDayKey =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday';

export interface WeeklyScheduleInterval {
  start: string;
  end: string;
}

export interface WeeklyScheduleDay {
  day: WeekDayKey;
  is_247: boolean;
  intervals: WeeklyScheduleInterval[];
}

export interface DeliveryPricingRule {
  start: string;
  end: string;
  surcharge: number;
}

export interface DeliveryZone {
  name: string;
  radius_km: number;
  price_to_building: number;
  price_to_door: number;
  time_minutes: number;
}

export interface Profile {
  id: UUID;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  is_2fa_enabled: boolean;
  auth_provider: 'LOCAL' | 'GOOGLE';
  disputes_lost: number;
  role: 'CLIENT' | 'SELLER';
  shop_name?: string;
  producer_id?: UUID;
  is_hidden?: boolean | null;
  city?: string;
  address?: string;
  latitude?: number | string | null;
  longitude?: number | string | null;
  opening_time?: string;
  closing_time?: string;
  short_description?: string;
  description?: string;
  delivery_radius_km?: number | string | null;
  delivery_price_to_building?: number | string | null;
  delivery_price_to_door?: number | string | null;
  delivery_time_minutes?: number | null;
  requisites?: any;
  employees?: any[];
  documents?: any[];
  delivery_pricing_rules?: DeliveryPricingRule[] | null;
  delivery_zones?: DeliveryZone[] | null;
  pickup_enabled?: boolean | null;
  logo_url?: string;
  main_category?: string;
  weekly_schedule?: WeeklyScheduleDay[] | null;
}

async function apiGet<T>(path: string, options?: { useCache?: boolean; useRateLimiter?: boolean; retryConfig?: Partial<RetryConfig> }): Promise<T> {
  const { useCache = true, useRateLimiter = true, retryConfig } = options || {};
  
  // Проверяем кэш для GET запросов
  if (useCache) {
    const cachedData = requestCache.get<T>(path);
    if (cachedData !== null) {
      return cachedData;
    }
  }
  
  // Применяем rate limiting
  if (useRateLimiter) {
    await rateLimiter.acquire();
  }
  
  // Выполняем запрос с повторными попытками
  const res = await fetchWithRetry(
    () => fetch(`${BASE_URL}${path}`, {
      next: { revalidate: 0 },
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    }),
    { ...DEFAULT_RETRY_CONFIG, ...retryConfig }
  );
  
  const json = await res.json();
  
  // Извлекаем поле data из ответа API, если ответ имеет формат { success: true, data: ... }
  let result: T;
  if (json && typeof json === 'object' && 'success' in json && 'data' in json) {
    result = json.data as T;
  } else {
    result = json as T;
  }
  
  // Сохраняем результат в кэш
  if (useCache) {
    requestCache.set(path, result);
  }
  
  return result;
}

// Export helper functions for use in other API files
export { apiGetAuth, apiPost, apiPatch, apiDelete, apiPostMultipart };

// Export retry config and cache utilities for external use
export { DEFAULT_RETRY_CONFIG, requestCache, rateLimiter };
export type { RetryConfig };

async function apiGetAuth<T>(path: string, token?: string, options?: { useCache?: boolean; useRateLimiter?: boolean; retryConfig?: Partial<RetryConfig> }): Promise<T> {
  const { useCache = true, useRateLimiter = true, retryConfig } = options || {};
  
  const fetchOptions = (t?: string) => ({
    next: { revalidate: 0 },
    cache: 'no-store' as const,
    headers: {
      Accept: 'application/json',
      ...(t ? { Authorization: `Bearer ${t}` } : {}),
    },
  });
  
  // Проверяем кэш для GET запросов (только если есть токен)
  if (useCache && token) {
    const cacheKey = `${path}_${token}`;
    const cachedData = requestCache.get<T>(cacheKey);
    if (cachedData !== null) {
      return cachedData;
    }
  }
  
  // Применяем rate limiting
  if (useRateLimiter) {
    await rateLimiter.acquire();
  }
  
  // Выполняем запрос с повторными попытками
  let res = await fetchWithRetry(
    () => fetch(`${BASE_URL}${path}`, fetchOptions(token)),
    { ...DEFAULT_RETRY_CONFIG, ...retryConfig }
  );
  
  // Если статус 401 и есть токен, пробуем обновить токен
  if (res.status === 401 && token) {
    const newToken = await apiRefreshToken();
    if (newToken) {
      res = await fetchWithRetry(
        () => fetch(`${BASE_URL}${path}`, fetchOptions(newToken)),
        { ...DEFAULT_RETRY_CONFIG, ...retryConfig }
      );
    }
  }
  
  const json = await res.json();
  
  // Извлекаем поле data из ответа API, если ответ имеет формат { success: true, data: ... }
  let result: T;
  if (json && typeof json === 'object' && 'success' in json && 'data' in json) {
    result = json.data as T;
  } else {
    result = json as T;
  }
  
  // Сохраняем результат в кэш (только если есть токен)
  if (useCache && token) {
    const cacheKey = `${path}_${token}`;
    requestCache.set(cacheKey, result);
  }
  
  return result;
}

async function apiPost<T>(path: string, body?: Record<string, unknown>, token?: string, options?: { useRateLimiter?: boolean; retryConfig?: Partial<RetryConfig> }): Promise<T> {
  const { useRateLimiter = true, retryConfig } = options || {};
  
  const fetchOptions = (t?: string) => ({
    method: 'POST',
    next: { revalidate: 0 },
    cache: 'no-store' as const,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(t ? { Authorization: `Bearer ${t}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  
  // Применяем rate limiting
  if (useRateLimiter) {
    await rateLimiter.acquire();
  }
  
  // Выполняем запрос с повторными попытками
  let res = await fetchWithRetry(
    () => fetch(`${BASE_URL}${path}`, fetchOptions(token)),
    { ...DEFAULT_RETRY_CONFIG, ...retryConfig }
  );
  
  // Если статус 401 и есть токен, пробуем обновить токен
  if (res.status === 401 && token) {
    const newToken = await apiRefreshToken();
    if (newToken) {
      res = await fetchWithRetry(
        () => fetch(`${BASE_URL}${path}`, fetchOptions(newToken)),
        { ...DEFAULT_RETRY_CONFIG, ...retryConfig }
      );
    }
  }
  
  const json = await res.json();
  // Извлекаем поле data из ответа API, если ответ имеет формат { success: true, data: ... }
  if (json && typeof json === 'object' && 'success' in json && 'data' in json) {
    return json.data as T;
  }
  return json as T;
}

async function apiPatch<T>(path: string, body?: Record<string, unknown>, token?: string, options?: { useRateLimiter?: boolean; retryConfig?: Partial<RetryConfig> }): Promise<T> {
  const { useRateLimiter = true, retryConfig } = options || {};
  
  const fetchOptions = (t?: string) => ({
    method: 'PATCH',
    next: { revalidate: 0 },
    cache: 'no-store' as const,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(t ? { Authorization: `Bearer ${t}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  
  // Применяем rate limiting
  if (useRateLimiter) {
    await rateLimiter.acquire();
  }
  
  // Выполняем запрос с повторными попытками
  let res = await fetchWithRetry(
    () => fetch(`${BASE_URL}${path}`, fetchOptions(token)),
    { ...DEFAULT_RETRY_CONFIG, ...retryConfig }
  );
  
  // Если статус 401 и есть токен, пробуем обновить токен
  if (res.status === 401 && token) {
    const newToken = await apiRefreshToken();
    if (newToken) {
      res = await fetchWithRetry(
        () => fetch(`${BASE_URL}${path}`, fetchOptions(newToken)),
        { ...DEFAULT_RETRY_CONFIG, ...retryConfig }
      );
    }
  }
  
  try {
    const json = await res.json();
    // Извлекаем поле data из ответа API, если ответ имеет формат { success: true, data: ... }
    if (json && typeof json === 'object' && 'success' in json && 'data' in json) {
      return json.data as T;
    }
    return json as T;
  } catch {
    return {} as T;
  }
}

async function apiDelete(path: string, token?: string, options?: { useRateLimiter?: boolean; retryConfig?: Partial<RetryConfig> }): Promise<void> {
  const { useRateLimiter = true, retryConfig } = options || {};
  
  const fetchOptions = (t?: string) => ({
    method: 'DELETE',
    headers: {
      ...(t ? { Authorization: `Bearer ${t}` } : {}),
    },
  });
  
  // Применяем rate limiting
  if (useRateLimiter) {
    await rateLimiter.acquire();
  }
  
  // Выполняем запрос с повторными попытками
  let res = await fetchWithRetry(
    () => fetch(`${BASE_URL}${path}`, fetchOptions(token)),
    { ...DEFAULT_RETRY_CONFIG, ...retryConfig }
  );
  
  // Если статус 401 и есть токен, пробуем обновить токен
  if (res.status === 401 && token) {
    const newToken = await apiRefreshToken();
    if (newToken) {
      res = await fetchWithRetry(
        () => fetch(`${BASE_URL}${path}`, fetchOptions(newToken)),
        { ...DEFAULT_RETRY_CONFIG, ...retryConfig }
      );
    }
  }
}

export async function getCategories(params?: Record<string, string | boolean | undefined>): Promise<Category[]> {
  const searchParams = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value));
      }
    });
  }
  const suffix = searchParams.toString() ? `?${searchParams.toString()}` : "";
  return apiGet<Category[]>(`/api/categories/${suffix}`);
}

export async function getProducers(): Promise<Producer[]> {
  return apiGet<Producer[]>("/api/producers/");
}

export async function getDishes(params?: Record<string, string | boolean | undefined>): Promise<Dish[]> {
  const searchParams = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value));
      }
    });
  }
  const suffix = searchParams.toString() ? `?${searchParams.toString()}` : "";
  return apiGet<Dish[]>(`/api/dishes/${suffix}`);
}

export async function getDish(id: UUID): Promise<Dish> {
  return apiGet<Dish>(`/api/dishes/${id}/`);
}

export async function getProducerById(id: UUID): Promise<Producer> {
  return apiGet<Producer>(`/api/producers/${id}/`);
}

export async function getProducerReviews(producerId: UUID): Promise<Review[]> {
  const params = new URLSearchParams();
  params.set('producer', String(producerId));
  return apiGet<Review[]>(`/api/reviews/?${params.toString()}`);
}

export async function createReview(
  body: {
    order: UUID;
    rating_taste: number;
    rating_appearance: number;
    rating_service: number;
    comment?: string;
  },
  token: string,
  photoFile?: File | null
): Promise<Review> {
  if (photoFile) {
    const form = new FormData();
    Object.entries(body).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        form.append(key, String(value));
      }
    });
    form.append('photo', photoFile);
    return apiPostMultipart<Review>("/api/reviews/", form, token);
  }
  return apiPost<Review>("/api/reviews/", body as Record<string, unknown>, token);
}

export async function updateReview(
  id: UUID,
  body: Partial<Pick<Review, 'rating_taste' | 'rating_appearance' | 'rating_service' | 'comment'>>,
  token: string,
  photoFile?: File | null
): Promise<Review> {
  if (photoFile) {
    const form = new FormData();
    Object.entries(body).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        form.append(key, String(value));
      }
    });
    form.append('photo', photoFile);
    const fetchOptions = (t?: string) => ({
      method: 'PATCH',
      headers: {
        Accept: 'application/json',
        ...(t ? { Authorization: `Bearer ${t}` } : {}),
      },
      body: form,
    });

    let res = await fetch(`${BASE_URL}/api/reviews/${id}/`, fetchOptions(token));

    if (res.status === 401 && token) {
      const newToken = await apiRefreshToken();
      if (newToken) {
        res = await fetch(`${BASE_URL}/api/reviews/${id}/`, fetchOptions(newToken));
      }
    }

    if (!res.ok) {
      let errorData: any = null;
      try {
        errorData = await res.json();
      } catch {
        errorData = { detail: `API Error ${res.status}` };
      }
      throw buildApiError(res, errorData);
    }

    const json = await res.json();
    // Извлекаем поле data из ответа API, если ответ имеет формат { success: true, data: ... }
    if (json && typeof json === 'object' && 'success' in json && 'data' in json) {
      return json.data as Review;
    }
    return json as Review;
  }
  return apiPatch<Review>(`/api/reviews/${id}/`, body as Record<string, unknown>, token);
}

export async function acceptReviewRefund(id: UUID, token: string): Promise<{ detail: string }> {
  return apiPost(`/api/reviews/${id}/accept_refund/`, undefined, token);
}

export async function offerReviewRefund(id: UUID, amount: number, token: string): Promise<{ detail: string }> {
  return apiPost(`/api/reviews/${id}/offer_refund/`, { amount }, token);
}

export async function raiseReviewDispute(id: UUID, description: string, reason: string, token: string): Promise<{ detail: string }> {
  return apiPost(`/api/reviews/${id}/raise_dispute/`, { description, reason }, token);
}

export async function getCart(token?: string): Promise<Cart> {
  return apiGetAuth<Cart>(`/api/cart/`, token);
}

export async function cartRemove(dish: UUID, token?: string, selectedToppings: any[] = []): Promise<Cart> {
  return apiPost<Cart>(`/api/cart/remove/`, { dish, selected_toppings: selectedToppings }, token);
}

export async function cartClear(token?: string): Promise<Cart> {
  return apiPost<Cart>(`/api/cart/clear/`, undefined, token);
}

export async function cartAdd(dish: UUID, quantity = 1, token?: string, selectedToppings: any[] = []): Promise<Cart> {
  return apiPost<Cart>(`/api/cart/add/`, { dish, quantity, selected_toppings: selectedToppings }, token);
}

export async function createOrder(body: {
  user_name: string;
  phone: string;
  dish: UUID;
  quantity: number;
  is_gift?: boolean;
  recipient_phone?: string;
  delivery_latitude?: number;
  delivery_longitude?: number;
  delivery_address_text?: string;
  delivery_type?: 'BUILDING' | 'DOOR';
  promo_code_text?: string;
  is_urgent?: boolean;
  selected_toppings?: any[];
  apartment?: string;
  entrance?: string;
  floor?: string;
  intercom?: string;
  delivery_comment?: string;
}, token?: string) {
  return apiPost<{ id: UUID; status?: string; total_price?: string; delivery_price?: string }>(`/api/orders/`, body, token);
}

export async function estimateOrder(body: {
  dish: UUID;
  quantity: number;
  delivery_latitude?: number;
  delivery_longitude?: number;
  delivery_address_text?: string;
  delivery_type?: 'BUILDING' | 'DOOR';
  promo_code_text?: string;
}, token?: string) {
  return apiPost<{ delivery_price: number; total_price: number; discount_amount?: number; estimated_cooking_time?: number }>(
    `/api/orders/estimate/`,
    body as Record<string, unknown>,
    token
  );
}

export async function payOrder(id: UUID, token?: string) {
  return apiPost<{ detail: string; status: string }>(`/api/orders/${id}/pay/`, undefined, token);
}

export async function notifyGiftRecipient(id: UUID, token?: string) {
  return apiPost<{ detail: string; sent_to?: string }>(`/api/orders/${id}/notify_gift_recipient/`, undefined, token);
}

export async function updateGiftDetails(
  id: UUID,
  body: {
    address?: string;
    time?: string;
    delivery_type?: "BUILDING" | "DOOR";
    entrance?: string;
    apartment?: string;
    floor?: string;
    intercom?: string;
    recipient_token?: string;
  }
) {
  return apiPost<{ detail: string; status?: string; min_available_time?: string }>(
    `/api/orders/${id}/update_gift_details/`,
    body as Record<string, unknown>
  );
}

export interface Gift {
  id: UUID;
  state: string;
  amount: string;
  currency: string;
  valid_until: string | null;
  activation_token: string;
  gift_code: string;
}

export interface GiftPreview {
  product_name: string;
  product_description: string;
  amount: string;
  donor_public_name: string;
  recipient_message: string;
  is_activatable: boolean;
  reason_not_activatable: string | null;
}

export interface GiftStatus {
  id: UUID;
  state: string;
  valid_until: string | null;
  activated_at: string | null;
  amount: string;
  currency: string;
  order_id: UUID | null;
  order_state: string | null;
  activation_token?: string;
  gift_code?: string;
}

export interface GiftListItem extends GiftStatus {
  created_at: string;
  direction: "SENT" | "RECEIVED" | "UNKNOWN";
}

export interface GiftStats {
  counts: {
    GiftCreated: number;
    GiftActivated: number;
    GiftConsumed: number;
    GiftRefunded: number;
    GiftCancelled: number;
    GiftExpired: number;
  };
  avg_activation_time_seconds: number;
  sla_refund_percentage: number;
  start: string;
  end: string;
}

export interface GiftActivationResult {
  gift_id: UUID;
  order_id: UUID;
  gift_state: string;
  order_state: string;
}

export type GiftNotificationSubscriptions = Record<string, ("email" | "push" | "crm")[]>;

export async function createGift(
  body: {
    product_id: UUID;
    recipient_email?: string;
    recipient_phone?: string;
    recipient_name?: string;
    idempotency_key?: string;
  },
  token: string
): Promise<Gift> {
  return apiPost<Gift>("/api/gifts/", body as Record<string, unknown>, token);
}

export async function previewGift(activationToken: string): Promise<GiftPreview> {
  return apiGet<GiftPreview>(`/api/gifts/preview/${activationToken}/`);
}

export async function activateGift(
  activationToken: string,
  body: {
    delivery_address: string;
    delivery_type?: "BUILDING" | "DOOR";
    recipient_phone?: string;
    recipient_name?: string;
  },
  token?: string
): Promise<GiftActivationResult> {
  return apiPost<GiftActivationResult>(
    `/api/gifts/activate/${activationToken}/`,
    body as Record<string, unknown>,
    token
  );
}

export async function cancelGift(id: UUID, token: string): Promise<GiftStatus> {
  return apiPost<GiftStatus>(`/api/gifts/${id}/cancel/`, undefined, token);
}

export async function getGiftStatus(id: UUID, token: string): Promise<GiftStatus> {
  return apiGetAuth<GiftStatus>(`/api/gifts/${id}/`, token);
}

export async function getMyGifts(
  params: { state?: string; direction?: "SENT" | "RECEIVED"; from?: string; to?: string } = {},
  token: string
): Promise<GiftListItem[]> {
  const searchParams = new URLSearchParams();
  if (params.state) searchParams.set("state", params.state);
  if (params.direction) searchParams.set("direction", params.direction.toLowerCase());
  if (params.from) searchParams.set("from", params.from);
  if (params.to) searchParams.set("to", params.to);
  const suffix = searchParams.toString() ? `?${searchParams.toString()}` : "";
  return apiGetAuth<GiftListItem[]>(`/api/gifts/my/${suffix}`, token);
}

export async function getGiftNotificationSettings(
  token: string
): Promise<{ subscriptions: GiftNotificationSubscriptions }> {
  return apiGetAuth<{ subscriptions: GiftNotificationSubscriptions }>(
    "/api/gifts/settings/",
    token
  );
}

export async function updateGiftNotificationSettings(
  subscriptions: GiftNotificationSubscriptions,
  token: string
): Promise<{ subscriptions: GiftNotificationSubscriptions }> {
  return apiPatch<{ subscriptions: GiftNotificationSubscriptions }>(
    "/api/gifts/settings/",
    { subscriptions } as Record<string, unknown>,
    token
  );
}

export async function getGiftStats(
  params: { start?: string; end?: string } = {},
  token: string
): Promise<GiftStats> {
  const searchParams = new URLSearchParams();
  if (params.start) searchParams.set("start", params.start);
  if (params.end) searchParams.set("end", params.end);
  const suffix = searchParams.toString() ? `?${searchParams.toString()}` : "";
  return apiGetAuth<GiftStats>(`/api/gifts/stats/${suffix}`, token);
}

export async function initOrderPayment(id: UUID, token?: string) {
  return apiPost<{ Success: boolean; PaymentId: string; PaymentURL: string; Message?: string }>(`/api/orders/${id}/init_payment/`, undefined, token);
}

export async function getOrderSbpQr(id: UUID, token?: string) {
  return apiPost<{ Success: boolean; Data: string; PaymentId: string; Message?: string }>(`/api/orders/${id}/get_sbp_qr/`, undefined, token);
}

export async function getProfile(token: string): Promise<Profile> {
  return apiGetAuth<Profile>("/api/auth/me/", token);
}

export async function updateProfile(data: Partial<Profile> & { shop_name?: string }, token: string): Promise<Profile> {
  return apiPatch<Profile>("/api/auth/me/", data as Record<string, unknown>, token);
}

export async function shopDescriptionAI(
  data: { mode: 'REWRITE' | 'GENERATE'; target: 'SHORT' | 'FULL'; text?: string },
  token: string
): Promise<{ text: string; target: 'SHORT' | 'FULL'; mode: 'REWRITE' | 'GENERATE' }> {
  return apiPost<{ text: string; target: 'SHORT' | 'FULL'; mode: 'REWRITE' | 'GENERATE' }>(
    `/api/auth/me/shop-description/ai/`,
    data as unknown as Record<string, unknown>,
    token
  );
}

export async function uploadSellerLogo(file: File, token: string): Promise<Profile> {
  const form = new FormData();
  form.append('file', file);
  return apiPostMultipart<Profile>("/api/auth/me/logo/", form, token);
}

export async function uploadDocument(file: File, type: string, name: string, token: string): Promise<Profile> {
  const form = new FormData();
  form.append('file', file);
  form.append('type', type);
  form.append('name', name);

  return apiPostMultipart<Profile>("/api/auth/me/documents/upload/", form, token);
}

export async function login(identifier: string, password?: string, role: string = 'CLIENT'): Promise<{ access?: string; refresh?: string; requires_2fa?: boolean; email?: string; phone?: string; sent_to?: 'email' | 'phone'; role?: string; user?: any }> {
  return apiPost(`/api/auth/login/`, { email: identifier, password, role });
}

export async function googleLogin(token: string, role: string = 'CLIENT'): Promise<{ access: string; refresh: string; email?: string; first_name?: string; last_name?: string; role?: string; user?: any }> {
  return apiPost(`/api/auth/login/google/`, { token, role });
}

export async function verifyLogin2FA(email: string, code: string, role: string = 'CLIENT'): Promise<{ access: string; refresh: string; role?: string; user?: any }> {
  return apiPost(`/api/auth/login/verify-2fa/`, { email, code, role });
}

export async function resendCode(email: string): Promise<{ detail: string }> {
  return apiPost(`/api/auth/resend-code/`, { email });
}

export async function register(data: { email: string; phone: string; password: string; role?: "CLIENT" | "SELLER"; first_name?: string; shop_name?: string }) {
  return apiPost(`/api/auth/register/`, data);
}

export async function verifyRegistration(email: string, code: string): Promise<{ access: string; refresh: string; role?: string; is_seller?: boolean; user?: any }> {
  return apiPost(`/api/auth/register/verify/`, { email, code });
}

export async function toggle2FA(enabled: boolean, token: string) {
  return apiPost(`/api/auth/2fa/toggle/`, { enabled }, token);
}

export async function requestPasswordReset(email: string) {
  return apiPost(`/api/auth/password/reset/request/`, { email });
}

export async function resetPassword(email: string, code: string, password: string) {
  return apiPost(`/api/auth/password/reset/verify/`, { email, code, password });
}


export interface PaymentMethod {
  id: UUID;
  card_type: string;
  last_four: string;
  exp_month: string;
  exp_year: string;
  is_default: boolean;
}

export interface UserDevice {
  id: UUID;
  name: string;
  ip_address: string;
  last_active: string;
  is_current: boolean;
}

export interface Order {
  id: UUID;
  user_name: string;
  user: UUID;
  phone: string;
  dish: Dish;
  quantity: number;
  total_price: string;
  status: 'WAITING_FOR_PAYMENT' | 'WAITING_FOR_RECIPIENT' | 'WAITING_FOR_ACCEPTANCE' | 'COOKING' | 'READY_FOR_REVIEW' | 'READY_FOR_DELIVERY' | 'DELIVERING' | 'ARRIVED' | 'COMPLETED' | 'CANCELLED' | 'DISPUTE';
  is_urgent: boolean;
  delivery_address?: string;
  delivery_address_text?: string;
  delivery_latitude?: number;
  delivery_longitude?: number;
  created_at: string;
  acceptance_deadline?: string;
  accepted_at?: string;
  ready_at?: string;
  finished_photo?: string;
  delivery_type: 'BUILDING' | 'DOOR';
  delivery_price: string;
  estimated_cooking_time?: number;
  review?: Review | null;
  apartment?: string;
  entrance?: string;
  floor?: string;
  intercom?: string;
  delivery_comment?: string;
  is_gift?: boolean;
  recipient_phone?: string;
  recipient_address_text?: string;
  recipient_latitude?: number;
  recipient_longitude?: number;
  recipient_specified_time?: string;
  gift_proof_image?: string | null;
}

export interface Notification {
  id: UUID;
  title: string;
  message: string;
  type: 'ORDER' | 'SYSTEM' | 'PROMO';
  is_read: boolean;
  created_at: string;
}

export interface HelpArticle {
  id: UUID;
  question: string;
  answer: string;
  category: string;
}

export async function getPaymentMethods(token: string): Promise<PaymentMethod[]> {
  return apiGetAuth<PaymentMethod[]>("/api/payment-methods/", token);
}

export async function addPaymentMethod(data: Partial<PaymentMethod>, token: string): Promise<PaymentMethod> {
  return apiPost<PaymentMethod>("/api/payment-methods/", data as Record<string, unknown>, token);
}

export async function deletePaymentMethod(id: UUID, token: string): Promise<void> {
  return apiDelete(`/api/payment-methods/${id}/`, token);
}

export async function setDefaultPaymentMethod(id: UUID, token: string): Promise<void> {
  return apiPost<void>(`/api/payment-methods/${id}/set_default/`, undefined, token);
}

export async function getSbpLink(token: string): Promise<{ payment_id: string; qr_payload: string; order_id: string }> {
  return apiPost(`/api/payment-methods/get_sbp_link/`, undefined, token);
}

export async function getDevices(token: string): Promise<UserDevice[]> {
  return apiGetAuth<UserDevice[]>("/api/devices/", token);
}

export async function logoutDevice(id: UUID, token: string): Promise<void> {
  return apiPost<void>(`/api/devices/${id}/logout/`, undefined, token);
}

export async function getNotifications(token: string): Promise<Notification[]> {
  return apiGetAuth<Notification[]>("/api/notifications/", token);
}

export async function markNotificationRead(id: UUID, token: string): Promise<void> {
  return apiPost<void>(`/api/notifications/${id}/mark_read/`, undefined, token);
}

export async function markAllNotificationsRead(token: string): Promise<void> {
  return apiPost<void>(`/api/notifications/mark_all_read/`, undefined, token);
}

export async function getOrders(token: string, params?: Record<string, string | undefined>): Promise<Order[]> {
  const qs = new URLSearchParams(
    (Object.entries(params || {}).filter(([, v]) => !!v) as [string, string][])
  ).toString();
  const suffix = qs ? `?${qs}` : "";
  return apiGetAuth<Order[]>(`/api/orders/${suffix}`, token);
}

export interface SellerStatisticsData {
  total_revenue: number;
  orders_count: number;
  active_orders_count: number;
  cancelled_orders_count: number;
  avg_order_value: number;
   reviews_count: number;
   avg_rating_overall: number;
   avg_rating_taste: number;
   avg_rating_appearance: number;
   avg_rating_service: number;
  top_dishes: {
    name: string;
    count: number;
    revenue: number;
  }[];
  chart_data: {
    date: string;
    revenue: number;
    count: number;
  }[];
}

export async function getSellerStatistics(token: string, timeRange: string = '7d'): Promise<SellerStatisticsData> {
  return apiGetAuth<SellerStatisticsData>(`/api/orders/statistics/?time_range=${timeRange}`, token);
}

export async function acceptOrder(id: UUID, token: string): Promise<Order> {
  return apiPost<Order>(`/api/orders/${id}/accept/`, undefined, token);
}

export async function uploadOrderPhoto(id: UUID, file: File, token: string): Promise<Order> {
  const form = new FormData();
  form.append('photo', file);
  return apiPostMultipart<Order>(`/api/orders/${id}/upload_photo/`, form, token);
}

export async function approveOrderPhoto(id: UUID, token: string): Promise<Order> {
  return apiPost<Order>(`/api/orders/${id}/approve_photo/`, undefined, token);
}

export async function completeOrder(id: UUID, token: string): Promise<Order> {
  return apiPost<Order>(`/api/orders/${id}/complete/`, undefined, token);
}

export async function markReadyOrder(id: UUID, token: string): Promise<Order> {
  return apiPost<Order>(`/api/orders/${id}/mark_ready/`, undefined, token);
}

export async function startDeliveryOrder(id: UUID, token: string): Promise<Order> {
  return apiPost<Order>(`/api/orders/${id}/start_delivery/`, undefined, token);
}

export async function markArrivedOrder(id: UUID, token: string): Promise<Order> {
  return apiPost<Order>(`/api/orders/${id}/mark_arrived/`, undefined, token);
}

export async function cancelOrder(id: UUID, role: 'buyer' | 'seller', reason: string, token: string): Promise<{ detail: string }> {
  return apiPost<{ detail: string }>(`/api/orders/${id}/cancel/`, { role, reason }, token);
}

export async function reorderOrder(id: UUID, token: string): Promise<Order> {
  return apiPost<Order>(`/api/orders/${id}/reorder/`, undefined, token);
}

export async function archiveChat(chatId: UUID, token: string): Promise<void> {
  return apiPost<void>(`/api/chats/${chatId}/archive/`, undefined, token);
}

export async function getArchivedChats(token: string): Promise<Chat[]> {
  return apiGetAuth<Chat[]>(`/api/chats/archived/`, token);
}

export async function rescheduleOrder(id: UUID, newTime: string, token: string): Promise<{ detail: string }> {
  return apiPost(`/api/orders/${id}/reschedule_delivery/`, { new_time: newTime }, token);
}

export async function createDish(data: Partial<Dish>, token: string): Promise<Dish> {
  return apiPost<Dish>("/api/dishes/", data as Record<string, unknown>, token);
}

export async function updateDish(id: UUID, data: Partial<Dish>, token: string): Promise<Dish> {
  const updated = await apiPatch<Dish>(`/api/dishes/${id}/`, data as Record<string, unknown>, token);
  if (!(updated as any)?.id) {
    return apiGetAuth<Dish>(`/api/dishes/${id}/`, token);
  }
  return updated;
}

export async function deleteDish(id: UUID, token: string): Promise<void> {
  return apiDelete(`/api/dishes/${id}/`, token);
}

export async function uploadDishPhoto(id: UUID, file: File, token: string): Promise<Dish> {
  const form = new FormData();
  form.append('photo', file);
  return apiPostMultipart<Dish>(`/api/dishes/${id}/upload_photo/`, form, token);
}

export async function addDishImage(dishId: UUID, file: File, token: string): Promise<any> {
  const form = new FormData();
  form.append('image', file);
  return apiPostMultipart(`/api/dishes/${dishId}/add_image/`, form, token);
}

export async function removeDishImage(dishId: UUID, imageId: number, token: string): Promise<void> {
  return apiDelete(`/api/dishes/${dishId}/remove_image/?image_id=${imageId}`, token);
}

export async function getHelpArticles(): Promise<HelpArticle[]> {
  return apiGet<HelpArticle[]>("/api/help-articles/");
}

export async function becomeSeller(data: { name: string; city: string; producer_type: string }, token: string): Promise<Producer> {
  return apiPost<Producer>("/api/become-seller/", data as unknown as Record<string, unknown>, token);
}

export async function requestChange(
  change_type: 'EMAIL' | 'PHONE' | 'PASSWORD', 
  new_value: string, 
  token: string,
  extra?: { old_password?: string; confirm_password?: string }
): Promise<{ detail: string }> {
  return apiPost(`/api/profile/change-request/`, { 
    change_type, 
    new_value, 
    ...(extra || {})
  }, token);
}

export async function confirmChange(change_type: 'EMAIL' | 'PHONE' | 'PASSWORD', verification_code: string, token: string): Promise<{ detail: string }> {
  return apiPost(`/api/profile/change-confirm/`, { change_type, verification_code }, token);
}
