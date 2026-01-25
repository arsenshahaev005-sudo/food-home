// API Client for HomeFood Marketplace

export const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const API_BASE_URL = BASE_URL;

// Helper functions for authenticated requests
export const apiGetAuth = async <T>(url: string, token: string): Promise<T> => {
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
        photos.forEach((photo, index) => {
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
      gift_voucher?: string;
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

export type {
  Category,
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
  getGiftNotificationSettings,
  updateGiftNotificationSettings,
} from './api/profileApi';

// Re-export profile types
export type {
  Profile,
  PaymentMethod,
  UserDevice,
  GiftNotificationSubscriptions,
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
  calories?: number;
  carbs?: number;
  fats?: number;
  proteins?: number;
  min_quantity: number;
  discount_percentage?: number;
  repeat_purchase_count?: number;
  rating?: number;
  reviews_count?: number;
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

export interface OrderEstimateItem {
  dish_id: string;
  quantity: number;
  selected_toppings?: any[];
}

export interface OrderEstimate {
  subtotal: number;
  delivery_price: number;
  total: number;
  estimated_delivery_time: string;
  cooking_time_minutes: number;
}

export interface DishFilters {
  category?: string;
  producer?: string;
  search?: string;
  min_price?: number;
  max_price?: number;
  is_available?: boolean;
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
 * Оценить стоимость заказа
 */
export const estimateOrder = async (items: OrderEstimateItem[]): Promise<OrderEstimate> => {
  const response = await fetch(`${API_BASE_URL}/api/orders/estimate/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ items }),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw error;
  }
  
  return response.json();
};

export default api;
