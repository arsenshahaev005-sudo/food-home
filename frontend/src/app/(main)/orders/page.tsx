"use client";

import { useState, useEffect } from "react";
import { getOrders, approveOrderPhoto, createReview, updateReview, acceptReviewRefund, getFullImageUrl, type Order, type Review } from "@/lib/api";
import Link from "next/link";
import DishQuickViewModal from "@/components/DishQuickViewModal";

// I'll use a client-side way to get the token or pass it from a parent if possible.
// Since this is a new page, I'll use a small helper to get the token from cookies on the client.
function getCookie(name: string) {
  if (typeof document === "undefined") return "";
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(";").shift();
  return "";
}

export default function OrdersPage() {
  const [token, setToken] = useState<string | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'active' | 'completed' | 'cancelled'>('active');
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [highlightedOrder, setHighlightedOrder] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<Record<string, { role: 'user' | 'seller', text: string, time: string }[]>>({});
  const [reviewDrafts, setReviewDrafts] = useState<Record<string, { taste: number; appearance: number; service: number; comment: string; photoFile?: File | null; photoPreview?: string | null; existingPhoto?: string | null }>>({});
  const [reviewSubmitting, setReviewSubmitting] = useState<string | null>(null);
  const [dishQuickViewOpen, setDishQuickViewOpen] = useState(false);
  const [dishQuickViewId, setDishQuickViewId] = useState<string | null>(null);

  useEffect(() => {
    const t = getCookie("accessToken");
    if (t) {
      setToken(t);
      fetchOrders(t);
    } else {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!loading && orders.length > 0) {
      const hash = window.location.hash;
      if (hash.startsWith('#order-')) {
        const orderId = hash.replace('#order-', '');
        const order = orders.find(o => o.id === orderId);
        
        if (order) {
          // Determine which tab the order belongs to
          if (order.status === 'COMPLETED') setActiveTab('completed');
          else if (order.status === 'CANCELLED') setActiveTab('cancelled');
          else setActiveTab('active');

          // Expand the order
          setExpandedOrder(orderId);
          setHighlightedOrder(orderId);

          // Scroll to it
          setTimeout(() => {
            const element = document.getElementById(`order-${orderId}`);
            if (element) {
              element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          }, 100);

          // Remove highlight after 3 seconds
          setTimeout(() => {
            setHighlightedOrder(null);
          }, 3000);
        }
      }
    }
  }, [loading, orders]);

  const fetchOrders = async (authToken: string, silent: boolean = false) => {
    if (!silent) {
      setLoading(true);
    }
    try {
      const data = await getOrders(authToken);
      setOrders(data.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
    } catch (e) {
      console.error("Failed to fetch orders", e);
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    if (!token) return;
    const interval = setInterval(() => {
      fetchOrders(token, true);
    }, 15000);
    return () => clearInterval(interval);
  }, [token]);

  const getStatusInfo = (status: Order["status"], isGift: boolean) => {
    switch (status) {
      case "WAITING_FOR_PAYMENT":
        return {
          label: isGift ? "Подарок: ждём оплаты" : "Ожидает оплаты",
          color: "text-orange-600",
          bg: "bg-orange-50",
        };
      case "WAITING_FOR_RECIPIENT":
        return {
          label: isGift ? "Подарок: ждём данные получателя" : "Ожидает данных",
          color: "text-orange-600",
          bg: "bg-orange-50",
        };
      case "WAITING_FOR_ACCEPTANCE":
        return {
          label: isGift ? "Подарок: ждём подтверждения" : "Ожидает подтверждения",
          color: "text-blue-600",
          bg: "bg-blue-50",
        };
      case "COOKING":
        return { label: "Готовится", color: "text-orange-600", bg: "bg-orange-50" };
      case "READY_FOR_REVIEW":
        return { label: "Блюдо готово", color: "text-blue-600", bg: "bg-blue-50" };
      case "READY_FOR_DELIVERY":
        return { label: "Готов к доставке", color: "text-blue-600", bg: "bg-blue-50" };
      case "DELIVERING":
        return { label: "В пути", color: "text-purple-600", bg: "bg-purple-50" };
      case "ARRIVED":
        return { label: "Доставлен", color: "text-green-600", bg: "bg-green-50" };
      case "COMPLETED":
        return { label: isGift ? "Подарок доставлен" : "Завершен", color: "text-green-600", bg: "bg-green-50" };
      case "CANCELLED":
        return { label: isGift ? "Подарок отменён" : "Отменен", color: "text-red-600", bg: "bg-red-50" };
      case "DISPUTE":
        return { label: "Спор", color: "text-red-600", bg: "bg-red-50" };
      default:
        return { label: status, color: "text-gray-600", bg: "bg-gray-50" };
    }
  };

  const filteredOrders = orders.filter(order => {
    if (activeTab === 'completed') return order.status === 'COMPLETED';
    if (activeTab === 'cancelled') return order.status === 'CANCELLED';
    return !['COMPLETED', 'CANCELLED'].includes(order.status);
  });

  const toggleExpand = (id: string) => {
    setExpandedOrder(expandedOrder === id ? null : id);
  };

  const handleOpenDish = (dishId: string) => {
    setDishQuickViewId(dishId);
    setDishQuickViewOpen(true);
  };

  useEffect(() => {
    // Poll for new messages from seller
    const interval = setInterval(() => {
      const currentChats = JSON.parse(localStorage.getItem('order_chats') || '{}');
      setChatMessages(currentChats);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleChatClick = (order: Order) => {
    // Save metadata before redirecting
    const metadata = JSON.parse(localStorage.getItem('order_metadata') || '{}');
    
    // Attempt to get full name of producer if available, otherwise fallback to producer_name
    const producerFirstName = (order as any).producer_first_name || '';
    const producerLastName = (order as any).producer_last_name || '';
    const sellerFullName = (producerFirstName || producerLastName) 
      ? `${producerFirstName} ${producerLastName}`.trim() 
      : ((order as any).producer_name || 'Продавец');

    metadata[order.id] = {
      dishName: order.dish.name,
      dishPhoto: order.dish.photo,
      userName: order.user_name,
      sellerName: sellerFullName,
      orderDate: new Date(order.created_at).toLocaleString('ru-RU', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }),
      quantity: order.quantity,
      totalPrice: order.total_price
    };
    localStorage.setItem('order_metadata', JSON.stringify(metadata));

    // Ensure the chat exists in order_chats if it doesn't already
    const orderChats = JSON.parse(localStorage.getItem('order_chats') || '{}');
    if (!orderChats[order.id]) {
      orderChats[order.id] = [];
      localStorage.setItem('order_chats', JSON.stringify(orderChats));
    }
  };

  const handleOpenDispute = (orderId: string) => {
    if (confirm("Вы уверены, что хотите открыть спор по этому заказу?")) {
      // Update metadata
      const orderMeta = JSON.parse(localStorage.getItem('order_metadata') || '{}');
      const currentOrder = orders.find(o => o.id === orderId);
      
      if (!orderMeta[orderId] && currentOrder) {
        // Initialize metadata if not exists
        const producerFirstName = (currentOrder as any).producer_first_name || '';
        const producerLastName = (currentOrder as any).producer_last_name || '';
        const sellerFullName = (producerFirstName || producerLastName) 
          ? `${producerFirstName} ${producerLastName}`.trim() 
          : ((currentOrder as any).producer_name || 'Продавец');

        orderMeta[orderId] = {
          dishName: currentOrder.dish.name,
          dishPhoto: currentOrder.dish.photo,
          userName: currentOrder.user_name,
          sellerName: sellerFullName,
          orderDate: new Date(currentOrder.created_at).toLocaleString('ru-RU', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }),
          quantity: currentOrder.quantity,
          totalPrice: currentOrder.total_price
        };
      }
      
      if (orderMeta[orderId]) {
        orderMeta[orderId].status = 'DISPUTE';
        localStorage.setItem('order_metadata', JSON.stringify(orderMeta));
      }

      // Add system message
      const msg = { 
        role: 'system', 
        text: '⚠️ Был открыт спор по этому заказу. Поддержка Food&Home подключится в ближайшее время.', 
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
      };
      
      const currentChats = JSON.parse(localStorage.getItem('order_chats') || '{}');
      const orderMsgs = currentChats[orderId] || [];
      currentChats[orderId] = [...orderMsgs, msg];
      localStorage.setItem('order_chats', JSON.stringify(currentChats));
      
      // Update local state to reflect change immediately
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'DISPUTE' } : o));
    }
  };

  const handleApprove = async (orderId: string) => {
    if (!token) return;
    try {
      const updatedOrder = await approveOrderPhoto(orderId, token);
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: updatedOrder.status } : o));
    } catch {
      alert("Ошибка при одобрении фото");
    }
  };

  const handleSubmitReview = async (order: Order) => {
    if (!token) return;
    const baseReview = (order as any).review as Review | undefined;
    const currentDraft = reviewDrafts[order.id] || {
      taste: baseReview?.rating_taste ?? 5,
      appearance: baseReview?.rating_appearance ?? 5,
      service: baseReview?.rating_service ?? 5,
      comment: baseReview?.comment ?? "",
      photoFile: undefined,
      photoPreview: undefined,
      existingPhoto: (baseReview as any)?.photo ?? undefined,
    };

    setReviewSubmitting(order.id);
    try {
      if (!baseReview) {
        const created = await createReview(
          {
            order: order.id,
            rating_taste: currentDraft.taste,
            rating_appearance: currentDraft.appearance,
            rating_service: currentDraft.service,
            comment: currentDraft.comment,
          },
          token,
          currentDraft.photoFile || undefined
        );
        setOrders(prev =>
          prev.map(o => (o.id === order.id ? { ...o, review: created as any } : o))
        );
      } else {
        const updated = await updateReview(
          baseReview.id,
          {
            rating_taste: currentDraft.taste,
            rating_appearance: currentDraft.appearance,
            rating_service: currentDraft.service,
            comment: currentDraft.comment,
          },
          token,
          currentDraft.photoFile || undefined
        );
        setOrders(prev =>
          prev.map(o => (o.id === order.id ? { ...o, review: updated as any } : o))
        );
      }
    } catch (error) {
      console.error("Error submitting review:", error);
      alert("Не удалось сохранить отзыв");
    } finally {
      setReviewSubmitting(null);
    }
  };

  const handleAcceptRefund = async (review: Review, orderId: string) => {
    if (!token) return;
    try {
      await acceptReviewRefund(review.id, token);
      setOrders(prev =>
        prev.map(o =>
          o.id === orderId && o.review
            ? { ...o, review: { ...(o.review as any), refund_accepted: true } }
            : o
        )
      );
    } catch {
      alert("Не удалось принять предложение возврата");
    }
  };

  if (!token && !loading) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4 text-center">
        <h1 className="text-3xl font-black text-gray-900 mb-4">Мои заказы</h1>
        <p className="text-gray-500 mb-8">Для просмотра истории заказов необходимо войти в аккаунт</p>
        <Link href="/auth/login" className="btn-warm px-8 py-3 rounded-2xl font-black">
          Войти
        </Link>
      </div>
    );
  }

  return (
    <>
      <DishQuickViewModal
        isOpen={dishQuickViewOpen}
        dishId={dishQuickViewId}
        initialDish={null}
        onClose={() => setDishQuickViewOpen(false)}
      />
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-gray-900">Мои заказы</h1>
          <p className="text-gray-500 font-medium mt-1">История ваших покупок и текущие заказы</p>
        </div>
        <Link href="/cart" className="text-sm font-black text-[#c9825b] hover:underline flex items-center gap-2">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          Вернуться в корзину
        </Link>
      </div>

      <div className="bg-white rounded-[32px] shadow-sm border border-gray-100 overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center bg-gray-50/50">
          <div className="grid grid-cols-3 w-full max-w-md gap-3">
            {[
              { id: 'active', label: 'Активные' },
              { id: 'completed', label: 'Завершенные' },
              { id: 'cancelled', label: 'Отмененные' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`relative py-3 text-[10px] md:text-xs font-black uppercase tracking-widest transition-all rounded-2xl border-2 flex items-center justify-center gap-2 px-4 ${
                  activeTab === tab.id 
                    ? 'bg-white border-[#c9825b] text-[#c9825b] shadow-lg shadow-[#c9825b]/10 scale-[1.02]' 
                    : 'bg-white border-transparent text-gray-400 hover:text-gray-600 hover:bg-gray-100/50'
                }`}
              >
                {activeTab === tab.id && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#c9825b] flex-shrink-0" />
                )}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="p-6 space-y-4 min-h-[400px]">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 space-y-4">
              <div className="w-12 h-12 border-4 border-[#c9825b] border-t-transparent rounded-full animate-spin" />
              <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">Загрузка заказов...</p>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="text-center py-24 space-y-6">
              <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mx-auto">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5">
                  <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div>
                <p className="text-gray-900 font-black text-xl">
                  {activeTab === 'active' ? 'Активных заказов нет' : 
                   activeTab === 'completed' ? 'Завершенных заказов нет' : 
                   'Отмененных заказов нет'}
                </p>
                <p className="text-gray-500 text-base mt-2">Здесь будут отображаться ваши покупки</p>
              </div>
              <Link href="/dishes" className="btn-warm inline-flex px-8 py-3 rounded-2xl font-black">
                Перейти к покупкам
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
          {filteredOrders.map((order) => {
            const isGift = Boolean((order as any).is_gift);
            const status = getStatusInfo(order.status, isGift);
            const isExpanded = expandedOrder === order.id;
            const baseReview = (order as any).review as Review | undefined;
            const currentDraft =
              reviewDrafts[order.id] || {
                taste: baseReview?.rating_taste ?? 5,
                appearance: baseReview?.rating_appearance ?? 5,
                service: baseReview?.rating_service ?? 5,
                comment: baseReview?.comment ?? "",
                photoFile: undefined,
                photoPreview: undefined,
                existingPhoto: (baseReview as any)?.photo ?? undefined,
              };
            const canEditReview =
              order.status === "COMPLETED" &&
              (!baseReview || !baseReview.is_updated);
            const hasRefundOffer =
              !!baseReview &&
              !!baseReview.refund_offered_amount &&
              !baseReview.refund_accepted;
            const giftSubstatus =
              isGift && order.status === "WAITING_FOR_RECIPIENT"
                ? "Получатель ещё не указал адрес доставки по ссылке из SMS"
                : isGift && order.status === "WAITING_FOR_ACCEPTANCE"
                ? "Данные получателя указаны, заказ ждёт подтверждения продавца"
                : isGift && order.status === "WAITING_FOR_PAYMENT"
                ? "Подарочный заказ будет создан после оплаты"
                : null;

            return (
              <div
                key={order.id}
                id={`order-${order.id}`}
                className={`bg-gray-50 rounded-[24px] border border-gray-100 transition-all duration-300 overflow-hidden ${
                  isExpanded
                    ? "ring-2 ring-[#c9825b]/20 bg-white border-[#c9825b]/20 shadow-xl shadow-[#c9825b]/5"
                    : "hover:border-[#c9825b]/30"
                } ${
                  highlightedOrder === order.id
                    ? "ring-4 ring-orange-400 ring-offset-2 scale-[1.02]"
                    : ""
                }`}
              >
                <div
                  className="p-5 cursor-pointer select-none"
                  onClick={() => toggleExpand(order.id)}
                >
                      <div className="flex items-start justify-between gap-6">
                        <div className="flex items-center gap-5 min-w-0 flex-1">
                          <div className="w-20 h-20 rounded-2xl bg-white border border-gray-200 overflow-hidden shrink-0 shadow-sm relative group">
                            {order.status === 'READY_FOR_REVIEW' && (order as any).finished_photo ? (
                              <>
                                <img src={(order as any).finished_photo} alt={order.dish.name} className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-blue-500/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="white" className="w-6 h-6 drop-shadow-md">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 15.75-2.489-2.489m0 0a3.375 3.375 0 1 0-4.773-4.773 3.375 3.375 0 0 0 4.774 4.774ZM21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                                  </svg>
                                </div>
                                <div className="absolute top-1 right-1 w-2 h-2 bg-blue-500 rounded-full border border-white animate-pulse"></div>
                              </>
                            ) : order.dish.photo ? (
                              <img src={order.dish.photo} alt={order.dish.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-orange-50 to-orange-100 flex items-center justify-center">
                                <span className="text-orange-200 font-bold">Food</span>
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="font-black text-gray-900 text-lg leading-tight break-words pr-2">{order.dish.name}</h3>
                            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                              <span className="text-base font-bold text-[#c9825b]">{Math.round(parseFloat(order.total_price))} ₽</span>
                              <span className="text-gray-300">•</span>
                              <span className="text-sm text-gray-500 font-medium">{order.quantity} шт.</span>
                            </div>
                            <div className="text-[11px] text-gray-400 mt-2 font-black uppercase tracking-tight">
                                {new Date(order.created_at).toLocaleString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                        </div>
                        <div className="text-right flex flex-col items-end gap-3 shrink-0">
                          <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider ${status.bg} ${status.color}`}>
                            {status.label}
                          </span>
                          {giftSubstatus && (
                            <p className="text-[10px] text-orange-500 font-medium max-w-[220px] text-right">
                              {giftSubstatus}
                            </p>
                          )}
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-gray-400 font-black">#{order.id.slice(0, 8)}</span>
                            <svg 
                              width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" 
                              className={`text-gray-400 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
                            >
                              <path d="M6 9l6 6 6-6" />
                            </svg>
                          </div>
                        </div>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="px-5 pb-6 animate-in slide-in-from-top-2 duration-300">
                        <div className="h-px bg-gray-100 mb-5" />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-4">
                            <div>
                              <div className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">
                                Получатель
                              </div>
                              <div className="text-sm font-bold text-gray-800">
                                {order.user_name || "Не указано"}
                              </div>
                            </div>
                            <div>
                              <div className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">
                                Телефон
                              </div>
                              <div className="text-sm font-bold text-gray-800">
                                {order.phone || "Не указано"}
                              </div>
                            </div>
                            <div>
                              <div className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">
                                Тип доставки
                              </div>
                              <div className="text-sm font-bold text-gray-800">
                                {order.delivery_type === "DOOR" ? "До двери" : "До подъезда"}
                                {order.is_urgent && (
                                  <span className="ml-2 text-[10px] bg-red-50 text-red-500 px-2 py-0.5 rounded-full font-black uppercase tracking-widest">
                                    Срочно
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="space-y-4">
                            <div>
                              <div className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">
                                {isGift ? "Адрес получателя" : "Адрес"}
                              </div>
                              <div className="text-sm font-bold text-gray-800 leading-relaxed">
                                {(isGift ? order.recipient_address_text : order.delivery_address_text) || "Не указано"}
                              </div>
                            </div>
                            <div className="pt-2 flex items-center gap-3">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenDish(order.dish.id);
                                }}
                                className="inline-flex items-center gap-2 text-xs font-black text-[#c9825b] hover:underline bg-[#c9825b]/5 px-4 py-2 rounded-xl transition-colors hover:bg-[#c9825b]/10"
                              >
                                Перейти к блюду
                                <svg
                                  width="12"
                                  height="12"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="3"
                                >
                                  <path d="M5 12h14M12 5l7 7-7 7" />
                                </svg>
                              </button>

                              {["WAITING_FOR_ACCEPTANCE", "COOKING", "READY_FOR_REVIEW"].includes(
                                order.status
                              ) && (
                                <Link
                                  href={`/chat?orderId=${order.id}`}
                                  onClick={() => handleChatClick(order)}
                                  className="inline-flex items-center gap-2 text-xs font-black text-gray-600 hover:text-gray-900 bg-gray-100 px-4 py-2 rounded-xl transition-colors hover:bg-gray-200"
                                >
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    strokeWidth={2.5}
                                    stroke="currentColor"
                                    className="w-4 h-4"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      d="M7.5 8.25h9m-9 3h9m-9 3h3m-12 1.5a2.25 2.25 0 0 0 2.25 2.25h1.35m11.35 0h1.35a2.25 2.25 0 0 0 2.25-2.25v-12a2.25 2.25 0 0 0-2.25-2.25h-15a2.25 2.25 0 0 0-2.25 2.25v12a2.25 2.25 0 0 0 2.25 2.25Z"
                                    />
                                  </svg>
                                  Чат с продавцом
                                  {chatMessages[order.id]?.some(
                                    (m: any) => !m.read && m.role !== "user"
                                  ) && <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>}
                                </Link>
                              )}

                              {order.status !== "DISPUTE" &&
                                order.status !== "CANCELLED" &&
                                order.status !== "COMPLETED" && (
                                  <button
                                    onClick={() => handleOpenDispute(order.id)}
                                    className="inline-flex items-center gap-2 text-xs font-black text-red-500 hover:text-red-700 bg-red-50 px-4 py-2 rounded-xl transition-colors hover:bg-red-100"
                                  >
                                    Спор
                                  </button>
                                )}
                            </div>
                          </div>
                        </div>

                        {order.status === "READY_FOR_REVIEW" &&
                          (order as any).finished_photo && (
                          <div className="mt-8 p-6 bg-blue-50 rounded-[32px] border border-blue-100 space-y-6">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15a2.25 2.25 0 0 0 2.25-2.25V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
                                </svg>
                              </div>
                              <div>
                                <h4 className="text-lg font-black text-gray-900">Проверьте готовое блюдо</h4>
                                <p className="text-sm text-gray-500 font-medium">Продавец подготовил ваш заказ и прислал фото</p>
                              </div>
                            </div>

                            <div className="relative aspect-video w-full rounded-3xl overflow-hidden shadow-lg bg-white">
                              <img src={(order as any).finished_photo} alt="Finished Dish" className="w-full h-full object-cover" />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleApprove(order.id);
                                }}
                                className="w-full bg-[#c9825b] text-white py-4 rounded-2xl font-black hover:bg-[#b07350] transition-all shadow-lg shadow-[#c9825b]/20 flex items-center justify-center gap-2"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-5 h-5">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                                </svg>
                                Все отлично, отправляйте!
                              </button>
                              <Link
                                href={`/chat?orderId=${order.id}`}
                                onClick={() => handleChatClick(order)}
                                className="w-full bg-white text-gray-600 border-2 border-gray-100 py-4 rounded-2xl font-black hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  strokeWidth={2}
                                  stroke="currentColor"
                                  className="w-5 h-5"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M7.5 8.25h9m-9 3h9m-9 3h3m-6.75 4.125a3 3 0 0 0 3 3h10.5a3 3 0 0 0 3-3v-10.5a3 3 0 0 0-3-3H6.75a3 3 0 0 0-3 3v10.5Z"
                                  />
                                </svg>
                                Есть замечания
                              </Link>
                            </div>
                          </div>
                        )}

                        {["COOKING", "READY_FOR_REVIEW", "READY_FOR_DELIVERY", "DELIVERING", "ARRIVED"].includes(
                          order.status
                        ) && (
                          <div className="mt-8 pt-6 border-t border-gray-100">
                            <div className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-6 text-center">Статус доставки</div>
                            <div className="flex items-center justify-between relative max-w-xl mx-auto px-4">
                              {/* Progress Bar Background */}
                              <div className="absolute top-1/2 left-0 w-full h-0.5 bg-gray-100 -translate-y-1/2 rounded-full"></div>
                              
                              {/* Active Progress Bar */}
                              <div
                                className="absolute top-1/2 left-0 h-0.5 bg-[#c9825b] -translate-y-1/2 rounded-full transition-all duration-1000"
                                style={{ 
                                  width:
                                    order.status === "COOKING"
                                      ? "0%"
                                      : order.status === "READY_FOR_REVIEW"
                                      ? "20%"
                                      : order.status === "READY_FOR_DELIVERY"
                                      ? "50%"
                                      : order.status === "DELIVERING"
                                      ? "80%"
                                      : order.status === "ARRIVED"
                                      ? "100%"
                                      : "0%"
                                }}
                              ></div>

                              {/* Steps */}
                              {[
                                { id: "COOKING", label: "Готовится", icon: "🍳" },
                                { id: "READY_FOR_DELIVERY", label: "Собран", icon: "📦" },
                                { id: "DELIVERING", label: "В пути", icon: "🚴" },
                                { id: "ARRIVED", label: "У двери", icon: "🏠" },
                              ].map((step) => {
                                const statuses = [
                                  "WAITING_FOR_PAYMENT",
                                  "WAITING_FOR_RECIPIENT",
                                  "WAITING_FOR_ACCEPTANCE",
                                  "COOKING",
                                  "READY_FOR_REVIEW",
                                  "READY_FOR_DELIVERY",
                                  "DELIVERING",
                                  "ARRIVED",
                                  "COMPLETED",
                                ];
                                const currentIndex = statuses.indexOf(order.status);
                                const stepIndex = statuses.indexOf(step.id);
                                const isCompleted = currentIndex >= stepIndex;
                                const isCurrent = order.status === step.id;

                                return (
                                  <div key={step.id} className="relative z-10 flex flex-col items-center">
                                    <div
                                      className={`w-10 h-10 rounded-full flex items-center justify-center text-sm shadow-md transition-all duration-500 ${
                                        isCompleted
                                          ? "bg-[#c9825b] text-white"
                                          : "bg-white text-gray-300 border-2 border-gray-100"
                                      } ${
                                        isCurrent ? "ring-4 ring-[#c9825b]/20 scale-110" : ""
                                      }`}
                                    >
                                      {step.icon}
                                    </div>
                                    <span
                                      className={`text-[9px] font-black uppercase tracking-tight mt-3 ${
                                        isCompleted ? "text-[#c9825b]" : "text-gray-400"
                                      }`}
                                    >
                                      {step.label}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {order.status === "COMPLETED" && (
                          <div className="mt-8 pt-6 border-t border-gray-100">
                            <div className="bg-gray-50 rounded-3xl p-5 md:p-6 border border-gray-100 space-y-5">
                              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                                <div>
                                  <div className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">
                                    Отзыв о заказе
                                  </div>
                                  <div className="text-sm md:text-base font-bold text-gray-900">
                                    {baseReview
                                      ? baseReview.is_updated
                                        ? "Вы уже скорректировали оценку для этого заказа"
                                        : "Вы можете изменить оценку, если продавец все исправил"
                                      : "Оцените вкус, внешний вид и сервис"}
                                  </div>
                                </div>

                                {hasRefundOffer && !baseReview?.refund_accepted && (
                                  <button
                                    onClick={() => baseReview && handleAcceptRefund(baseReview, order.id)}
                                    className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-2xl text-xs font-black bg-[#c9825b] text-white hover:bg-[#b07350] transition-colors"
                                  >
                                    Принять возврат
                                    <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded-full">
                                      {Math.round(
                                        parseFloat(baseReview.refund_offered_amount || "0")
                                      )}{" "}
                                      ₽
                                    </span>
                                  </button>
                                )}
                              </div>

                              {hasRefundOffer && (
                                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-100 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                                  <div className="flex items-start gap-3">
                                    <div className="w-9 h-9 rounded-2xl bg-white/80 flex items-center justify-center text-[#c9825b]">
                                      <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        className="w-5 h-5"
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          d="M12 6v12m-3-2.5c.5.5 1.5 1.5 3 1.5s2.5-1 3-1.5M8 7c.5-.5 1.5-1.5 3-1.5S13.5 6.5 14 7"
                                        />
                                      </svg>
                                    </div>
                                    <div>
                                      <div className="text-xs font-black uppercase tracking-widest text-amber-700">
                                        Предложение возврата
                                      </div>
                                      <div className="text-sm text-gray-800 font-semibold mt-1">
                                        Продавец предлагает вернуть{" "}
                                        {Math.round(
                                          parseFloat(baseReview?.refund_offered_amount || "0")
                                        ).toLocaleString("ru-RU")}{" "}
                                        ₽
                                      </div>
                                      <div className="text-xs text-gray-600 mt-1">
                                        После принятия возврата вы сможете изменить оценку только один раз,
                                        чтобы подтвердить, что ситуация урегулирована.
                                      </div>
                                    </div>
                                  </div>
                                  {baseReview?.refund_accepted && (
                                    <div className="text-[11px] font-bold text-amber-700 bg-amber-100 px-3 py-1 rounded-full self-start">
                                      Предложение принято, обновите вашу оценку
                                    </div>
                                  )}
                                </div>
                              )}

                              {baseReview && baseReview.is_updated ? (
                                <div className="space-y-4 pt-2">
                                  <div className="flex flex-col md:flex-row gap-8">
                                    {/* Metrics - Left Column */}
                                    <div className="flex flex-col gap-3 min-w-[140px] pt-1">
                                      {[
                                        { label: "Вкус", value: baseReview.rating_taste },
                                        { label: "Внешний вид", value: baseReview.rating_appearance },
                                        { label: "Сервис", value: baseReview.rating_service },
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
                                                    star <= item.value ? "text-yellow-400 fill-current" : "text-gray-100 fill-current"
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

                                    {/* Photos - Right Column */}
                                    {(baseReview.dish_photo || baseReview.finished_photo) && (
                                      <div className="flex flex-wrap gap-6 flex-1">
                                        {baseReview.dish_photo && (
                                          <div className="space-y-3">
                                            <div className="w-44 h-44 rounded-[32px] overflow-hidden border border-gray-100 shadow-sm group cursor-zoom-in">
                                              <img
                                                src={getFullImageUrl(baseReview.dish_photo)}
                                                alt="Dish main"
                                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                              />
                                            </div>
                                            <div className="text-[10px] font-black uppercase tracking-widest text-gray-400 text-center">
                                              Карточка товара
                                            </div>
                                          </div>
                                        )}
                                        {baseReview.finished_photo && (
                                          <div className="space-y-3">
                                            <div className="w-44 h-44 rounded-[32px] overflow-hidden border border-gray-100 shadow-sm group cursor-zoom-in">
                                              <img
                                                src={getFullImageUrl(baseReview.finished_photo)}
                                                alt="Finished dish"
                                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                              />
                                            </div>
                                            <div className="text-[10px] font-black uppercase tracking-widest text-gray-400 text-center">
                                              Готовое блюдо
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>

                                  {/* Comment */}
                                  {baseReview.comment && (
                                    <div className="relative mt-2">
                                      <div className="absolute -left-4 top-0 bottom-0 w-1 bg-[#c9825b]/10 rounded-full" />
                                      <p className="text-gray-800 leading-relaxed font-medium pl-2 italic">
                                        «{baseReview.comment}»
                                      </p>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <>
                                  <div className="space-y-3">
                                    {[
                                      { key: "taste" as const, label: "Вкус", value: currentDraft.taste },
                                      {
                                        key: "appearance" as const,
                                        label: "Внешний вид",
                                        value: currentDraft.appearance,
                                      },
                                      {
                                        key: "service" as const,
                                        label: "Сервис",
                                        value: currentDraft.service,
                                      },
                                    ].map((row) => (
                                      <div key={row.key} className="space-y-2">
                                        <div className="flex items-center justify-between">
                                          <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                                            {row.label}
                                          </span>
                                          <span className="text-xs font-bold text-gray-900">
                                            {row.value} / 5
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-0.5">
                                          {[1, 2, 3, 4, 5].map((star) => (
                                            <button
                                              key={star}
                                              type="button"
                                              onClick={() =>
                                                setReviewDrafts((prev) => ({
                                                  ...prev,
                                                  [order.id]: {
                                                    ...currentDraft,
                                                    [row.key]: star,
                                                  },
                                                }))
                                              }
                                              className="p-0 bg-transparent border-none shadow-none focus:outline-none"
                                            >
                                              <svg
                                                xmlns="http://www.w3.org/2000/svg"
                                                viewBox="0 0 24 24"
                                                fill="currentColor"
                                                className={`w-4 h-4 ${
                                                  star <= row.value
                                                    ? "text-yellow-400"
                                                    : "text-gray-200"
                                                }`}
                                              >
                                                <path
                                                  fillRule="evenodd"
                                                  d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z"
                                                  clipRule="evenodd"
                                                />
                                              </svg>
                                            </button>
                                          ))}
                                        </div>
                                      </div>
                                    ))}
                                  </div>

                                  <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                      <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                                        Комментарий
                                      </span>
                              {baseReview && !baseReview.is_updated && (
                                <span className="text-[11px] font-medium text-gray-400">
                                  После изменения отзыва повторная корректировка будет невозможна
                                </span>
                              )}
                            </div>
                            <textarea
                              value={currentDraft.comment}
                              onChange={(e) =>
                                setReviewDrafts((prev) => ({
                                  ...prev,
                                  [order.id]: {
                                    ...(prev[order.id] || currentDraft),
                                    comment: e.target.value,
                                  },
                                }))
                              }
                              rows={3}
                              className="w-full text-sm rounded-2xl border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#c9825b] focus:border-transparent resize-none"
                              placeholder="Расскажите, что вам понравилось, а что можно улучшить"
                            />
                          </div>

                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                                Фото (необязательно)
                              </span>
                            </div>
                            <div className="flex items-center gap-4 flex-wrap">
                              <label className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl border border-dashed border-gray-300 text-xs font-bold text-gray-600 cursor-pointer hover:border-[#c9825b] hover:text-[#c9825b] transition-colors bg-white">
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0] || null;
                                    if (!file) {
                                      setReviewDrafts((prev) => ({
                                        ...prev,
                                        [order.id]: {
                                          ...(prev[order.id] || currentDraft),
                                          photoFile: undefined,
                                          photoPreview: undefined,
                                        },
                                      }));
                                      return;
                                    }
                                    const previewUrl = URL.createObjectURL(file);
                                    setReviewDrafts((prev) => ({
                                      ...prev,
                                      [order.id]: {
                                        ...(prev[order.id] || currentDraft),
                                        photoFile: file,
                                        photoPreview: previewUrl,
                                      },
                                    }));
                                  }}
                                />
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  strokeWidth={2}
                                  stroke="currentColor"
                                  className="w-4 h-4"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 9 12 4.5 7.5 9m4.5-4.5V15"
                                  />
                                </svg>
                                <span>Добавить фото</span>
                              </label>

                              {(currentDraft.photoPreview || currentDraft.existingPhoto) && (
                                <div className="w-16 h-16 rounded-2xl overflow-hidden border border-gray-200 bg-gray-50">
                                  <img
                                    src={
                                      currentDraft.photoPreview ||
                                      (currentDraft.existingPhoto
                                        ? getFullImageUrl(currentDraft.existingPhoto)
                                        : "")
                                    }
                                    alt="Фото отзыва"
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              )}
                            </div>
                          </div>

                                  {canEditReview && (
                                    <div className="pt-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                      <div className="text-[11px] text-gray-500">
                                        Оценку можно исправить только один раз. Проверьте, что все указано верно.
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => handleSubmitReview(order)}
                                        disabled={reviewSubmitting === order.id}
                                        className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-black ${
                                          reviewSubmitting === order.id
                                            ? "bg-gray-300 text-gray-600 cursor-not-allowed"
                                            : "bg-[#c9825b] text-white hover:bg-[#b07350]"
                                        } transition-colors`}
                                      >
                                        {baseReview ? "Обновить отзыв" : "Оставить отзыв"}
                                      </button>
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Chat Modal */}
      {/* Chat Modal removed and redirected to /chat */}
    </div>
    </>
  );
}
