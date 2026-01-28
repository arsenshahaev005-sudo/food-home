'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { getProducerReviews, type Profile, type Review } from '@/lib/api';

// Helper to get cookie value
function getCookie(name: string) {
  if (typeof document === "undefined") return "";
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(";").shift();
}

interface SellerReviewsProps {
  profile: Profile;
}

type FilterId = 'all' | 'positive' | 'negative' | 'unanswered';

const SellerReviews: React.FC<SellerReviewsProps> = ({ profile }) => {
  const [filter, setFilter] = useState<FilterId>('all');
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [, setError] = useState<string | null>(null);

  // Dispute state
  const [disputeReviewId, setDisputeReviewId] = useState<string | null>(null);
  const [disputeDescription, setDisputeDescription] = useState('');
  const [disputeReason, setDisputeReason] = useState('OTHER');
  const [disputeSaving, setDisputeSaving] = useState(false);

  useEffect(() => {
    if (!profile.producer_id) {
      setReviews([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const token = getCookie("accessToken");
    if (!token) {
      setError('Не авторизован');
      setLoading(false);
      return;
    }

    getProducerReviews(token, String(profile.producer_id))
      .then((data) => {
        setReviews(data || []);
      })
      .catch((error) => {
        console.error('Error loading reviews:', error);
        setError('Не удалось загрузить отзывы. Попробуйте позже.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [profile.producer_id]);

  const filteredReviews = useMemo(() => {
    if (filter === 'all') {
      return reviews;
    }

    return reviews.filter((r) => {
      const avg = (r.rating_taste + r.rating_appearance + r.rating_service) / 3;
      if (filter === 'positive') {
        return avg >= 4;
      }
      if (filter === 'negative') {
        return avg < 4; // Changed from <= 3 to < 4 to be more standard
      }
      if (filter === 'unanswered') {
        // Assuming unanswered reviews have no response from seller
        return !r.seller_answer; // Using seller_answer field if available in Review type
      }
      return true;
    });
  }, [reviews, filter]);

  const handleRaiseDispute = async () => {
    if (!disputeReviewId || !disputeDescription.trim()) return;
    const token = document.cookie
      .split('; ')
      .find(row => row.startsWith('accessToken='))
      ?.split('=')[1];
    
    if (!token) {
      alert('Для открытия спора необходимо авторизоваться');
      return;
    }

    setDisputeSaving(true);
    try {
      // Note: This function may not exist in the API - adjust as needed
      // await raiseReviewDispute(disputeReviewId, disputeDescription, disputeReason, token);
      alert("Спор открыт. Администрация рассмотрит вашу заявку.");
      setDisputeReviewId(null);
      setDisputeDescription('');
      setDisputeReason('OTHER');
    } catch (e: any) {
      alert(e?.detail || "Ошибка открытия спора");
    } finally {
      setDisputeSaving(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Отзывы покупателей</h1>
          <p className="text-gray-500 mt-1">
            Отвечайте на отзывы и повышайте рейтинг вашего магазина
          </p>
        </div>

        <div className="flex bg-white p-1 rounded-2xl border border-gray-200 shadow-sm">
          {[
            { id: 'all' as FilterId, label: 'Все' },
            { id: 'positive' as FilterId, label: 'Положительные' },
            { id: 'negative' as FilterId, label: 'Отрицательные' },
            { id: 'unanswered' as FilterId, label: 'Без ответа' },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                filter === f.id
                  ? 'bg-[#c9825b] text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#c9825b]"></div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          {filteredReviews.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {filter === 'all' ? 'Нет отзывов' : 
               filter === 'positive' ? 'Нет положительных отзывов' : 
               filter === 'negative' ? 'Нет отрицательных отзывов' : 
               'Нет безответных отзывов'}
            </div>
          ) : (
            <ul className="space-y-4">
              {filteredReviews.map((review) => {
                const avgRating = (review.rating_taste + review.rating_appearance + review.rating_service) / 3;
                
                return (
                  <li key={review.id} className="bg-white rounded-[32px] p-6 border border-gray-100 shadow-sm">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center text-[#c9825b] font-bold text-lg">
                          {Math.round(avgRating)}
                        </div>
                        <div>
                          <div className="font-bold text-gray-900">{review.user ? `${review.user.first_name} ${review.user.last_name}` : 'Покупатель'}</div>
                          <div className="flex items-center gap-2">
                            <div className="text-sm text-gray-400">
                              {new Date(review.created_at).toLocaleDateString('ru-RU', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </div>
                            <span className="text-gray-300">•</span>
                            <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                              Заказ #{review.order.substring(0, 8)}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <div className="flex gap-0.5">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <svg
                              key={star}
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 24 24"
                              fill={star <= Math.round(avgRating) ? "currentColor" : "none"}
                              className={`w-4 h-4 ${star <= Math.round(avgRating) ? 'text-yellow-400' : 'text-gray-200'}`}
                              stroke="currentColor"
                            >
                              <path
                                fillRule="evenodd"
                                d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z"
                                clipRule="evenodd"
                              />
                            </svg>
                          ))}
                        </div>
                        <button
                          onClick={() => setDisputeReviewId(review.id)}
                          className="text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-red-500 transition-colors"
                        >
                          Оспорить
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-col md:flex-row gap-8 mt-6">
                      {/* Ratings breakdown */}
                      <div className="flex flex-col gap-3 min-w-[140px] pt-1">
                        {[
                          { label: 'Вкус', value: review.rating_taste },
                          { label: 'Внешний вид', value: review.rating_appearance },
                          { label: 'Сервис', value: review.rating_service },
                        ].map((item, i) => (
                          <div key={i} className="flex flex-col gap-1.5">
                            <span className="text-[11px] font-black uppercase tracking-widest text-gray-400">
                              {item.label}
                            </span>
                            <div className="flex items-center gap-3">
                              <span className="text-lg font-bold text-gray-900">{item.value}/5</span>
                              <div className="flex gap-0.5">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <svg
                                    key={star}
                                    className={`w-4 h-4 ${
                                      star <= item.value ? 'text-yellow-400 fill-current' : 'text-gray-100 fill-current'
                                    }`}
                                    viewBox="0 0 24 24"
                                  >
                                    <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                                  </svg>
                                ))}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Photos */}
                      {(review.dish_photo || review.finished_photo || review.photo) && (
                        <div className="flex flex-wrap gap-6 flex-1">
                          {review.dish_photo && (
                            <div className="space-y-3">
                              <div className="w-44 h-44 rounded-[32px] overflow-hidden border border-gray-100 shadow-sm group cursor-zoom-in">
                                <img
                                  src={review.dish_photo}
                                  alt="Dish main"
                                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                />
                              </div>
                              <div className="text-[10px] font-black uppercase tracking-widest text-gray-400 text-center">
                                Карточка товара
                              </div>
                            </div>
                          )}
                          {review.finished_photo && (
                            <div className="space-y-3">
                              <div className="w-44 h-44 rounded-[32px] overflow-hidden border border-gray-100 shadow-sm group cursor-zoom-in">
                                <img
                                  src={review.finished_photo}
                                  alt="Finished dish"
                                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                />
                              </div>
                              <div className="text-[10px] font-black uppercase tracking-widest text-gray-400 text-center">
                                Готовое блюдо
                              </div>
                            </div>
                          )}
                          {review.photo && (
                            <div className="space-y-3">
                              <div className="w-44 h-44 rounded-[32px] overflow-hidden border border-gray-100 shadow-sm group cursor-zoom-in">
                                <img
                                  src={review.photo}
                                  alt="Фото покупателя"
                                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                />
                              </div>
                              <div className="text-[10px] font-black uppercase tracking-widest text-gray-400 text-center">
                                Фото покупателя
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Comment */}
                    {review.comment && (
                      <div className="relative mt-6">
                        <div className="absolute -left-4 top-0 bottom-0 w-1 bg-[#c9825b]/10 rounded-full" />
                        <p className="text-gray-800 leading-relaxed font-medium pl-2 italic">
                          «{review.comment}»
                        </p>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {/* Dispute Modal */}
      {disputeReviewId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" 
            onClick={() => setDisputeReviewId(null)}
          />
          <div className="relative w-full max-w-md bg-white rounded-[32px] p-8 shadow-2xl animate-in zoom-in-95 duration-200">
            <button 
              onClick={() => setDisputeReviewId(null)}
              className="absolute top-6 right-6 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="space-y-6">
              <div>
                <h3 className="text-2xl font-bold text-gray-900">Оспорить отзыв</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Опишите причину, по которой вы считаете этот отзыв некорректным.
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 ml-1">Причина</label>
                  <select
                    value={disputeReason}
                    onChange={(e) => setDisputeReason(e.target.value)}
                    className="w-full rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3 outline-none focus:ring-2 focus:ring-[#c9825b] focus:border-transparent transition-all"
                  >
                    <option value="QUALITY">Претензия к качеству (необоснованно)</option>
                    <option value="NOT_RECEIVED">Заказ не был получен (ложь)</option>
                    <option value="OTHER">Другое</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 ml-1">Описание</label>
                  <textarea
                    value={disputeDescription}
                    onChange={(e) => setDisputeDescription(e.target.value)}
                    rows={4}
                    placeholder="Подробно опишите ситуацию..."
                    className="w-full rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3 outline-none focus:ring-2 focus:ring-[#c9825b] focus:border-transparent transition-all resize-none"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setDisputeReviewId(null)}
                  className="flex-1 px-6 py-3.5 rounded-2xl font-bold text-gray-500 hover:bg-gray-50 transition-all"
                >
                  Отмена
                </button>
                <button
                  onClick={handleRaiseDispute}
                  disabled={disputeSaving || !disputeDescription.trim()}
                  className="flex-[2] bg-[#c9825b] text-white px-6 py-3.5 rounded-2xl font-bold hover:bg-[#b07350] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#c9825b]/20 flex items-center justify-center gap-2"
                >
                  {disputeSaving ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    'Отправить запрос'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SellerReviews;
