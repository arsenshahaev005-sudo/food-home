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
  if (token) {
    return apiGetAuth<Category[]>('/api/categories/', token);
  }
  
  // Публичный доступ без токена
  const response = await fetch(`${BASE_URL}/api/categories/`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw error;
  }
  
  return response.json();
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
