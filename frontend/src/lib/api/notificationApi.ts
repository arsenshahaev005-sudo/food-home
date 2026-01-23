import { apiGetAuth, apiPost, apiPatch, apiDelete } from '../api';

export interface NotificationSettings extends Record<string, unknown> {
  email_enabled: boolean;
  email_order_updates: boolean;
  email_promotions: boolean;
  email_newsletter: boolean;
  email_reminders: boolean;
  push_enabled: boolean;
  push_order_updates: boolean;
  push_promotions: boolean;
}

export interface UserNotification {
  id: string;
  user: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  metadata?: Record<string, unknown>;
}

/**
 * Получить настройки уведомлений пользователя
 */
export const getNotificationSettings = async (token: string): Promise<NotificationSettings> => {
  return apiGetAuth<NotificationSettings>('/notifications/settings/', token);
};

/**
 * Обновить настройки уведомлений пользователя
 */
export const updateNotificationSettings = async (
  settings: Partial<NotificationSettings>,
  token: string
): Promise<NotificationSettings> => {
  return apiPatch<NotificationSettings>('/notifications/settings/', settings, token);
};

/**
 * Получить все уведомления пользователя
 */
export const getNotifications = async (token: string): Promise<UserNotification[]> => {
  return apiGetAuth<UserNotification[]>('/notifications/', token);
};

/**
 * Получить непрочитанные уведомления
 */
export const getUnreadNotifications = async (token: string): Promise<UserNotification[]> => {
  return apiGetAuth<UserNotification[]>('/notifications/?unread=true', token);
};

/**
 * Получить количество непрочитанных уведомлений
 */
export const getUnreadNotificationCount = async (token: string): Promise<number> => {
  return apiGetAuth<{ count: number }>('/notifications/unread-count/', token).then(
    (data) => data.count
  );
};

/**
 * Отметить уведомление как прочитанное
 */
export const markNotificationAsRead = async (id: string, token: string): Promise<void> => {
  await apiPost(`/notifications/${id}/read/`, {}, token);
};

/**
 * Отметить все уведомления как прочитанные
 */
export const markAllNotificationsAsRead = async (token: string): Promise<void> => {
  await apiPost('/notifications/read-all/', {}, token);
};

/**
 * Удалить уведомление
 */
export const deleteNotification = async (id: string, token: string): Promise<void> => {
  await apiDelete(`/notifications/${id}/`, token);
};

/**
 * Подписаться на рассылку
 */
export const subscribeToNewsletter = async (email: string, token: string): Promise<void> => {
  await apiPost('/notifications/subscribe-newsletter/', { email }, token);
};

/**
 * Отписаться от рассылки
 */
export const unsubscribeFromNewsletter = async (token: string): Promise<void> => {
  await apiPost('/notifications/unsubscribe-newsletter/', {}, token);
};
