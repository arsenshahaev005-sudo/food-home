/**
 * API клиент для работы с чатом.
 * 
 * Обоснование: Коммуникация важна для уточнения деталей заказа.
 * Уведомления о новых сообщениях, шаблоны сообщений,
 * возможность отправки фото и оценка качества общения
 * улучшают пользовательский опыт.
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

export interface ChatMessage {
  id: string;
  sender: {
    id: string;
    email: string;
    first_name?: string;
    last_name?: string;
  };
  recipient: {
    id: string;
    email: string;
    first_name?: string;
    last_name?: string;
  };
  content: string;
  message_type: 'TEXT' | 'IMAGE' | 'VIDEO';
  media_url?: string;
  order?: {
    id: string;
    dish_name: string;
  };
  is_read: boolean;
  created_at: string;
}

export interface ConversationPartner {
  user_id: string;
  email: string;
  name?: string;
  last_message: {
    content: string | null;
    created_at: string | null;
    message_type: string | null;
  };
  unread_count: number;
  message_count: number;
}

export interface MessageTemplate {
  id: string;
  title: string;
  content: string;
  order: number;
  is_active: boolean;
  created_at: string;
}

export interface CommunicationRating {
  id: string;
  rater: {
    id: string;
    email: string;
    name?: string;
  };
  rated_user: {
    id: string;
    email: string;
    name?: string;
  };
  order: {
    id: string;
  };
  rating: number;
  comment: string;
  created_at: string;
}

/**
 * Получить историю переписки с пользователем
 */
export async function getConversationHistory(token: string, otherUserId: string, limit: number = 50): Promise<ChatMessage[]> {
  return apiGetAuth<ChatMessage[]>(`/api/chat/conversation/${otherUserId}/?limit=${limit}`, token);
}

/**
 * Получить список собеседников
 */
export async function getConversationPartners(token: string): Promise<ConversationPartner[]> {
  return apiGetAuth<ConversationPartner[]>('/api/chat/partners/', token);
}

/**
 * Получить количество непрочитанных сообщений
 */
export async function getUnreadCount(token: string): Promise<number> {
  const result = await apiGetAuth<{ count: number }>('/api/chat/unread-count/', token);
  return result.count;
}

/**
 * Отметить сообщения как прочитанные
 */
export async function markMessagesAsRead(token: string, senderId: string): Promise<void> {
  await apiPost<void>(`/api/chat/mark-read/${senderId}/`, {}, token);
}

/**
 * Отправить сообщение
 */
export async function sendMessage(
  token: string,
  recipientId: string,
  content: string,
  messageType: 'TEXT' | 'IMAGE' | 'VIDEO' = 'TEXT',
  mediaFile?: File,
  orderId?: string
): Promise<ChatMessage> {
  if (mediaFile) {
    const formData = new FormData();
    formData.append('recipient', recipientId);
    formData.append('content', content);
    formData.append('message_type', messageType);
    formData.append('media', mediaFile);
    if (orderId) {
      formData.append('order', orderId);
    }
    return apiPostMultipart<ChatMessage>('/api/chat/send/', formData, token);
  } else {
    return apiPost<ChatMessage>('/api/chat/send/', {
      recipient: recipientId,
      content,
      message_type: messageType,
      order: orderId,
    }, token);
  }
}

/**
 * Архивировать переписку
 */
export async function archiveConversation(token: string, otherUserId: string): Promise<void> {
  await apiPost<void>(`/api/chat/archive/${otherUserId}/`, {}, token);
}

/**
 * Получить шаблоны сообщений продавца
 */
export async function getMessageTemplates(token: string): Promise<MessageTemplate[]> {
  return apiGetAuth<MessageTemplate[]>('/api/chat/templates/', token);
}

/**
 * Создать шаблон сообщения
 */
export async function createMessageTemplate(
  token: string,
  title: string,
  content: string,
  order: number = 0
): Promise<MessageTemplate> {
  return apiPost<MessageTemplate>('/api/chat/templates/', {
    title,
    content,
    order,
  }, token);
}

/**
 * Обновить шаблон сообщения
 */
export async function updateMessageTemplate(
  token: string,
  templateId: string,
  title?: string,
  content?: string,
  is_active?: boolean,
  order?: number
): Promise<MessageTemplate> {
  return apiPost<MessageTemplate>(`/api/chat/templates/${templateId}/update/`, {
    title,
    content,
    is_active,
    order,
  }, token);
}

/**
 * Удалить шаблон сообщения
 */
export async function deleteMessageTemplate(token: string, templateId: string): Promise<void> {
  await apiDelete(`/api/chat/templates/${templateId}/`, token);
}

/**
 * Отправить оценку качества общения
 */
export async function submitCommunicationRating(
  token: string,
  orderId: string,
  ratedUserId: string,
  rating: number,
  comment: string = ''
): Promise<CommunicationRating> {
  return apiPost<CommunicationRating>('/api/chat/communication-rating/', {
    order: orderId,
    rated_user: ratedUserId,
    rating,
    comment,
  }, token);
}

/**
 * Получить оценки качества общения пользователя
 */
export async function getUserCommunicationRatings(token: string): Promise<CommunicationRating[]> {
  return apiGetAuth<CommunicationRating[]>('/api/chat/communication-ratings/', token);
}

/**
 * Получить среднюю оценку качества общения пользователя
 */
export async function getAverageCommunicationRating(token: string): Promise<{ average_rating: number; rating_count: number }> {
  return apiGetAuth<{ average_rating: number; rating_count: number }>('/api/chat/communication-rating/average/', token);
}
