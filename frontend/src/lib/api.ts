// API Client for HomeFood Marketplace

export const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const API_BASE_URL = BASE_URL;

// Import Order type from types/api and re-export it
import type { Order } from '../types/api';
export type { Order } from '../types/api';

// Helper functions for authenticated requests
export const apiGetAuth = async <T>(url: string, token: string): Promise<T> => {
  // Проверка токена: выбрасываем ошибку если токен невалидный
  if (!token || token.trim().length === 0) {
    console.error('apiGetAuth: invalid token provided', {
      hasToken: !!token,
      tokenLength: token?.length,
      url
    });
    throw new Error('Invalid token: token is empty or contains only whitespace');
  }
  
  const response = await fetch(`${API_BASE_URL}${url}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw error;
  }

  return response.json();
};

export const apiPostAuth = async <T>(url: string, token: string, data: any): Promise<T> => {
  // Проверка токена
  if (!token || token.trim().length === 0) {
    console.error('apiPostAuth: invalid token provided', {
      hasToken: !!token,
      tokenLength: token?.length,
      url
    });
    throw new Error('Invalid token: token is empty or contains only whitespace');
  }
  
  const response = await fetch(`${API_BASE_URL}${url}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw error;
  }

  return response.json();
};

export const apiPutAuth = async <T>(url: string, token: string, data: any): Promise<T> => {
  // Проверка токена
  if (!token || token.trim().length === 0) {
    console.error('apiPutAuth: invalid token provided', {
      hasToken: !!token,
      tokenLength: token?.length,
      url
    });
    throw new Error('Invalid token: token is empty or contains only whitespace');
  }
  
  const response = await fetch(`${API_BASE_URL}${url}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw error;
  }

  return response.json();
};

export const apiDeleteAuth = async <T>(url: string, token: string): Promise<T> => {
  // Проверка токена
  if (!token || token.trim().length === 0) {
    console.error('apiDeleteAuth: invalid token provided', {
      hasToken: !!token,
      tokenLength: token?.length,
      url
    });
    throw new Error('Invalid token: token is empty or contains only whitespace');
  }
  
  const response = await fetch(`${API_BASE_URL}${url}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw error;
  }

  return response.json();
};

// Additional helper functions for API modules
export const apiPost = async <T>(url: string, data: any, token: string): Promise<T> => {
  // Проверка токена
  if (!token || token.trim().length === 0) {
    console.error('apiPost: invalid token provided', {
      hasToken: !!token,
      tokenLength: token?.length,
      url
    });
    throw new Error('Invalid token: token is empty or contains only whitespace');
  }
  
  const response = await fetch(`${API_BASE_URL}${url}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw error;
  }

  return response.json();
};

export const apiPatch = async <T>(url: string, data: any, token: string): Promise<T> => {
  // Проверка токена
  if (!token || token.trim().length === 0) {
    console.error('apiPatch: invalid token provided', {
      hasToken: !!token,
      tokenLength: token?.length,
      url
    });
    throw new Error('Invalid token: token is empty or contains only whitespace');
  }
  
  const response = await fetch(`${API_BASE_URL}${url}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw error;
  }

  return response.json();
};

export const apiDelete = async <T>(url: string, token: string): Promise<T> => {
  // Проверка токена
  if (!token || token.trim().length === 0) {
    console.error('apiDelete: invalid token provided', {
      hasToken: !!token,
      tokenLength: token?.length,
      url
    });
    throw new Error('Invalid token: token is empty or contains only whitespace');
  }
  
  const response = await fetch(`${API_BASE_URL}${url}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw error;
  }

  return response.json();
};

// ============ Orders high-level API functions ============

export interface OrderEstimate {
  delivery_price: number;
  total_price: number;
  discount_amount?: number;
  estimated_cooking_time: number;
}

interface OrderPaymentInitLegacyResponse {
  Success: boolean;
  PaymentId?: string;
  Message?: string;
  [key: string]: unknown;
}

interface OrderSbpQrResponse {
  Success: boolean;
  Data?: string;
  Message?: string;
  [key: string]: unknown;
}

export const createOrder = async (data: any, token?: string): Promise<Order> => {
  if (!token || token.trim().length === 0) {
    console.error('createOrder: invalid token provided', {
      hasToken: !!token,
      tokenLength: token?.length,
    });
    throw new Error('Invalid token: token is empty or contains only whitespace');
  }

  const response = await fetch(`${API_BASE_URL}/api/orders/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw error;
  }

  return response.json();
};

export const payOrder = async (
  orderId: string,
  token?: string,
): Promise<{ detail: string; status: string }> => {
  if (!token || token.trim().length === 0) {
    console.error('payOrder: invalid token provided', {
      hasToken: !!token,
      tokenLength: token?.length,
      orderId,
    });
    throw new Error('Invalid token: token is empty or contains only whitespace');
  }

  const response = await fetch(`${API_BASE_URL}/api/orders/${orderId}/pay/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({}),
  });

  if (!response.ok) {
    const error = await response.json();
    throw error;
  }

  return response.json();
};

export const initOrderPayment = async (
  orderId: string,
  token?: string,
): Promise<OrderPaymentInitLegacyResponse> => {
  if (!token || token.trim().length === 0) {
    console.error('initOrderPayment: invalid token provided', {
      hasToken: !!token,
      tokenLength: token?.length,
      orderId,
    });
    throw new Error('Invalid token: token is empty or contains only whitespace');
  }

  const response = await fetch(`${API_BASE_URL}/api/orders/${orderId}/init_payment/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({}),
  });

  if (!response.ok) {
    const error = await response.json();
    throw error;
  }

  const data = await response.json();

  return {
    Success: true,
    PaymentId: data.payment_id as string | undefined,
    Message: null,
    ...data,
  };
};

export const getOrderSbpQr = async (
  orderId: string,
  token?: string,
): Promise<OrderSbpQrResponse> => {
  if (!token || token.trim().length === 0) {
    console.error('getOrderSbpQr: invalid token provided', {
      hasToken: !!token,
      tokenLength: token?.length,
      orderId,
    });
    throw new Error('Invalid token: token is empty or contains only whitespace');
  }

  const response = await fetch(`${API_BASE_URL}/api/orders/${orderId}/get_sbp_qr/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({}),
  });

  if (!response.ok) {
    const error = await response.json();
    throw error;
  }

  return response.json();
};

export const reorderOrder = async (orderId: string, token: string): Promise<Order> => {
  const reorderResponse = await apiPostAuth<{
    success?: boolean;
    data?: { order_id?: string };
    order_id?: string;
  }>('/api/orders/reorder/', token, {
    order_id: orderId,
  });

  const newOrderId =
    reorderResponse.data?.order_id || (reorderResponse.order_id as string | undefined);

  if (!newOrderId) {
    throw new Error('Не удалось определить идентификатор нового заказа');
  }

  const order = await apiGetAuth<Order>(`/api/v1/orders/${newOrderId}/`, token);
  return order;
};

export const api = {
  // Orders API
  orders: {
    reject: (orderId: string, reason: string) =>
      fetch(`${API_BASE_URL}/orders/${orderId}/reject/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      }),
    
    addTips: (orderId: string, amount: number) =>
      fetch(`${API_BASE_URL}/orders/${orderId}/add_tips/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount }),
      }),
    
    rescheduleDelivery: (orderId: string, newTime: string, recipientConsent: boolean, reason: string) =>
      fetch(`${API_BASE_URL}/orders/${orderId}/reschedule_delivery/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          new_delivery_time: newTime,
          recipient_consent: recipientConsent,
          reason,
        }),
      }),
    
    markUnsatisfactory: (orderId: string, reason: string, description: string, photos?: File[]) => {
      const formData = new FormData();
      formData.append('reason', reason);
      formData.append('description', description);
      if (photos) {
        photos.forEach((photo) => {
          formData.append(`photos`, photo);
        });
      }
      
      return fetch(`${API_BASE_URL}/orders/${orderId}/mark_unsatisfactory/`, {
        method: 'POST',
        body: formData,
      });
    },
    
    getDisputes: (orderId: string) =>
      fetch(`${API_BASE_URL}/orders/${orderId}/disputes/`),
    
    getDeliveryStatus: (orderId: string) =>
      fetch(`${API_BASE_URL}/orders/${orderId}/delivery_status/`),
    
    getCommissionBreakdown: (orderId: string) =>
      fetch(`${API_BASE_URL}/orders/${orderId}/commission_breakdown/`),
  },
  
  // Disputes API
  disputes: {
    resolve: (disputeId: string, accepted: boolean, penaltyPaid?: boolean, refundAmount?: number) =>
      fetch(`${API_BASE_URL}/disputes/${disputeId}/resolve/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accepted,
          penalty_paid: penaltyPaid,
          refund_amount: refundAmount,
        }),
      }),
  },
  
  // Reviews API
  reviews: {
    requestCorrection: (reviewId: string, data: {
      refund_amount?: number;
      partial_refund?: number;
      message: string;
    }) =>
      fetch(`${API_BASE_URL}/reviews/${reviewId}/request_correction/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
    
    acceptCorrection: (reviewId: string) =>
      fetch(`${API_BASE_URL}/reviews/${reviewId}/accept_correction/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }),
    
    rejectCorrection: (reviewId: string) =>
      fetch(`${API_BASE_URL}/reviews/${reviewId}/reject_correction/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }),
  },
  
  // Producers API
  producers: {
    getRepeatCustomers: () =>
      fetch(`${API_BASE_URL}/producers/repeat_customers/`),
    
    getProblemBuyers: () =>
      fetch(`${API_BASE_URL}/producers/problem_buyers/`),
    
    blockBuyer: (buyerId: string, reason: string) =>
      fetch(`${API_BASE_URL}/producers/block_buyer/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ buyer_id: buyerId, reason }),
      }),
    
    unblockBuyer: (buyerId: string) =>
      fetch(`${API_BASE_URL}/producers/unblock_buyer/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ buyer_id: buyerId }),
      }),
    
    getFinancialSummary: () =>
      fetch(`${API_BASE_URL}/producers/financial_summary/`),
    
    getPenaltyHistory: () =>
      fetch(`${API_BASE_URL}/producers/penalty_history/`),
  },
};

// ============ Re-exports from sub-API modules ============

// Re-export cart functions with proper names
export {
  getCart,
  updateCartItemQuantity,
  saveForLater,
  getSavedItems,
  removeSavedItem,
  moveSavedToCart,
} from './api/cartApi';

// Create wrapper functions with correct parameter order for CartActions compatibility
export const cartAdd = async (dishId: string, quantity: number, token: string, selectedToppings?: any[]): Promise<void> => {
  const { addToCart } = await import('./api/cartApi');
  await addToCart(token, dishId, quantity, selectedToppings);
};

export const cartRemove = async (dishId: string, token: string, selectedToppings?: any[]): Promise<void> => {
  const { removeFromCart } = await import('./api/cartApi');
  await removeFromCart(token, dishId, selectedToppings);
};

export const cartClear = async (token: string): Promise<void> => {
  const { clearCart } = await import('./api/cartApi');
  await clearCart(token);
};

// Re-export content functions
export {
  getCategories,
  getCategoryBySlug,
  getCategory,
  getSubcategories,
  getBlogArticles,
  getBlogArticlesByCategory,
  getBlogArticleBySlug,
  getBlogArticle,
  searchBlogArticles,
  getLatestBlogArticles,
  getMetaTags,
} from './api/contentApi';

// Re-export types from sub-API modules
export type {
  CartItem,
  CartSummary,
  SavedCartItem,
  SaveForLaterRequest,
  UpdateQuantityRequest,
} from './api/cartApi';

// Alias Cart to CartSummary for compatibility
export type { CartSummary as Cart } from './api/cartApi';

export type {
  Category,
  CategoryFilters,
  BlogArticle,
  MetaTags,
} from './api/contentApi';

// Re-export profile functions
export {
  getProfile,
  toggle2FA,
  getPaymentMethods,
  addPaymentMethod,
  deletePaymentMethod,
  getDevices,
  logoutDevice,
  becomeSeller,
  requestChange,
  confirmChange,
  updateProfile,
  uploadSellerLogo,
  uploadDocument,
  getFullImageUrl,
} from './api/profileApi';

// Re-export profile types
export type {
  Profile,
  PaymentMethod,
  UserDevice,
  WeeklyScheduleDay,
  WeekDayKey,
  DeliveryZone,
  DeliveryPricingRule,
} from './api/profileApi';

// Re-export notification functions
export {
  getNotifications,
  markAllNotificationsAsRead,
} from './api/notificationApi';

// Re-export notification types
export type {
  UserNotification as Notification,
} from './api/notificationApi';

// Re-export FAQ functions
export {
  getHelpArticles,
} from './api/faqApi';

// Re-export FAQ types
export type {
  HelpArticle,
} from './api/faqApi';

// Re-export review functions
export {
  getProducerReviews,
} from './api/reviewApi';

// Re-export review types
export type {
  Review,
} from './api/reviewApi';

// ============ Catalog API functions ============

export interface Dish {
  id: string;
  name: string;
  description: string;
  price: string;
  photo: string;
  category: string;
  producer: string;
  cooking_time_minutes: number;
  allow_preorder: boolean;
  is_available: boolean;
  is_top: boolean;
  is_archived: boolean;
  weight?: string;
  composition?: string;
  manufacturing_time?: string;
  shelf_life?: string;
  storage_conditions?: string;
  dimensions?: string;
  fillings?: string;
  sales_count?: number;
  max_quantity_per_order?: number | null;
  start_sales_at?: string | null;
  calories?: number;
  carbs?: number;
  fats?: number;
  proteins?: number;
  min_quantity: number;
  discount_percentage?: number;
  repeat_purchase_count?: number;
  rating?: number;
  reviews_count?: number;
  views_count?: number;
  in_cart_count?: number;
  rating_count?: number;
  sort_score?: number;
}

export interface Producer {
  id: string;
  name: string;
  description?: string;
  photo?: string;
  address?: string;
  rating?: number;
  reviews_count?: number;
  dishes_count?: number;
  is_verified: boolean;
  delivery_zones?: any[];
  pickup_enabled: boolean;
  weekly_schedule?: any;
}

export interface DishFilters {
  category?: string;
  producer?: string;
  search?: string;
  min_price?: number;
  max_price?: number;
  is_available?: boolean | string;
  is_archived?: boolean | string;
  is_top?: boolean;
  page?: number;
  page_size?: number;
}

export interface ProducerFilters {
  search?: string;
  is_verified?: boolean;
  pickup_enabled?: boolean;
  page?: number;
  page_size?: number;
}

/**
 * Получить список блюд с фильтрами
 */
export const getDishes = async (params?: DishFilters): Promise<{ results: Dish[]; count: number }> => {
  const queryParams = new URLSearchParams();

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.append(key, String(value));
      }
    });
  }

  const queryString = queryParams.toString();
  const url = `/api/dishes/${queryString ? `?${queryString}` : ''}`;

  console.log('[getDishes] Fetching with params:', params);
  console.log('[getDishes] URL:', `${API_BASE_URL}${url}`);

  const response = await fetch(`${API_BASE_URL}${url}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    console.error('[getDishes] Error response:', error);
    throw error;
  }

  const responseData = await response.json();
  console.log('[getDishes] Response data:', responseData);

  // Backend returns { success: true, data: [...], pagination: { count: ... } }
  // Transform to expected format { results: [...], count: ... }
  const data = {
    results: responseData.data || [],
    count: responseData.pagination?.count || 0
  };

  console.log('[getDishes] Transformed data:', data);

  return data;
};

/**
 * Получить список производителей
 */
export const getProducers = async (params?: ProducerFilters): Promise<{ results: Producer[]; count: number }> => {
  const queryParams = new URLSearchParams();
  
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.append(key, String(value));
      }
    });
  }
  
  const queryString = queryParams.toString();
  const url = `/api/producers/${queryString ? `?${queryString}` : ''}`;
  
  const response = await fetch(`${API_BASE_URL}${url}`, {
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
 * Получить производителя по ID
 */
export const getProducerById = async (id: string): Promise<Producer> => {
  const response = await fetch(`${API_BASE_URL}/api/producers/${id}/`, {
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
 * Оценить стоимость заказа для одного блюда
 */
export const estimateOrder = async (
  data: {
    dish: string;
    quantity: number;
    delivery_latitude?: number;
    delivery_longitude?: number;
    delivery_type?: 'BUILDING' | 'DOOR';
    promo_code_text?: string;
  },
  token?: string,
): Promise<OrderEstimate> => {
  if (!token || token.trim().length === 0) {
    console.error('estimateOrder: invalid token provided', {
      hasToken: !!token,
      tokenLength: token?.length,
      dish: data.dish,
    });
    throw new Error('Invalid token: token is empty or contains only whitespace');
  }

  const response = await fetch(`${API_BASE_URL}/api/orders/estimate/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw error;
  }

  return response.json();
};

/**
 * Получить список заказов для текущего пользователя
 */
export const getOrders = async (token: string): Promise<Order[]> => {
  const response = await fetch(`${API_BASE_URL}/api/v1/orders/`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw error;
  }

  const data = await response.json();
  // API v1 returns { success: true, data: Order[], pagination: {...} } format
  // Legacy API returns { results: Order[] } format
  return data.data || data.results || data;
};

export const acceptOrder = async (orderId: string, token: string): Promise<Order> => {
  const response = await fetch(`${API_BASE_URL}/api/v1/orders/${orderId}/accept/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ order_id: orderId }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw error;
  }

  const data = await response.json();
  return data.order || data;
};

export const cancelOrder = async (
  orderId: string,
  _actor: 'seller' | 'buyer',
  reason: string,
  token: string,
): Promise<Order> => {
  const response = await fetch(`${API_BASE_URL}/api/v1/orders/${orderId}/cancel/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      order_id: orderId,
      reason,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw error;
  }

  const data = await response.json();
  return data.order || data;
};

export const rejectOrder = async (
  orderId: string,
  reason: string,
  token: string,
): Promise<Order> => {
  const response = await fetch(`${API_BASE_URL}/api/v1/orders/${orderId}/reject/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      order_id: orderId,
      reason,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw error;
  }

  const data = await response.json();
  return data.order || data;
};

export const uploadOrderPhoto = async (
  orderId: string,
  photoFile: File,
  token: string,
): Promise<any> => {
  const formData = new FormData();
  formData.append('photo', photoFile);

  const response = await fetch(`${API_BASE_URL}/api/orders/${orderId}/upload_photo/`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw error;
  }

  return response.json();
};

export const startDeliveryOrder = async (orderId: string, token: string): Promise<any> => {
  const response = await fetch(`${API_BASE_URL}/api/orders/${orderId}/start_delivery/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({}),
  });

  if (!response.ok) {
    const error = await response.json();
    throw error;
  }

  return response.json();
};

export const markArrivedOrder = async (orderId: string, token: string): Promise<any> => {
  const response = await fetch(`${API_BASE_URL}/api/orders/${orderId}/mark_arrived/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({}),
  });

  if (!response.ok) {
    const error = await response.json();
    throw error;
  }

  return response.json();
};

export const markReadyOrder = async (orderId: string, token: string): Promise<any> => {
  const response = await fetch(`${API_BASE_URL}/api/orders/${orderId}/mark_ready/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({}),
  });

  if (!response.ok) {
    const error = await response.json();
    throw error;
  }

  return response.json();
};

export const completeOrder = async (orderId: string, token: string): Promise<any> => {
  const response = await fetch(`${API_BASE_URL}/api/orders/${orderId}/complete/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({}),
  });

  if (!response.ok) {
    const error = await response.json();
    throw error;
  }

  return response.json();
};

// ============ Dish Management API functions ============

/**
 * Создать новое блюдо
 */
export const createDish = async (dishData: Partial<Dish>, token: string): Promise<Dish> => {
  const response = await fetch(`${API_BASE_URL}/api/dishes/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(dishData),
  });

  if (!response.ok) {
    const error = await response.json();
    throw error;
  }

  return response.json();
};

/**
 * Обновить блюдо
 */
export const updateDish = async (dishId: string, dishData: Partial<Dish>, token: string): Promise<Dish> => {
  const response = await fetch(`${API_BASE_URL}/api/dishes/${dishId}/`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(dishData),
  });

  if (!response.ok) {
    const error = await response.json();
    throw error;
  }

  return response.json();
};

/**
 * Удалить блюдо
 */
export const deleteDish = async (dishId: string, token: string): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/api/dishes/${dishId}/`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw error;
  }
};

/**
 * Загрузить фото блюда
 */
export const uploadDishPhoto = async (dishId: string, photoFile: File, token: string): Promise<Dish> => {
  const formData = new FormData();
  formData.append('photo', photoFile);

  const response = await fetch(`${API_BASE_URL}/api/dishes/${dishId}/upload_photo/`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw error;
  }

  return response.json();
};

/**
 * Добавить дополнительное фото блюда
 */
export const addDishImage = async (dishId: string, imageFile: File, token: string): Promise<Dish> => {
  const formData = new FormData();
  formData.append('image', imageFile);

  const response = await fetch(`${API_BASE_URL}/api/dishes/${dishId}/add_image/`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw error;
  }

  return response.json();
};

/**
 * Удалить фото блюда
 */
export const removeDishImage = async (dishId: string, imageId: string, token: string): Promise<Dish> => {
  const response = await fetch(`${API_BASE_URL}/api/dishes/${dishId}/remove_image/?image_id=${imageId}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw error;
  }

  return response.json();
};

export default api;
