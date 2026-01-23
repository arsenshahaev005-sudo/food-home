import { apiGetAuth, apiPost } from '../api';

export interface LoyaltyLevel {
  id: string;
  name: string;
  slug: string;
  min_points: number;
  max_points?: number;
  discount_percentage: number;
  benefits: string[];
  icon?: string;
  color?: string;
}

export interface LoyaltyPoints {
  total_points: number;
  available_points: number;
  pending_points: number;
  earned_this_month: number;
  redeemed_this_month: number;
}

export interface LoyaltyReward {
  id: string;
  name: string;
  description: string;
  points_cost: number;
  image?: string;
  is_available: boolean;
  quantity_available?: number;
  expires_at?: string;
}

export interface LoyaltyTransaction {
  id: string;
  type: 'earned' | 'redeemed' | 'expired';
  points: number;
  description: string;
  created_at: string;
  order_id?: string;
  metadata?: Record<string, unknown>;
}

export interface LoyaltyStats {
  current_level: LoyaltyLevel;
  next_level?: LoyaltyLevel;
  points_to_next_level: number;
  progress_percentage: number;
  total_earned: number;
  total_redeemed: number;
}

/**
 * Получить уровень лояльности пользователя
 */
export const getLoyaltyLevel = async (token: string): Promise<LoyaltyLevel> => {
  return apiGetAuth<LoyaltyLevel>('/loyalty/level/', token);
};

/**
 * Получить баллы лояльности пользователя
 */
export const getLoyaltyPoints = async (token: string): Promise<LoyaltyPoints> => {
  return apiGetAuth<LoyaltyPoints>('/loyalty/points/', token);
};

/**
 * Получить статистику лояльности
 */
export const getLoyaltyStats = async (token: string): Promise<LoyaltyStats> => {
  return apiGetAuth<LoyaltyStats>('/loyalty/stats/', token);
};

/**
 * Получить все уровни лояльности
 */
export const getLoyaltyLevels = async (token: string): Promise<LoyaltyLevel[]> => {
  return apiGetAuth<LoyaltyLevel[]>('/loyalty/levels/', token);
};

/**
 * Получить доступные награды
 */
export const getLoyaltyRewards = async (token: string): Promise<LoyaltyReward[]> => {
  return apiGetAuth<LoyaltyReward[]>('/loyalty/rewards/', token);
};

/**
 * Получить историю транзакций
 */
export const getLoyaltyTransactions = async (
  token: string,
  page: number = 1,
  limit: number = 20
): Promise<LoyaltyTransaction[]> => {
  return apiGetAuth<LoyaltyTransaction[]>(
    `/loyalty/transactions/?page=${page}&limit=${limit}`,
    token
  );
};

/**
 * Погасить баллы за награду
 */
export const redeemLoyaltyReward = async (
  rewardId: string,
  token: string
): Promise<void> => {
  await apiPost(`/loyalty/rewards/${rewardId}/redeem/`, {}, token);
};

/**
 * Погасить баллы за скидку
 */
export const redeemLoyaltyDiscount = async (
  points: number,
  token: string
): Promise<{ discount_amount: number }> => {
  return apiPost<{ discount_amount: number }>('/loyalty/redeem-discount/', { points }, token);
};

/**
 * Получить историю начисления баллов за заказы
 */
export const getOrderPointsHistory = async (
  token: string,
  page: number = 1,
  limit: number = 20
): Promise<LoyaltyTransaction[]> => {
  return apiGetAuth<LoyaltyTransaction[]>(
    `/loyalty/order-points/?page=${page}&limit=${limit}`,
    token
  );
};
