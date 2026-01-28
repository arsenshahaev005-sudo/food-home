'use client';

import React, { useState, useEffect } from 'react';

interface DishFiltersProps {
  initialFilters: {
    search?: string;
    category?: string;
    producer?: string;
    section?: string;
    cooking_time_from?: string;
    cooking_time_to?: string;
    calories_from?: string;
    calories_to?: string;
    proteins_from?: string;
    proteins_to?: string;
    fats_from?: string;
    fats_to?: string;
    carbs_from?: string;
    carbs_to?: string;
  };
  categories: Array<{ id: string; name: string }>;
  producers: Array<{ id: string; name: string }>;
  onFilterChange: (filters: any) => void;
}

const DishFilters: React.FC<DishFiltersProps> = ({ 
  initialFilters, 
  categories, 
  producers, 
  onFilterChange 
}) => {
  const [filters, setFilters] = useState(initialFilters);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Ensure categories is an array
  const safeCategories = Array.isArray(categories) ? categories : [];
  const safeProducers = Array.isArray(producers) ? producers : [];

  useEffect(() => {
    onFilterChange(filters);
  }, [filters, onFilterChange]);

  const handleChange = (key: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const resetFilters = () => {
    setFilters({
      search: '',
      category: '',
      producer: '',
      section: 'all',
      cooking_time_from: '',
      cooking_time_to: '',
      calories_from: '',
      calories_to: '',
      proteins_from: '',
      proteins_to: '',
      fats_from: '',
      fats_to: '',
      carbs_from: '',
      carbs_to: ''
    });
  };

  return (
    <div className="space-y-6">
      {/* Basic Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
        <div>
          <label className="block text-sm font-medium mb-1">Поиск</label>
          <input
            type="text"
            value={filters.search || ''}
            onChange={(e) => handleChange('search', e.target.value)}
            placeholder="Поиск по названию"
            className="w-full border rounded-full px-4 py-2 text-sm md:text-base"
            style={{ borderColor: "var(--border-warm)", backgroundColor: "#fff9f3" }}
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Категория</label>
          <select
            value={filters.category || ''}
            onChange={(e) => handleChange('category', e.target.value)}
            className="w-full border rounded-full px-4 py-2 text-sm md:text-base"
            style={{ borderColor: "var(--border-warm)", backgroundColor: "#fff9f3" }}
          >
            <option value="">Все категории</option>
            {safeCategories.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Производитель</label>
          <select
            value={filters.producer || ''}
            onChange={(e) => handleChange('producer', e.target.value)}
            className="w-full border rounded-full px-4 py-2 text-sm md:text-base"
            style={{ borderColor: "var(--border-warm)", backgroundColor: "#fff9f3" }}
          >
            <option value="">Все производители</option>
            {safeProducers.map((prod) => (
              <option key={prod.id} value={prod.id}>{prod.name}</option>
            ))}
          </select>
        </div>
        
        <div>
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full btn-warm h-11"
            style={{ backgroundColor: "#c9825b", color: "#ffffff" }}
          >
            {showAdvanced ? 'Скрыть фильтры' : 'Доп. фильтры'}
          </button>
        </div>
      </div>

      {/* Advanced Filters */}
      {showAdvanced && (
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
          <h3 className="font-medium mb-3">Дополнительные фильтры</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Cooking Time Filters */}
            <div className="space-y-2">
              <label className="block text-sm">Время приготовления (мин)</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={filters.cooking_time_from || ''}
                  onChange={(e) => handleChange('cooking_time_from', e.target.value)}
                  placeholder="От"
                  className="w-full border rounded px-2 py-1 text-sm"
                  min="0"
                />
                <input
                  type="number"
                  value={filters.cooking_time_to || ''}
                  onChange={(e) => handleChange('cooking_time_to', e.target.value)}
                  placeholder="До"
                  className="w-full border rounded px-2 py-1 text-sm"
                  min="0"
                />
              </div>
            </div>
            
            {/* Calories Filters */}
            <div className="space-y-2">
              <label className="block text-sm">Калории</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={filters.calories_from || ''}
                  onChange={(e) => handleChange('calories_from', e.target.value)}
                  placeholder="От"
                  className="w-full border rounded px-2 py-1 text-sm"
                  min="0"
                />
                <input
                  type="number"
                  value={filters.calories_to || ''}
                  onChange={(e) => handleChange('calories_to', e.target.value)}
                  placeholder="До"
                  className="w-full border rounded px-2 py-1 text-sm"
                  min="0"
                />
              </div>
            </div>
            
            {/* Proteins Filters */}
            <div className="space-y-2">
              <label className="block text-sm">Белки (г)</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={filters.proteins_from || ''}
                  onChange={(e) => handleChange('proteins_from', e.target.value)}
                  placeholder="От"
                  className="w-full border rounded px-2 py-1 text-sm"
                  min="0"
                />
                <input
                  type="number"
                  value={filters.proteins_to || ''}
                  onChange={(e) => handleChange('proteins_to', e.target.value)}
                  placeholder="До"
                  className="w-full border rounded px-2 py-1 text-sm"
                  min="0"
                />
              </div>
            </div>
            
            {/* Fats Filters */}
            <div className="space-y-2">
              <label className="block text-sm">Жиры (г)</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={filters.fats_from || ''}
                  onChange={(e) => handleChange('fats_from', e.target.value)}
                  placeholder="От"
                  className="w-full border rounded px-2 py-1 text-sm"
                  min="0"
                />
                <input
                  type="number"
                  value={filters.fats_to || ''}
                  onChange={(e) => handleChange('fats_to', e.target.value)}
                  placeholder="До"
                  className="w-full border rounded px-2 py-1 text-sm"
                  min="0"
                />
              </div>
            </div>
            
            {/* Carbs Filters */}
            <div className="space-y-2">
              <label className="block text-sm">Углеводы (г)</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={filters.carbs_from || ''}
                  onChange={(e) => handleChange('carbs_from', e.target.value)}
                  placeholder="От"
                  className="w-full border rounded px-2 py-1 text-sm"
                  min="0"
                />
                <input
                  type="number"
                  value={filters.carbs_to || ''}
                  onChange={(e) => handleChange('carbs_to', e.target.value)}
                  placeholder="До"
                  className="w-full border rounded px-2 py-1 text-sm"
                  min="0"
                />
              </div>
            </div>
          </div>
          
          <div className="flex justify-end mt-4">
            <button
              onClick={resetFilters}
              className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400 text-sm"
            >
              Сбросить все фильтры
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DishFilters;