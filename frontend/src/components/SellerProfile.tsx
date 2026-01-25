"use client";

import { useState, useEffect } from "react";
import { Category, Profile, WeeklyScheduleDay, WeekDayKey, DeliveryZone, DeliveryPricingRule, getCategories, updateProfile, uploadSellerLogo, requestChange, confirmChange, toggle2FA, getDevices, logoutDevice, UserDevice, uploadDocument, getFullImageUrl } from "@/lib/api";
import Link from "next/link";
import { useRouter } from "next/navigation";
import PasswordChangeModal from "@/components/PasswordChangeModal";
import DevicesModal from "@/components/DevicesModal";
import AddressCapsule from "@/components/AddressCapsule";
import MapPicker from "@/components/MapPicker";
import DeliveryZonesModal from "@/components/DeliveryZonesModal";
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";

interface SellerProfileProps {
  profile: Profile;
  onProfileUpdated?: (profile: Profile) => void;
}

type ProfileSubTab = 'ABOUT' | 'DELIVERY' | 'EMPLOYEES' | 'REQUISITES' | 'DOCUMENTS' | 'FTS';
type AboutSection = 'GENERAL' | 'CONTACTS' | 'WORKING_MODE';

// Helper to get cookie value
function getCookie(name: string) {
  if (typeof document === "undefined") return "";
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(";").shift();
}

const WEEK_DAYS: { key: WeekDayKey; label: string; short: string }[] = [
  { key: 'monday', label: 'Понедельник', short: 'Пн' },
  { key: 'tuesday', label: 'Вторник', short: 'Вт' },
  { key: 'wednesday', label: 'Среда', short: 'Ср' },
  { key: 'thursday', label: 'Четверг', short: 'Чт' },
  { key: 'friday', label: 'Пятница', short: 'Пт' },
  { key: 'saturday', label: 'Суббота', short: 'Сб' },
  { key: 'sunday', label: 'Воскресенье', short: 'Вс' },
];

function buildDefaultWeeklySchedule(): WeeklyScheduleDay[] {
  return WEEK_DAYS.map((d) => ({ day: d.key, is_247: false, intervals: [] }));
}

function normalizeWeeklySchedule(value: unknown): WeeklyScheduleDay[] {
  const defaults = buildDefaultWeeklySchedule();
  if (!Array.isArray(value)) return defaults;

  const map = new Map<WeekDayKey, WeeklyScheduleDay>();
  for (const item of value) {
    if (!item || typeof item !== 'object') continue;
    const dayRaw = (item as any).day;
    const is247Raw = (item as any).is_247;
    const intervalsRaw = (item as any).intervals;
    if (!WEEK_DAYS.some((d) => d.key === dayRaw)) continue;
    const intervals = Array.isArray(intervalsRaw)
      ? intervalsRaw
          .filter((x: any) => x && typeof x === 'object')
          .map((x: any) => ({ start: String(x.start || ''), end: String(x.end || '') }))
      : [];
    map.set(dayRaw, { day: dayRaw, is_247: Boolean(is247Raw), intervals });
  }

  return defaults.map((d) => map.get(d.day) || d);
}

function timeToMinutes(value: string) {
  const m = /^(\d{2}):(\d{2})$/.exec(value || '');
  if (!m) return null;
  const hh = Number.parseInt(m[1], 10);
  const mm = Number.parseInt(m[2], 10);
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
  if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return null;
  return hh * 60 + mm;
}

function buildScheduleSummary(value: WeeklyScheduleDay[]): string {
  const normalized = normalizeWeeklySchedule(value);
  const parts: string[] = [];
  for (const d of normalized) {
    const meta = WEEK_DAYS.find((x) => x.key === d.day);
    const label = meta?.short || d.day;
    if (d.is_247) {
      parts.push(`${label} Круглосуточно`);
      continue;
    }
    if (!d.intervals || d.intervals.length === 0) {
      continue;
    }
    const it = d.intervals
      .filter((x) => timeToMinutes(x.start) !== null && timeToMinutes(x.end) !== null)
      .map((x) => `${x.start}–${x.end}`)
      .join(', ');
    if (it) parts.push(`${label} ${it}`);
  }
  return parts.join(' · ');
}

function toNumber(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const n = Number.parseFloat(value);
    if (Number.isFinite(n)) return n;
  }
  return fallback;
}

function normalizeDeliveryZones(value: unknown, profile: Profile): DeliveryZone[] {
  if (Array.isArray(value) && value.length > 0) {
    return value
      .filter((x) => x && typeof x === 'object')
      .map((x: any, idx: number) => ({
        name: String(x.name || `Зона ${idx + 1}`),
        radius_km: toNumber(x.radius_km, 10),
        price_to_building: toNumber(x.price_to_building, 0),
        price_to_door: toNumber(x.price_to_door, 0),
        time_minutes: Math.max(1, Math.floor(toNumber(x.time_minutes, 60))),
      }))
      .slice(0, 10);
  }

  return [
    {
      name: 'Основная зона',
      radius_km: toNumber((profile as any).delivery_radius_km, 10),
      price_to_building: toNumber((profile as any).delivery_price_to_building, 0),
      price_to_door: toNumber((profile as any).delivery_price_to_door, 0),
      time_minutes: Math.max(1, Math.floor(toNumber((profile as any).delivery_time_minutes, 60))),
    },
  ];
}

function normalizeDeliveryPricingRules(value: unknown): DeliveryPricingRule[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((x) => x && typeof x === 'object')
    .map((x: any) => ({
      start: String(x.start || ''),
      end: String(x.end || ''),
      surcharge: toNumber(x.surcharge, 0),
    }))
    .filter((x) => x.start && x.end)
    .slice(0, 12);
}

export default function SellerProfile({ profile: initialProfile, onProfileUpdated }: SellerProfileProps) {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile>(initialProfile);
  const [activeSubTab, setActiveSubTab] = useState<ProfileSubTab>('ABOUT');
  const [aboutSection, setAboutSection] = useState<AboutSection>('GENERAL');

  const initialLat =
    typeof initialProfile.latitude === "number"
      ? initialProfile.latitude
      : typeof initialProfile.latitude === "string"
        ? Number.parseFloat(initialProfile.latitude)
        : null;
  const initialLon =
    typeof initialProfile.longitude === "number"
      ? initialProfile.longitude
      : typeof initialProfile.longitude === "string"
        ? Number.parseFloat(initialProfile.longitude)
        : null;

  // Form States for General
  const [generalForm, setGeneralForm] = useState({
      shop_name: initialProfile.shop_name || '',
      city: initialProfile.city || '',
      address: initialProfile.address || '',
      latitude: Number.isFinite(initialLat as number) ? (initialLat as number) : null,
      longitude: Number.isFinite(initialLon as number) ? (initialLon as number) : null,
      main_category: initialProfile.main_category || '',
      short_description: initialProfile.short_description || '',
      description: initialProfile.description || '',
      logo_url: initialProfile.logo_url || '',
  });

  const [weeklyScheduleForm, setWeeklyScheduleForm] = useState<WeeklyScheduleDay[]>(
    normalizeWeeklySchedule((initialProfile as any).weekly_schedule)
  );
  const [scheduleSaving, setScheduleSaving] = useState(false);
  const [shopStateSaving, setShopStateSaving] = useState(false);
  const [deliveryZonesForm, setDeliveryZonesForm] = useState<DeliveryZone[]>(
    normalizeDeliveryZones((initialProfile as any).delivery_zones, initialProfile)
  );
  const [deliveryPricingRulesForm, setDeliveryPricingRulesForm] = useState<DeliveryPricingRule[]>(
    normalizeDeliveryPricingRules((initialProfile as any).delivery_pricing_rules)
  );
  const [deliverySaving, setDeliverySaving] = useState(false);
  const [pickupSaving, setPickupSaving] = useState(false);

  // Requisites and Employees States
    const [requisitesForm, setRequisitesForm] = useState<any>((initialProfile as any).requisites || {
          legal_status: '',
      });
    const [employeesForm, setEmployeesForm] = useState<any[]>((initialProfile as any).employees || []);
    const [documentsForm, setDocumentsForm] = useState<any[]>((initialProfile as any).documents || []);
    const [requisitesSaving, setRequisitesSaving] = useState(false);
    const [employeesSaving, setEmployeesSaving] = useState(false);
    const [documentsSaving, setDocumentsSaving] = useState(false);
    const [uploadingDocType, setUploadingDocType] = useState<string | null>(null);

  // Contacts / Security States
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isDevicesModalOpen, setIsDevicesModalOpen] = useState(false);
  const [isZonesModalOpen, setIsZonesModalOpen] = useState(false);
  const [devices, setDevices] = useState<UserDevice[]>([]);
  const [loading, setLoading] = useState(false);

  // Editing states (Phone/Email/Name)
  const [editingField, setEditingField] = useState<'EMAIL' | 'PHONE' | 'NAME' | null>(null);
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
  const [isSaveHovered, setIsSaveHovered] = useState(false);
  const [is2FAHovered, setIs2FAHovered] = useState(false);
  const [isDevicesHovered, setIsDevicesHovered] = useState(false);
  const [hoveredAboutSection, setHoveredAboutSection] = useState<AboutSection | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [logoUploading, setLogoUploading] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (resendCooldown > 0) {
      timer = setInterval(() => {
        setResendCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [resendCooldown]);

  useEffect(() => {
    getCategories()
      .then((data) => {
        setCategories(Array.isArray(data) ? data : []);
      })
      .catch(() => setCategories([]));
  }, []);

  const handleError = (e: any, defaultMsg: string) => {
      let msg = defaultMsg;
      if (e?.detail) msg = e.detail;
      else if (typeof e === 'string') msg = e;
      alert(msg);
  };

  const handleUpdateGeneral = async () => {
      const token = getCookie("accessToken");
      if (!token) return;
      try {
          const updated = await updateProfile(generalForm, token);
          setProfile(updated);
          onProfileUpdated?.(updated);
          alert("Данные сохранены");
      } catch (e) {
          handleError(e, "Ошибка сохранения");
      }
  };

  const handleLogoFileChange = async (file: File | null) => {
      if (!file) return;
      if (logoUploading) return;

      const token = getCookie("accessToken");
      if (!token) return;

      setLogoUploading(true);
      try {
          const updated = await uploadSellerLogo(file, token);
          setProfile(updated);
          onProfileUpdated?.(updated);
          setGeneralForm((prev) => ({ ...prev, logo_url: updated.logo_url || '' }));
      } catch (e) {
          handleError(e, "Ошибка загрузки логотипа");
      } finally {
          setLogoUploading(false);
      }
  };

  const handleUpdateWeeklySchedule = async () => {
    if (scheduleSaving) return;
    const token = getCookie("accessToken");
    if (!token) return;

    const normalized = normalizeWeeklySchedule(weeklyScheduleForm).map((d) => {
      if (d.is_247) return { ...d, intervals: [] };
      const intervals = (d.intervals || [])
        .map((x) => ({ start: String(x.start || ''), end: String(x.end || '') }))
        .filter((x) => timeToMinutes(x.start) !== null && timeToMinutes(x.end) !== null)
        .filter((x) => (timeToMinutes(x.end) as number) > (timeToMinutes(x.start) as number));
      return { ...d, intervals };
    });

    try {
      setScheduleSaving(true);
      const updated = await updateProfile({ weekly_schedule: normalized } as any, token);
      setProfile(updated);
      setWeeklyScheduleForm(normalizeWeeklySchedule((updated as any).weekly_schedule));
      onProfileUpdated?.(updated);
      alert("Режим работы сохранен");
    } catch (e) {
      handleError(e, "Ошибка сохранения");
    } finally {
      setScheduleSaving(false);
    }
  };

  const handleToggleShopHidden = async () => {
    if (shopStateSaving) return;
    const token = getCookie("accessToken");
    if (!token) return;

    const nextHidden = !Boolean((profile as any).is_hidden);
    if (nextHidden) {
      if (!confirm("Закрыть магазин? Он перестанет отображаться в списке продавцов.")) return;
    }

    try {
      setShopStateSaving(true);
      const updated = await updateProfile({ is_hidden: nextHidden } as any, token);
      setProfile(updated);
      onProfileUpdated?.(updated);
    } catch (e) {
      handleError(e, "Ошибка обновления статуса магазина");
    } finally {
      setShopStateSaving(false);
    }
  };

  const handleLogout = () => {
    document.cookie = "accessToken=; path=/; max-age=0";
    document.cookie = "refreshToken=; path=/; max-age=0";
    router.push("/");
    router.refresh();
  };

  // Contacts Logic
  const startEditing = (field: 'EMAIL' | 'PHONE' | 'NAME') => {
    setEditingField(field);
    setEditValue('');
    setEditValueLastName('');
    if (field === 'NAME') {
        setEditValue(profile.first_name || '');
        setEditValueLastName(profile.last_name || '');
    } else if (field === 'PHONE') {
        setEditValue(profile.phone || '');
    } else if (field === 'EMAIL') {
        setEditValue(profile.email || '');
    }
    setVerifyCode('');
    setEditStep('INPUT');
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
        await requestChange(editingField, editValue, token);
        setEditStep('VERIFY');
        setResendCooldown(60);
    } catch (e: any) {
        handleError(e, "Ошибка запроса");
    } finally {
        setLoading(false);
    }
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
        // Refresh profile? The response might not return full profile if confirmed via simple API.
        // Assuming page reload or manual fetch needed, but updateProfile returns profile.
        // confirmChange returns detail.
        // Let's manually update state or fetch
        window.location.reload(); 
    } catch (e: any) {
        handleError(e, "Ошибка подтверждения");
    }
  };

  const handleSimpleUpdateName = async () => {
      const token = getCookie("accessToken");
      if (!token) return;
      try {
          const updated = await updateProfile({ first_name: editValue, last_name: editValueLastName }, token);
          setProfile(updated);
          onProfileUpdated?.(updated);
          setEditingField(null);
          alert("Имя обновлено");
      } catch (e) {
          handleError(e, "Ошибка обновления");
      }
  };

  const handleToggle2FA = async () => {
    const token = getCookie("accessToken");
    if (!token) return;
    try {
        const newState = !profile.is_2fa_enabled;
        await toggle2FA(newState, token);
        setProfile({ ...profile, is_2fa_enabled: newState });
    } catch (e) {
        handleError(e, "Ошибка переключения 2FA");
    }
  };

  const loadDevices = async () => {
    const token = getCookie("accessToken");
    if (token) {
        try {
            const data = await getDevices(token);
            setDevices(data);
            setIsDevicesModalOpen(true);
        } catch (e) { console.error(e); }
    }
  };

  const handleLogoutDevice = async (id: string) => {
    const token = getCookie("accessToken");
    if (!token) return;
    if (!confirm("Выйти на этом устройстве?")) return;
    try {
      await logoutDevice(id, token);
      const data = await getDevices(token);
      setDevices(data);
    } catch (e: any) {
      handleError(e, "Ошибка выхода с устройства");
    }
  };


  const profileSubTabs: { id: ProfileSubTab; label: string }[] = [
    { id: 'ABOUT', label: 'О магазине' },
    { id: 'DELIVERY', label: 'Доставка' },
    { id: 'EMPLOYEES', label: 'Сотрудники' },
    { id: 'REQUISITES', label: 'Реквизиты' },
    { id: 'DOCUMENTS', label: 'Документы' },
    { id: 'FTS', label: 'Уведомления ФНС' },
  ];

  return (
    <div className="space-y-8">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
                <h1 className="text-3xl font-bold text-gray-900">Настройки магазина</h1>
                <p className="text-gray-500 mt-1">Управляйте информацией о вашем магазине и настройками доставки</p>
            </div>
            <Link 
                href={profile.producer_id ? `/producers/${profile.producer_id}` : '#'} 
                className={`inline-flex items-center px-5 py-2.5 rounded-xl bg-white border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition-all duration-200 shadow-sm ${!profile.producer_id ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
                <span className="mr-2">Посмотреть на сайте</span>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                </svg>
            </Link>
        </div>

        {/* Profile Sub-navigation */}
        <div className="flex gap-2 bg-white p-1.5 rounded-2xl border border-gray-200 shadow-sm overflow-x-auto no-scrollbar">
            {profileSubTabs.map((subTab) => (
                <button
                    key={subTab.id}
                    type="button"
                    onClick={() => setActiveSubTab(subTab.id)}
                    className={`flex-1 min-w-[120px] !px-4 !py-2.5 !rounded-xl text-sm font-semibold transition-all duration-200 whitespace-nowrap ${
                        activeSubTab === subTab.id
                            ? '!bg-[#c9825b] !text-white !shadow-sm'
                            : '!bg-transparent text-gray-600 hover:!bg-gray-50 hover:text-[#c9825b]'
                    }`}
                >
                    {subTab.label}
                </button>
            ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content Column */}
            <div className="lg:col-span-2 bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-8">
                {activeSubTab === 'ABOUT' && (
                    <div className="space-y-8">
                        {/* About Sections Navigation */}
                        <div className="flex gap-4 border-b border-gray-100 pb-4">
                            {(['GENERAL', 'CONTACTS', 'WORKING_MODE'] as AboutSection[]).map(sec => (
                                <button
                                    key={sec}
                                    type="button"
                                    onClick={() => setAboutSection(sec)}
                                    className={`relative py-2 text-sm font-bold transition-all duration-200 ${
                                        aboutSection === sec ? 'text-[#c9825b]' : 'text-gray-400 hover:text-gray-600'
                                    }`}
                                >
                                    {sec === 'GENERAL' ? 'Общее' : sec === 'CONTACTS' ? 'Безопасность' : 'Режим работы'}
                                    {aboutSection === sec && (
                                        <div className="absolute bottom-[-17px] left-0 right-0 h-1 bg-[#c9825b] rounded-full" />
                                    )}
                                </button>
                            ))}
                        </div>

                        {aboutSection === 'GENERAL' && (
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                                <div className="lg:col-span-4 space-y-6">
                                    <div className="relative group mx-auto w-48 h-48">
                                        <div className="w-full h-full rounded-3xl overflow-hidden border-4 border-gray-50 shadow-inner bg-gray-50">
                                            {generalForm.logo_url ? (
                                                <img src={getFullImageUrl(generalForm.logo_url)} alt="Logo" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-gray-300">
                                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-16 h-16">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v14.25A2.25 2.25 0 0 0 5.25 19.5h13.5a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 18.75 4.5H5.25A2.25 2.25 0 0 0 3 6.75V19.5" />
                                                    </svg>
                                                </div>
                                            )}
                                        </div>
                                        <label className="absolute bottom-[-10px] right-[-10px] p-3 bg-[#c9825b] text-white rounded-2xl shadow-lg cursor-pointer hover:scale-110 transition-transform duration-200 border-4 border-white">
                                            <input type="file" className="hidden" accept="image/*" onChange={(e) => handleLogoFileChange(e.target.files?.[0] || null)} />
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15a2.25 2.25 0 0 0 2.25-2.25V9.574c0-1.067-.75-1.994-1.802-2.169a48.324 48.324 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
                                            </svg>
                                        </label>
                                    </div>
                                    <div className="text-center">
                                        <h4 className="font-bold text-gray-900">Логотип магазина</h4>
                                        <p className="text-sm text-gray-500 mt-1">Рекомендуемый размер 512x512px</p>
                                    </div>
                                </div>

                                    <div className="space-y-6 lg:col-span-8">
                                        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                                            <div className="space-y-2">
                                                <label className="ml-1 text-sm font-bold text-gray-700">Название магазина</label>
                                                <input
                                                    type="text"
                                                    value={generalForm.shop_name}
                                                    onChange={(e) => setGeneralForm(prev => ({ ...prev, shop_name: e.target.value }))}
                                                    placeholder="Введите название"
                                                    className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 outline-none transition-all duration-200 focus:ring-2 focus:ring-[#c9825b] focus:border-transparent"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="ml-1 text-sm font-bold text-gray-700">Город</label>
                                                <input
                                                    type="text"
                                                    value={generalForm.city}
                                                    onChange={(e) => setGeneralForm(prev => ({ ...prev, city: e.target.value }))}
                                                    placeholder="Например: Саратов"
                                                    className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 outline-none transition-all duration-200 focus:ring-2 focus:ring-[#c9825b] focus:border-transparent"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="ml-1 text-sm font-bold text-gray-700">Основная категория</label>
                                            <div className="relative">
                                                <select
                                                    value={generalForm.main_category}
                                                    onChange={(e) => setGeneralForm(prev => ({ ...prev, main_category: e.target.value }))}
                                                    className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 outline-none transition-all duration-200 focus:ring-2 focus:ring-[#c9825b] focus:border-transparent appearance-none cursor-pointer"
                                                >
                                                    <option value="">Выберите категорию</option>
                                                    {Array.isArray(categories) && categories.map((cat) => (
                                                        <option key={cat.id} value={cat.id}>
                                                            {cat.name}
                                                        </option>
                                                    ))}
                                                </select>
                                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-400">
                                                    <svg className="h-5 w-5 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                                                        <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                                                    </svg>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="ml-1 text-sm font-bold text-gray-700">Краткое описание</label>
                                            <input
                                                type="text"
                                                value={generalForm.short_description}
                                                onChange={(e) => setGeneralForm(prev => ({ ...prev, short_description: e.target.value }))}
                                                placeholder="Коротко о вашем магазине"
                                                className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 outline-none transition-all duration-200 focus:ring-2 focus:ring-[#c9825b] focus:border-transparent"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <label className="ml-1 text-sm font-bold text-gray-700">Полное описание</label>
                                            <textarea
                                                value={generalForm.description}
                                                onChange={(e) => setGeneralForm(prev => ({ ...prev, description: e.target.value }))}
                                                rows={4}
                                                placeholder="Расскажите подробнее о вашем магазине, продукции и ценностях"
                                                className="w-full resize-none rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 outline-none transition-all duration-200 focus:ring-2 focus:ring-[#c9825b] focus:border-transparent"
                                            />
                                        </div>

                                        <div className="space-y-4 pt-4 border-t border-gray-100">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <h4 className="font-bold text-gray-900">Адрес и местоположение</h4>
                                                    <p className="text-sm text-gray-500">Укажите точный адрес для отображения на карте</p>
                                                </div>
                                            </div>
                                            <div className="space-y-4">
                                                <AddressCapsule 
                                                    value={generalForm.address} 
                                                    onChange={(val) => setGeneralForm(prev => ({ ...prev, address: val }))} 
                                                />
                                                <div className="h-64 rounded-3xl overflow-hidden border border-gray-200">
                                                    <MapPicker 
                                                        defaultCity={generalForm.city}
                                                        initial={
                                                          generalForm.latitude != null && generalForm.longitude != null
                                                            ? { lat: generalForm.latitude, lon: generalForm.longitude }
                                                            : undefined
                                                        }
                                                        onChange={(coords, addressText) =>
                                                          setGeneralForm((prev) => ({
                                                            ...prev,
                                                            latitude: coords.lat,
                                                            longitude: coords.lon,
                                                            ...(addressText ? { address: addressText } : {}),
                                                          }))
                                                        }
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex justify-end pt-6">
                                            <button
                                                onClick={handleUpdateGeneral}
                                                className="bg-[#c9825b] text-white px-6 py-2.5 rounded-2xl font-bold hover:bg-[#b07350] hover:shadow-lg hover:shadow-[#c9825b]/20 hover:scale-105 transition-all duration-200 active:scale-95"
                                            >
                                                Сохранить
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                        {aboutSection === 'CONTACTS' && (
                          <div className="space-y-8">
                              {/* Personal Info Card */}
                              <div className="bg-gray-50 rounded-3xl p-6 border border-gray-100">
                                  <div className="flex items-center gap-3 mb-6">
                                      <div className="p-2.5 bg-white rounded-2xl shadow-sm">
                                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="#c9825b" className="w-6 h-6">
                                              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                                          </svg>
                                      </div>
                                      <div>
                                          <h3 className="text-lg font-bold text-gray-900">Личные данные</h3>
                                          <p className="text-sm text-gray-500">Ваша контактная информация для связи</p>
                                      </div>
                                  </div>

                                  <div className="flex flex-col gap-3">
                                      {/* Name */}
                                      <div className="bg-white p-5 rounded-2xl border border-gray-100 group hover:border-[#c9825b]/30 transition-all shadow-sm">
                                          <div className="flex justify-between items-center">
                                              <div className="flex items-center gap-4">
                                                  <div className="w-10 h-10 rounded-xl bg-[#c9825b]/5 flex items-center justify-center text-[#c9825b]">
                                                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                                                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                                                      </svg>
                                                  </div>
                                                  <div>
                                                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Имя и Фамилия</p>
                                                      <p className="text-gray-900 font-bold text-base leading-tight break-all">
                                                          {profile.first_name} {profile.last_name}
                                                      </p>
                                                  </div>
                                              </div>
                                              <button 
                                                  onClick={() => startEditing('NAME')}
                                                  className="p-2.5 text-gray-400 hover:text-[#c9825b] hover:bg-[#fff5f0] rounded-xl transition-all flex-shrink-0"
                                              >
                                                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                                                      <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                                                  </svg>
                                              </button>
                                          </div>
                                      </div>

                                      {/* Phone */}
                                      <div className="bg-white p-5 rounded-2xl border border-gray-100 group hover:border-[#c9825b]/30 transition-all shadow-sm">
                                          <div className="flex justify-between items-center">
                                              <div className="flex items-center gap-4">
                                                  <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center text-green-600">
                                                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                                                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H3.75A2.25 2.25 0 0 0 1.5 4.5v2.25Z" />
                                                      </svg>
                                                  </div>
                                                  <div>
                                                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Телефон</p>
                                                      <p className="text-gray-900 font-bold text-base leading-tight break-all">{profile.phone || 'Не указан'}</p>
                                                  </div>
                                              </div>
                                              <button 
                                                  onClick={() => startEditing('PHONE')}
                                                  className="p-2.5 text-gray-400 hover:text-[#c9825b] hover:bg-[#fff5f0] rounded-xl transition-all flex-shrink-0"
                                              >
                                                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                                                      <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                                                  </svg>
                                              </button>
                                          </div>
                                      </div>
                                  </div>
                              </div>

                              {/* Security Card */}
                              <div className="bg-gray-50 rounded-3xl p-6 border border-gray-100">
                                  <div className="flex items-center gap-3 mb-6">
                                      <div className="p-2.5 bg-white rounded-2xl shadow-sm">
                                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="#c9825b" className="w-6 h-6">
                                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751A11.959 11.959 0 0 1 12 2.714Z" />
                                          </svg>
                                      </div>
                                      <div>
                                          <h3 className="text-lg font-bold text-gray-900">Безопасность</h3>
                                          <p className="text-sm text-gray-500">Защита вашего аккаунта и сессии</p>
                                      </div>
                                  </div>

                                  <div className="flex flex-col gap-3">
                                      {/* Email */}
                                      <div className="bg-white p-5 rounded-2xl border border-gray-100 group hover:border-[#c9825b]/30 transition-all shadow-sm">
                                          <div className="flex items-center justify-between">
                                              <div className="flex items-center gap-4 min-w-0">
                                                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 flex-shrink-0">
                                                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                                                          <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
                                                      </svg>
                                                  </div>
                                                  <div className="min-w-0">
                                                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Email адрес</p>
                                                      <p className="text-gray-900 font-bold text-base leading-tight truncate">{profile.email}</p>
                                                  </div>
                                              </div>
                                              <button 
                                                  onClick={() => startEditing('EMAIL')}
                                                  className="p-2.5 text-gray-400 hover:text-[#c9825b] hover:bg-[#fff5f0] rounded-xl transition-all flex-shrink-0"
                                              >
                                                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                                                      <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                                                  </svg>
                                              </button>
                                          </div>
                                      </div>

                                      {/* Password */}
                                      <div className="bg-white p-5 rounded-2xl border border-gray-100 group hover:border-[#c9825b]/30 transition-all shadow-sm">
                                          <div className="flex items-center justify-between">
                                              <div className="flex items-center gap-4 min-w-0">
                                                  <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600 flex-shrink-0">
                                                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                                                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1 1 21.75 8.25Z" />
                                                      </svg>
                                                  </div>
                                                  <div className="min-w-0">
                                                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Пароль</p>
                                                      <p className="text-gray-900 font-bold text-base leading-tight">••••••••</p>
                                                  </div>
                                              </div>
                                              <button 
                                                  onClick={() => setIsPasswordModalOpen(true)}
                                                  className="p-2.5 text-gray-400 hover:text-[#c9825b] hover:bg-[#fff5f0] rounded-xl transition-all flex-shrink-0"
                                              >
                                                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                                                      <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                                                  </svg>
                                              </button>
                                          </div>
                                      </div>

                                      {/* 2FA */}
                                      <div className="bg-white p-5 rounded-2xl border border-gray-100 group hover:border-[#c9825b]/30 transition-all shadow-sm">
                                          <div className="flex items-center justify-between">
                                              <div className="flex items-center gap-4 min-w-0">
                                                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${profile.is_2fa_enabled ? 'bg-green-50 text-green-600' : 'bg-gray-50 text-gray-400'}`}>
                                                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                                                          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 0 0 6 3.75v16.5a2.25 2.25 0 0 0 2.25 2.25h7.5A2.25 2.25 0 0 0 18 20.25V3.75a2.25 2.25 0 0 0-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
                                                      </svg>
                                                  </div>
                                                  <div className="min-w-0">
                                                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5 text-wrap">Двухфакторная аутентификация</p>
                                                      <p className={`font-bold text-base leading-tight ${profile.is_2fa_enabled ? 'text-green-600' : 'text-gray-500'}`}>
                                                          {profile.is_2fa_enabled ? 'Активна' : 'Выключена'}
                                                      </p>
                                                  </div>
                                              </div>
                                              <button 
                                                  onClick={handleToggle2FA}
                                                  className={`p-2.5 rounded-xl transition-all flex-shrink-0 ${
                                                      profile.is_2fa_enabled 
                                                      ? 'text-red-600 hover:bg-red-50' 
                                                      : 'text-gray-400 hover:text-[#c9825b] hover:bg-[#fff5f0]'
                                                  }`}
                                              >
                                                  {profile.is_2fa_enabled ? (
                                                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                                                          <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 0 0 5.636 5.636m12.728 12.728A9 9 0 0 1 5.636 5.636m12.728 12.728L5.636 5.636" />
                                                      </svg>
                                                  ) : (
                                                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                                                          <path strokeLinecap="round" strokeLinejoin="round" d="M5.636 5.636a9 9 0 1 0 12.728 0M12 3v9" />
                                                      </svg>
                                                  )}
                                              </button>
                                          </div>
                                      </div>

                                      {/* Devices */}
                                      <div className="bg-white p-5 rounded-2xl border border-gray-100 group hover:border-[#c9825b]/30 transition-all shadow-sm">
                                          <div className="flex items-center justify-between">
                                              <div className="flex items-center gap-4 min-w-0">
                                                  <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600 flex-shrink-0">
                                                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                                                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 0 1-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0 1 15 18.257V17.25m6-12V15a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 15V5.25m18 0A2.25 2.25 0 0 0 18.75 3H5.25A2.25 2.25 0 0 0 3 5.25m18 0V12a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 12V5.25" />
                                                      </svg>
                                                  </div>
                                                  <div className="min-w-0">
                                                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Активные сессии</p>
                                                      <p className="text-gray-900 font-bold text-base leading-tight">Устройства</p>
                                                  </div>
                                              </div>
                                              <button 
                                                  onClick={loadDevices}
                                                  className="p-2.5 text-gray-400 hover:text-[#c9825b] hover:bg-[#fff5f0] rounded-xl transition-all flex-shrink-0"
                                              >
                                                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                                                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.644C3.542 4.633 9.268 2 12 2s8.458 2.633 9.964 9.678c.066.31.066.644 0 .954C20.458 19.367 14.732 22 12 22s-8.458-2.633-9.964-9.678Z" />
                                                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                                                  </svg>
                                              </button>
                                          </div>
                                      </div>
                                  </div>
                              </div>

                              {/* Modals for editing */}
                              {editingField === 'NAME' && (
                                  <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                                      <div className="bg-white p-8 rounded-3xl w-full max-w-md shadow-2xl animate-in fade-in zoom-in duration-200">
                                          <h3 className="text-2xl font-bold mb-2 text-[#4b2f23]">Изменение имени</h3>
                                          <p className="text-gray-500 mb-6">Введите ваши актуальные данные</p>
                                          
                                          <div className="space-y-4">
                                              <div className="space-y-1.5">
                                                  <label className="text-sm font-bold text-gray-700 ml-1">Имя</label>
                                                  <input 
                                                      value={editValue} 
                                                      onChange={e => setEditValue(e.target.value)} 
                                                      placeholder="Имя"
                                                      className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 focus:ring-2 focus:ring-[#c9825b] focus:border-transparent outline-none transition-all"
                                                  />
                                              </div>
                                              <div className="space-y-1.5">
                                                  <label className="text-sm font-bold text-gray-700 ml-1">Фамилия</label>
                                                  <input 
                                                      value={editValueLastName} 
                                                      onChange={e => setEditValueLastName(e.target.value)} 
                                                      placeholder="Фамилия"
                                                      className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 focus:ring-2 focus:ring-[#c9825b] focus:border-transparent outline-none transition-all"
                                                  />
                                              </div>
                                              <div className="flex gap-3 mt-8">
                                                  <button 
                                                      onClick={() => setEditingField(null)} 
                                                      className="flex-1 py-3 font-bold rounded-2xl border border-gray-200 hover:bg-gray-50 transition-all"
                                                  >
                                                      Отмена
                                                  </button>
                                                  <button 
                                                      onClick={handleSimpleUpdateName} 
                                                      className="flex-1 py-3 font-bold rounded-2xl bg-[#c9825b] text-white hover:bg-[#b07350] shadow-lg shadow-[#c9825b]/20 transition-all"
                                                  >
                                                      Сохранить
                                                  </button>
                                              </div>
                                          </div>
                                      </div>
                                  </div>
                              )}

                              {(editingField === 'EMAIL' || editingField === 'PHONE') && (
                                  <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                                      <div className="bg-white p-8 rounded-3xl w-full max-w-md shadow-2xl animate-in fade-in zoom-in duration-200">
                                          <h3 className="text-2xl font-bold mb-2 text-[#4b2f23] font-serif">
                                              {editingField === 'EMAIL' ? 'Смена Email адреса' : 'Смена номера телефона'}
                                          </h3>
                                          <p className="text-gray-500 mb-6 text-sm">
                                              {editStep === 'INPUT' 
                                                  ? (editingField === 'EMAIL' 
                                                      ? 'Введите новый Email. Мы отправим код подтверждения.' 
                                                      : 'Введите новый номер телефона. Изменение требует подтверждения через код, отправленный на вашу почту.') 
                                                  : 'Введите код подтверждения из сообщения.'}
                                          </p>
                                          
                                          <div className="space-y-4">
                                              {editStep === 'INPUT' ? (
                                                  <>
                                                      <div className="space-y-1.5">
                                                          <label className="text-sm font-bold text-gray-700 ml-1">
                                                              {editingField === 'EMAIL' ? 'Новый Email' : 'Новый номер телефона'}
                                                          </label>
                                                          {editingField === 'PHONE' ? (
                                                              <div className="rounded-2xl border border-gray-200 bg-gray-50 focus-within:ring-2 focus-within:ring-[#c9825b] focus-within:border-transparent transition-all overflow-hidden px-4">
                                                                  <PhoneInput
                                                                      international
                                                                      defaultCountry="RU"
                                                                      value={editValue}
                                                                      onChange={(val) => setEditValue(val || '')}
                                                                      className="w-full bg-transparent py-3 outline-none text-gray-900 font-medium"
                                                                      placeholder="+7 (999) 000-00-00"
                                                                  />
                                                              </div>
                                                          ) : (
                                                              <input 
                                                                  value={editValue} 
                                                                  onChange={e => setEditValue(e.target.value)} 
                                                                  type="email"
                                                                  className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 focus:ring-2 focus:ring-[#c9825b] focus:border-transparent outline-none transition-all"
                                                                  placeholder="example@mail.com"
                                                              />
                                                          )}
                                                      </div>
                                                      <div className="flex gap-3 mt-8">
                                                          <button 
                                                              onClick={() => setEditingField(null)} 
                                                              className="flex-1 py-3 font-bold rounded-2xl border border-gray-200 hover:bg-gray-50 transition-all text-gray-700"
                                                          >
                                                              Отмена
                                                          </button>
                                                          <button 
                                                              onClick={handleRequestCode} 
                                                              className="flex-1 py-3 font-bold rounded-2xl bg-[#c9825b] text-white hover:bg-[#b07350] shadow-lg shadow-[#c9825b]/20 transition-all"
                                                          >
                                                              {editingField === 'PHONE' ? 'Получить код' : 'Отправить код'}
                                                          </button>
                                                      </div>
                                                  </>
                                              ) : (
                                                  <>
                                                      <div className="bg-[#fff5f0] p-4 rounded-2xl border border-[#ffdccb] mb-4">
                                                          <p className="text-sm text-[#4b2f23] leading-relaxed">
                                                              Мы отправили код подтверждения на ваш <strong>текущий email</strong>. 
                                                              Проверьте почту.
                                                          </p>
                                                      </div>
                                                      <div className="space-y-1.5">
                                                          <label className="text-sm font-bold text-gray-700 ml-1">Код подтверждения</label>
                                                          <input 
                                                              value={verifyCode} 
                                                              onChange={e => setVerifyCode(e.target.value)} 
                                                              placeholder="000000"
                                                              className="w-full border-2 border-gray-100 rounded-2xl px-4 py-4 text-center tracking-[0.5em] text-2xl font-bold focus:ring-2 focus:ring-[#c9825b] focus:border-transparent outline-none transition-all"
                                                          />
                                                      </div>
                                                      <div className="flex gap-3 mt-8">
                                                          <button 
                                                              onClick={() => setEditingField(null)} 
                                                              className="flex-1 py-3 font-bold rounded-2xl border border-gray-200 hover:bg-gray-50 transition-all"
                                                          >
                                                              Отмена
                                                          </button>
                                                          <button 
                                                              onClick={handleConfirmCode} 
                                                              className="flex-1 py-3 font-bold rounded-2xl bg-[#c9825b] text-white hover:bg-[#b07350] shadow-lg shadow-[#c9825b]/20 transition-all"
                                                          >
                                                              Подтвердить
                                                          </button>
                                                      </div>
                                                  </>
                                              )}
                                          </div>
                                      </div>
                                  </div>
                              )}
                          </div>
                      )}

                      {aboutSection === 'WORKING_MODE' && (
                          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                  <div>
                                      <h3 className="text-2xl font-bold text-gray-900">Режим работы</h3>
                                      <p className="text-sm text-gray-500 mt-1">Настройте график работы вашего магазина на каждый день недели.</p>
                                  </div>
                                  <button
                                      onClick={handleUpdateWeeklySchedule}
                                      disabled={scheduleSaving}
                                      className="bg-[#c9825b] text-white px-6 py-2.5 rounded-2xl font-bold hover:bg-[#b07350] hover:scale-105 transition-all disabled:opacity-60 shadow-lg shadow-[#c9825b]/20 flex items-center justify-center gap-2 active:scale-95"
                                  >
                                      {scheduleSaving ? (
                                          <div className="w-4 h-4 border-2 border-white/30 border-t-transparent rounded-full animate-spin" />
                                      ) : (
                                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                                              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                                          </svg>
                                      )}
                                      {scheduleSaving ? 'Сохранение...' : 'Сохранить'}
                                  </button>
                              </div>

                              <div className="grid grid-cols-1 gap-4">
                                  {normalizeWeeklySchedule(weeklyScheduleForm).map((day) => {
                                      const meta = WEEK_DAYS.find((d) => d.key === day.day);
                                      const isActive = day.is_247 || (day.intervals && day.intervals.length > 0);
                                      
                                      return (
                                          <div
                                              key={day.day}
                                              className={`bg-white rounded-3xl p-5 border transition-all duration-300 group flex flex-col ${
                                                  isActive 
                                                  ? 'border-[#c9825b]/20 shadow-sm bg-[#fffdfc]' 
                                                  : 'border-gray-100 hover:border-gray-200 shadow-sm'
                                              }`}
                                          >
                                              <div className="flex items-start justify-between gap-4 mb-5">
                                                  <div className="flex items-center gap-3">
                                                      <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-sm transition-all duration-300 flex-shrink-0 ${
                                                          isActive 
                                                          ? 'bg-[#c9825b] text-white shadow-lg shadow-[#c9825b]/20' 
                                                          : 'bg-gray-50 text-gray-400'
                                                      }`}>
                                                          {meta?.short}
                                                      </div>
                                                      <div className="min-w-0">
                                                          <div className="font-bold text-gray-900 text-base leading-tight truncate">
                                                              {meta?.label}
                                                          </div>
                                                          <div className={`text-[10px] font-black uppercase tracking-widest mt-0.5 ${isActive ? 'text-[#c9825b]' : 'text-gray-400'}`}>
                                                              {isActive ? (day.is_247 ? 'Круглосуточно' : 'По расписанию') : 'Выходной'}
                                                          </div>
                                                      </div>
                                                  </div>
                                                  
                                                  <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                                                      <span className="text-[9px] font-black text-gray-400 uppercase tracking-tighter">Круглосуточно</span>
                                                      <label className="relative inline-flex items-center cursor-pointer">
                                                          <input
                                                              type="checkbox"
                                                              checked={day.is_247}
                                                              onChange={(e) => {
                                                                  const checked = e.target.checked;
                                                                  setWeeklyScheduleForm((prev) =>
                                                                      normalizeWeeklySchedule(prev).map((x) =>
                                                                          x.day === day.day
                                                                              ? { ...x, is_247: checked, intervals: checked ? [] : x.intervals }
                                                                              : x
                                                                      )
                                                                  );
                                                              }}
                                                              className="sr-only peer"
                                                          />
                                                          <div className="w-10 h-5 bg-gray-100 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-200 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#c9825b]"></div>
                                                      </label>
                                                  </div>
                                              </div>

                                              {!day.is_247 && (
                                                  <div className="space-y-3">
                                                      {(day.intervals || []).map((it, idx) => (
                                                          <div key={idx} className="flex items-center gap-2 animate-in fade-in slide-in-from-top-1 duration-200">
                                                              <div className="flex-1 grid grid-cols-2 gap-3">
                                                                  <div className="flex items-center gap-3 bg-white rounded-2xl px-4 py-2.5 border border-gray-100 shadow-sm focus-within:border-[#c9825b]/30 transition-all">
                                                                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">От</span>
                                                                      <input
                                                                          type="time"
                                                                          value={it.start}
                                                                          onChange={(e) => {
                                                                              const value = e.target.value;
                                                                              setWeeklyScheduleForm((prev) =>
                                                                                  normalizeWeeklySchedule(prev).map((x) => {
                                                                                      if (x.day !== day.day) return x;
                                                                                      const nextIntervals = [...(x.intervals || [])];
                                                                                      nextIntervals[idx] = { ...nextIntervals[idx], start: value };
                                                                                      return { ...x, intervals: nextIntervals };
                                                                                  })
                                                                              );
                                                                          }}
                                                                          className="w-full bg-transparent text-sm font-bold text-gray-900 outline-none"
                                                                      />
                                                                  </div>
                                                                  <div className="flex items-center gap-3 bg-white rounded-2xl px-4 py-2.5 border border-gray-100 shadow-sm focus-within:border-[#c9825b]/30 transition-all">
                                                                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">До</span>
                                                                      <input
                                                                          type="time"
                                                                          value={it.end}
                                                                          onChange={(e) => {
                                                                              const value = e.target.value;
                                                                              setWeeklyScheduleForm((prev) =>
                                                                                  normalizeWeeklySchedule(prev).map((x) => {
                                                                                      if (x.day !== day.day) return x;
                                                                                      const nextIntervals = [...(x.intervals || [])];
                                                                                      nextIntervals[idx] = { ...nextIntervals[idx], end: value };
                                                                                      return { ...x, intervals: nextIntervals };
                                                                                  })
                                                                              );
                                                                          }}
                                                                          className="w-full bg-transparent text-sm font-bold text-gray-900 outline-none"
                                                                      />
                                                                  </div>
                                                              </div>
                                                              <button
                                                                  type="button"
                                                                  onClick={() => {
                                                                      setWeeklyScheduleForm((prev) =>
                                                                          normalizeWeeklySchedule(prev).map((x) => {
                                                                              if (x.day !== day.day) return x;
                                                                              const nextIntervals = [...(x.intervals || [])];
                                                                              nextIntervals.splice(idx, 1);
                                                                              return { ...x, intervals: nextIntervals };
                                                                          })
                                                                      );
                                                                  }}
                                                                  className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                                              >
                                                                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                                                                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                                                                  </svg>
                                                              </button>
                                                          </div>
                                                      ))}

                                                      <button
                                                          type="button"
                                                          onClick={() => {
                                                              setWeeklyScheduleForm((prev) =>
                                                                  normalizeWeeklySchedule(prev).map((x) => {
                                                                      if (x.day !== day.day) return x;
                                                                      const nextIntervals = [...(x.intervals || []), { start: '09:00', end: '18:00' }];
                                                                      return { ...x, intervals: nextIntervals };
                                                                  })
                                                              );
                                                          }}
                                                          className={`w-full py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all duration-200 flex items-center justify-center gap-2 border-2 border-dashed ${
                                                              isActive 
                                                              ? 'bg-white border-[#c9825b]/20 text-[#c9825b] hover:bg-[#fff5f0]' 
                                                              : 'bg-gray-50/50 border-gray-100 text-gray-400 hover:bg-gray-50 hover:border-gray-200'
                                                          }`}
                                                      >
                                                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-3.5 h-3.5">
                                                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                                                          </svg>
                                                          Добавить интервал
                                                      </button>
                                                  </div>
                                              )}
                                              
                                              {!day.is_247 && (!day.intervals || day.intervals.length === 0) && (
                                                  <div className="mt-auto pt-2">
                                                      <div className="flex items-center gap-3 p-3 bg-gray-50/50 rounded-2xl border border-dashed border-gray-100 opacity-60">
                                                          <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center text-gray-300 flex-shrink-0">
                                                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                                                                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                                                              </svg>
                                                          </div>
                                                          <div className="min-w-0">
                                                              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">Выходной</p>
                                                              <p className="text-[9px] text-gray-400 mt-1 truncate">Магазин будет закрыт</p>
                                                          </div>
                                                      </div>
                                                  </div>
                                              )}
                                          </div>
                                      );
                                  })}
                              </div>
                          </div>
                      )}
                  </div>
                )}
                
                {activeSubTab === 'DELIVERY' && (
                  <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <h3 className="text-2xl font-bold text-gray-900">Доставка</h3>
                        <p className="text-sm text-gray-500 mt-1">
                          Настройте зоны доставки, стоимость и ориентировочное время.
                        </p>
                      </div>

                      <button
                        onClick={async () => {
                          if (deliverySaving) return;
                          const token = getCookie("accessToken");
                          if (!token) return;

                          const normalizedZones = normalizeDeliveryZones(deliveryZonesForm, profile).map((z) => ({
                            name: String(z.name || ''),
                            radius_km: toNumber(z.radius_km, 10),
                            price_to_building: Math.max(0, toNumber(z.price_to_building, 0)),
                            price_to_door: Math.max(0, toNumber(z.price_to_door, 0)),
                            time_minutes: Math.max(1, Math.floor(toNumber(z.time_minutes, 60))),
                          }));

                          const normalizedRules = normalizeDeliveryPricingRules(deliveryPricingRulesForm).map((r) => ({
                            start: String(r.start || ''),
                            end: String(r.end || ''),
                            surcharge: Math.max(0, toNumber(r.surcharge, 0)),
                          }));

                          try {
                            setDeliverySaving(true);
                            const updated = await updateProfile(
                              { delivery_zones: normalizedZones, delivery_pricing_rules: normalizedRules } as any,
                              token
                            );
                            setProfile(updated);
                            setDeliveryZonesForm(normalizeDeliveryZones((updated as any).delivery_zones, updated));
                            setDeliveryPricingRulesForm(normalizeDeliveryPricingRules((updated as any).delivery_pricing_rules));
                            onProfileUpdated?.(updated);
                            alert("Доставка сохранена");
                          } catch (e) {
                            handleError(e, "Ошибка сохранения");
                          } finally {
                            setDeliverySaving(false);
                          }
                        }}
                        disabled={deliverySaving}
                        className="bg-[#c9825b] text-white px-6 py-2.5 rounded-2xl font-bold hover:bg-[#b07350] hover:scale-105 transition-all disabled:opacity-60 shadow-lg shadow-[#c9825b]/20 flex items-center justify-center gap-2 active:scale-95"
                      >
                        {deliverySaving ? (
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                            </svg>
                        )}
                        {deliverySaving ? 'Сохранение...' : 'Сохранить'}
                      </button>
                    </div>

                    <div className="space-y-8">
                      {/* Delivery Zones and Surcharges */}
                      <div className="space-y-8">
                        {/* Zones Card */}
                        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
                          <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-[#fff5f0] flex items-center justify-center text-[#c9825b]">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.446 1.972.473a2.25 2.25 0 0 0 2.508-1.493l.873-2.555a2.25 2.25 0 0 0-1.676-2.902l-1.972-.473a2.25 2.25 0 0 0-2.508 1.493l-.873 2.555a2.25 2.25 0 0 0 1.676 2.902Z" />
                                    </svg>
                                </div>
                                <h4 className="text-lg font-bold text-gray-900">Зоны доставки</h4>
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsZonesModalOpen(true)}
                                    className="px-5 py-2.5 bg-white text-gray-600 hover:text-[#c9825b] border border-gray-100 hover:border-[#c9825b]/20 rounded-2xl font-bold text-sm transition-all duration-300 flex items-center gap-2 shadow-sm"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.446 1.972.473a2.25 2.25 0 0 0 2.508-1.493l.873-2.555a2.25 2.25 0 0 0-1.676-2.902l-1.972-.473a2.25 2.25 0 0 0-2.508 1.493l-.873 2.555a2.25 2.25 0 0 0 1.676 2.902Z" />
                                    </svg>
                                    Показать на карте
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setDeliveryZonesForm((prev) => [
                                            ...(prev || []),
                                            {
                                                name: `Зона ${(prev?.length || 0) + 1}`,
                                                radius_km: 5,
                                                price_to_building: 0,
                                                price_to_door: 0,
                                                time_minutes: 60,
                                            },
                                        ]);
                                    }}
                                    className="px-5 py-2.5 bg-[#fff5f0] text-[#c9825b] hover:bg-[#c9825b] hover:text-white rounded-2xl font-bold text-sm transition-all duration-300 flex items-center gap-2 shadow-sm"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                                    </svg>
                                    Добавить зону
                                </button>
                            </div>
                          </div>

                          <div className="space-y-6">
                            {(deliveryZonesForm || []).length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-16 text-center bg-gray-50/50 rounded-[2.5rem] border-2 border-dashed border-gray-100">
                                    <div className="w-16 h-16 rounded-3xl bg-white flex items-center justify-center text-gray-300 mb-4 shadow-sm">
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.446 1.972.473a2.25 2.25 0 0 0 2.508-1.493l.873-2.555a2.25 2.25 0 0 0-1.676-2.902l-1.972-.473a2.25 2.25 0 0 0-2.508 1.493l-.873 2.555a2.25 2.25 0 0 0 1.676 2.902Z" />
                                        </svg>
                                    </div>
                                    <p className="text-gray-400 font-bold uppercase tracking-widest text-sm">Зоны доставки не настроены</p>
                                    <p className="text-gray-400 text-xs mt-1">Добавьте хотя бы одну зону для начала работы</p>
                                </div>
                            ) : (
                                (deliveryZonesForm || []).map((z, idx) => (
                                    <div
                                        key={idx}
                                        className="bg-white rounded-[2rem] p-8 border border-gray-100 shadow-sm transition-all duration-300 hover:shadow-xl hover:shadow-gray-200/40 group relative"
                                    >
                                        <div className="flex items-center justify-between gap-6 mb-10">
                                            <div className="flex-1">
                                                <input
                                                    value={z.name}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        setDeliveryZonesForm((prev) => {
                                                            const next = [...(prev || [])];
                                                            next[idx] = { ...next[idx], name: val };
                                                            return next;
                                                        });
                                                    }}
                                                    placeholder="Название зоны"
                                                    className="w-full bg-transparent border-none p-0 text-xl font-black text-gray-900 focus:ring-0 placeholder:text-gray-200 transition-all"
                                                />
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setDeliveryZonesForm((prev) => {
                                                        const next = [...(prev || [])];
                                                        next.splice(idx, 1);
                                                        return next;
                                                    });
                                                }}
                                                className="w-14 h-14 flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all"
                                                aria-label="Удалить зону"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-8 h-8">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                                                </svg>
                                            </button>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                                            {/* Радиус */}
                                            <div className="space-y-3">
                                                <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Радиус</label>
                                                <div className="flex items-center gap-4 bg-gray-50/80 rounded-[1.25rem] px-6 py-4 border border-transparent focus-within:border-[#c9825b]/20 focus-within:bg-white focus-within:shadow-sm transition-all">
                                                    <input
                                                        type="number"
                                                        step="0.5"
                                                        min="0.5"
                                                        value={z.radius_km}
                                                        onChange={(e) => {
                                                            const val = e.target.value;
                                                            setDeliveryZonesForm((prev) => {
                                                                const next = [...(prev || [])];
                                                                next[idx] = { ...next[idx], radius_km: val as any };
                                                                return next;
                                                            });
                                                        }}
                                                        className="w-full bg-transparent border-none p-0 text-lg font-bold text-gray-900 focus:ring-0"
                                                    />
                                                    <span className="text-gray-400 font-bold text-sm">км</span>
                                                </div>
                                            </div>

                                            {/* Время доставки */}
                                            <div className="space-y-3">
                                                <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Время доставки</label>
                                                <div className="flex items-center gap-4 bg-gray-50/80 rounded-[1.25rem] px-6 py-4 border border-transparent focus-within:border-[#c9825b]/20 focus-within:bg-white focus-within:shadow-sm transition-all">
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        value={z.time_minutes}
                                                        onChange={(e) => {
                                                            const val = e.target.value;
                                                            setDeliveryZonesForm((prev) => {
                                                                const next = [...(prev || [])];
                                                                next[idx] = { ...next[idx], time_minutes: val as any };
                                                                return next;
                                                            });
                                                        }}
                                                        className="w-full bg-transparent border-none p-0 text-lg font-bold text-gray-900 focus:ring-0"
                                                    />
                                                    <span className="text-gray-400 font-bold text-sm">мин</span>
                                                </div>
                                            </div>

                                            {/* До подъезда */}
                                            <div className="space-y-3">
                                                <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">До подъезда</label>
                                                <div className="flex items-center gap-4 bg-gray-50/80 rounded-[1.25rem] px-6 py-4 border border-transparent focus-within:border-[#c9825b]/20 focus-within:bg-white focus-within:shadow-sm transition-all">
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        step="10"
                                                        value={z.price_to_building}
                                                        onChange={(e) => {
                                                            const val = e.target.value;
                                                            setDeliveryZonesForm((prev) => {
                                                                const next = [...(prev || [])];
                                                                next[idx] = { ...next[idx], price_to_building: val as any };
                                                                return next;
                                                            });
                                                        }}
                                                        className="w-full bg-transparent border-none p-0 text-lg font-bold text-gray-900 focus:ring-0"
                                                    />
                                                    <span className="text-gray-400 font-bold text-sm">₽</span>
                                                </div>
                                            </div>

                                            {/* До двери */}
                                            <div className="space-y-3">
                                                <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">До двери</label>
                                                <div className="flex items-center gap-4 bg-gray-50/80 rounded-[1.25rem] px-6 py-4 border border-transparent focus-within:border-[#c9825b]/20 focus-within:bg-white focus-within:shadow-sm transition-all">
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        step="10"
                                                        value={z.price_to_door}
                                                        onChange={(e) => {
                                                            const val = e.target.value;
                                                            setDeliveryZonesForm((prev) => {
                                                                const next = [...(prev || [])];
                                                                next[idx] = { ...next[idx], price_to_door: val as any };
                                                                return next;
                                                            });
                                                        }}
                                                        className="w-full bg-transparent border-none p-0 text-lg font-bold text-gray-900 focus:ring-0"
                                                    />
                                                    <span className="text-gray-400 font-bold text-sm">₽</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                          </div>
                        </div>

                        {/* Surcharges Card */}
                        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
                          <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-[#fff5f0] flex items-center justify-center text-[#c9825b]">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                                    </svg>
                                </div>
                                <h4 className="text-lg font-bold text-gray-900">Надбавки по времени</h4>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setDeliveryPricingRulesForm((prev) => [
                                  ...(prev || []),
                                  { start: '18:00', end: '22:00', surcharge: 50 },
                                ]);
                              }}
                              className="text-sm font-bold text-[#c9825b] hover:text-[#b07350] bg-[#fff5f0] px-4 py-2 rounded-xl transition-all flex items-center gap-1"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                              </svg>
                              Добавить надбавку
                            </button>
                          </div>

                          <div className="space-y-3">
                            {(deliveryPricingRulesForm || []).length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-8 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                                    <p className="text-gray-500">Надбавок нет</p>
                                </div>
                            ) : (
                                (deliveryPricingRulesForm || []).map((r, idx) => (
                                    <div key={idx} className="flex flex-wrap items-center gap-4 bg-gray-50 rounded-2xl p-4 border border-gray-100 transition-all hover:bg-white hover:shadow-sm">
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="time"
                                                value={r.start}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    setDeliveryPricingRulesForm((prev) => {
                                                        const next = [...(prev || [])];
                                                        next[idx] = { ...next[idx], start: val };
                                                        return next;
                                                    });
                                                }}
                                                className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm font-bold text-gray-900 focus:ring-2 focus:ring-[#c9825b] outline-none transition-all"
                                            />
                                            <span className="text-gray-400 font-bold">—</span>
                                            <input
                                                type="time"
                                                value={r.end}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    setDeliveryPricingRulesForm((prev) => {
                                                        const next = [...(prev || [])];
                                                        next[idx] = { ...next[idx], end: val };
                                                        return next;
                                                    });
                                                }}
                                                className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm font-bold text-gray-900 focus:ring-2 focus:ring-[#c9825b] outline-none transition-all"
                                            />
                                        </div>
                                        
                                        <div className="flex items-center gap-3">
                                            <div className="relative">
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="10"
                                                    value={r.surcharge}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        setDeliveryPricingRulesForm((prev) => {
                                                            const next = [...(prev || [])];
                                                            next[idx] = { ...next[idx], surcharge: val as any };
                                                            return next;
                                                        });
                                                    }}
                                                    className="w-24 bg-white border border-gray-200 rounded-xl px-4 py-2 text-sm font-bold text-gray-900 focus:ring-2 focus:ring-[#c9825b] outline-none transition-all"
                                                />
                                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold">₽</span>
                                            </div>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => {
                                                setDeliveryPricingRulesForm((prev) => {
                                                    const next = [...(prev || [])];
                                                    next.splice(idx, 1);
                                                    return next;
                                                });
                                            }}
                                            className="ml-auto p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                            aria-label="Удалить надбавку"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                                            </svg>
                                        </button>
                                    </div>
                                ))
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Bottom Section: Pickup */}
                      <div className="max-w-2xl">
                        {/* Pickup Card */}
                        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-[#fff5f0] flex items-center justify-center text-[#c9825b]">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 0 1 .75-.75h3a.75.75 0 0 1 .75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349M3.75 21V9.349m0 0a2.25 2.25 0 0 0 2.25-2.25V4.65a2.25 2.25 0 0 1 2.25-2.25h6.75a2.25 2.25 0 0 1 2.25 2.25v2.449a2.25 2.25 0 0 0 2.25 2.25m-16.5 0a2.25 2.25 0 0 1 2.25-2.25h16.5a2.25 2.25 0 0 1 2.25 2.25" />
                                    </svg>
                                </div>
                                <h4 className="text-lg font-bold text-gray-900">Самовывоз</h4>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={Boolean((profile as any).pickup_enabled)}
                                    onChange={async () => {
                                        if (pickupSaving) return;
                                        const token = getCookie("accessToken");
                                        if (!token) return;
                                        const next = !Boolean((profile as any).pickup_enabled);
                                        try {
                                            setPickupSaving(true);
                                            const updated = await updateProfile({ pickup_enabled: next } as any, token);
                                            setProfile(updated);
                                            onProfileUpdated?.(updated);
                                        } catch (e) {
                                            handleError(e, "Ошибка сохранения");
                                        } finally {
                                            setPickupSaving(false);
                                        }
                                    }}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#c9825b]"></div>
                            </label>
                          </div>
                          
                          <p className="text-sm text-gray-500 mb-6">
                            Позволяет покупателям забирать заказы самостоятельно из вашего магазина.
                          </p>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className={`p-4 rounded-2xl border transition-all h-full flex flex-col justify-center ${
                                (profile as any).pickup_enabled 
                                  ? 'bg-[#fff5f0] border-[#c9825b]/20 text-[#c9825b]' 
                                  : 'bg-gray-50 border-gray-100 text-gray-500'
                            }`}>
                              <div className="flex items-center gap-2 font-bold text-sm">
                                  <div className={`w-2 h-2 rounded-full ${ (profile as any).pickup_enabled ? 'bg-[#c9825b] animate-pulse' : 'bg-gray-400' }`} />
                                  {(profile as any).pickup_enabled ? 'Самовывоз активен' : 'Самовывоз отключен'}
                              </div>
                            </div>

                            <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                                <div className="flex items-center gap-2 mb-1">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5 text-gray-400">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
                                    </svg>
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Адрес самовывоза</span>
                                </div>
                                <div className="text-sm font-bold text-gray-900 leading-tight">
                                    {generalForm.address || 'Адрес не указан в профиле'}
                                </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeSubTab === 'REQUISITES' && (
                  <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <h3 className="text-2xl font-bold text-gray-900">Реквизиты</h3>
                        <p className="text-sm text-gray-500 mt-1">
                          Укажите юридическую информацию о вашем бизнесе для работы на платформе.
                        </p>
                      </div>

                      <button
                        onClick={async () => {
                          if (requisitesSaving) return;
                          const token = getCookie("accessToken");
                          if (!token) return;

                          try {
                            setRequisitesSaving(true);
                            const updated = await updateProfile({ requisites: requisitesForm } as any, token);
                            setProfile(updated);
                            setRequisitesForm(updated.requisites || { legal_status: '' });
                            onProfileUpdated?.(updated);
                            alert("Реквизиты сохранены");
                          } catch (e) {
                            handleError(e, "Ошибка сохранения");
                          } finally {
                            setRequisitesSaving(false);
                          }
                        }}
                        disabled={requisitesSaving}
                        className="bg-[#c9825b] text-white px-6 py-2.5 rounded-2xl font-bold hover:bg-[#b07350] hover:scale-105 transition-all disabled:opacity-60 shadow-lg shadow-[#c9825b]/20 flex items-center justify-center gap-2 active:scale-95"
                      >
                        {requisitesSaving ? (
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                            </svg>
                        )}
                        {requisitesSaving ? 'Сохранение...' : 'Сохранить'}
                      </button>
                    </div>

                    <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Юридический статус</label>
                            <select
                                value={requisitesForm.legal_status || ''}
                                onChange={(e) => setRequisitesForm({ ...requisitesForm, legal_status: e.target.value })}
                                className="w-full bg-gray-50 rounded-2xl px-5 py-3.5 border border-transparent focus:border-[#c9825b]/20 focus:bg-white focus:shadow-sm transition-all outline-none text-gray-900 font-bold"
                            >
                                <option value="">Выберите статус</option>
                                <option value="ip_no_nds">ИП без НДС</option>
                                <option value="org_no_nds">Организация без НДС</option>
                                <option value="ip_nds">ИП с НДС</option>
                                <option value="org_nds">Организация с НДС</option>
                                <option value="self_employed">Самозанятый</option>
                                <option value="ip_npd">ИП на НПД</option>
                            </select>
                        </div>

                        {requisitesForm.legal_status && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-50">
                                {(() => {
                                    const status = requisitesForm.legal_status;
                                    const isOrg = status.startsWith('org_');
                                    const isIP = status.startsWith('ip_');
                                    const isSelf = status === 'self_employed';

                                    const fields = [
                                        { id: 'full_name', label: isOrg ? 'Полное наименование организации' : 'ФИО', placeholder: isOrg ? 'ООО "Ромашка"' : 'Иванов Иван Иванович' },
                                        { id: 'inn', label: 'ИНН', placeholder: isOrg ? '10 знаков' : '12 знаков' },
                                    ];

                                    if (isOrg) {
                                        fields.push({ id: 'kpp', label: 'КПП', placeholder: '9 знаков' });
                                        fields.push({ id: 'ogrn', label: 'ОГРН', placeholder: '13 знаков' });
                                        fields.push({ id: 'legal_address', label: 'Юридический адрес', placeholder: 'г. Москва, ...' });
                                    } else if (isIP || isSelf) {
                                        if (isIP) {
                                            fields.push({ id: 'ogrnip', label: 'ОГРНИП', placeholder: '15 знаков' });
                                        }
                                        fields.push({ id: 'registration_address', label: 'Адрес регистрации', placeholder: 'г. Москва, ...' });
                                    }

                                    // Common bank fields
                                     const bankFields = [
                                         { id: 'bank_name', label: 'Название банка', placeholder: 'ПАО Сбербанк' },
                                         { id: 'bic', label: 'БИК', placeholder: '044525225' },
                                         { id: 'checking_account', label: 'Расчетный счет', placeholder: '408...' },
                                         { id: 'correspondent_account', label: 'Корр. счет', placeholder: '301...' }
                                     ];

                                     return (
                                         <>
                                             {fields.map((field) => (
                                                 <div key={field.id} className="space-y-2">
                                                     <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{field.label}</label>
                                                     <input
                                                         type="text"
                                                         value={requisitesForm[field.id] || ''}
                                                         onChange={(e) => setRequisitesForm({ ...requisitesForm, [field.id]: e.target.value })}
                                                         placeholder={field.placeholder}
                                                         className="w-full bg-gray-50 rounded-2xl px-5 py-3.5 border border-transparent focus:border-[#c9825b]/20 focus:bg-white focus:shadow-sm transition-all outline-none text-gray-900 font-bold"
                                                     />
                                                 </div>
                                             ))}
                                             <div className="col-span-full pt-4 mt-2 border-t border-gray-50">
                                                 <h4 className="text-sm font-bold text-gray-900 mb-4">Банковские реквизиты</h4>
                                             </div>
                                             {bankFields.map((field) => (
                                                 <div key={field.id} className="space-y-2">
                                                     <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{field.label}</label>
                                                     <input
                                                         type="text"
                                                         value={requisitesForm[field.id] || ''}
                                                         onChange={(e) => setRequisitesForm({ ...requisitesForm, [field.id]: e.target.value })}
                                                         placeholder={field.placeholder}
                                                         className="w-full bg-gray-50 rounded-2xl px-5 py-3.5 border border-transparent focus:border-[#c9825b]/20 focus:bg-white focus:shadow-sm transition-all outline-none text-gray-900 font-bold"
                                                     />
                                                 </div>
                                             ))}
                                         </>
                                     );
                                 })()}
                             </div>
                        )}
                    </div>
                  </div>
                )}

                {activeSubTab === 'DOCUMENTS' && (
                  <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900">Документы</h3>
                      <p className="text-sm text-gray-500 mt-1">
                        Загрузите необходимые документы для подтверждения вашего бизнеса.
                      </p>
                    </div>

                    {!requisitesForm.legal_status ? (
                        <div className="bg-amber-50 border border-amber-100 p-6 rounded-3xl flex items-center gap-4">
                            <div className="p-3 bg-amber-100 rounded-2xl text-amber-600">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                                </svg>
                            </div>
                            <div>
                                <p className="font-bold text-amber-900">Сначала выберите юридический статус</p>
                                <p className="text-sm text-amber-700">Перейдите в раздел «Реквизиты» и укажите ваш юридический статус, чтобы мы знали, какие документы потребуются.</p>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {(() => {
                                const status = requisitesForm.legal_status;
                                const requiredDocs: { type: string; label: string; description: string }[] = [];
                                
                                if (status.startsWith('ip_')) {
                                    requiredDocs.push(
                                        { type: 'passport_main', label: 'Паспорт (основной разворот)', description: 'Скан-копия или качественное фото' },
                                        { type: 'passport_registration', label: 'Паспорт (прописка)', description: 'Скан-копия или качественное фото' },
                                        { type: 'inn_cert', label: 'Свидетельство ИНН', description: 'Свидетельство о постановке на учет' },
                                        { type: 'ogrnip_cert', label: 'Лист записи ЕГРИП', description: 'Свидетельство ОГРНИП или лист записи' }
                                    );
                                } else if (status.startsWith('org_')) {
                                    requiredDocs.push(
                                        { type: 'charter', label: 'Устав организации', description: 'Первая, последняя страницы и страницы с полномочиями директора' },
                                        { type: 'director_appointment', label: 'Приказ о назначении директора', description: 'Или решение единственного участника' },
                                        { type: 'inn_kpp_cert', label: 'Свидетельство ИНН/КПП', description: 'Скан оригинала' },
                                        { type: 'ogrn_cert', label: 'Лист записи ЕГРЮЛ', description: 'Свидетельство ОГРН или лист записи' }
                                    );
                                } else if (status === 'self_employed') {
                                    requiredDocs.push(
                                        { type: 'passport_main', label: 'Паспорт (основной разворот)', description: 'Скан-копия или качественное фото' },
                                        { type: 'passport_registration', label: 'Паспорт (прописка)', description: 'Скан-копия или качественное фото' },
                                        { type: 'self_employed_cert', label: 'Справка о постановке на учет', description: 'Справка из приложения «Мой налог» (КНД 1122035)' }
                                    );
                                }

                                return requiredDocs.map((doc) => {
                                    const uploaded = documentsForm.find(d => d.type === doc.type);
                                    const isUploading = uploadingDocType === doc.type;

                                    return (
                                        <div key={doc.type} className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4 hover:border-[#c9825b]/20 transition-all group">
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="space-y-1">
                                                    <h4 className="font-bold text-gray-900 group-hover:text-[#c9825b] transition-colors">{doc.label}</h4>
                                                    <p className="text-xs text-gray-400">{doc.description}</p>
                                                </div>
                                                {uploaded && (
                                                    <div className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                                        uploaded.status === 'APPROVED' ? 'bg-green-50 text-green-600' :
                                                        uploaded.status === 'REJECTED' ? 'bg-red-50 text-red-600' :
                                                        'bg-blue-50 text-blue-600'
                                                    }`}>
                                                        {uploaded.status === 'APPROVED' ? 'Одобрено' :
                                                         uploaded.status === 'REJECTED' ? 'Отклонено' :
                                                         'На проверке'}
                                                    </div>
                                                )}
                                            </div>

                                            {uploaded ? (
                                                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-2xl border border-transparent hover:border-gray-200 transition-all">
                                                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-[#c9825b] shadow-sm">
                                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                                                        </svg>
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-bold text-gray-900 truncate">{uploaded.name}</p>
                                                        <p className="text-[10px] text-gray-400">{new Date(uploaded.uploaded_at).toLocaleDateString()}</p>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <a href={uploaded.url} target="_blank" rel="noopener noreferrer" className="p-2 text-gray-400 hover:text-[#c9825b] transition-colors">
                                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                                                            </svg>
                                                        </a>
                                                        <button 
                                                            onClick={async () => {
                                                                const newDocs = documentsForm.filter(d => d.type !== doc.type);
                                                                setDocumentsForm(newDocs);
                                                                const token = getCookie("accessToken");
                                                                if (!token) return;
                                                                try {
                                                                    const updated = await updateProfile({ documents: newDocs } as any, token);
                                                                    setProfile(updated);
                                                                    onProfileUpdated?.(updated);
                                                                } catch (err) {
                                                                    handleError(err, "Ошибка удаления");
                                                                }
                                                            }}
                                                            className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                                                        >
                                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                                                            </svg>
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <label className={`flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-200 rounded-2xl hover:border-[#c9825b]/30 hover:bg-[#c9825b]/5 transition-all cursor-pointer ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}>
                                                    <input 
                                                        type="file" 
                                                        className="hidden" 
                                                        onChange={async (e) => {
                                                            const file = e.target.files?.[0];
                                                            if (!file) return;
                                                            const token = getCookie("accessToken");
                                                            if (!token) return;

                                                            try {
                                                                setUploadingDocType(doc.type);
                                                                const updated = await uploadDocument(file, doc.type, doc.label, token);
                                                                setProfile(updated);
                                                                setDocumentsForm(updated.documents || []);
                                                                onProfileUpdated?.(updated);
                                                            } catch (err) {
                                                                handleError(err, "Ошибка загрузки");
                                                            } finally {
                                                                setUploadingDocType(null);
                                                            }
                                                        }}
                                                    />
                                                    {isUploading ? (
                                                        <div className="w-6 h-6 border-2 border-[#c9825b]/30 border-t-[#c9825b] rounded-full animate-spin" />
                                                    ) : (
                                                        <>
                                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-gray-400 mb-2">
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
                                                            </svg>
                                                            <span className="text-xs font-bold text-gray-500">Загрузить файл</span>
                                                        </>
                                                    )}
                                                </label>
                                            )}
                                            {uploaded && uploaded.comment && (
                                                <div className="p-3 bg-red-50 rounded-xl text-[10px] text-red-600 border border-red-100">
                                                    <strong>Комментарий:</strong> {uploaded.comment}
                                                </div>
                                            )}
                                        </div>
                                    );
                                });
                            })()}
                        </div>
                    )}
                  </div>
                )}

                {activeSubTab === 'EMPLOYEES' && (
                  <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <h3 className="text-2xl font-bold text-gray-900">Сотрудники</h3>
                        <p className="text-sm text-gray-500 mt-1">
                          Управляйте списком сотрудников и их ролями.
                        </p>
                      </div>

                      <button
                        onClick={async () => {
                          if (employeesSaving) return;
                          const token = getCookie("accessToken");
                          if (!token) return;

                          try {
                            setEmployeesSaving(true);
                            const updated = await updateProfile({ employees: employeesForm } as any, token);
                            setProfile(updated);
                            setEmployeesForm(updated.employees || []);
                            onProfileUpdated?.(updated);
                            alert("Список сотрудников сохранен");
                          } catch (e) {
                            handleError(e, "Ошибка сохранения");
                          } finally {
                            setEmployeesSaving(false);
                          }
                        }}
                        disabled={employeesSaving}
                        className="bg-[#c9825b] text-white px-6 py-2.5 rounded-2xl font-bold hover:bg-[#b07350] hover:scale-105 transition-all disabled:opacity-60 shadow-lg shadow-[#c9825b]/20 flex items-center justify-center gap-2 active:scale-95"
                      >
                        {employeesSaving ? (
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                            </svg>
                        )}
                        {employeesSaving ? 'Сохранение...' : 'Сохранить'}
                      </button>
                    </div>

                    <div className="space-y-4">
                        {employeesForm.map((emp, idx) => (
                            <div key={idx} className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex flex-col md:flex-row gap-6 items-start">
                                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Имя</label>
                                        <input
                                            type="text"
                                            value={emp.name || ''}
                                            onChange={(e) => {
                                                const next = [...employeesForm];
                                                next[idx] = { ...next[idx], name: e.target.value };
                                                setEmployeesForm(next);
                                            }}
                                            className="w-full bg-gray-50 rounded-xl px-4 py-2 text-sm font-bold text-gray-900 outline-none focus:bg-white border border-transparent focus:border-[#c9825b]/20"
                                            placeholder="Имя сотрудника"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Роль</label>
                                        <select
                                            value={emp.role || ''}
                                            onChange={(e) => {
                                                const next = [...employeesForm];
                                                next[idx] = { ...next[idx], role: e.target.value };
                                                setEmployeesForm(next);
                                            }}
                                            className="w-full bg-gray-50 rounded-xl px-4 py-2 text-sm font-bold text-gray-900 outline-none focus:bg-white border border-transparent focus:border-[#c9825b]/20"
                                        >
                                            <option value="">Выберите роль</option>
                                            <option value="manager">Менеджер</option>
                                            <option value="chef">Повар</option>
                                            <option value="courier">Курьер</option>
                                            <option value="admin">Администратор</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Телефон</label>
                                        <input
                                            type="text"
                                            value={emp.phone || ''}
                                            onChange={(e) => {
                                                const next = [...employeesForm];
                                                next[idx] = { ...next[idx], phone: e.target.value };
                                                setEmployeesForm(next);
                                            }}
                                            className="w-full bg-gray-50 rounded-xl px-4 py-2 text-sm font-bold text-gray-900 outline-none focus:bg-white border border-transparent focus:border-[#c9825b]/20"
                                            placeholder="+7 (999) 000-00-00"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Email</label>
                                        <input
                                            type="email"
                                            value={emp.email || ''}
                                            onChange={(e) => {
                                                const next = [...employeesForm];
                                                next[idx] = { ...next[idx], email: e.target.value };
                                                setEmployeesForm(next);
                                            }}
                                            className="w-full bg-gray-50 rounded-xl px-4 py-2 text-sm font-bold text-gray-900 outline-none focus:bg-white border border-transparent focus:border-[#c9825b]/20"
                                            placeholder="email@example.com"
                                        />
                                    </div>
                                </div>
                                <button
                                    onClick={() => {
                                        const next = [...employeesForm];
                                        next.splice(idx, 1);
                                        setEmployeesForm(next);
                                    }}
                                    className="p-3 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all self-center md:self-end"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                                    </svg>
                                </button>
                            </div>
                        ))}

                        <button
                            type="button"
                            onClick={() => setEmployeesForm([...employeesForm, { name: '', role: '', phone: '', email: '' }])}
                            className="w-full py-6 rounded-3xl border-2 border-dashed border-gray-100 text-gray-400 hover:border-[#c9825b]/20 hover:text-[#c9825b] hover:bg-[#fff5f0]/30 transition-all flex flex-col items-center justify-center gap-2 group"
                        >
                            <div className="w-10 h-10 rounded-2xl bg-gray-50 flex items-center justify-center group-hover:bg-white transition-all">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                                </svg>
                            </div>
                            <span className="text-sm font-bold">Добавить сотрудника</span>
                        </button>
                    </div>
                  </div>
                )}

                {['FTS'].includes(activeSubTab) && (
                   <div className="flex flex-col items-center justify-center py-12 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                      <div className="w-12 h-12 bg-white rounded-full shadow-sm flex items-center justify-center mb-3">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="#9ca3af" className="w-6 h-6">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                        </svg>
                      </div>
                      <p className="text-gray-500">Раздел "{profileSubTabs.find(t => t.id === activeSubTab)?.label}" находится в разработке</p>
                   </div>
                )}
              </div>
            </div>

            {/* Sidebar Column */}
            <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-[#e5e7eb] transition-all duration-300 hover:shadow-md">
              <div className="flex items-center justify-between gap-4 mb-4">
                <h3 className="font-bold text-lg text-[#4b2f23]">Состояние магазина</h3>
                <span
                  className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                    (profile as any).is_hidden ? 'bg-gray-100 text-gray-700' : 'bg-[#fff5f0] text-[#c9825b]'
                  }`}
                >
                  {(profile as any).is_hidden ? 'Закрыт' : 'Открыт'}
                </span>
              </div>

              <button
                onClick={handleToggleShopHidden}
                disabled={shopStateSaving}
                className={`w-full px-6 py-2.5 rounded-xl font-medium transition-colors disabled:opacity-60 ${
                  (profile as any).is_hidden
                    ? 'bg-white text-[#c9825b] border border-[#c9825b] hover:bg-[#fff5f0]'
                    : 'bg-[#c9825b] text-white hover:bg-[#b07350]'
                }`}
              >
                {shopStateSaving
                  ? 'Сохранение...'
                  : (profile as any).is_hidden
                    ? 'Открыть магазин'
                    : 'Закрыть магазин'}
              </button>

              <div className="mt-4 text-sm text-gray-600">
                <div className="text-xs text-gray-500 mb-1">Сводка по времени работы</div>
                <div className="font-medium text-[#4b2f23]">
                  {buildScheduleSummary(((profile as any).weekly_schedule ?? weeklyScheduleForm) as WeeklyScheduleDay[]) ||
                    'Расписание не настроено'}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-3xl p-6 shadow-sm border border-[#e5e7eb]">
                <div className="flex items-center space-x-4 mb-6">
                    {profile.logo_url ? (
                      <img
                        src={getFullImageUrl(profile.logo_url)}
                        alt="Логотип магазина"
                        className="w-16 h-16 rounded-full object-cover border border-gray-200"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-[#c9825b] flex items-center justify-center text-white text-2xl font-bold">
                          {profile.shop_name ? profile.shop_name[0].toUpperCase() : 'M'}
                      </div>
                    )}
                    <div>
                        <div className="font-bold text-lg text-[#4b2f23]">{profile.shop_name || 'Мой магазин'}</div>
                        <div className="text-sm text-gray-500">{profile.first_name} {profile.last_name}</div>
                    </div>
                </div>
                
                <div className="space-y-4">
                    <div className="flex justify-between items-center py-2 border-b border-gray-50">
                        <span className="text-sm text-gray-500">Рейтинг</span>
                        <span className="font-bold text-[#4b2f23]">4.9 ★</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-gray-50">
                        <span className="text-sm text-gray-500">Заказов за месяц</span>
                        <span className="font-bold text-[#4b2f23]">124</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-gray-50">
                        <span className="text-sm text-gray-500">Доход за месяц</span>
                        <span className="font-bold text-[#4b2f23]">₽ 45,200</span>
                    </div>
                </div>
            </div>

            <div className="bg-[#4b2f23] rounded-3xl p-6 text-white relative overflow-hidden">
                <div className="relative z-10">
                    <h3 className="font-bold text-lg mb-2">Поддержка продавцов</h3>
                    <p className="text-white/70 text-sm mb-4">Возникли вопросы по работе платформы?</p>
                    <button 
                        onClick={() => router.push('/seller?view=CHAT&orderId=support')}
                        className="bg-white text-[#4b2f23] px-4 py-2 rounded-xl text-sm font-medium hover:bg-gray-100 transition-colors"
                    >
                        Написать в чат
                    </button>
                </div>
                <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-white/10 rounded-full blur-xl"></div>
                <div className="absolute top-4 right-4 w-12 h-12 bg-[#c9825b]/20 rounded-full blur-lg"></div>
            </div>
        </div>
    </div>

        {/* Modals */}
        <PasswordChangeModal 
            isOpen={isPasswordModalOpen}
            onClose={() => setIsPasswordModalOpen(false)}
            token={getCookie("accessToken") || ""}
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

        <DeliveryZonesModal
            isOpen={isZonesModalOpen}
            onClose={() => setIsZonesModalOpen(false)}
            zones={deliveryZonesForm}
            center={{ 
                lat: generalForm.latitude || 55.751244, 
                lon: generalForm.longitude || 37.618423 
            }}
        />
    </div>
  );
}
