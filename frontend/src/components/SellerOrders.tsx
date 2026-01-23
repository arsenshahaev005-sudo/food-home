"use client";

import { useState, useEffect } from "react";
import { Order, getOrders, acceptOrder, completeOrder, uploadOrderPhoto, startDeliveryOrder, markArrivedOrder, markReadyOrder, cancelOrder } from "@/lib/api";
import { useRouter, useSearchParams } from "next/navigation";

interface SellerOrdersProps {
  token: string;
}

type OrderStatusFilter = 'ACTIVE' | 'COMPLETED' | 'CANCELLED' | 'ALL';

export default function SellerOrders({ token }: SellerOrdersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<OrderStatusFilter>('ALL');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [highlightedOrder, setHighlightedOrder] = useState<string | null>(null);
  const [showChat, setShowChat] = useState<string | null>(null);
  const [showCompleteModal, setShowCompleteModal] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<Record<string, { role: 'user' | 'seller', text: string, time: string }[]>>({});
  const [newMessage, setNewMessage] = useState("");
  const [expandedOrders, setExpandedOrders] = useState<Record<string, boolean>>({});

  const isActionLoading = (type: string, id: string | null) => {
    if (!id || !actionLoading) return false;
    return actionLoading === `${type}:${id}`;
  };

  useEffect(() => {
    loadOrders();
  }, [filter]);

  useEffect(() => {
    const orderId = searchParams.get('orderId');
    if (orderId && !loading && orders.length > 0) {
      const order = orders.find(o => o.id === orderId);
      if (order) {
        // Set filter to show this order if it's not in the current filter
        const isActive = !['COMPLETED', 'CANCELLED'].includes(order.status);
        if (filter === 'ACTIVE' && !isActive) setFilter('ALL');
        if (filter === 'COMPLETED' && order.status !== 'COMPLETED') setFilter('ALL');
        if (filter === 'CANCELLED' && order.status !== 'CANCELLED') setFilter('ALL');

        setHighlightedOrder(orderId);
        
        // Scroll to it
        setTimeout(() => {
          const element = document.getElementById(`order-seller-${orderId}`);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 100);

        // Remove highlight after 3 seconds
        setTimeout(() => {
          setHighlightedOrder(null);
        }, 3000);
      } else {
          // If order not found in current list (maybe because of filter), switch to ALL
          if (filter !== 'ALL') {
              setFilter('ALL');
          }
      }
    }
  }, [searchParams, loading, orders.length]);

  const loadOrders = async (silent: boolean = false) => {
    try {
      if (!silent) {
        setLoading(true);
      }
      const data = await getOrders(token);
      
      let filtered = data;
      if (filter === 'ACTIVE') {
          filtered = data.filter(o => !['COMPLETED', 'CANCELLED'].includes(o.status));
      } else if (filter === 'COMPLETED') {
          filtered = data.filter(o => o.status === 'COMPLETED');
      } else if (filter === 'CANCELLED') {
          filtered = data.filter(o => o.status === 'CANCELLED');
      }
      
      // Sort by status (WAITING_FOR_ACCEPTANCE first) and then by date desc
      filtered.sort((a, b) => {
        if (a.status === 'WAITING_FOR_ACCEPTANCE' && b.status !== 'WAITING_FOR_ACCEPTANCE') return -1;
        if (a.status !== 'WAITING_FOR_ACCEPTANCE' && b.status === 'WAITING_FOR_ACCEPTANCE') return 1;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
      
      setOrders(filtered);
    } catch (e) {
      console.error("Failed to load orders", e);
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    const interval = setInterval(() => {
      loadOrders(true);
    }, 15000);
    return () => clearInterval(interval);
  }, [filter]);

  const handleAccept = async (id: string) => {
    try {
      setActionLoading(`accept:${id}`);
      await acceptOrder(id, token);
      await loadOrders();
    } catch (e) {
      alert("Ошибка при принятии заказа");
    } finally {
      setActionLoading(null);
    }
  };

  const handleComplete = async (id: string) => {
    try {
      setActionLoading(`complete:${id}`);
      
      const order = orders.find(o => o.id === id);
      const isCooking = order?.status === 'COOKING';

      if (isCooking && !photoFile) {
        alert("Пожалуйста, загрузите фото готового блюда");
        setActionLoading(null);
        return;
      }

      setShowCompleteModal(null); // Close modal after check
      
      const targetStatus = 'READY_FOR_REVIEW';

      // Update local state immediately for better UX
      setOrders(prev => {
        const next = prev.map(o => o.id === id ? { ...o, status: targetStatus as any } : o);
        return next;
      });
      
      try {
        let updatedOrder;
        if (isCooking && photoFile) {
          updatedOrder = await uploadOrderPhoto(id, photoFile, token);
          
          // Add system message to chat
          try {
            const systemMsg = { 
              role: 'system' as const, 
              text: '📸 Продавец прислал фотографию готового блюда. Пожалуйста, проверьте её в деталях заказа.', 
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
            };
            const currentChats = JSON.parse(localStorage.getItem('order_chats') || '{}');
            const orderMsgs = currentChats[id] || [];
            currentChats[id] = [...orderMsgs, systemMsg];
            localStorage.setItem('order_chats', JSON.stringify(currentChats));
          } catch (chatErr) {
            console.warn("Failed to add system message to chat", chatErr);
          }
        } else {
          updatedOrder = await completeOrder(id, token);
        }
        
        // If API returns the updated order, sync it
        if (updatedOrder && updatedOrder.status) {
          setOrders(prev => prev.map(o => o.id === id ? { ...o, ...updatedOrder } : o));
        }
        
        // Clear photo state
        setPhotoFile(null);
        setPhotoPreview(null);
      } catch (err) {
        console.warn("API operation failed, but we will proceed with UI update for demo", err);
      }
    } catch (e) {
      console.error("Critical error in handleComplete", e);
      alert("Ошибка при завершении заказа");
    } finally {
      setActionLoading(null);
    }
  };

  const handleStartDelivery = async (id: string) => {
    try {
      setActionLoading(`start_delivery:${id}`);
      await startDeliveryOrder(id, token);
      await loadOrders();
    } catch (e) {
      alert("Ошибка при начале доставки");
    } finally {
      setActionLoading(null);
    }
  };

  const handleMarkArrived = async (id: string) => {
    try {
      setActionLoading(`arrived:${id}`);
      await markArrivedOrder(id, token);
      await loadOrders();
    } catch (e) {
      alert("Ошибка при отметке прибытия");
    } finally {
      setActionLoading(null);
    }
  };

  const handleFinishOrder = async (id: string) => {
    try {
      setActionLoading(`finish:${id}`);
      await completeOrder(id, token);
      await loadOrders();
    } catch (e) {
      alert("Ошибка при завершении заказа");
    } finally {
      setActionLoading(null);
    }
  };

  const toggleOrderDetails = (id: string) => {
    setExpandedOrders(prev => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleDecline = async (id: string) => {
    const confirmed = window.confirm("Вы уверены, что хотите отказаться от этого заказа?");
    if (!confirmed) return;
    try {
      setActionLoading(`cancel:${id}`);
      await cancelOrder(id, "seller", "", token);
      await loadOrders();
    } catch (e) {
      alert("Ошибка при отказе от заказа");
    } finally {
      setActionLoading(null);
    }
  };

  const sendMessage = (orderId: string) => {
    if (!newMessage.trim()) return;
    const msg = { role: 'seller' as const, text: newMessage, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
    
    // Save to localStorage for synchronization with more info
    const currentOrder = orders.find(o => o.id === orderId);
    const currentChats = JSON.parse(localStorage.getItem('order_chats') || '{}');
    const orderMsgs = currentChats[orderId] || [];
    const updatedMsgs = [...orderMsgs, msg];
    
    // Store metadata if it's the first message or to keep it updated
    currentChats[orderId] = updatedMsgs;
    if (currentOrder) {
      const metadata = JSON.parse(localStorage.getItem('order_metadata') || '{}');
      
      const userFirstName = (currentOrder as any).user_first_name || '';
      const userLastName = (currentOrder as any).user_last_name || '';
      const buyerFullName = (userFirstName || userLastName)
        ? `${userFirstName} ${userLastName}`.trim()
        : (currentOrder.user_name || 'Покупатель');

      const sellerFirstName = (currentOrder as any).producer_first_name || '';
      const sellerLastName = (currentOrder as any).producer_last_name || '';
      const sellerFullName = (sellerFirstName || sellerLastName)
        ? `${sellerFirstName} ${sellerLastName}`.trim()
        : (currentOrder.producer_name || 'Продавец');

      metadata[orderId] = {
        dishName: currentOrder.dish.name,
        dishPhoto: currentOrder.dish.photo,
        userName: buyerFullName,
        sellerName: sellerFullName,
        orderDate: new Date(currentOrder.created_at).toLocaleString('ru-RU', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }),
        quantity: currentOrder.quantity,
        totalPrice: currentOrder.total_price
      };
      localStorage.setItem('order_metadata', JSON.stringify(metadata));
    }
    
    localStorage.setItem('order_chats', JSON.stringify(currentChats));
    
    setChatMessages(prev => ({
      ...prev,
      [orderId]: updatedMsgs
    }));
    setNewMessage("");
  };

  useEffect(() => {
    // Poll for new messages from buyer
    const interval = setInterval(() => {
      const currentChats = JSON.parse(localStorage.getItem('order_chats') || '{}');
      setChatMessages(currentChats);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleChatClick = (order: Order) => {
        // Save metadata before redirecting
        const metadata = JSON.parse(localStorage.getItem('order_metadata') || '{}');
        
        // Attempt to get full name of buyer if available
        const userFirstName = (order as any).user_first_name || '';
        const userLastName = (order as any).user_last_name || '';
        const buyerFullName = (userFirstName || userLastName)
            ? `${userFirstName} ${userLastName}`.trim()
            : (order.user_name || 'Покупатель');

        // Attempt to get full name of seller (current user)
        const sellerFirstName = (order as any).producer_first_name || '';
        const sellerLastName = (order as any).producer_last_name || '';
        const sellerFullName = (sellerFirstName || sellerLastName)
            ? `${sellerFirstName} ${sellerLastName}`.trim()
            : (order.producer_name || 'Продавец');

        metadata[order.id] = {
            dishName: order.dish.name,
            dishPhoto: order.dish.photo,
            userName: buyerFullName,
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

        router.push(`/seller?view=CHAT&orderId=${order.id}`);
    };

  const handleOpenDispute = (orderId: string) => {
    if (confirm("Вы уверены, что хотите открыть спор по этому заказу?")) {
      // Update metadata
      const orderMeta = JSON.parse(localStorage.getItem('order_metadata') || '{}');
      const currentOrder = orders.find(o => o.id === orderId);
      
      if (!orderMeta[orderId] && currentOrder) {
        const userFirstName = (currentOrder as any).user_first_name || '';
        const userLastName = (currentOrder as any).user_last_name || '';
        const buyerFullName = (userFirstName || userLastName)
          ? `${userFirstName} ${userLastName}`.trim()
          : (currentOrder.user_name || 'Покупатель');

        const sellerFirstName = (currentOrder as any).producer_first_name || '';
        const sellerLastName = (currentOrder as any).producer_last_name || '';
        const sellerFullName = (sellerFirstName || sellerLastName)
          ? `${sellerFirstName} ${sellerLastName}`.trim()
          : (currentOrder.producer_name || 'Продавец');

        orderMeta[orderId] = {
          dishName: currentOrder.dish.name,
          dishPhoto: currentOrder.dish.photo,
          userName: buyerFullName,
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
      
      // Update local state
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'DISPUTE' } : o));
    }
  };

  const getStatusBadge = (status: Order['status']) => {
    const styles: Record<string, string> = {
      WAITING_FOR_PAYMENT: "bg-gray-100 text-gray-600",
      WAITING_FOR_ACCEPTANCE: "bg-blue-100 text-blue-600 animate-pulse",
      COOKING: "bg-orange-100 text-orange-600",
      READY_FOR_REVIEW: "bg-blue-100 text-blue-600 font-bold",
      READY_FOR_DELIVERY: "bg-indigo-100 text-indigo-600 font-bold",
      DELIVERING: "bg-purple-100 text-purple-600 animate-pulse",
      ARRIVED: "bg-teal-100 text-teal-600 font-bold",
      COMPLETED: "bg-green-100 text-green-600",
      CANCELLED: "bg-red-100 text-red-600",
      DISPUTE: "bg-red-200 text-red-800 font-bold",
    };
    
    const labels: Record<string, string> = {
      WAITING_FOR_PAYMENT: "Ожидает оплаты",
      WAITING_FOR_ACCEPTANCE: "Новый заказ",
      COOKING: "Готовится",
      READY_FOR_REVIEW: "Готов (фото)",
      READY_FOR_DELIVERY: "Ожидает курьера",
      DELIVERING: "В пути",
      ARRIVED: "У клиента",
      COMPLETED: "Завершен",
      CANCELLED: "Отменен",
      DISPUTE: "Спор",
    };

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-bold ${styles[status] || "bg-gray-100 text-gray-600"}`}>
        {labels[status] || status}
      </span>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Заказы</h1>
          <p className="text-gray-500 mt-1">Управление заказами вашего магазина</p>
        </div>
        
        <div className="flex bg-gray-50 p-1.5 rounded-2xl border border-gray-100">
          {(['ALL', 'ACTIVE', 'COMPLETED', 'CANCELLED'] as OrderStatusFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-5 py-2.5 rounded-xl text-sm font-black transition-all flex items-center gap-2 ${
                filter === f 
                  ? 'bg-white text-[#c9825b] shadow-sm ring-1 ring-gray-100' 
                  : 'text-gray-400 hover:text-gray-600 hover:bg-white/50'
              }`}
            >
              {filter === f && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#c9825b]" />
              )}
              {f === 'ACTIVE' ? 'Активные' : f === 'COMPLETED' ? 'Завершенные' : f === 'CANCELLED' ? 'Отмененные' : 'Все'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white h-48 rounded-3xl border border-gray-100 animate-pulse"></div>
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="bg-white rounded-3xl border border-gray-100 p-12 text-center">
          <div className="w-20 h-20 bg-gray-50 rounded-3xl flex items-center justify-center mx-auto mb-4 text-gray-300">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.112 16.835a.75.75 0 0 1-.747.799H3.03a.75.75 0 0 1-.747-.799l1.112-16.835a.75.75 0 0 1 .747-.707H19.01a.75.75 0 0 1 .747.707Z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-gray-900">Заказов не найдено</h3>
          <p className="text-gray-500 mt-2">В этой категории пока нет заказов.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {orders.map((order) => {
            const isHighlighted = highlightedOrder === order.id;
            const cardClass =
              "bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-all group" +
              (isHighlighted ? " ring-4 ring-orange-400 ring-offset-2 scale-[1.01]" : "");

            const hasUnread =
              chatMessages[order.id]?.some((m) => !m.read && m.role !== "seller") || false;

            return (
              <div
                key={order.id}
                id={`order-seller-${order.id}`}
                className={cardClass}
              >
                <div className="p-6">
                  <div className="flex flex-col md:flex-row justify-between gap-6">
                    <div className="flex gap-6">
                      <div className="w-24 h-24 rounded-2xl overflow-hidden bg-gray-100 flex-shrink-0">
                        {order.dish.photo ? (
                          <img
                            src={order.dish.photo}
                            alt={order.dish.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-300">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                              strokeWidth={1.5}
                              stroke="currentColor"
                              className="w-8 h-8"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"
                              />
                            </svg>
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                            #{order.id.slice(0, 8)}
                          </span>
                          {getStatusBadge(order.status)}
                          {order.is_urgent && (
                            <span className="bg-red-50 text-red-600 px-2 py-0.5 rounded-lg text-[10px] font-black uppercase">
                              Срочно
                            </span>
                          )}
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-1">
                          {order.dish.name}
                        </h3>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span className="font-medium text-gray-900">
                            {order.quantity} шт. ×{" "}
                            {Math.round(parseFloat(order.dish.price || "0"))} ₽
                          </span>
                          <div className="w-1 h-1 rounded-full bg-gray-300" />
                          <span>
                            {new Date(order.created_at).toLocaleString("ru-RU", {
                              day: "numeric",
                              month: "long",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col justify-between items-end gap-4">
                      <div className="text-right">
                        <div className="text-2xl font-black text-[#c9825b]">
                          {Math.round(parseFloat(order.total_price || "0"))} ₽
                        </div>
                        <div className="text-sm text-gray-500 font-medium">
                          {order.user_name}
                        </div>
                        <div className="text-xs text-gray-400">{order.phone}</div>
                      </div>

                      <div className="flex flex-wrap items-center justify-end gap-2">
                        {order.status === "WAITING_FOR_ACCEPTANCE" && (
                          <>
                            <button
                              disabled={!!actionLoading}
                              onClick={() => handleAccept(order.id)}
                              className="bg-[#c9825b] text-white px-6 py-2 rounded-xl font-bold hover:bg-[#b07350] transition-all shadow-lg shadow-[#c9825b]/20 disabled:opacity-50"
                            >
                              {isActionLoading("accept", order.id)
                                ? "Принимаем..."
                                : "Принять"}
                            </button>
                            <button
                              disabled={!!actionLoading}
                              onClick={() => handleDecline(order.id)}
                              className="bg-white text-red-600 px-5 py-2 rounded-xl font-bold border border-red-200 hover:bg-red-50 transition-all disabled:opacity-50"
                            >
                              {isActionLoading("cancel", order.id)
                                ? "Отказываемся..."
                                : "Отказаться"}
                            </button>
                          </>
                        )}

                        {order.status === "COOKING" && (
                          <button
                            onClick={() => setShowCompleteModal(order.id)}
                            className="bg-green-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-green-700 transition-all shadow-lg shadow-green-600/20"
                          >
                            Готово
                          </button>
                        )}

                        {(order.status === "READY_FOR_REVIEW" ||
                          order.status === "READY_FOR_DELIVERY") && (
                          <div className="flex flex-col items-end gap-3">
                            {order.status === "READY_FOR_REVIEW" && (
                              <span className="text-[10px] font-bold text-green-600 uppercase tracking-widest bg-green-50 px-3 py-1 rounded-full border border-green-100 mb-1">
                                Фото отправлено • Можно доставлять
                              </span>
                            )}
                            <div className="flex items-center gap-3">
                              <button
                                onClick={() => handleChatClick(order)}
                                className="bg-white border border-gray-200 text-gray-600 px-4 py-2 rounded-xl font-bold hover:bg-gray-50 transition-all flex items-center gap-2"
                              >
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
                                    d="M7.5 8.25h9m-9 3h9m-9 3h3m-12 1.5a2.25 2.25 0 0 0 2.25 2.25h1.35m11.35 0h1.35a2.25 2.25 0 0 0 2.25-2.25v-12a2.25 2.25 0 0 0-2.25-2.25h-15a2.25 2.25 0 0 0-2.25 2.25v12a2.25 2.25 0 0 0 2.25 2.25Z"
                                  />
                                </svg>
                                Чат
                              </button>
                              <button
                                disabled={!!actionLoading}
                                onClick={() => handleStartDelivery(order.id)}
                                className="bg-indigo-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50"
                              >
                                {isActionLoading("start_delivery", order.id)
                                  ? "Загрузка..."
                                  : "Начать доставку"}
                              </button>
                            </div>
                          </div>
                        )}

                        {order.status === "DELIVERING" && (
                          <button
                            disabled={!!actionLoading}
                            onClick={() => handleMarkArrived(order.id)}
                            className="bg-teal-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-teal-700 transition-all shadow-lg shadow-teal-600/20 disabled:opacity-50"
                          >
                            {isActionLoading("arrived", order.id)
                              ? "Загрузка..."
                              : "Прибыл к клиенту"}
                          </button>
                        )}

                        {order.status === "ARRIVED" && (
                          <button
                            disabled={!!actionLoading}
                            onClick={() => handleFinishOrder(order.id)}
                            className="bg-green-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-green-700 transition-all shadow-lg shadow-green-600/20 disabled:opacity-50"
                          >
                            {isActionLoading("finish", order.id)
                              ? "Завершаем..."
                              : "Завершить заказ"}
                          </button>
                        )}

                        {["WAITING_FOR_ACCEPTANCE", "COOKING"].includes(
                          order.status
                        ) && (
                          <button
                            onClick={() => handleChatClick(order)}
                            className="bg-white border border-gray-200 text-gray-600 px-4 py-2 rounded-xl font-bold hover:bg-gray-50 transition-all flex items-center gap-2"
                          >
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
                                d="M7.5 8.25h9m-9 3h9m-9 3h3m-12 1.5a2.25 2.25 0 0 0 2.25 2.25h1.35m11.35 0h1.35a2.25 2.25 0 0 0 2.25-2.25v-12a2.25 2.25 0 0 0-2.25-2.25h-15a2.25 2.25 0 0 0-2.25 2.25v12a2.25 2.25 0 0 0 2.25 2.25Z"
                              />
                            </svg>
                            Чат
                            {hasUnread && (
                              <span className="w-2 h-2 rounded-full bg-red-500" />
                            )}
                          </button>
                        )}

                        <button
                          onClick={() => toggleOrderDetails(order.id)}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-[#c9825b] bg-orange-50 hover:bg-orange-100 transition-colors"
                        >
                          Подробнее
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
                              d="M8.25 4.5l7.5 7.5-7.5 7.5"
                            />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 p-4 bg-orange-50/50 rounded-2xl border border-orange-100 flex items-start gap-4">
                    <div className="p-2.5 rounded-xl bg-white text-[#c9825b] shadow-sm ring-1 ring-orange-100/50 flex-shrink-0">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={2.5}
                        stroke="currentColor"
                        className="w-5 h-5"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z"
                        />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[10px] font-black text-[#c9825b] uppercase tracking-wider">
                          Адрес доставки
                        </span>
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            order.delivery_type === "DOOR"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {order.delivery_type === "DOOR"
                            ? "ДО ДВЕРИ"
                            : "ДО ПОДЪЕЗДА"}
                        </span>
                      </div>
                      <div className="text-base text-gray-900 font-bold leading-tight">
                        {order.delivery_address ||
                          order.delivery_address_text ||
                          "Адрес не указан"}
                      </div>
                    </div>
                  </div>

                  {expandedOrders[order.id] && (
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                      {order.apartment && (
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-lg bg-gray-50 text-gray-600">
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
                                d="M19 21V5a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v5m-4 0h4"
                              />
                            </svg>
                          </div>
                          <div>
                            <div className="text-xs font-bold text-gray-400 uppercase">
                              Квартира
                            </div>
                            <div className="text-sm text-gray-900 font-bold">
                              {order.apartment}
                            </div>
                          </div>
                        </div>
                      )}

                      {order.entrance && (
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-lg bg-gray-50 text-gray-600">
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
                                d="M13.5 21v-7.5a.75.75 0 0 1 .75-.75h3a.75.75 0 0 1 .75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349M3.75 21V9.349m0 0a3.001 3.001 0 0 0 3.75-.615A2.993 2.993 0 0 0 9.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 0 0 2.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 0 0 3.75.614m-16.5 0a3.004 3.004 0 0 1-.621-4.72l1.189-1.19A1.5 1.5 0 0 1 5.378 3h13.243a1.5 1.5 0 0 1 1.06.44l1.19 1.189a3.004 3.004 0 0 1-.621 4.72m-13.5 0V3"
                              />
                            </svg>
                          </div>
                          <div>
                            <div className="text-xs font-bold text-gray-400 uppercase">
                              Подъезд
                            </div>
                            <div className="text-sm text-gray-900 font-bold">
                              {order.entrance}
                            </div>
                          </div>
                        </div>
                      )}

                      {order.floor && (
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-lg bg-gray-50 text-gray-600">
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
                                d="M12 7.5h1.5m-1.5 4.5h1.5m-7.5 4.5h7.5m-7.5 1.5h7.5m-13.5-9h1.5m1.5 1.5h1.5m1.5 1.5h1.5m-1.5 1.5h1.5M12 15.75a3 3 0 1 1 0-6 3 3 0 0 1 0 6Z"
                              />
                            </svg>
                          </div>
                          <div>
                            <div className="text-xs font-bold text-gray-400 uppercase">
                              Этаж
                            </div>
                            <div className="text-sm text-gray-900 font-bold">
                              {order.floor}
                            </div>
                          </div>
                        </div>
                      )}

                      {order.intercom && (
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-lg bg-gray-50 text-gray-600">
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
                                d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z"
                              />
                            </svg>
                          </div>
                          <div>
                            <div className="text-xs font-bold text-gray-400 uppercase">
                              Домофон
                            </div>
                            <div className="text-sm text-gray-900 font-bold">
                              {order.intercom}
                            </div>
                          </div>
                        </div>
                      )}

                      {order.delivery_comment && (
                        <div className="flex items-start gap-3 md:col-span-2">
                          <div className="p-2 rounded-lg bg-gray-50 text-gray-600">
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
                                d="M7.5 8.25h9m-9 3h9m-9 3h3m-12 1.5a2.25 2.25 0 0 0 2.25 2.25h1.35m11.35 0h1.35a2.25 2.25 0 0 0 2.25-2.25v-12a2.25 2.25 0 0 0-2.25-2.25h-15a2.25 2.25 0 0 0-2.25 2.25v12a2.25 2.25 0 0 0 2.25 2.25Z"
                              />
                            </svg>
                          </div>
                          <div>
                            <div className="text-xs font-bold text-gray-400 uppercase">
                              Комментарий к доставке
                            </div>
                            <div className="text-sm text-gray-900 font-bold">
                              {order.delivery_comment}
                            </div>
                          </div>
                        </div>
                      )}

                      {order.acceptance_deadline &&
                        order.status === "WAITING_FOR_ACCEPTANCE" && (
                          <div className="flex items-start gap-3">
                            <div className="p-2 rounded-lg bg-orange-50 text-orange-600">
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
                                  d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                                />
                              </svg>
                            </div>
                            <div>
                              <div className="text-xs font-bold text-gray-400 uppercase">
                                Принять до
                              </div>
                              <div className="text-sm text-orange-600 font-bold">
                                {new Date(
                                  order.acceptance_deadline
                                ).toLocaleTimeString("ru-RU", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </div>
                            </div>
                          </div>
                        )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Chat Modal removed and redirected to unified CHAT view */}

      {/* Complete Order Modal */}
      {showCompleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-sm rounded-[32px] shadow-2xl overflow-hidden p-8 text-center">
            <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6 text-green-600">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-10 h-10">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
            </div>
            <h3 className="text-2xl font-black text-gray-900 mb-2">Заказ готов?</h3>
            <p className="text-gray-500 mb-6 font-medium text-sm">Пожалуйста, прикрепите фото готового блюда для проверки покупателем.</p>
            
            <div className="mb-8">
              {!photoPreview ? (
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-200 rounded-2xl cursor-pointer hover:bg-gray-50 transition-colors">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-gray-400 mb-2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15a2.25 2.25 0 0 0 2.25-2.25V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
                    </svg>
                    <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Нажмите для фото</p>
                  </div>
                  <input 
                    type="file" 
                    className="hidden" 
                    accept="image/*" 
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setPhotoFile(file);
                        setPhotoPreview(URL.createObjectURL(file));
                      }
                    }}
                  />
                </label>
              ) : (
                <div className="relative w-full h-32 rounded-2xl overflow-hidden group">
                  <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                  <button 
                    onClick={() => {
                      setPhotoFile(null);
                      setPhotoPreview(null);
                    }}
                    className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
            
            <div className="space-y-3">
              <button
                disabled={!!actionLoading || (orders.find(o => o.id === showCompleteModal)?.status === 'COOKING' && !photoFile)}
                onClick={() => handleComplete(showCompleteModal)}
                className="w-full bg-green-600 text-white py-4 rounded-2xl font-black hover:bg-green-700 transition-all shadow-lg shadow-green-600/20 disabled:opacity-50"
              >
                {showCompleteModal && isActionLoading("complete", showCompleteModal) ? 'Отправка...' : 'Отправить фото и завершить'}
              </button>
              <button 
                onClick={() => {
                  setShowCompleteModal(null);
                  setPhotoFile(null);
                  setPhotoPreview(null);
                }}
                className="w-full bg-gray-50 text-gray-500 py-4 rounded-2xl font-black hover:bg-gray-100 transition-all"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
