/**
 * API клиент для работы с реферальной программой.
 * 
 * Обоснование: Система реферальных бонусов
 * стимулирует пользователей привлекать новых клиентов,
 * что снижает стоимость привлечения клиентов (CAC).
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

export interface ReferralBonus {
  id: string;
  referrer: {
    id: string;
    email: string;
    first_name?: string;
    last_name?: string;
  };
  referee: {
    id: string;
    email: string;
    first_name?: string;
    last_name?: string;
  };
  bonus_type: 'REFERRER_BONUS' | 'REFERRER_FIRST_ORDER_BONUS' | 'REFEREE_BONUS';
  amount: string;
  status: 'PENDING' | 'COMPLETED' | 'CANCELLED';
  order_id?: string;
  created_at: string;
  completed_at?: string;
}

export interface ReferralStats {
  total_earned: string;
  pending_amount: string;
  completed_amount: string;
  total_referrals: number;
  successful_referrals: number;
  pending_referrals: number;
}

export interface ReferralLink {
  code: string;
  full_url: string;
  created_at: string;
  total_clicks: number;
  total_signups: number;
  total_conversions: number;
}

/**
 * Получить реферальные бонусы текущего пользователя
 */
export async function getReferralBonuses(token: string): Promise<ReferralBonus[]> {
  return apiGetAuth<ReferralBonus[]>('/api/referrals/bonuses/', token);
}

/**
 * Получить статистику реферальной программы
 */
export async function getReferralStats(token: string): Promise<ReferralStats> {
  return apiGetAuth<ReferralStats>('/api/referrals/stats/', token);
}

/**
 * Получить реферальную ссылку
 */
export async function getReferralLink(token: string): Promise<ReferralLink> {
  return apiGetAuth<ReferralLink>('/api/referrals/link/', token);
}

/**
 * Создать новую реферальную ссылку
 */
export async function createReferralLink(token: string): Promise<ReferralLink> {
  return apiPost<ReferralLink>('/api/referrals/link/', {}, token);
}

/**
 * Получить информацию о реферере по коду
 */
export async function getReferrerByCode(code: string): Promise<{
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
} | null> {
  const res = await fetch(`${BASE_URL}/api/referrals/referrer/${code}/`, {
    headers: {
      'Accept': 'application/json',
    }
  });
  
  if (!res.ok) {
    if (res.status === 404) {
      return null;
    }
    const errorData = await res.json().catch(() => ({ detail: `API Error ${res.status}` }));
    throw new Error(errorData.detail || `API Error ${res.status}`);
  }
  
  const json = await res.json();
  // Extract data field if response has format { success: true, data: ... }
  if (json && typeof json === 'object' && 'success' in json && 'data' in json) {
    return json.data;
  }
  return json;
}

/**
 * Применить реферальный код при регистрации
 */
export async function applyReferralCode(code: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/referrals/apply/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({ code })
  });
  
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: `API Error ${res.status}` }));
    throw new Error(errorData.detail || `API Error ${res.status}`);
  }
}
