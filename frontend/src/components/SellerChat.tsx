"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

export default function SellerChat() {
  const searchParams = useSearchParams();
  const orderIdFromQuery = searchParams.get('orderId');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Record<string, any[]>>({});
  const [metadata, setMetadata] = useState<Record<string, any>>({});
  const [chats, setChats] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [translations, setTranslations] = useState<Record<number, string>>({});

  // Use a ref to track if we've already handled the initial query param
  const initialSelectionDone = useRef(false);

  useEffect(() => {
    const loadChats = () => {
      const orderChats = JSON.parse(localStorage.getItem('order_chats') || '{}');
      const orderMeta = JSON.parse(localStorage.getItem('order_metadata') || '{}');
      setMetadata(orderMeta);

      // Mark messages as read for active chat
      if (activeChatId && orderChats[activeChatId]) {
        let changed = false;
        orderChats[activeChatId] = orderChats[activeChatId].map((m: any) => {
          if (m.read === false && m.role !== 'seller') {
            changed = true;
            return { ...m, read: true };
          }
          return m;
        });
        if (changed) {
          localStorage.setItem('order_chats', JSON.stringify(orderChats));
        }
      }

      const chatList = Object.keys(orderChats)
        .filter(id => id !== 'support') // Убираем ID 'support' из основного списка, так как он добавляется отдельно
        .map(orderId => {
        const msgs = orderChats[orderId];
        const meta = orderMeta[orderId];
        const unreadCount = msgs.filter((m: any) => !m.read && m.role !== 'seller').length;
        return {
          id: orderId,
          name: meta ? `${meta.userName} (${meta.dishName})` : `Заказ #${orderId.slice(0, 8)}`,
          lastMsg: msgs[msgs.length - 1]?.text || 'Нет сообщений',
          time: msgs[msgs.length - 1]?.time || '',
          unread: unreadCount,
          online: true // Placeholder
        };
      });

      // Добавляем чат поддержки
      const supportMessages = orderChats['support'] || [];
      const supportChat = {
        id: 'support',
        name: 'Поддержка Food&Home',
        lastMsg: supportMessages[supportMessages.length - 1]?.text || 'Мы всегда на связи',
        time: supportMessages[supportMessages.length - 1]?.time || '',
        unread: 0,
        online: true,
        isSupport: true
      };

      const finalChatList = [supportChat, ...chatList];
      setChats(finalChatList);
      setMessages(orderChats);
      
      // Auto-select chat from query ONLY ONCE or if activeChatId is not set
      if (!initialSelectionDone.current && orderIdFromQuery && finalChatList.some(c => c.id === orderIdFromQuery)) {
        setActiveChatId(orderIdFromQuery);
        initialSelectionDone.current = true;
      } else if (!activeChatId && finalChatList.length > 0) {
        setActiveChatId(finalChatList[0].id);
      }
    };

    loadChats();
    const interval = setInterval(loadChats, 2000);
    return () => clearInterval(interval);
  }, [activeChatId, orderIdFromQuery]);

  const handleTranslate = async (text: string, msgIndex: number) => {
    const dictionary: Record<string, string> = {
      'thank you': 'спасибо',
      'thanks': 'спасибо',
      'hello': 'привет',
      'hi': 'привет',
      'how are you': 'как дела?',
      'how much': 'сколько стоит?',
      'price': 'цена',
      'good': 'хорошо',
      'ok': 'ок',
      'yes': 'да',
      'no': 'нет',
      'bye': 'пока'
    };

    const lowerText = text.toLowerCase().trim().replace(/[?!.,]/g, '');
    if (dictionary[lowerText]) {
      setTranslations(prev => ({ ...prev, [msgIndex]: `[Перевод]: ${dictionary[lowerText]}` }));
      return;
    }

    try {
      const response = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|ru`);
      const data = await response.json();
      
      if (data.responseData && data.responseData.translatedText) {
        const translated = data.responseData.translatedText;
        const finalTranslation = `[Перевод]: ${translated}`;
        setTranslations(prev => ({ ...prev, [msgIndex]: finalTranslation }));
      } else {
        throw new Error('Translation failed');
      }
    } catch (error) {
      console.error('Translation API error:', error);
      setTranslations(prev => ({ ...prev, [msgIndex]: `[Перевод]: ${text} (ошибка перевода)` }));
    }
  };

  const needsTranslation = (text: string) => {
    if (!text) return false;
    // Simple check: if contains many non-cyrillic letters and is not a system message
    const cyrillicPattern = /[а-яА-ЯёЁ]/;
    const latinPattern = /[a-zA-Z]/;
    return latinPattern.test(text) && !cyrillicPattern.test(text);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert("Файл слишком большой. Максимальный размер 5МБ");
        return;
      }
      setSelectedFile(file);
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => setFilePreview(reader.result as string);
        reader.readAsDataURL(file);
      } else {
        setFilePreview(null);
      }
    }
  };

  const handleOpenDispute = () => {
    if (!activeChatId) return;
    
    if (confirm("Вы уверены, что хотите открыть спор по этому заказу?")) {
      // Update metadata
      const orderMeta = JSON.parse(localStorage.getItem('order_metadata') || '{}');
      if (orderMeta[activeChatId]) {
        orderMeta[activeChatId].status = 'DISPUTE';
        localStorage.setItem('order_metadata', JSON.stringify(orderMeta));
        setMetadata(orderMeta);
      }

      // Add system message
      const msg = { 
        role: 'system', 
        text: '⚠️ Был открыт спор по этому заказу. Поддержка Food&Home подключится в ближайшее время.', 
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        read: true
      };
      
      const currentChats = JSON.parse(localStorage.getItem('order_chats') || '{}');
      const orderMsgs = currentChats[activeChatId] || [];
      currentChats[activeChatId] = [...orderMsgs, msg];
      localStorage.setItem('order_chats', JSON.stringify(currentChats));
      setMessages(prev => ({ ...prev, [activeChatId]: currentChats[activeChatId] }));
    }
  };

  const sendMessage = () => {
    if ((!newMessage.trim() && !selectedFile) || !activeChatId) return;

    let fileData = null;
    if (selectedFile) {
      fileData = {
        name: selectedFile.name,
        type: selectedFile.type,
        size: selectedFile.size,
        url: filePreview
      };
    }

    const msg = { 
      role: 'seller', 
      text: newMessage, 
      file: fileData,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      read: false
    };
    
    const currentChats = JSON.parse(localStorage.getItem('order_chats') || '{}');
    const orderMsgs = currentChats[activeChatId] || [];
    const updatedMsgs = [...orderMsgs, msg];
    currentChats[activeChatId] = updatedMsgs;
    localStorage.setItem('order_chats', JSON.stringify(currentChats));
    
    setMessages(prev => ({ ...prev, [activeChatId]: updatedMsgs }));

    // Support auto-reply for seller
    if (activeChatId === 'support') {
      setTimeout(() => {
        const currentChatsNow = JSON.parse(localStorage.getItem('order_chats') || '{}');
        const reply = {
          role: 'support',
          text: 'Служба поддержки Food&Home получила ваше сообщение. Мы свяжемся с вами в ближайшее время.',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          read: false
        };
        currentChatsNow['support'] = [...(currentChatsNow['support'] || []), reply];
        localStorage.setItem('order_chats', JSON.stringify(currentChatsNow));
        setMessages(prev => ({ ...prev, support: currentChatsNow['support'] }));
      }, 1000);
    }
    
    // Refresh metadata
    const orderMeta = JSON.parse(localStorage.getItem('order_metadata') || '{}');
    if (orderMeta[activeChatId]) {
        setMetadata(orderMeta);
    }
    
    setNewMessage("");
    setSelectedFile(null);
    setFilePreview(null);
  };

  const activeChat = chats.find(c => c.id === activeChatId) || chats[0];
  const activeMessages = activeChatId ? messages[activeChatId] || [] : [];
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior: "smooth"
      });
    }
  };

  useEffect(() => {
    if (activeChatId) {
      scrollToBottom();
    }
  }, [activeChatId]);

  return (
    <div className="h-[calc(100vh-80px)] flex flex-col animate-in fade-in duration-500 -mt-4">
        <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Сообщения</h1>
            <p className="text-gray-500 mt-1">Общайтесь с покупателями напрямую</p>
        </div>

        <div className="flex-1 bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex">
            {/* Chat Sidebar */}
            <div className="w-96 border-r border-gray-100 flex flex-col">
                <div className="p-4 border-b border-gray-100">
                    <div className="relative">
                        <input 
                            type="text" 
                            placeholder="Поиск чата..." 
                            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#c9825b]/20 focus:border-[#c9825b] transition-all"
                        />
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                        </svg>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto">
                    {chats.length === 0 && (
                        <div className="p-10 text-center text-gray-400 text-sm">
                            Нет активных чатов
                        </div>
                    )}
                    {chats.map((chat, i) => (
                        <div 
                            key={chat.id} 
                            onClick={() => setActiveChatId(chat.id)}
                            className={`p-4 flex items-center gap-3 cursor-pointer transition-all hover:bg-gray-50 ${activeChatId === chat.id ? 'bg-[#fff5f0] border-l-4 border-[#c9825b]' : ''}`}
                        >
                            <div className="relative">
                                {chat.isSupport ? (
                                    <div className="w-12 h-12 rounded-2xl bg-white border border-gray-100 flex items-center justify-center overflow-hidden">
                                        <img src="/icon.svg" alt="Support" className="w-8 h-8 object-contain" />
                                    </div>
                                ) : (
                                    <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center text-[#c9825b] font-bold text-lg uppercase">
                                        {chat.name[0]}
                                    </div>
                                )}
                                {chat.online && <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-baseline mb-1">
                                    <div className="font-bold text-gray-900 truncate">{chat.name}</div>
                                    <div className="text-[10px] text-gray-400 font-bold">{chat.time}</div>
                                </div>
                                <div className="text-xs text-gray-500 truncate">{chat.lastMsg}</div>
                            </div>
                            {chat.unread > 0 && (
                                <div className="w-5 h-5 bg-[#c9825b] rounded-lg flex items-center justify-center text-[10px] font-black text-white">
                                    {chat.unread}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Chat Main */}
            <div className="flex-1 flex flex-col bg-gray-50/30">
                {!activeChatId ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-16 h-16 mb-4 opacity-20">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.451-.139-.904-.539-1.13A8.25 8.25 0 0 1 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
                        </svg>
                        <p className="text-sm font-medium">Выберите чат, чтобы начать общение</p>
                    </div>
                ) : (
                    <>
                        {/* Chat Header */}
                        <div className="p-4 bg-white border-b border-gray-100 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                {activeChat.isSupport ? (
                                    <div className="w-10 h-10 rounded-xl bg-white border border-gray-100 flex items-center justify-center overflow-hidden">
                                        <img src="/icon.svg" alt="Support" className="w-7 h-7 object-contain" />
                                    </div>
                                ) : (
                                    <div className="w-10 h-10 rounded-xl bg-[#fff5f0] flex items-center justify-center text-[#c9825b] font-bold uppercase">
                                        {activeChat.name[0]}
                                    </div>
                                )}
                                <div>
                                    <div className="font-bold text-gray-900">
                                        {activeChat.isSupport ? 'Поддержка Food&Home' : (metadata[activeChat.id]?.userName || 'Покупатель')}
                                    </div>
                                    <div className={`text-[10px] font-bold uppercase tracking-widest ${activeChat.online ? 'text-green-500' : 'text-gray-400'}`}>
                                        {activeChat.online ? 'В сети' : 'Был(а) недавно'}
                                    </div>
                                </div>
                            </div>
                            {metadata[activeChat.id] && (
                                <div className="text-right hidden md:block">
                                    <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">Заказ #{activeChat.id.slice(0, 8)}</div>
                                    <div className="text-xs font-bold text-[#c9825b]">{metadata[activeChat.id].dishName} ({metadata[activeChat.id].quantity} шт.)</div>
                                    {metadata[activeChat.id].status !== 'DISPUTE' && (
                                        <button 
                                            onClick={handleOpenDispute}
                                            className="text-[10px] font-black text-red-500 uppercase tracking-widest hover:underline mt-1 inline-block"
                                        >
                                            Спор
                                        </button>
                                    )}
                                    {metadata[activeChat.id].status === 'DISPUTE' && (
                                        <div className="text-[10px] font-black text-red-600 uppercase tracking-widest mt-1 bg-red-50 px-2 py-0.5 rounded-md inline-block">
                                            Спор открыт
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Order Details Banner */}
                        {metadata[activeChat.id] && (
                            <Link 
                                href={`/seller?view=ORDERS&orderId=${activeChat.id}`}
                                className="px-6 py-3 bg-[#fff9f5] border-b border-orange-100 flex items-center justify-between hover:bg-[#fff2e9] transition-colors group"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl overflow-hidden bg-white border border-orange-100 flex-shrink-0">
                                        {metadata[activeChat.id].dishPhoto ? (
                                            <img src={metadata[activeChat.id].dishPhoto} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-orange-200">
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
                                                </svg>
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <div className="text-sm font-bold text-gray-900 group-hover:text-[#c9825b] transition-colors">{metadata[activeChat.id].dishName}</div>
                                        <div className="text-[10px] text-gray-500 font-medium">
                                            {metadata[activeChat.id].orderDate} • {metadata[activeChat.id].quantity} шт. • {Math.round(parseFloat(metadata[activeChat.id].totalPrice))} ₽
                                        </div>
                                    </div>
                                </div>
                                <div className="text-[10px] font-black text-[#c9825b] uppercase group-hover:underline">Детали заказа</div>
                            </Link>
                        )}

                        {/* Messages */}
                        <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-6 space-y-4 flex flex-col">
                            {activeMessages.length === 0 && (
                                <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                                    <p className="text-xs font-bold uppercase tracking-widest">История сообщений пуста</p>
                                </div>
                            )}
                            {activeMessages.map((msg, i) => (
                                <div 
                                    key={i} 
                                    className={`flex flex-col gap-1 ${
                                        msg.role === 'system' 
                                            ? 'w-full items-center my-4' 
                                            : msg.role === 'seller' 
                                                ? 'self-end items-end max-w-[70%]' 
                                                : 'self-start items-start max-w-[70%]'
                                    }`}
                                >
                                    {msg.role === 'system' ? (
                                        <div className="bg-red-50 text-red-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-red-100 shadow-sm">
                                            {msg.text}
                                        </div>
                                    ) : (
                                        <>
                                            <div className={`px-3.5 py-2 rounded-2xl text-sm shadow-sm ${
                                                msg.role === 'seller' 
                                                    ? 'bg-[#c9825b] text-white rounded-tr-none' 
                                                    : 'bg-white text-gray-700 border border-gray-100 rounded-tl-none'
                                            }`}>
                                                {msg.file && (
                                                    <div className="mb-2">
                                                        {msg.file.type.startsWith('image/') ? (
                                                            <img 
                                                                src={msg.file.url} 
                                                                alt={msg.file.name} 
                                                                onClick={() => setPreviewImage(msg.file.url)}
                                                                className="max-w-[200px] max-h-[200px] object-cover rounded-lg border border-white/20 cursor-pointer hover:opacity-90 transition-opacity" 
                                                            />
                                                        ) : (
                                                            <div className={`flex items-center gap-2 p-1.5 rounded-lg ${msg.role === 'seller' ? 'bg-white/10' : 'bg-gray-50'}`}>
                                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m.75 12 3 3m0 0 3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                                                                </svg>
                                                                <div className="text-[10px] font-bold truncate max-w-[120px]">{msg.file.name}</div>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                                <div>
                                                    {translations[i] || msg.text}
                                                </div>
                                                {needsTranslation(msg.text) && !translations[i] && (
                                                    <button 
                                                        onClick={() => handleTranslate(msg.text, i)}
                                                        className={`mt-1.5 text-[10px] font-bold uppercase tracking-tighter flex items-center gap-1 hover:underline ${msg.role === 'seller' ? 'text-white/80' : 'text-[#c9825b]'}`}
                                                    >
                                                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                            <path d="M5 8l6 6" /><path d="M4 14l6-6 2-3" /><path d="M2 5h12" /><path d="M7 2h1" /><path d="M22 22l-5-10-5 10" /><path d="M14 18h6" />
                                                        </svg>
                                                        Перевести
                                                    </button>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-1.5 px-1">
                                                <span className="text-[10px] text-gray-400 font-bold">{msg.time}</span>
                                                {msg.role === 'seller' && (
                                                    <div className="flex items-center">
                                                        {msg.read ? (
                                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#c9825b" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                                                <path d="M2 12l5 5L20 4M7 12l5 5L20 7" />
                                                            </svg>
                                                        ) : (
                                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-gray-300" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                                                <path d="M20 6L9 17l-5-5" />
                                                            </svg>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Chat Input */}
                        <form 
                            onSubmit={(e) => { e.preventDefault(); sendMessage(); }}
                            className="p-4 bg-white border-t border-gray-100"
                        >
                            {selectedFile && (
                                <div className="mb-3 flex items-center gap-3 p-2 bg-gray-50 rounded-xl animate-in slide-in-from-bottom-2">
                                    {filePreview ? (
                                        <div className="w-12 h-12 rounded-lg overflow-hidden border border-gray-200">
                                            <img src={filePreview} alt="" className="w-full h-full object-cover" />
                                        </div>
                                    ) : (
                                        <div className="w-12 h-12 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-[#c9825b]">
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m.75 12 3 3m0 0 3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                                            </svg>
                                        </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <div className="text-xs font-bold text-gray-900 truncate">{selectedFile.name}</div>
                                        <div className="text-[10px] text-gray-400 font-bold uppercase">{(selectedFile.size / 1024).toFixed(1)} KB</div>
                                    </div>
                                    <button 
                                        type="button" 
                                        onClick={() => { setSelectedFile(null); setFilePreview(null); }}
                                        className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                            )}
                            <div className="flex gap-4">
                                <input 
                                    type="file" 
                                    ref={fileInputRef}
                                    onChange={handleFileChange}
                                    className="hidden"
                                    accept="image/*,.pdf,.doc,.docx,.txt"
                                    multiple={false}
                                />
                                <button 
                                    type="button" 
                                    onClick={() => fileInputRef.current?.click()}
                                    className="p-3 text-gray-400 hover:text-[#c9825b] transition-colors bg-gray-50 rounded-2xl"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="m18.375 12.739-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.94-10.94A3 3 0 1 1 19.5 7.372L8.552 18.32a1.5 1.5 0 1 1-2.121-2.121l10.94-10.94" />
                                    </svg>
                                </button>
                                <div className="flex-1 relative">
                                    <input 
                                        type="text" 
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                        placeholder="Напишите сообщение..." 
                                        className="w-full px-6 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#c9825b]/20 focus:border-[#c9825b] transition-all"
                                    />
                                </div>
                                <button 
                                    type="submit"
                                    disabled={!newMessage.trim() && !selectedFile}
                                    className="p-3 bg-[#c9825b] text-white rounded-2xl hover:bg-[#b07350] transition-all shadow-lg shadow-[#c9825b]/20 disabled:opacity-50 disabled:grayscale"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
                                    </svg>
                                </button>
                            </div>
                        </form>
                    </>
                )}
            </div>
            {/* Image Preview Modal */}
            {previewImage && (
                <div 
                    className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4 animate-in fade-in duration-200"
                    onClick={() => setPreviewImage(null)}
                >
                    <button 
                        className="absolute top-6 right-6 text-white/50 hover:text-white transition-colors"
                        onClick={() => setPreviewImage(null)}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-8 h-8">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                        </svg>
                    </button>
                    <img 
                        src={previewImage} 
                        alt="Preview" 
                        className="max-w-full max-h-full object-contain rounded-lg animate-in zoom-in-95 duration-200"
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            )}
        </div>
    </div>
  );
}
