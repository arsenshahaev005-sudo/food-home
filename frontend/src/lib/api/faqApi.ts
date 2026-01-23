import { apiGetAuth, apiPost, apiPatch, apiDelete } from '../api';

export interface HelpArticle {
  id: string;
  title: string;
  content: string;
  category: string;
  order: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export interface FAQFormData extends Record<string, unknown> {
  title: string;
  content: string;
  category: string;
  order?: number;
  is_published?: boolean;
}

export interface QuestionFormData extends Record<string, unknown> {
  name: string;
  email: string;
  question: string;
  category?: string;
}

/**
 * Получить все опубликованные статьи справки
 */
export const getHelpArticles = async (token: string): Promise<HelpArticle[]> => {
  return apiGetAuth<HelpArticle[]>('/help-articles/', token);
};

/**
 * Получить статьи справки по категории
 */
export const getHelpArticlesByCategory = async (
  category: string,
  token: string
): Promise<HelpArticle[]> => {
  return apiGetAuth<HelpArticle[]>(`/help-articles/?category=${category}`, token);
};

/**
 * Получить статью справки по ID
 */
export const getHelpArticle = async (id: string, token: string): Promise<HelpArticle> => {
  return apiGetAuth<HelpArticle>(`/help-articles/${id}/`, token);
};

/**
 * Поиск по статьям справки
 */
export const searchHelpArticles = async (
  query: string,
  token: string
): Promise<HelpArticle[]> => {
  return apiGetAuth<HelpArticle[]>(
    `/help-articles/?search=${encodeURIComponent(query)}`,
    token
  );
};

/**
 * Получить категории статей справки
 */
export const getHelpArticleCategories = async (token: string): Promise<string[]> => {
  return apiGetAuth<string[]>('/help-articles/categories/', token);
};

/**
 * Создать новую статью справки (только для администраторов)
 */
export const createHelpArticle = async (
  data: FAQFormData,
  token: string
): Promise<HelpArticle> => {
  return apiPost<HelpArticle>('/help-articles/', data, token);
};

/**
 * Обновить статью справки (только для администраторов)
 */
export const updateHelpArticle = async (
  id: string,
  data: Partial<FAQFormData>,
  token: string
): Promise<HelpArticle> => {
  return apiPatch<HelpArticle>(`/help-articles/${id}/`, data, token);
};

/**
 * Удалить статью справки (только для администраторов)
 */
export const deleteHelpArticle = async (id: string, token: string): Promise<void> => {
  await apiDelete(`/help-articles/${id}/`, token);
};

/**
 * Отправить вопрос пользователям
 */
export const submitQuestion = async (data: QuestionFormData, token: string): Promise<void> => {
  await apiPost('/help-articles/submit-question/', data, token);
};
