"use client";

import { useState, useEffect } from "react";
import { Dish, getDishes, updateDish, deleteDish, Category, getCategories, Profile, createDish, uploadDishPhoto, addDishImage, removeDishImage, BASE_URL } from "@/lib/api";

interface SellerProductsProps {
  token: string;
  profile: Profile;
}

const EMPTY_DISH: Partial<Dish> = {
  name: "",
  description: "",
  price: "0",
  category: "" as any,
  is_available: true,
  is_archived: false,
  is_top: false,
  weight: "",
  composition: "",
  manufacturing_time: "",
  shelf_life: "",
  storage_conditions: "",
  dimensions: "",
  fillings: "",
  cooking_time_minutes: 60,
  calories: 0,
  proteins: "0",
  fats: "0",
  carbs: "0",
  min_quantity: 1,
  discount_percentage: 0,
  max_quantity_per_order: null,
  start_sales_at: null,
  allow_preorder: true,
};

export default function SellerProducts({ token, profile }: SellerProductsProps) {
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [categories, setCategories] = useState<Category[]>([
    { id: "fallback-1" as any, name: "Выпечка" },
    { id: "fallback-2" as any, name: "Первые блюда" },
    { id: "fallback-3" as any, name: "Вторые блюда" }
  ]);
  const [rootCategories, setRootCategories] = useState<Category[]>([]);
  const [selectedRootCategoryId, setSelectedRootCategoryId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState<Dish | null>(null);
  const [isPreviewing, setIsPreviewing] = useState<Dish | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [form, setForm] = useState<Partial<Dish>>(EMPTY_DISH);
  const [startSalesAtLocal, setStartSalesAtLocal] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [extraPhotos, setExtraPhotos] = useState<File[]>([]);
  const [extraPreviews, setExtraPreviews] = useState<{ id?: number; image: string; file?: File }[]>([]);
  const [imagesToDelete, setImagesToDelete] = useState<number[]>([]);
  const [dimWidth, setDimWidth] = useState("");
  const [dimHeight, setDimHeight] = useState("");
  const [dimDepth, setDimDepth] = useState("");
  const [prepDays, setPrepDays] = useState("0");
  const [prepHours, setPrepHours] = useState("0");
  const [prepMinutes, setPrepMinutes] = useState("30");
  const [weightValue, setWeightValue] = useState("");
  const [shelfLifeValue, setShelfLifeValue] = useState("");
  const [shelfLifeUnit, setShelfLifeUnit] = useState<"ч" | "д">("ч");
  const [toppings, setToppings] = useState<{ id?: number; name: string; price: string }[]>([]);
  const [newToppingName, setNewToppingName] = useState("");
  const [newToppingPrice, setNewToppingPrice] = useState("");

  const pad2 = (n: number) => String(n).padStart(2, "0");

  const isoToDatetimeLocal = (value?: string | null) => {
    if (!value) return "";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "";
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  };

  const datetimeLocalToIso = (value: string) => {
    const [datePart, timePart] = value.split("T");
    if (!datePart || !timePart) return null;
    const [year, month, day] = datePart.split("-").map((x) => Number(x));
    const [hour, minute] = timePart.split(":").map((x) => Number(x));
    const d = new Date(year, (month || 1) - 1, day || 1, hour || 0, minute || 0, 0, 0);
    if (Number.isNaN(d.getTime())) return null;
    return d.toISOString();
  };

  useEffect(() => {
    loadData();
  }, [showArchived]);

  useEffect(() => {
    if (isEditing) {
      setForm(isEditing);
      setStartSalesAtLocal(isoToDatetimeLocal(isEditing.start_sales_at));
      setPhotoPreview(isEditing.photo || null);
      setExtraPreviews(isEditing.images?.map((img: any) => ({ id: img.id, image: img.image })) || []);
      setImagesToDelete([]);
      
      if (isEditing.dimensions) {
        const dims = isEditing.dimensions.match(/\d+/g);
        if (dims && dims.length >= 3) {
          setDimWidth(dims[0]);
          setDimHeight(dims[1]);
          setDimDepth(dims[2]);
        }
      }
      
      if (isEditing.manufacturing_time) {
        const days = isEditing.manufacturing_time.match(/(\d+)\s*д/);
        const hours = isEditing.manufacturing_time.match(/(\d+)\s*ч/);
        const mins = isEditing.manufacturing_time.match(/(\d+)\s*м/);
        setPrepDays(days ? days[1] : "0");
        setPrepHours(hours ? hours[1] : "0");
        setPrepMinutes(mins ? mins[1] : "30");
      }

      if (isEditing.weight) {
        const weightMatch = isEditing.weight.match(/\d+/);
        setWeightValue(weightMatch ? weightMatch[0] : "");
      } else {
        setWeightValue("");
      }

      if (isEditing.shelf_life) {
        const valueMatch = isEditing.shelf_life.match(/\d+/);
        const unitMatch = isEditing.shelf_life.match(/[чд]/);
        setShelfLifeValue(valueMatch ? valueMatch[0] : "");
        setShelfLifeUnit(unitMatch && unitMatch[0] === "д" ? "д" : "ч");
      } else {
        setShelfLifeValue("");
        setShelfLifeUnit("ч");
      }

      const existingToppings = Array.isArray(isEditing.toppings) ? isEditing.toppings : [];
      setToppings(
        existingToppings.map((t: any) => ({
          id: t.id,
          name: String(t.name ?? ""),
          price: String(t.price ?? "0"),
        }))
      );

      if (rootCategories.length > 0) {
        const dishCategoryId = isEditing.category;
        let rootForDish = rootCategories.find((c) => c.id === dishCategoryId);

        if (!rootForDish && dishCategoryId) {
          rootForDish = rootCategories.find((c) =>
            (c.subcategories || []).some((sub) => sub.id === dishCategoryId)
          );
        }

        if (rootForDish) {
          setSelectedRootCategoryId(rootForDish.id);
        } else if (rootCategories[0]) {
          setSelectedRootCategoryId(rootCategories[0].id);
        }
      }
    } else if (isCreating) {
      if (rootCategories.length > 0) {
        const defaultRoot = rootCategories[0];
        const firstSub = defaultRoot.subcategories && defaultRoot.subcategories[0];
        setSelectedRootCategoryId(defaultRoot.id);
        setForm({ ...EMPTY_DISH, category: (firstSub?.id ?? "") as any });
      } else {
        setForm({ ...EMPTY_DISH, category: categories[0]?.id });
      }
      setStartSalesAtLocal("");
      setPhotoPreview(null);
      setExtraPreviews([]);
      setDimWidth(""); setDimHeight(""); setDimDepth("");
      setPrepDays("0"); setPrepHours("0"); setPrepMinutes("30");
      setWeightValue("");
      setShelfLifeValue("");
      setShelfLifeUnit("ч");
      setToppings([]);
      setNewToppingName("");
      setNewToppingPrice("");
    }
    setPhotoFile(null);
    setExtraPhotos([]);
  }, [isEditing, isCreating, categories, rootCategories]);

  // Consolidate form updates from various inputs
  useEffect(() => {
    setForm(prev => {
      const updates: Partial<Dish> = {};
      
      // Dimensions
      if (dimWidth || dimHeight || dimDepth) {
        updates.dimensions = `${dimWidth}x${dimHeight}x${dimDepth} см`;
      }
      
      // Manufacturing time
      const parts: string[] = [];
      const d = parseInt(prepDays) || 0;
      const h = parseInt(prepHours) || 0;
      const m = parseInt(prepMinutes) || 0;
      
      if (d > 0) parts.push(`${d} д`);
      if (h > 0) parts.push(`${h} ч`);
      if (m > 0) parts.push(`${m} м`);
      
      updates.manufacturing_time = parts.join(' ') || "30 м";
      
      // Also update cooking_time_minutes for backend logic
      updates.cooking_time_minutes = (d * 24 * 60) + (h * 60) + m;
      if (updates.cooking_time_minutes === 0) updates.cooking_time_minutes = 30;
      
      // Weight
      if (weightValue) {
        updates.weight = `${weightValue} г`;
      } else {
        updates.weight = "";
      }
      
      // Shelf life
      if (shelfLifeValue) {
        updates.shelf_life = `${shelfLifeValue} ${shelfLifeUnit}`;
      } else {
        updates.shelf_life = "";
      }
      
      return { ...prev, ...updates };
    });
  }, [dimWidth, dimHeight, dimDepth, prepDays, prepHours, prepMinutes, weightValue, shelfLifeValue, shelfLifeUnit]);

  const loadData = async () => {
    setLoading(true);
    console.log("loadData: Starting data fetch...");
    
    // 1. Load Categories
    try {
      let catsData: Category[] = [];
      
      try {
        // Use only_roots=true to get the hierarchy from the backend
        catsData = await getCategories({ only_roots: true });
        console.log("loadData: Categories from getCategories (roots):", catsData?.length);
      } catch (err) {
        console.warn("loadData: getCategories failed, trying direct fetch", err);
        const response = await fetch(`${BASE_URL}/api/categories/?only_roots=true`, {
          headers: { Accept: 'application/json' }
        });
        if (response.ok) {
          catsData = await response.json();
        }
      }
      
      // Fallback: if no roots found, try getting all categories
      if (!Array.isArray(catsData) || catsData.length === 0) {
        console.log("loadData: No root categories, fetching all...");
        catsData = await getCategories();
      }

      if (Array.isArray(catsData) && catsData.length > 0) {
        const roots = catsData as Category[];
        setRootCategories(roots);

        const all: Category[] = [];
        const seenIds = new Set<string>();

        const collect = (cat: Category) => {
          if (!cat || !cat.id || seenIds.has(cat.id)) return;
          seenIds.add(cat.id);
          all.push(cat);

          if (cat.subcategories && Array.isArray(cat.subcategories)) {
            cat.subcategories.forEach((sub) => collect(sub));
          }
        };

        roots.forEach((root) => collect(root));

        if (all.length > 0) {
          setCategories(all);
        } else {
          console.warn("loadData: Flattening resulted in empty list");
          setCategories([
            { id: "00000000-0000-0000-0000-000000000000" as any, name: "Общая категория" }
          ]);
          setRootCategories([
            { id: "00000000-0000-0000-0000-000000000000" as any, name: "Общая категория" }
          ]);
        }
      } else {
        console.warn("loadData: No categories found at all");
        setCategories([
          { id: "00000000-0000-0000-0000-000000000000" as any, name: "Общая категория" }
        ]);
        setRootCategories([
          { id: "00000000-0000-0000-0000-000000000000" as any, name: "Общая категория" }
        ]);
      }
    } catch (e) {
      console.error("loadData: Critical error loading categories", e);
    }

    // 2. Load Dishes
    try {
      const dishesData = await getDishes({ producer: profile.producer_id, is_archived: showArchived });
      setDishes(dishesData.sort((a, b) => (b.sales_count || 0) - (a.sales_count || 0)));
    } catch (e) {
      console.error("loadData: Failed to load products", e);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleArchive = async (dish: Dish) => {
    try {
      const newStatus = !dish.is_archived;
      const updated = await updateDish(dish.id, { is_archived: newStatus }, token);
      
      if (showArchived !== updated.is_archived) {
         setDishes(prev => prev.filter(d => d.id !== dish.id));
         // Optional: alert or toast
         // alert(updated.is_archived ? "Товар перенесен в архив" : "Товар восстановлен из архива");
      } else {
         setDishes(prev => prev.map(d => d.id === dish.id ? updated : d));
      }
    } catch (e) {
      console.error("Archive toggle error:", e);
      alert("Ошибка при изменении статуса архивации");
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!photoPreview && !photoFile) {
      alert("Главное фото обязательно");
      return;
    }

    // Validation for dimensions
    if (!dimWidth || !dimHeight || !dimDepth) {
      alert("Пожалуйста, заполните все габариты товара");
      return;
    }

    try {
      setSaving(true);
      let savedDish: Dish;

      const d = parseInt(prepDays) || 0;
      const h = parseInt(prepHours) || 0;
      const m = parseInt(prepMinutes) || 0;

      const timeParts: string[] = [];
      if (d > 0) timeParts.push(`${d} д`);
      if (h > 0) timeParts.push(`${h} ч`);
      if (m > 0) timeParts.push(`${m} м`);

      const manufacturing_time = timeParts.join(" ") || "30 м";
      const cooking_time_minutes = (d * 24 * 60) + (h * 60) + m || 30;

      const start_sales_at = startSalesAtLocal
        ? (datetimeLocalToIso(startSalesAtLocal) ?? form.start_sales_at ?? null)
        : null;

      const dataToSave: any = { ...form, start_sales_at, manufacturing_time, cooking_time_minutes };

      const normalizedToppings = (toppings || [])
        .map(t => {
          const name = t.name.trim();
          if (!name) return null;
          const raw = (t.price || "0").toString().replace(",", ".");
          const num = parseFloat(raw);
          return {
            name,
            price: Number.isFinite(num) ? num : 0,
          };
        })
        .filter((x): x is { name: string; price: number } => Boolean(x));

      dataToSave.toppings = normalizedToppings;
      
      // Ensure numeric fields are numbers if they are strings
      if (typeof dataToSave.price === 'string') {
        dataToSave.price = dataToSave.price.replace(',', '.');
      }
      
      if (isEditing) {
        savedDish = await updateDish(isEditing.id, dataToSave, token);
      } else {
        savedDish = await createDish({ ...dataToSave, producer: profile.producer_id }, token);
      }

      if (photoFile) {
        savedDish = await uploadDishPhoto(savedDish.id, photoFile, token);
      }
      
      // Upload extra photos
      if (extraPhotos.length > 0) {
        for (const file of extraPhotos) {
          await addDishImage(savedDish.id, file, token);
        }
      }

      // Delete extra photos
      if (imagesToDelete.length > 0) {
        for (const imageId of imagesToDelete) {
          await removeDishImage(savedDish.id, imageId, token);
        }
      }

      await loadData();
      setIsEditing(null);
      setIsCreating(false);
      setImagesToDelete([]);
      setExtraPhotos([]);
      setExtraPreviews([]);
    } catch (e: any) {
      console.error("Save error:", e);
      let errorMsg = "Ошибка при сохранении товара";
      
      if (e && typeof e === 'object') {
        if (typeof e.detail === 'string') {
          errorMsg += `\n\n${e.detail}`;
        } else if (typeof e.message === 'string') {
          errorMsg += `\n\n${e.message}`;
        } else {
          const details = Object.entries(e)
            .filter(([key]) => key !== 'message' && key !== 'detail' && key !== 'status' && key !== 'data')
            .map(([key, value]) => {
              const val = Array.isArray(value)
                ? value.join(', ')
                : (typeof value === 'object' ? JSON.stringify(value) : value);
              return `${key}: ${val}`;
            })
            .join('\n');
          
          if (details) errorMsg += `\n\n${details}`;
        }
      } else if (typeof e === 'string') {
        errorMsg += `\n\n${e}`;
      }
      
      alert(errorMsg);
    } finally {
      setSaving(false);
    }
  };

  const handleExtraPhotosChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setExtraPhotos(prev => [...prev, ...files]);
      const newEntries = files.map(file => ({ 
        image: URL.createObjectURL(file),
        file: file
      }));
      setExtraPreviews(prev => [...prev, ...newEntries]);
    }
  };

  const removeExtraPhoto = (index: number) => {
    const itemToRemove = extraPreviews[index];
    
    // If it's an existing image from backend, track it for deletion
    if (itemToRemove.id) {
      setImagesToDelete(prev => [...prev, itemToRemove.id!]);
    } else if (itemToRemove.file) {
      // If it's a new photo not yet uploaded, remove it from extraPhotos too
      setExtraPhotos(prev => prev.filter(f => f !== itemToRemove.file));
    }

    setExtraPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  useEffect(() => {
    if (isCreating || isEditing) {
      document.body.classList.add("modal-open");
    } else {
      document.body.classList.remove("modal-open");
    }
    return () => {
      document.body.classList.remove("modal-open");
    };
  }, [isCreating, isEditing]);

  const handleToggleAvailability = async (dish: any) => {
    try {
      const updated = await updateDish(dish.id, { is_available: !dish.is_available }, token);
      setDishes(dishes.map(d => d.id === dish.id ? updated : d));
    } catch (e) {
      alert("Ошибка при обновлении статуса");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Вы уверены, что хотите удалить этот товар?")) return;
    try {
      await deleteDish(id, token);
      setDishes(dishes.filter(d => d.id !== id));
    } catch (e) {
      alert("Ошибка при удалении");
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Товары</h1>
          <p className="text-gray-500 mt-1">Управление ассортиментом вашего магазина</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={() => loadData()}
            className="p-2.5 bg-white border border-gray-100 rounded-2xl text-gray-400 hover:text-[#c9825b] hover:border-[#c9825b]/20 transition-all shadow-sm"
            title="Обновить данные"
            disabled={loading}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
          </button>

          <button 
            onClick={() => setShowArchived(!showArchived)}
            className={`px-4 py-2.5 rounded-2xl text-sm font-bold transition-all ${showArchived ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            {showArchived ? 'Показать активные' : 'Архив'}
          </button>
          
          <button 
            onClick={() => setIsCreating(true)}
            className="bg-[#c9825b] text-white px-6 py-2.5 rounded-2xl font-bold hover:bg-[#b07350] transition-all shadow-lg shadow-[#c9825b]/20 flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Добавить товар
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="bg-white h-80 rounded-3xl border border-gray-100 animate-pulse"></div>
          ))}
        </div>
      ) : dishes.length === 0 ? (
        <div className="bg-white rounded-3xl border border-gray-100 p-12 text-center">
          <div className="w-20 h-20 bg-gray-50 rounded-3xl flex items-center justify-center mx-auto mb-4 text-gray-300">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10">
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 7.5-9-5.25L3 7.5m18 0-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-gray-900">Товаров пока нет</h3>
          <p className="text-gray-500 mt-2">Начните добавлять блюда, чтобы они появились в вашем магазине.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {dishes.map((dish) => (
            <div key={dish.id} className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-all group relative">
              {/* Dish Photo */}
              <div className="aspect-[4/3] bg-gray-100 relative overflow-hidden">
                {dish.photo ? (
                  <img src={dish.photo} alt={dish.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-300">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
                    </svg>
                  </div>
                )}
                <div className="absolute top-4 left-4">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm ${dish.is_available ? 'bg-green-500 text-white' : 'bg-gray-500 text-white'}`}>
                    {dish.is_available ? 'В наличии' : 'Нет в наличии'}
                  </span>
                </div>
                <div className="absolute top-4 right-4 flex gap-2 translate-y-[-10px] opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleArchive(dish);
                    }}
                    className={`p-2 bg-white/90 backdrop-blur-sm rounded-xl shadow-lg transition-colors ${dish.is_archived ? 'text-green-600 hover:bg-green-50' : 'text-gray-700 hover:text-[#c9825b]'}`}
                    title={dish.is_archived ? "Восстановить из архива" : "В архив"}
                  >
                    {dish.is_archived ? (
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
                      </svg>
                    )}
                  </button>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsEditing(dish);
                    }}
                    className="p-2 bg-white/90 backdrop-blur-sm rounded-xl text-gray-700 hover:text-[#c9825b] shadow-lg"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                    </svg>
                  </button>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(dish.id);
                    }}
                    className="p-2 bg-white/90 backdrop-blur-sm rounded-xl text-red-600 hover:bg-red-50 shadow-lg"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Dish Content */}
              <div 
                className="p-5 cursor-pointer"
                onClick={() => setIsPreviewing(dish)}
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-gray-900 text-lg group-hover:text-[#c9825b] transition-colors line-clamp-1">{dish.name}</h3>
                  <div className="text-lg font-black text-[#c9825b]">{Math.round(parseFloat(dish.price || "0"))} ₽</div>
                </div>
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <span className="text-xs font-bold px-2 py-0.5 bg-gray-100 text-gray-500 rounded-lg">
                    {dish.sales_count} продаж
                  </span>
                  {dish.weight && (
                    <span className="text-xs font-bold px-2 py-0.5 bg-orange-50 text-orange-600 rounded-lg">
                      {dish.weight}
                    </span>
                  )}
                  {dish.manufacturing_time && (
                    <span className="text-xs font-bold px-2 py-0.5 bg-blue-50 text-blue-600 rounded-lg">
                      {dish.manufacturing_time}
                    </span>
                  )}
                  {dish.start_sales_at && new Date(dish.start_sales_at) > new Date() && (
                    <span className="text-xs font-bold px-2 py-0.5 bg-purple-50 text-purple-600 rounded-lg">
                      Скоро
                    </span>
                  )}
                </div>
                <p className="text-gray-500 text-sm line-clamp-2 mb-4 min-h-[40px]">{dish.description}</p>

                <div className="space-y-3 pt-4 border-t border-gray-50" onClick={e => e.stopPropagation()}>
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                      Наличие
                    </div>
                    
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={dish.is_available} 
                        onChange={() => handleToggleAvailability(dish)}
                        className="sr-only peer" 
                      />
                      <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#c9825b]"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between">
                     <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                       В ТОП-12
                     </div>
                    
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={dish.is_top} 
                        onChange={async () => {
                          try {
                            const updated = await updateDish(dish.id, { is_top: !dish.is_top }, token);
                            setDishes(dishes.map(d => d.id === dish.id ? updated : d));
                          } catch (e) {
                            alert("Ошибка при обновлении статуса ТОП");
                          }
                        }}
                        className="sr-only peer" 
                      />
                      <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#c9825b]"></div>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal for Creating/Editing */}
      {(isCreating || isEditing) && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
          onClick={() => { setIsCreating(false); setIsEditing(null); }}
        >
          <div 
            className="bg-white rounded-[32px] shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-300"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <div>
                <h2 className="text-2xl font-black text-gray-900">{isCreating ? "Новый товар" : "Редактирование"}</h2>
                <p className="text-sm text-gray-500 mt-1">Заполните информацию о вашем блюде</p>
              </div>
              <button 
                onClick={() => { setIsCreating(false); setIsEditing(null); }}
                className="p-2 hover:bg-white rounded-2xl transition-colors text-gray-400 hover:text-gray-900 shadow-sm border border-transparent hover:border-gray-100"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSave} className="overflow-y-auto flex-1 p-8 space-y-10 custom-scrollbar">
              {/* Photo & Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-10">
                <div className="md:col-span-5 space-y-6">
                  <div>
                    <label className="block text-sm font-black text-gray-400 uppercase tracking-widest ml-1 mb-2">Главное фото</label>
                    <div className="relative aspect-square rounded-[32px] overflow-hidden bg-gray-50 border-2 border-dashed border-gray-200 group hover:border-[#c9825b] transition-colors cursor-pointer">
                      {photoPreview ? (
                        <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 p-6 text-center">
                          <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-[#c9825b]">
                              <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
                            </svg>
                          </div>
                          <p className="text-sm font-bold text-gray-900">Нажмите для загрузки</p>
                          <p className="text-xs mt-1">PNG, JPG до 10MB</p>
                        </div>
                      )}
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handlePhotoChange}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>

                <div className="md:col-span-7 space-y-6">
                  <div>
                    <label className="block text-sm font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Название блюда</label>
                    <input 
                      type="text" 
                      required
                      value={form.name}
                      onChange={e => setForm({ ...form, name: e.target.value })}
                      placeholder="Напр: Домашние пельмени с говядиной"
                      className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-[#c9825b]/20 focus:border-[#c9825b] outline-none transition-all font-medium"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-4">
                      <div className="relative group">
                        <label className="block text-sm font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Категория</label>
                        <select 
                          value={selectedRootCategoryId}
                          onChange={e => {
                            const newRootId = e.target.value;
                            setSelectedRootCategoryId(newRootId);
                            const root = rootCategories.find(c => c.id === newRootId);
                            const firstSub = root?.subcategories && root.subcategories[0];
                            setForm(prev => ({
                              ...prev,
                              category: (firstSub?.id ?? "") as any
                            }));
                          }}
                          className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-[#c9825b]/20 focus:border-[#c9825b] outline-none transition-all font-medium"
                        >
                          <option value="" disabled>{loading ? "Загрузка..." : "Выберите категорию"}</option>
                          {rootCategories.length > 0
                            ? rootCategories.map(cat => (
                                <option key={cat.id} value={cat.id}>{cat.name}</option>
                              ))
                            : categories.map(cat => (
                                <option key={cat.id} value={cat.id}>{cat.name}</option>
                              ))}
                        </select>
                      </div>

                      <div className="relative group">
                        <label className="block text-sm font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Подкатегория</label>
                        <select 
                          required
                          value={form.category || ""}
                          onChange={e => setForm({ ...form, category: e.target.value as any })}
                          className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-[#c9825b]/20 focus:border-[#c9825b] outline-none transition-all font-medium"
                        >
                          <option value="" disabled>{loading ? "Загрузка..." : "Выберите подкатегорию"}</option>
                          {(() => {
                            if (rootCategories.length > 0 && selectedRootCategoryId) {
                              const root = rootCategories.find(c => c.id === selectedRootCategoryId);
                              const subs = root?.subcategories || [];
                              if (subs.length > 0) {
                                return subs.map(sub => (
                                  <option key={sub.id} value={sub.id}>{sub.name}</option>
                                ));
                              }
                            }
                            return categories.map(cat => (
                              <option key={cat.id} value={cat.id}>{cat.name}</option>
                            ));
                          })()}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Цена (₽)</label>
                      <input 
                        type="number" 
                        required
                        value={form.price ?? ""}
                        onChange={e => setForm(prev => ({ ...prev, price: e.target.value }))}
                        onFocus={e => {
                          if ((form.price ?? "") === "0") {
                            setForm(prev => ({ ...prev, price: "" }));
                          }
                        }}
                        onBlur={e => {
                          if ((form.price ?? "") === "") {
                            setForm(prev => ({ ...prev, price: "0" }));
                          }
                        }}
                        className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-[#c9825b]/20 focus:border-[#c9825b] outline-none transition-all font-black text-[#c9825b] text-lg"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Описание</label>
                    <textarea 
                      required
                      value={form.description}
                      onChange={e => setForm({ ...form, description: e.target.value })}
                      rows={3}
                      placeholder="Расскажите о вкусе, особенностях приготовления..."
                      className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-[#c9825b]/20 focus:border-[#c9825b] outline-none transition-all font-medium resize-none"
                    />
                  </div>
                </div>
              </div>

              {/* Extra Photos - Now full width */}
              <div className="space-y-4 pt-4 border-t border-gray-50">
                <label className="block text-sm font-black text-gray-400 uppercase tracking-widest ml-1 mb-2">Доп. фото</label>
                <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar">
                  {extraPreviews.map((item, idx) => (
                    <div key={idx} className="relative aspect-square w-32 flex-shrink-0 rounded-2xl overflow-hidden bg-gray-50 border border-gray-100 group shadow-sm">
                      <img src={item.image} alt={`Extra ${idx}`} className="w-full h-full object-cover" />
                      <button 
                        type="button"
                        onClick={() => removeExtraPhoto(idx)}
                        className="absolute top-2 right-2 p-1.5 bg-black/60 text-white rounded-xl opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                  <label className="aspect-square w-32 flex-shrink-0 rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-400 hover:border-[#c9825b] hover:text-[#c9825b] transition-all cursor-pointer bg-gray-50/50">
                    <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center mb-2">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                      </svg>
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-wider">Добавить</span>
                    <input 
                      type="file" 
                      multiple 
                      accept="image/*" 
                      onChange={handleExtraPhotosChange}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* Promotion & Discount Section */}
              <div className="space-y-4 pt-6 border-t border-gray-50">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1.5 h-6 bg-orange-500 rounded-full"></div>
                  <h3 className="text-lg font-black text-gray-900">Продвижение и скидки</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Размер скидки (%)</label>
                      <div className="relative">
                        <input 
                          type="number" 
                          min="0"
                          max="100"
                          value={form.discount_percentage || ""}
                          onChange={e => {
                            const val = parseInt(e.target.value);
                            setForm(prev => ({ ...prev, discount_percentage: isNaN(val) ? 0 : Math.min(100, Math.max(0, val)) }));
                          }}
                          placeholder="0"
                          className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-[#C9825B]/20 focus:border-[#C9825B] outline-none transition-all font-black text-[#C9825B] text-lg pr-12"
                        />
                        <span className="absolute right-6 top-1/2 -translate-y-1/2 font-black text-[#C9825B]">%</span>
                      </div>
                    </div>
                    
                    {(form.discount_percentage ?? 0) > 0 && (
                      <div>
                        <label className="block text-sm font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Итоговая цена</label>
                        <div className="w-full px-6 py-4 bg-[#C9825B]/5 border border-[#C9825B]/10 rounded-2xl font-black text-[#C9825B] text-lg flex items-center justify-between">
                          <span>{Math.round(parseFloat(form.price || "0") * (1 - (form.discount_percentage ?? 0) / 100))} ₽</span>
                          <span className="text-xs font-bold uppercase tracking-widest px-2 py-1 bg-[#C9825B] text-white rounded-lg">Выгода {Math.round(parseFloat(form.price || "0") * ((form.discount_percentage ?? 0) / 100))} ₽</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="bg-orange-50/50 rounded-[32px] p-6 border border-orange-100/50">
                     <div className="flex items-center justify-between mb-4">
                       <div>
                         <h4 className="font-black text-gray-900 uppercase tracking-widest text-sm">Вывести в ТОП-12</h4>
                         <p className="text-xs text-gray-500 mt-1">Товар будет отображаться первым на вашей странице</p>
                       </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={form.is_top || false}
                          onChange={e => setForm(prev => ({ ...prev, is_top: e.target.checked }))}
                          className="sr-only peer" 
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#c9825b]"></div>
                      </label>
                    </div>
                    <div className="text-[10px] font-bold text-orange-600 bg-orange-100/50 px-3 py-2 rounded-xl">
                      💡 Совет: выбирайте свои лучшие товары для привлечения внимания покупателей.
                    </div>
                  </div>
                </div>
              </div>

              {/* Characteristics */}
              <div className="space-y-6 pt-6 border-t border-gray-50">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
                    <div className="w-1.5 h-6 bg-[#c9825b] rounded-full"></div>
                    Характеристики
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Вес (г)</label>
                    <div className="relative">
                      <input 
                        type="number" 
                        value={weightValue}
                        onChange={e => setWeightValue(e.target.value)}
                        placeholder="Напр: 500"
                        className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-[#c9825b]/20 focus:border-[#c9825b] outline-none transition-all font-medium pr-10"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">г</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Срок годности</label>
                    <div className="flex gap-2">
                      <input 
                        type="number" 
                        value={shelfLifeValue}
                        onChange={e => setShelfLifeValue(e.target.value)}
                        placeholder="48"
                        className="flex-1 px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-[#c9825b]/20 focus:border-[#c9825b] outline-none transition-all font-medium min-w-0"
                      />
                      <select 
                        value={shelfLifeUnit}
                        onChange={e => setShelfLifeUnit(e.target.value as "ч" | "д")}
                        className="w-24 px-2 py-3.5 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-[#c9825b]/20 focus:border-[#c9825b] outline-none transition-all font-medium text-sm"
                      >
                        <option value="ч">час.</option>
                        <option value="д">дн.</option>
                      </select>
                    </div>
                  </div>
                  <div className="md:col-span-2 lg:col-span-1">
                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Время изготовления</label>
                    <div className="grid grid-cols-3 gap-2">
                      <select 
                        value={prepDays} 
                        onChange={e => setPrepDays(e.target.value)}
                        className="w-full px-2 py-3.5 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-[#c9825b]/20 focus:border-[#c9825b] outline-none transition-all font-medium text-sm"
                      >
                        {[0,1,2,3,4,5,6,7].map(d => <option key={d} value={d}>{d} дн</option>)}
                      </select>
                      <select 
                        value={prepHours} 
                        onChange={e => setPrepHours(e.target.value)}
                        className="w-full px-2 py-3.5 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-[#c9825b]/20 focus:border-[#c9825b] outline-none transition-all font-medium text-sm"
                      >
                        {Array.from({length: 24}, (_, i) => (
                          <option key={i} value={i}>{i} ч</option>
                        ))}
                      </select>
                      <select 
                        value={prepMinutes} 
                        onChange={e => setPrepMinutes(e.target.value)}
                        className="w-full px-2 py-3.5 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-[#c9825b]/20 focus:border-[#c9825b] outline-none transition-all font-medium text-sm"
                      >
                        {[0,5,10,15,20,25,30,35,40,45,50,55].map(m => (
                          <option key={m} value={m}>{m} мин</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Габариты (Ш x В x Г, см)</label>
                    <div className="flex gap-2">
                      <input 
                        type="number" 
                        value={dimWidth}
                        onChange={e => setDimWidth(e.target.value)}
                        placeholder="Ш"
                        className="w-full px-3 py-3.5 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-[#c9825b]/20 focus:border-[#c9825b] outline-none transition-all font-medium text-center"
                      />
                      <input 
                        type="number" 
                        value={dimHeight}
                        onChange={e => setDimHeight(e.target.value)}
                        placeholder="В"
                        className="w-full px-3 py-3.5 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-[#c9825b]/20 focus:border-[#c9825b] outline-none transition-all font-medium text-center"
                      />
                      <input 
                        type="number" 
                        value={dimDepth}
                        onChange={e => setDimDepth(e.target.value)}
                        placeholder="Г"
                        className="w-full px-3 py-3.5 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-[#c9825b]/20 focus:border-[#c9825b] outline-none transition-all font-medium text-center"
                      />
                    </div>
                  </div>
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Условия хранения</label>
                  <input 
                    type="text" 
                    value={form.storage_conditions}
                    onChange={e => setForm({ ...form, storage_conditions: e.target.value })}
                    placeholder="Напр: В холодильнике при +4°C"
                    className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-[#c9825b]/20 focus:border-[#c9825b] outline-none transition-all font-medium"
                  />
                </div>
              </div>

                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Платные добавки</label>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {toppings.map((t, i) => (
                      <div key={t.id ?? i} className="flex items-center gap-3 px-3 py-1.5 bg-[#c9825b]/10 text-[#c9825b] rounded-xl text-sm font-bold border border-[#c9825b]/20 group">
                        <span>{t.name}</span>
                        <span className="text-xs text-[#c9825b]/80">+{t.price || "0"} ₽</span>
                        <button
                          type="button"
                          onClick={() => setToppings(prev => prev.filter((_, idx) => idx !== i))}
                          className="text-[#c9825b]/40 hover:text-[#c9825b] transition-colors"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)_auto] gap-2">
                    <input
                      type="text"
                      value={newToppingName}
                      onChange={e => setNewToppingName(e.target.value)}
                      placeholder="Название добавки"
                      className="px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-[#c9825b]/20 focus:border-[#c9825b] outline-none transition-all font-medium"
                    />
                    <input
                      type="number"
                      min="0"
                      value={newToppingPrice}
                      onChange={e => setNewToppingPrice(e.target.value)}
                      placeholder="Цена, ₽"
                      className="px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-[#c9825b]/20 focus:border-[#c9825b] outline-none transition-all font-medium"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const name = newToppingName.trim();
                        if (!name) return;
                        const price = newToppingPrice.trim() || "0";
                        setToppings(prev => [...prev, { name, price, id: undefined }]);
                        setNewToppingName("");
                        setNewToppingPrice("");
                      }}
                      className="px-5 py-3.5 bg-gray-100 text-gray-600 rounded-xl font-bold hover:bg-gray-200 transition-all whitespace-nowrap"
                    >
                      Добавить
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Состав (подробно)</label>
                  <textarea 
                    value={form.composition}
                    onChange={e => setForm({ ...form, composition: e.target.value })}
                    rows={2}
                    placeholder="Мука в/с, молоко 3.2%, яйца куриные..."
                    className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-[#c9825b]/20 focus:border-[#c9825b] outline-none transition-all font-medium resize-none"
                  />
                </div>
              </div>

              {/* Order Settings */}
              <div className="space-y-6 pt-6 border-t border-gray-50 pb-8">
                <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
                  <div className="w-1.5 h-6 bg-[#c9825b] rounded-full"></div>
                  Настройки заказа
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Мин. кол-во для заказа</label>
                    <input 
                      type="number" 
                      min="1"
                      value={form.min_quantity || 1}
                      onChange={e => setForm({ ...form, min_quantity: parseInt(e.target.value) || 1 })}
                      className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-[#c9825b]/20 focus:border-[#c9825b] outline-none transition-all font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Макс. кол-во для заказа</label>
                    <input 
                      type="number" 
                      value={form.max_quantity_per_order || ''}
                      onChange={e => setForm({ ...form, max_quantity_per_order: e.target.value ? parseInt(e.target.value) : null })}
                      placeholder="Без ограничений"
                      className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-[#c9825b]/20 focus:border-[#c9825b] outline-none transition-all font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Дата начала продаж</label>
                    <input 
                      type="datetime-local" 
                      value={startSalesAtLocal}
                      onChange={(e) => {
                        const next = e.target.value;
                        setStartSalesAtLocal(next);
                        if (!next) {
                          setForm(prev => ({ ...prev, start_sales_at: null }));
                          return;
                        }
                        const iso = datetimeLocalToIso(next);
                        if (iso) setForm(prev => ({ ...prev, start_sales_at: iso }));
                      }}
                      className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-[#c9825b]/20 focus:border-[#c9825b] outline-none transition-all font-medium"
                    />
                  </div>
                </div>
              </div>
            </form>

            {/* Modal Footer */}
            <div className="px-8 py-6 border-t border-gray-100 flex justify-end gap-4 bg-gray-50/50">
              <button 
                type="button"
                onClick={() => { setIsCreating(false); setIsEditing(null); }}
                className="px-8 py-3.5 rounded-2xl font-bold text-gray-500 hover:text-gray-900 transition-colors"
              >
                Отмена
              </button>
              <button 
                onClick={handleSave}
                disabled={saving}
                className="bg-[#c9825b] text-white px-12 py-3.5 rounded-2xl font-black hover:bg-[#b07350] transition-all shadow-lg shadow-[#c9825b]/20 flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98]"
              >
                {saving ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Сохранение...
                  </>
                ) : (
                  "Сохранить товар"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Preview Modal */}
      {isPreviewing && (
        <div 
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-300"
          onClick={() => setIsPreviewing(null)}
        >
          <div 
            className="bg-white rounded-[40px] shadow-2xl w-full max-w-5xl max-h-[95vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-300"
            onClick={e => e.stopPropagation()}
          >
            <div className="absolute top-6 right-6 z-10">
              <button 
                onClick={() => setIsPreviewing(null)}
                className="p-3 bg-white/90 hover:bg-white rounded-2xl transition-all text-gray-900 shadow-xl border border-gray-100 hover:scale-110 active:scale-95"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="overflow-y-auto flex-1 custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
                {/* Images Gallery */}
                <div className="bg-gray-50 p-8 space-y-4">
                  <div className="aspect-square rounded-[32px] overflow-hidden shadow-lg border border-gray-100">
                    <img src={isPreviewing.photo} alt={isPreviewing.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    {isPreviewing.images?.map((img, idx) => (
                      <div key={idx} className="aspect-square rounded-2xl overflow-hidden shadow-sm border border-gray-100 bg-white">
                        <img src={img.image} alt={`Extra ${idx}`} className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Product Info */}
                <div className="p-10 space-y-8">
                  <div>
                    <div className="flex items-center gap-3 mb-4">
                      <span className="px-3 py-1 bg-[#c9825b]/10 text-[#c9825b] rounded-full text-[10px] font-black uppercase tracking-wider">
                        {categories.find(c => c.id === isPreviewing.category)?.name || 'Категория'}
                      </span>
                      {isPreviewing.start_sales_at && new Date(isPreviewing.start_sales_at) > new Date() && (
                        <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[10px] font-black uppercase tracking-wider">
                          Скоро
                        </span>
                      )}
                    </div>
                    <h2 className="text-4xl font-black text-gray-900 leading-tight mb-2">{isPreviewing.name}</h2>
                    <div className="text-3xl font-black text-[#c9825b]">{Math.round(parseFloat(isPreviewing.price || "0"))} ₽</div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-sm font-black text-gray-400 uppercase tracking-widest">Описание</h4>
                    <p className="text-gray-600 leading-relaxed text-lg">{isPreviewing.description}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="p-5 bg-gray-50 rounded-3xl border border-gray-100">
                      <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Вес / Объем</div>
                      <div className="font-bold text-gray-900">{isPreviewing.weight || '—'}</div>
                    </div>
                    <div className="p-5 bg-gray-50 rounded-3xl border border-gray-100">
                      <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Изготовление</div>
                      <div className="font-bold text-gray-900">{isPreviewing.manufacturing_time || '—'}</div>
                    </div>
                  </div>

                  {isPreviewing.composition && (
                    <div className="space-y-4">
                      <h4 className="text-sm font-black text-gray-400 uppercase tracking-widest">Состав</h4>
                      <p className="text-gray-600 leading-relaxed">{isPreviewing.composition}</p>
                    </div>
                  )}

                  {/* Min Quantity Section */}
                  <div className="p-6 bg-orange-50/50 rounded-[32px] border border-orange-100 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-orange-500 shadow-sm border border-orange-100">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />
                        </svg>
                      </div>
                      <div>
                        <div className="text-[10px] font-black text-orange-400 uppercase tracking-widest mb-0.5">Мин. заказ</div>
                        <div className="text-xl font-black text-gray-900">{isPreviewing.min_quantity || 1} шт.</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Предзаказ</div>
                      <div className="text-sm font-bold text-green-600 flex items-center gap-1 justify-end">
                        <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                        Включен
                      </div>
                    </div>
                  </div>

                  {/* Other details */}
                  <div className="grid grid-cols-1 gap-4 pt-4">
                    {isPreviewing.storage_conditions && (
                      <div className="flex items-center justify-between text-sm py-3 border-b border-gray-50">
                        <span className="font-bold text-gray-400 uppercase tracking-wider text-[10px]">Хранение</span>
                        <span className="font-bold text-gray-900">{isPreviewing.storage_conditions}</span>
                      </div>
                    )}
                    {isPreviewing.shelf_life && (
                      <div className="flex items-center justify-between text-sm py-3 border-b border-gray-50">
                        <span className="font-bold text-gray-400 uppercase tracking-wider text-[10px]">Срок годности</span>
                        <span className="font-bold text-gray-900">{isPreviewing.shelf_life}</span>
                      </div>
                    )}
                    {isPreviewing.dimensions && (
                      <div className="flex items-center justify-between text-sm py-3 border-b border-gray-50">
                        <span className="font-bold text-gray-400 uppercase tracking-wider text-[10px]">Размеры</span>
                        <span className="font-bold text-gray-900">{isPreviewing.dimensions}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
