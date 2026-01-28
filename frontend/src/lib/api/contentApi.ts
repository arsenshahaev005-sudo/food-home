import { apiGetAuth, BASE_URL } from '../api';

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  parent?: string | null;
  image?: string;
  order: number;
}

export interface BlogArticle {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  featured_image?: string;
  category?: string;
  author?: string;
  published_at?: string;
  created_at: string;
  updated_at: string;
  is_published: boolean;
  tags?: string[];
  meta_title?: string;
  meta_description?: string;
}

export interface MetaTags {
  title: string;
  description: string;
  keywords?: string;
  og_title?: string;
  og_description?: string;
  og_image?: string;
  twitter_card?: string;
}

/**
 * Получить все категории (публичный доступ)
 */
export const getCategories = async (token?: string): Promise<Category[]> => {
  // Проверка токена: используем аутентификацию только если токен валидный
  const isValidToken = token && token.trim().length > 0;
  
  let data: unknown;
  
  if (isValidToken) {
    data = await apiGetAuth<Category[]>('/api/categories/', token);
  } else {
    // Публичный доступ без токена или с невалидным токеном
    const response = await fetch(`${BASE_URL}/api/categories/`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      const error = await response.json();
      console.error('getCategories error (public):', error);
      throw error;
    }
    
    data = await response.json();
  }
  
  // Handle different response formats
  if (Array.isArray(data)) {
    return data as Category[];
  }
  
  // Handle object with results field (DRF pagination)
  if (data && typeof data === 'object') {
    const dataObj = data as Record<string, unknown>;
    
    // Check for results field
    if ('results' in dataObj && Array.isArray(dataObj.results)) {
      return dataObj.results as Category[];
    }
    
    // Check for data field
    if ('data' in dataObj && Array.isArray(dataObj.data)) {
      return dataObj.data as Category[];
    }
    
    // Check for count and results fields (DRF pagination)
    if ('count' in dataObj && 'results' in dataObj && Array.isArray(dataObj.results)) {
      return dataObj.results as Category[];
    }
  }

  console.warn('getCategories: unexpected response format, returning empty array');
  return [];
};

/**
 * Получить категорию по slug
 */
export const getCategoryBySlug = async (slug: string, token: string): Promise<Category> => {
  return apiGetAuth<Category>(`/api/categories/${slug}/`, token);
};

/**
 * Получить категорию по ID
 */
export const getCategory = async (id: string, token: string): Promise<Category> => {
  return apiGetAuth<Category>(`/api/categories/${id}/`, token);
};

/**
 * Получить подкатегории для родительской категории
 */
export const getSubcategories = async (parentId: string, token: string): Promise<Category[]> => {
  return apiGetAuth<Category[]>(`/api/categories/?parent=${parentId}`, token);
};

/**
 * Получить все опубликованные статьи блога
 */
export const getBlogArticles = async (token: string): Promise<BlogArticle[]> => {
  return apiGetAuth<BlogArticle[]>('/api/blog-articles/', token);
};

/**
 * Получить статьи блога по категории
 */
export const getBlogArticlesByCategory = async (
  category: string,
  token: string
): Promise<BlogArticle[]> => {
  return apiGetAuth<BlogArticle[]>(`/api/blog-articles/?category=${category}`, token);
};

/**
 * Получить статью блога по slug
 */
export const getBlogArticleBySlug = async (slug: string, token: string): Promise<BlogArticle> => {
  return apiGetAuth<BlogArticle>(`/api/blog-articles/${slug}/`, token);
};

/**
 * Получить статью блога по ID
 */
export const getBlogArticle = async (id: string, token: string): Promise<BlogArticle> => {
  return apiGetAuth<BlogArticle>(`/api/blog-articles/${id}/`, token);
};

/**
 * Поиск по статьям блога
 */
export const searchBlogArticles = async (
  query: string,
  token: string
): Promise<BlogArticle[]> => {
  return apiGetAuth<BlogArticle[]>(`/api/blog-articles/?search=${encodeURIComponent(query)}`, token);
};

/**
 * Получить последние статьи блога
 */
export const getLatestBlogArticles = async (
  limit: number = 5,
  token: string
): Promise<BlogArticle[]> => {
  return apiGetAuth<BlogArticle[]>(`/api/blog-articles/?limit=${limit}`, token);
};

/**
 * Получить метатеги для страницы
 */
export const getMetaTags = async (path: string, token: string): Promise<MetaTags> => {
  return apiGetAuth<MetaTags>(`/api/meta-tags/?path=${encodeURIComponent(path)}`, token);
};
