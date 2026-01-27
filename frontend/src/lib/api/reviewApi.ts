/**
 * API клиент для работы с отзывами.
 * 
 * Обоснование: Отзывы сильно влияют на решение о покупке.
 * Фотоотзывы, видеоотзывы, детализация и ответ продавца
 * повышают доверие пользователей.
 * */

import { BASE_URL } from '../api';

export interface Review {
  id: string;
  order: string;
  dish_name: string;
  dish_photo?: string;
  rating_taste: number;
  rating_appearance: number;
  rating_service: number;
  rating_portion?: number;
  rating_packaging?: number;
  comment: string;
  created_at: string;
  is_updated: boolean;
  photo?: string;
  video?: string;
  dish_additional_photos?: string[];
  seller_response?: string;
  seller_response_created_at?: string;
  seller_answer?: string;
  user?: {
    id: string;
    first_name: string;
    last_name: string;
  };
  finished_photo?: string;
}

export interface ReviewFormData {
  order: string;
  rating_taste: number;
  rating_appearance: number;
  rating_service: number;
  rating_portion?: number;
  rating_packaging?: number;
  comment?: string;
  photo?: File;
  video?: File;
  dish_additional_photos?: File[];
}

export interface SellerResponseFormData {
  review_id: string;
  answer: string;
  photo?: File;
}
