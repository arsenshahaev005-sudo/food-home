"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  toggle2FA,
  getProfile,
  getPaymentMethods,
  addPaymentMethod,
  deletePaymentMethod,
  getDevices,
  logoutDevice,
  getNotifications,
  markAllNotificationsRead,
  becomeSeller,
  getHelpArticles,
  requestChange,
  confirmChange,
  updateProfile,
  getGiftNotificationSettings,
  updateGiftNotificationSettings,
  type GiftNotificationSubscriptions,
  Profile,
  PaymentMethod,
  UserDevice,
  Notification,
  HelpArticle,
} from "@/lib/api";
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";
import PasswordChangeModal from "@/components/PasswordChangeModal";
import PaymentMethodsModal from "@/components/PaymentMethodsModal";
import DevicesModal from "@/components/DevicesModal";

import Link from "next/link";

// Helper to get cookie value
function getCookie(name: string) {
  if (typeof document === "undefined") return "";
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(";").shift();
}

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Data states
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [devices, setDevices] = useState<UserDevice[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [helpArticles, setHelpArticles] = useState<HelpArticle[]>([]);
  const [giftSubscriptions, setGiftSubscriptions] = useState<GiftNotificationSubscriptions>({});
  const [giftSettingsLoading, setGiftSettingsLoading] = useState(false);
  const [giftSettingsSaving, setGiftSettingsSaving] = useState(false);
  
  // UI states
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [viewMode, setViewMode] = useState<'SELLER' | 'PERSONAL'>('SELLER'); // For sellers to switch views

  // Form states
  const [sellerForm, setSellerForm] = useState({ name: '', city: '', producer_type: 'SELF_EMPLOYED' });
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isDevicesModalOpen, setIsDevicesModalOpen] = useState(false);

  // Editing states
  const [editingField, setEditingField] = useState<'EMAIL' | 'PHONE' | 'NAME' | 'SHOP_NAME' | null>(null);
  const [editValue, setEditValue] = useState('');
  const [editValueLastName, setEditValueLastName] = useState('');
  const [verifyCode, setVerifyCode] = useState('');
  const [editStep, setEditStep] = useState<'INPUT' | 'VERIFY'>('INPUT');
  const [resendCooldown, setResendCooldown] = useState(0);
  
  // Animation states
  const [isEmailChangeHovered, setIsEmailChangeHovered] = useState(false);
  const [isPhoneChangeHovered, setIsPhoneChangeHovered] = useState(false);
  const [isPasswordChangeHovered, setIsPasswordChangeHovered] = useState(false);
  const [isNameChangeHovered, setIsNameChangeHovered] = useState(false);
  const [isShopNameChangeHovered, setIsShopNameChangeHovered] = useState(false);
  const [isSaveHovered, setIsSaveHovered] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (resendCooldown > 0) {
      timer = setInterval(() => {
        setResendCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleError = (e: any, defaultMsg: string) => {
    let msg = defaultMsg;
    if (e?.detail) msg = e.detail;
    else if (Array.isArray(e)) msg = e.join(', ');
    else if (typeof e === 'object' && e !== null) {
        const vals = Object.values(e);
        if (vals.length > 0) {
             const first = vals[0];
             if (Array.isArray(first)) msg = first.join(', ');
             else if (typeof first === 'string') msg = first;
        }
    } else if (typeof e === 'string') {
        msg = e;
    }
    alert(msg);
  };

  useEffect(() => {
    const token = getCookie("accessToken");
    if (!token) {
      router.push("/auth/login");
      return;
    }

    getProfile(token)
      .then((p) => {
        if (p.role === 'SELLER') {
            router.replace("/seller");
            return;
        }
        setProfile(p);
        loadNotifications(token).catch(console.error);
        loadGiftSettings(token).catch(console.error);
      })
      .catch(() => {
        router.push("/auth/login");
      });
  }, [router]);

  // ... (keep existing functions)

  const loadPaymentMethods = async () => {
    const token = getCookie("accessToken");
    if (token) {
      try {
        const data = await getPaymentMethods(token);
        setPaymentMethods(data);
      } catch (e: any) {
         if (e?.detail === "Given token not valid for any token type" || e?.response?.status === 401) {
             router.push("/auth/login");
             return;
         }
         console.error("Payment methods error:", e);
      }
    }
  };

  const loadDevices = async () => {
    const token = getCookie("accessToken");
    if (token) {
      try {
        const data = await getDevices(token);
        setDevices(data);
      } catch (e) { console.error(e); }
    }
  };

  const loadNotifications = async (token: string) => {
    try {
      const data = await getNotifications(token);
      setNotifications(data);
    } catch (e) { console.error(e); }
  };

  const loadGiftSettings = async (token: string) => {
    try {
      setGiftSettingsLoading(true);
      const data = await getGiftNotificationSettings(token);
      setGiftSubscriptions(data.subscriptions || {});
    } catch (e) {
      console.error(e);
    } finally {
      setGiftSettingsLoading(false);
    }
  };

  const loadHelp = async () => {
    try {
      const data = await getHelpArticles();
      setHelpArticles(data);
    } catch (e) { console.error(e); }
  };

  const handleToggle2FA = async () => {
    const token = getCookie("accessToken");
    if (!token || !profile) return;

    setLoading(true);
    try {
      const newState = !profile.is_2fa_enabled;
      await toggle2FA(newState, token);
      setProfile({ ...profile, is_2fa_enabled: newState });
    } catch (e: any) {
      handleError(e, "Ошибка переключения 2FA");
    } finally {
      setLoading(false);
    }
  };

  const handleAddCard = async (cardData: { card_type: string; last_four: string; exp_month: string; exp_year: string }) => {
    const token = getCookie("accessToken");
    if (!token) return;
    try {
      await addPaymentMethod(cardData, token);
      loadPaymentMethods();
    } catch (e: any) {
      handleError(e, "Ошибка добавления карты");
      throw e;
    }
  };

  const handleDeleteCard = async (id: string) => {
    const token = getCookie("accessToken");
    if (!token) return;
    if (!confirm("Удалить карту?")) return;
    try {
      await deletePaymentMethod(id, token);
      loadPaymentMethods();
    } catch (e: any) {
      handleError(e, "Ошибка удаления карты");
    }
  };

  const handleLogoutDevice = async (id: string) => {
    const token = getCookie("accessToken");
    if (!token) return;
    if (!confirm("Выйти на этом устройстве?")) return;
    try {
      await logoutDevice(id, token);
      loadDevices();
    } catch (e: any) {
      handleError(e, "Ошибка выхода с устройства");
    }
  };

  const handleBecomeSeller = async () => {
    const token = getCookie("accessToken");
    if (!token) return;
    try {
      await becomeSeller(sellerForm, token);
      alert("Поздравляем! Вы стали продавцом.");
      setActiveSection(null);
      // Refresh profile to update role
      getProfile(token).then(setProfile);
    } catch (e: any) {
      handleError(e, "Не удалось создать профиль");
    }
  };

  const handleLogout = () => {
    document.cookie = "accessToken=; path=/; max-age=0";
    router.push("/");
    router.refresh();
  };

  const startEditing = (field: 'EMAIL' | 'PHONE' | 'NAME' | 'SHOP_NAME') => {
    setEditingField(field);
    setEditValue('');
    setEditValueLastName('');
    if (field === 'NAME') {
        setEditValue(profile?.first_name || '');
        setEditValueLastName(profile?.last_name || '');
    } else if (field === 'SHOP_NAME') {
        setEditValue(profile?.shop_name || '');
    }
    setVerifyCode('');
    setEditStep('INPUT');
  };

  const handleSimpleUpdate = async () => {
    const token = getCookie("accessToken");
    if (!token) return;
    
    setLoading(true);
    try {
        const updateData: any = {};
        if (editingField === 'NAME') {
            updateData.first_name = editValue;
            updateData.last_name = editValueLastName;
        } else if (editingField === 'SHOP_NAME') {
            updateData.shop_name = editValue;
        }
        
        const updatedProfile = await updateProfile(updateData, token);
        setProfile(updatedProfile);
        alert("Успешно обновлено");
        setEditingField(null);
    } catch (e: any) {
        handleError(e, "Ошибка обновления");
    } finally {
        setLoading(false);
    }
  };

  const handleRequestCode = async () => {
    if (loading) return;
    const token = getCookie("accessToken");
    if (!token) return;
    
    setLoading(true);
    try {
        if (editingField !== 'EMAIL' && editingField !== 'PHONE') {
            return;
        }
        const value = editValue;
        const extra = undefined;

        await requestChange(editingField, value, token, extra);
        setEditStep('VERIFY');
        setResendCooldown(60); 
    } catch (e: any) {
        handleError(e, "Ошибка запроса");
    } finally {
        setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (resendCooldown > 0) return;
    await handleRequestCode();
  };

  const handleConfirmCode = async () => {
    const token = getCookie("accessToken");
    if (!token) return;
    try {
        if (editingField !== 'EMAIL' && editingField !== 'PHONE') {
            return;
        }
        await confirmChange(editingField, verifyCode, token);
        alert("Успешно изменено!");
        setEditingField(null);
        getProfile(token).then(setProfile);
    } catch (e: any) {
        handleError(e, "Ошибка подтверждения");
    }
  };

  const unreadCount = Array.isArray(notifications) ? notifications.filter(n => !n.is_read).length : 0;

  if (loading) {
    return (
        <div className="min-h-[50vh] flex items-center justify-center">
            <div className="w-10 h-10 border-4 border-[#c9825b] border-t-transparent rounded-full animate-spin"></div>
        </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 relative bg-gray-800/50 backdrop-blur-sm rounded-2xl shadow-xl">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold" style={{ color: "#4b2f23" }}>Настройки профиля</h1>
        
        <div className="flex items-center gap-4">
            {profile?.role === 'SELLER' && (
                <Link 
                    href="/seller"
                    className="text-sm font-medium px-4 py-2 bg-[#c9825b] text-white rounded-full hover:bg-[#a06646] transition-colors"
                >
                    Кабинет продавца
                </Link>
            )}

            {/* Notification Bell */}
            <button 
            onClick={() => {
                setShowNotifications(!showNotifications);
                if (!showNotifications) {
                    const token = getCookie("accessToken");
                    if (token) markAllNotificationsRead(token).then(() => loadNotifications(token));
                }
            }}
            className="relative p-2 rounded-full hover:bg-gray-100 transition-all duration-300 hover:scale-110 active:scale-95"
            >

          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="#4b2f23" className="w-7 h-7 transition-transform duration-300 group-hover:rotate-12">
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
          </svg>
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-white animate-bounce">
              {unreadCount}
            </span>
          )}
        </button>
        </div>

        {/* Notifications Dropdown */}
        {showNotifications && (
          <div className="absolute top-20 right-4 w-80 bg-white rounded-xl shadow-xl border border-gray-100 z-50 p-4 max-h-96 overflow-y-auto">
            <h3 className="font-bold text-lg mb-2 text-[#4b2f23]">Уведомления</h3>
            {Array.isArray(notifications) && notifications.length === 0 ? (
              <p className="text-gray-500 text-sm">Нет новых уведомлений</p>
            ) : Array.isArray(notifications) ? (
              <div className="space-y-3">
                {notifications.map(n => (
                  <div key={n.id} className={`p-3 rounded-lg ${n.is_read ? 'bg-gray-50' : 'bg-[#fff5f0]'}`}>
                    <div className="font-medium text-sm text-[#4b2f23]">{n.title}</div>
                    <div className="text-xs text-gray-600 mt-1">{n.message}</div>
                    <div className="text-xs text-gray-400 mt-2">{new Date(n.created_at).toLocaleDateString()}</div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">Загрузка уведомлений...</p>
            )}
          </div>
        )}
      </div>
      
      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <Link 
          href="/orders" 
          className="flex items-center gap-4 p-5 bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-100 shadow-xl hover:shadow-md hover:border-[#c9825b]/30 transition-all group"
        >
          <div className="w-12 h-12 rounded-2xl bg-[#fff5f0] flex items-center justify-center text-[#c9825b] group-hover:scale-110 transition-transform">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.112 16.835a.75.75 0 0 1-.747.799H3.03a.75.75 0 0 1-.747-.799l1.112-16.835a.75.75 0 0 1 .747-.707H19.01a.75.75 0 0 1 .747.707Z" />
            </svg>
          </div>
          <div>
            <div className="font-black text-gray-900">Мои заказы</div>
            <div className="text-xs text-gray-500 font-medium">История покупок и статус заказов</div>
          </div>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5 ml-auto text-gray-300 group-hover:text-[#c9825b] group-hover:translate-x-1 transition-all">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </Link>

        <Link 
          href="/cart" 
          className="flex items-center gap-4 p-5 bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-100 shadow-xl hover:shadow-md hover:border-[#c9825b]/30 transition-all group"
        >
          <div className="w-12 h-12 rounded-2xl bg-[#fff5f0] flex items-center justify-center text-[#c9825b] group-hover:scale-110 transition-transform">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />
            </svg>
          </div>
          <div>
            <div className="font-black text-gray-900">Корзина</div>
            <div className="text-xs text-gray-500 font-medium">Перейти к оформлению заказа</div>
          </div>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5 ml-auto text-gray-300 group-hover:text-[#c9825b] group-hover:translate-x-1 transition-all">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </Link>
      </div>
      
      <div 
        className="p-6 rounded-2xl space-y-6 bg-gray-800/50 backdrop-blur-sm shadow-xl"
      >
        {/* Personal Data */}
        <div className="pb-6 border-b border-gray-100">
            <div className="flex items-center justify-between cursor-pointer group" onClick={() => {
                if (activeSection !== 'personal') setActiveSection('personal'); else setActiveSection(null);
            }}>
                <div>
                <div className="font-medium text-lg group-hover:text-[#c9825b] transition-colors" style={{ color: "#4b2f23" }}>Личные данные</div>
                    <div className="text-sm text-gray-500">
                        {profile?.first_name} {profile?.last_name}
                        <span className="mx-2">•</span>
                        <span className="text-[#c9825b] font-medium">{profile?.role === 'SELLER' ? 'Продавец' : 'Покупатель'}</span>
                    </div>
                </div>
                <div className={`text-sm font-medium px-3 py-1 rounded-full transition-colors ${activeSection === 'personal' ? 'bg-gray-100 text-gray-600' : 'bg-[#fff5f0] text-[#c9825b]'}`}>
                    {activeSection === 'personal' ? 'Свернуть' : 'Изменить'}
                </div>
            </div>

                    {activeSection === 'personal' && (
                <div className="mt-4 space-y-4">
                    {/* Name */}
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                        <div>
                            <div className="text-xs text-gray-500">Имя и Фамилия</div>
                            <div className="font-medium">{profile?.first_name} {profile?.last_name}</div>
                        </div>
                        <button 
                            onClick={() => startEditing('NAME')} 
                            onMouseEnter={() => setIsNameChangeHovered(true)}
                            onMouseLeave={() => setIsNameChangeHovered(false)}
                            className="text-sm font-medium px-4 py-1.5 rounded-full transition-colors duration-300"
                            style={{
                                backgroundColor: isNameChangeHovered ? '#c9825b' : '#fff5f0',
                                color: isNameChangeHovered ? '#ffffff' : '#c9825b',
                            }}
                        >
                            Изменить
                        </button>
                    </div>

                    {/* Shop Name for Sellers */}
                    {profile?.role === 'SELLER' && (
                        <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                            <div>
                                <div className="text-xs text-gray-500">Название магазина</div>
                                <div className="font-medium">{profile?.shop_name || 'Не указано'}</div>
                            </div>
                            <button 
                                onClick={() => startEditing('SHOP_NAME')} 
                                onMouseEnter={() => setIsShopNameChangeHovered(true)}
                                onMouseLeave={() => setIsShopNameChangeHovered(false)}
                                className="text-sm font-medium px-4 py-1.5 rounded-full transition-colors duration-300"
                                style={{
                                    backgroundColor: isShopNameChangeHovered ? '#c9825b' : '#fff5f0',
                                    color: isShopNameChangeHovered ? '#ffffff' : '#c9825b',
                                }}
                            >
                                Изменить
                            </button>
                        </div>
                    )}

                    {profile?.auth_provider !== 'GOOGLE' && (
                      <>
                        <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                          <div>
                            <div className="text-xs text-gray-500">Email</div>
                            <div className="font-medium">{profile?.email}</div>
                          </div>
                          <button 
                            onClick={() => startEditing('EMAIL')} 
                            onMouseEnter={() => setIsEmailChangeHovered(true)}
                            onMouseLeave={() => setIsEmailChangeHovered(false)}
                            className="text-sm font-medium px-4 py-1.5 rounded-full transition-colors duration-300"
                            style={{
                                backgroundColor: isEmailChangeHovered ? '#c9825b' : '#fff5f0',
                                color: isEmailChangeHovered ? '#ffffff' : '#c9825b',
                            }}
                          >
                            Изменить
                          </button>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                          <div>
                            <div className="text-xs text-gray-500">Телефон</div>
                            <div className="font-medium">{profile?.phone || 'Не указан'}</div>
                          </div>
                          <button 
                            onClick={() => startEditing('PHONE')} 
                            onMouseEnter={() => setIsPhoneChangeHovered(true)}
                            onMouseLeave={() => setIsPhoneChangeHovered(false)}
                            className="text-sm font-medium px-4 py-1.5 rounded-full transition-colors duration-300"
                            style={{
                                backgroundColor: isPhoneChangeHovered ? '#c9825b' : '#fff5f0',
                                color: isPhoneChangeHovered ? '#ffffff' : '#c9825b',
                            }}
                          >
                            Изменить
                          </button>
                        </div>
                      </>
                    )}

                    {/* Password */}
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                        <div>
                            <div className="text-xs text-gray-500">Пароль</div>
                            <div className="font-medium">••••••••</div>
                        </div>
                        <button 
                            onClick={() => setIsPasswordModalOpen(true)} 
                            onMouseEnter={() => setIsPasswordChangeHovered(true)}
                            onMouseLeave={() => setIsPasswordChangeHovered(false)}
                            className="text-sm font-medium px-4 py-1.5 rounded-full transition-colors duration-300"
                            style={{
                                backgroundColor: isPasswordChangeHovered ? '#c9825b' : '#fff5f0',
                                color: isPasswordChangeHovered ? '#ffffff' : '#c9825b',
                            }}
                        >
                            Изменить
                        </button>
                    </div>
                </div>
            )}
            
            {/* Edit Modal / Overlay */}
            {editingField && (
                <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-2xl w-full max-w-md mx-4 shadow-2xl">
                        <h3 className="text-xl font-bold mb-2" style={{ color: "#4b2f23" }}>
                            {editingField === 'EMAIL' && 'Смена Email адреса'}
                            {editingField === 'PHONE' && 'Смена номера телефона'}
                            {editingField === 'NAME' && 'Изменение имени'}
                            {editingField === 'SHOP_NAME' && 'Изменение названия магазина'}
                        </h3>
                        
                        <p className="text-sm text-gray-500 mb-4">
                            {editingField === 'EMAIL' && 'Пожалуйста, введите новый Email. Для безопасности мы попросим подтвердить это действие кодом, который придет на вашу текущую почту.'}
                            {editingField === 'PHONE' && 'Введите новый номер телефона. Изменение требует подтверждения через код, отправленный на вашу почту.'}
                            {editingField === 'NAME' && 'Введите ваше новое имя.'}
                            {editingField === 'SHOP_NAME' && 'Введите новое название вашего магазина.'}
                        </p>
                        
                        {editStep === 'INPUT' ? (
                            <div className="space-y-4">
                                        {editingField === 'NAME' && (
                                            <div className="space-y-3">
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">Имя</label>
                                                    <input 
                                                        type="text"
                                                        className="w-full rounded-full border border-gray-200 bg-gray-50 px-4 py-3 focus:ring-2 focus:ring-[#c9825b] focus:border-transparent outline-none transition-all"
                                                        value={editValue}
                                                        onChange={(e) => setEditValue(e.target.value)}
                                                        placeholder="Ваше имя"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">Фамилия</label>
                                                    <input 
                                                        type="text"
                                                        className="w-full rounded-full border border-gray-200 bg-gray-50 px-4 py-3 focus:ring-2 focus:ring-[#c9825b] focus:border-transparent outline-none transition-all"
                                                        value={editValueLastName}
                                                        onChange={(e) => setEditValueLastName(e.target.value)}
                                                        placeholder="Ваша фамилия"
                                                    />
                                                </div>
                                            </div>
                                        )}
                                        {editingField === 'SHOP_NAME' && (
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Название магазина</label>
                                                <input 
                                                    type="text"
                                                    className="w-full rounded-full border border-gray-200 bg-gray-50 px-4 py-3 focus:ring-2 focus:ring-[#c9825b] focus:border-transparent outline-none transition-all"
                                                    value={editValue}
                                                    onChange={(e) => setEditValue(e.target.value)}
                                                    placeholder="Название магазина"
                                                />
                                            </div>
                                        )}
                                        {editingField === 'EMAIL' && (
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Новый Email</label>
                                                <input 
                                                    type="email"
                                                    className="w-full rounded-full border border-gray-200 bg-gray-50 px-4 py-3 focus:ring-2 focus:ring-[#c9825b] focus:border-transparent outline-none transition-all"
                                                    value={editValue}
                                                    onChange={(e) => setEditValue(e.target.value)}
                                                    placeholder="example@mail.com"
                                                />
                                            </div>
                                        )}
                                        {editingField === 'PHONE' && (
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Новый номер телефона</label>
                                                <div className="rounded-full shadow-sm ring-1 ring-inset ring-gray-300 focus-within:ring-2 focus-within:ring-inset focus-within:ring-[#c9825b] bg-transparent">
                                                    <PhoneInput
                                                        international
                                                        defaultCountry="RU"
                                                        value={editValue}
                                                        onChange={(val) => setEditValue(val || '')}
                                                        className="phone-input-custom px-4 py-2.5 w-full bg-transparent"
                                                        placeholder="Номер телефона"
                                                    />
                                                </div>
                                            </div>
                                        )}
                                <div className="flex space-x-3">
                                    <button 
                                        onClick={() => setEditingField(null)} 
                                        className="flex-1 py-2 font-medium rounded-lg shadow-sm"
                                        style={{ backgroundColor: '#fff', color: '#1a1a1a', border: '1px solid var(--border-warm)', transition: 'background-color 200ms ease, color 200ms ease, border-color 200ms ease, box-shadow 200ms ease' }}
                                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#C9825B'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = '#C9825B'; }}
                                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#fff'; e.currentTarget.style.color = '#1a1a1a'; e.currentTarget.style.borderColor = 'var(--border-warm)'; }}
                                    >
                                        Отмена
                                    </button>
                                    <button 
                                        onClick={() => {
                                            if (editingField === 'NAME' || editingField === 'SHOP_NAME') {
                                                handleSimpleUpdate();
                                            } else {
                                                handleRequestCode();
                                            }
                                        }}
                                        disabled={loading}
                                        onMouseEnter={() => setIsSaveHovered(true)}
                                        onMouseLeave={() => setIsSaveHovered(false)}
                                        className="flex-1 py-2 font-medium rounded-lg shadow-sm disabled:opacity-70 transition-all duration-300"
                                        style={{ 
                                            backgroundColor: isSaveHovered ? '#c9825b' : '#fff',
                                            color: isSaveHovered ? '#ffffff' : '#1a1a1a',
                                            border: isSaveHovered ? '1px solid #c9825b' : '1px solid var(--border-warm)'
                                        }}
                                    >
                                        {loading ? 'Загрузка...' : ((editingField === 'NAME' || editingField === 'SHOP_NAME') ? 'Сохранить' : 'Получить код')}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="bg-[#fff5f0] p-3 rounded-lg border border-[#ffdccb]">
                                    <p className="text-sm text-[#4b2f23]">
                                        Мы отправили код подтверждения на ваш <strong>текущий email</strong>. 
                                        Пожалуйста, проверьте папку "Входящие" или "Спам".
                                    </p>
                                    <div className="mt-2 text-center">
                                        <button 
                                            onClick={handleResendCode} 
                                            disabled={resendCooldown > 0}
                                            className={`text-xs font-medium ${resendCooldown > 0 ? 'text-gray-400 cursor-not-allowed' : 'text-[#c9825b] hover:underline'}`}
                                        >
                                            {resendCooldown > 0 ? `Отправить код повторно через ${resendCooldown}с` : 'Отправить код повторно'}
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Код из письма</label>
                                    <input 
                                        type="text"
                                        className="w-full border p-2 rounded-lg text-center tracking-widest text-lg"
                                        value={verifyCode}
                                        onChange={(e) => setVerifyCode(e.target.value)}
                                        placeholder="123456"
                                        maxLength={6}
                                    />
                                </div>
                                <div className="flex space-x-3">
                                    <button 
                                        onClick={() => setEditStep('INPUT')} 
                                        className="flex-1 py-2 font-medium rounded-lg shadow-sm"
                                        style={{ backgroundColor: '#fff', color: '#1a1a1a', border: '1px solid var(--border-warm)', transition: 'background-color 200ms ease, color 200ms ease, border-color 200ms ease, box-shadow 200ms ease' }}
                                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#C9825B'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = '#C9825B'; }}
                                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#fff'; e.currentTarget.style.color = '#1a1a1a'; e.currentTarget.style.borderColor = 'var(--border-warm)'; }}
                                    >Назад</button>
                                    <button 
                                        onClick={handleConfirmCode} 
                                        className="flex-1 py-2 font-medium rounded-lg shadow-sm"
                                        style={{ backgroundColor: '#fff', color: '#1a1a1a', border: '1px solid var(--border-warm)', transition: 'background-color 200ms ease, color 200ms ease, border-color 200ms ease, box-shadow 200ms ease' }}
                                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#C9825B'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = '#C9825B'; }}
                                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#fff'; e.currentTarget.style.color = '#1a1a1a'; e.currentTarget.style.borderColor = 'var(--border-warm)'; }}
                                    >Подтвердить</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>

        {profile?.auth_provider !== 'GOOGLE' && (
          <div className="flex items-center justify-between pb-6 border-b border-gray-100">
            <div>
              <div className="font-medium text-lg" style={{ color: "#4b2f23" }}>Двухфакторная аутентификация</div>
              <div className="text-sm text-gray-500">Дополнительная защита</div>
            </div>
            <button
              type="button"
              onClick={handleToggle2FA}
              disabled={loading}
              className="flex items-center space-x-2"
              aria-pressed={profile?.is_2fa_enabled}
            >
              <span
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer items-center rounded-full border-2 transition-colors duration-200 ease-in-out ${
                  profile?.is_2fa_enabled ? "bg-white border-[#c9825b]" : "bg-[#c9825b] border-[#c9825b]"
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full shadow ring-0 transition duration-200 ease-in-out ${
                    profile?.is_2fa_enabled ? "translate-x-5 bg-[#c9825b]" : "translate-x-1 bg-white"
                  }`}
                />
              </span>
            </button>
          </div>
        )}

        {/* Payment Methods */}
        <div className="pb-6 border-b border-gray-100">
          <div className="flex items-center justify-between cursor-pointer group" onClick={() => {
             loadPaymentMethods();
             setIsPaymentModalOpen(true);
          }}>
            <div>
              <div className="font-medium text-lg group-hover:text-[#c9825b] transition-colors" style={{ color: "#4b2f23" }}>Способы оплаты</div>
              <div className="text-sm text-gray-500">Управление картами</div>
            </div>
            <div className="text-sm font-medium px-3 py-1 rounded-full bg-[#fff5f0] text-[#c9825b]">
                Настроить
            </div>
          </div>
        </div>

        {/* Devices */}
        <div className="pb-6 border-b border-gray-100">
          <div className="flex items-center justify-between cursor-pointer group" onClick={() => {
             loadDevices();
             setIsDevicesModalOpen(true);
          }}>
            <div>
              <div className="font-medium text-lg group-hover:text-[#c9825b] transition-colors" style={{ color: "#4b2f23" }}>Ваши устройства</div>
              <div className="text-sm text-gray-500">Активные сессии</div>
            </div>
            <div className="text-sm font-medium px-3 py-1 rounded-full bg-[#fff5f0] text-[#c9825b]">
                Показать
            </div>
          </div>
        </div>

        <div className="pb-6 border-b border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="font-medium text-lg" style={{ color: "#4b2f23" }}>
                Уведомления о подарках
              </div>
              <div className="text-sm text-gray-500">
                Выберите события и каналы для оповещений
              </div>
            </div>
          </div>
          <div className="space-y-3">
            {[
              { key: "GiftActivated", label: "Подарок активирован" },
              { key: "GiftConsumed", label: "Подарок использован" },
              { key: "GiftExpired", label: "Срок подарка истёк" },
            ].map((item) => {
              const current: ("email" | "push" | "crm")[] = giftSubscriptions[item.key] || [];
              const toggleChannel = (channel: "email" | "push" | "crm") => {
                setGiftSubscriptions((prev) => {
                  const existing = prev[item.key] || [];
                  const has = existing.includes(channel);
                  const next = has ? existing.filter((c) => c !== channel) : [...existing, channel];
                  const cleaned = { ...prev };
                  if (next.length === 0) {
                    delete cleaned[item.key];
                  } else {
                    cleaned[item.key] = next;
                  }
                  return cleaned;
                });
              };
              const channels: { key: "email" | "push" | "crm"; label: string }[] = [
                { key: "email", label: "Email" },
                { key: "push", label: "Push" },
                { key: "crm", label: "CRM" },
              ];
              return (
                <div
                  key={item.key}
                  className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 rounded-xl bg-gray-50 px-4 py-3"
                >
                  <div>
                    <div className="text-sm font-medium text-gray-900">{item.label}</div>
                    <div className="text-xs text-gray-500">
                      {item.key === "GiftActivated" && "Когда вы активируете полученный подарок"}
                      {item.key === "GiftConsumed" && "Когда подарок превращается в заказ"}
                      {item.key === "GiftExpired" && "Когда истёк срок действия подарка"}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {channels.map((ch) => {
                      const checked = current.includes(ch.key);
                      return (
                        <label
                          key={ch.key}
                          className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium cursor-pointer hover:border-[#c9825b]/60"
                        >
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-gray-300"
                            style={{ accentColor: "#c9825b" }}
                            checked={checked}
                            onChange={() => toggleChannel(ch.key)}
                          />
                          <span className="text-gray-700">{ch.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex justify-end mt-4">
            <button
              type="button"
              disabled={giftSettingsSaving || giftSettingsLoading}
              onClick={async () => {
                const token = getCookie("accessToken");
                if (!token) return;
                try {
                  setGiftSettingsSaving(true);
                  const data = await updateGiftNotificationSettings(giftSubscriptions, token);
                  setGiftSubscriptions(data.subscriptions || {});
                } catch (e) {
                  handleError(e, "Не удалось сохранить настройки уведомлений о подарках");
                } finally {
                  setGiftSettingsSaving(false);
                }
              }}
              className="inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-semibold"
              style={{
                backgroundColor: giftSettingsSaving ? "#e5e7eb" : "#c9825b",
                color: giftSettingsSaving ? "#6b7280" : "#ffffff",
              }}
            >
              {giftSettingsSaving ? "Сохранение..." : "Сохранить настройки"}
            </button>
          </div>
        </div>

        {/* Become Seller (Only if not already seller) */}
        {profile?.role !== 'SELLER' && (
            <div className="pb-6 border-b border-gray-100">
                  <div className="flex items-center justify-between cursor-pointer group" onClick={() => {
                     if (activeSection !== 'seller') setActiveSection('seller'); else setActiveSection(null);
                  }}>
                    <div>
                      <div className="font-medium text-lg group-hover:text-[#c9825b] transition-colors" style={{ color: "#4b2f23" }}>Стать продавцом</div>
                      <div className="text-sm text-gray-500">Начните продавать домашнюю еду</div>
                    </div>
                    <div className={`text-sm font-medium px-3 py-1 rounded-full transition-colors ${activeSection === 'seller' ? 'bg-gray-100 text-gray-600' : 'bg-[#fff5f0] text-[#c9825b]'}`}>
                        {activeSection === 'seller' ? 'Свернуть' : 'Заполнить'}
                    </div>
                  </div>
                  
                  {activeSection === 'seller' && (
                     <div className="mt-4 p-4 bg-[#fff5f0] rounded-lg">
                        <p className="text-sm text-[#4b2f23] mb-4">Заполните анкету, чтобы открыть свой магазин.</p>
                        <input placeholder="Название магазина" className="w-full border p-2 rounded mb-2"
                           value={sellerForm.name} onChange={e => setSellerForm({...sellerForm, name: e.target.value})} />
                        <input placeholder="Город" className="w-full border p-2 rounded mb-2"
                           value={sellerForm.city} onChange={e => setSellerForm({...sellerForm, city: e.target.value})} />
                        <select className="w-full border p-2 rounded mb-4"
                           value={sellerForm.producer_type} onChange={e => setSellerForm({...sellerForm, producer_type: e.target.value})}>
                           <option value="SELF_EMPLOYED">Самозанятый (5%)</option>
                           <option value="INDIVIDUAL_ENTREPRENEUR">ИП (10%)</option>
                        </select>
                        <button onClick={handleBecomeSeller} className="w-full bg-[#c9825b] text-white py-2 rounded font-medium hover:bg-[#a06646]">Отправить заявку</button>
                     </div>
                  )}
            </div>
        )}

        {/* Help & FAQ */}
        <div className="pb-6 border-b border-gray-100">
          <div className="flex items-center justify-between cursor-pointer group" onClick={() => {
             if (activeSection !== 'help') { setActiveSection('help'); loadHelp(); } else setActiveSection(null);
          }}>
            <div>
              <div className="font-medium text-lg group-hover:text-[#c9825b] transition-colors" style={{ color: "#4b2f23" }}>Помощь и Частые вопросы</div>
              <div className="text-sm text-gray-500">Поддержка пользователей</div>
            </div>
            <div className={`text-sm font-medium px-3 py-1 rounded-full transition-colors ${activeSection === 'help' ? 'bg-gray-100 text-gray-600' : 'bg-[#fff5f0] text-[#c9825b]'}`}>
                {activeSection === 'help' ? 'Свернуть' : 'Показать'}
            </div>
          </div>
          
          {activeSection === 'help' && (
            <div className="mt-4 space-y-2">
               {helpArticles.length === 0 ? <p className="text-sm text-gray-500">Загрузка...</p> : 
                 helpArticles.map(art => (
                   <div key={art.id} className="p-3 bg-gray-50 rounded-lg">
                      <div className="font-medium text-[#4b2f23]">{art.question}</div>
                      <div className="text-sm text-gray-600 mt-1">{art.answer}</div>
                   </div>
                 ))
               }
               <div className="mt-4 pt-4 border-t text-center">
                 <button 
                   onClick={() => router.push('/chat?orderId=support')}
                   className="text-[#c9825b] font-medium hover:underline"
                 >
                   Написать в поддержку
                 </button>
               </div>
            </div>
          )}
        </div>

        {/* Logout */}
        <div className="pt-4 flex justify-end">
          <button 
            onClick={handleLogout}
            className="group flex items-center px-6 py-2.5 text-sm font-medium text-red-600 bg-red-50 rounded-full transition-all duration-300 hover:!bg-[#c9825b] hover:!text-white active:!bg-[#c9825b] active:!text-white hover:shadow-md active:scale-95"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-2 transition-transform duration-300 group-hover:-translate-x-1">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
            </svg>
            Выйти из аккаунта
          </button>
        </div>
      </div>
      
      <PasswordChangeModal 
        isOpen={isPasswordModalOpen} 
        onClose={() => setIsPasswordModalOpen(false)} 
        token={getCookie("accessToken") || ""} 
      />
      <PaymentMethodsModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        paymentMethods={paymentMethods}
        onAddCard={handleAddCard}
        onDeleteCard={handleDeleteCard}
      />
      <DevicesModal
        isOpen={isDevicesModalOpen}
        onClose={() => setIsDevicesModalOpen(false)}
        devices={devices}
        onLogoutDevice={handleLogoutDevice}
        onLogoutCurrent={() => {
            if (confirm("Выйти из аккаунта?")) handleLogout();
        }}
      />
    </div>
  );
}
