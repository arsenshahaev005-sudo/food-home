/**
 * API клиент для работы с отзывами.
 *
 * Обоснование: Отзывы сильно влияют на решение о покупке.
 * Фотоотзывы, видеоотзывы, детализация и ответ продавца
 * повышают доверие пользователей.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

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

function normalizeReviewListResponse(data: unknown): Review[] {
  if (Array.isArray(data)) {
    return data as Review[];
  }

  if (
    data &&
    typeof data === "object"
  ) {
    // Check for 'data' field (new API format)
    if (Array.isArray((data as { data?: unknown }).data)) {
      return (data as { data: Review[] }).data;
    }

    // Check for 'results' field (paginated format)
    if (Array.isArray((data as { results?: unknown }).results)) {
      return (data as { results: Review[] }).results;
    }
  }

  return [];
}

export async function getProducerReviews(
  arg1: string,
  arg2?: string,
): Promise<Review[]> {
  const hasToken = typeof arg2 === "string";
  const token = hasToken ? arg1 : undefined;
  const producerId = hasToken ? (arg2 as string) : arg1;

  const params = new URLSearchParams();
  params.append("producer", producerId);

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(
    `${API_BASE_URL}/api/reviews/?${params.toString()}`,
    {
      method: "GET",
      headers,
    },
  );

  if (!response.ok) {
    try {
      const errorBody = await response.json();
      throw errorBody;
    } catch (e) {
      console.error("[getProducerReviews] Failed to parse error JSON", e);
      throw {
        detail: "Не удалось загрузить отзывы",
        status: response.status,
      };
    }
  }

  const data = await response.json();
  return normalizeReviewListResponse(data);
}
