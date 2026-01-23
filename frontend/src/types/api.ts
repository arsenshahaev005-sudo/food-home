// API Types for HomeFood Marketplace

export interface Dish {
  id: string;
  name: string;
  description: string;
  price: string;
  category: string;
  producer: string;
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
  is_favorite?: boolean; // Added for favorites functionality
  rating?: number;
  review_count?: number;
}

export interface Topping {
  id: number;
  name: string;
  price: number;
}

export interface SearchHistoryItem {
  id: string;
  query: string;
  results_count: number;
  created_at: string;
}

export interface SavedSearch {
  id: string;
  name: string;
  query_params: Record<string, any>;
  created_at: string;
}

export interface Order {
  id: string;
  user_name: string;
  user: string;
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
  total_cooking_time?: number; // Added for cart optimization
}

export interface Review {
  id: string;
  order: string;
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

export interface Chat {
  id: string;
  // Add other chat properties as needed
}