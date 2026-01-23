"""
Улучшенная система кэширования для приложения.
"""

from django.core.cache import cache
from typing import Any, Optional, Union
import hashlib
import json
from datetime import timedelta


class CacheService:
    """
    Сервис для работы с кэшем.
    Предоставляет удобные методы для кэширования данных с префиксами и TTL.
    """
    
    def __init__(self):
        self.default_timeout = 300  # 5 минут по умолчанию
    
    def make_key(self, prefix: str, *args) -> str:
        """
        Создать ключ кэша с префиксом и параметрами.
        
        Args:
            prefix: Префикс для ключа
            *args: Дополнительные параметры для уникальности ключа
        
        Returns:
            Сгенерированный ключ кэша
        """
        key_parts = [prefix]
        for arg in args:
            if isinstance(arg, (dict, list)):
                key_parts.append(hashlib.md5(json.dumps(arg, sort_keys=True).encode()).hexdigest())
            else:
                key_parts.append(str(arg))
        
        return ":".join(key_parts)
    
    def get(self, key: str, default: Any = None) -> Any:
        """
        Получить значение из кэша.
        
        Args:
            key: Ключ кэша
            default: Значение по умолчанию, если ключ не найден
        
        Returns:
            Значение из кэша или default
        """
        return cache.get(key, default)
    
    def set(self, key: str, value: Any, timeout: Optional[int] = None) -> bool:
        """
        Сохранить значение в кэше.
        
        Args:
            key: Ключ кэша
            value: Значение для сохранения
            timeout: Время жизни в секундах (если None, используется значение по умолчанию)
        
        Returns:
            True, если успешно сохранено
        """
        if timeout is None:
            timeout = self.default_timeout
        
        return cache.set(key, value, timeout)
    
    def delete(self, key: str) -> bool:
        """
        Удалить значение из кэша.
        
        Args:
            key: Ключ кэша для удаления
        
        Returns:
            True, если успешно удалено
        """
        return cache.delete(key)
    
    def get_or_set(self, key: str, callable_func, timeout: Optional[int] = None) -> Any:
        """
        Получить значение из кэша или установить его, если не существует.
        
        Args:
            key: Ключ кэша
            callable_func: Функция для получения значения, если его нет в кэше
            timeout: Время жизни в секундах
        
        Returns:
            Значение из кэша или результат callable_func
        """
        if timeout is None:
            timeout = self.default_timeout
        
        return cache.get_or_set(key, callable_func, timeout)
    
    def delete_pattern(self, pattern: str) -> int:
        """
        Удалить все ключи, соответствующие паттерну.
        ВНИМАНИЕ: Может быть медленной операцией в больших кэшах.
        
        Args:
            pattern: Паттерн для поиска ключей (например, 'users:*')
        
        Returns:
            Количество удаленных ключей
        """
        # Django не предоставляет встроенного метода для удаления по паттерну
        # Это базовая реализация, которая может быть улучшена в зависимости от бэкенда кэша
        try:
            # Пытаемся использовать метод keys, если он поддерживается бэкендом
            keys = cache.keys(pattern)
            if keys:
                cache.delete_many(keys)
                return len(keys)
        except (AttributeError, NotImplementedError):
            # Если метод keys не поддерживается, возвращаем 0
            # В production для Redis можно использовать redis-py напрямую
            pass
        return 0


class ModelCacheService(CacheService):
    """
    Специализированный сервис кэширования для Django моделей.
    """
    
    def get_model_instance(self, model_class, pk: Union[str, int], timeout: Optional[int] = None) -> Any:
        """
        Получить экземпляр модели из кэша или базы данных.
        
        Args:
            model_class: Класс Django модели
            pk: Первичный ключ
            timeout: Время жизни кэша
        
        Returns:
            Экземпляр модели
        """
        key = self.make_key(f"{model_class._meta.label_lower}:instance", pk)
        
        instance = self.get(key)
        if instance is None:
            instance = model_class.objects.get(pk=pk)
            self.set(key, instance, timeout)
        
        return instance
    
    def get_model_queryset(self, model_class, filter_kwargs: dict, timeout: Optional[int] = None) -> Any:
        """
        Получить QuerySet модели из кэша.
        
        Args:
            model_class: Класс Django модели
            filter_kwargs: Аргументы фильтрации
            timeout: Время жизни кэша
        
        Returns:
            QuerySet модели
        """
        key = self.make_key(f"{model_class._meta.label_lower}:queryset", filter_kwargs)
        
        queryset = self.get(key)
        if queryset is None:
            queryset = model_class.objects.filter(**filter_kwargs)
            self.set(key, queryset, timeout)
        
        return queryset
    
    def invalidate_model_instance(self, model_class, pk: Union[str, int]) -> bool:
        """
        Инвалидировать кэш экземпляра модели.
        
        Args:
            model_class: Класс Django модели
            pk: Первичный ключ
        
        Returns:
            True, если успешно удалено
        """
        key = self.make_key(f"{model_class._meta.label_lower}:instance", pk)
        return self.delete(key)
    
    def invalidate_model_queryset(self, model_class, filter_kwargs: dict) -> bool:
        """
        Инвалидировать кэш QuerySet модели.
        
        Args:
            model_class: Класс Django модели
            filter_kwargs: Аргументы фильтрации
        
        Returns:
            True, если успешно удалено
        """
        key = self.make_key(f"{model_class._meta.label_lower}:queryset", filter_kwargs)
        return self.delete(key)


# Глобальный экземпляр сервиса кэширования
cache_service = CacheService()
model_cache_service = ModelCacheService()


# Утилиты для часто используемых кэшей
class CommonCacheKeys:
    """Класс для часто используемых ключей кэша."""
    
    @staticmethod
    def categories_list(timeout: int = 3600) -> tuple:
        """Ключ для списка категорий."""
        return ("categories:list", timeout)
    
    @staticmethod
    def producer_detail(producer_id: Union[str, int], timeout: int = 300) -> tuple:
        """Ключ для деталей производителя."""
        return (f"producer:{producer_id}", timeout)
    
    @staticmethod
    def dish_detail(dish_id: Union[str, int], timeout: int = 300) -> tuple:
        """Ключ для деталей блюда."""
        return (f"dish:{dish_id}", timeout)
    
    @staticmethod
    def user_orders(user_id: Union[str, int], timeout: int = 60) -> tuple:
        """Ключ для списка заказов пользователя."""
        return (f"user:{user_id}:orders", timeout)
    
    @staticmethod
    def producer_orders(producer_id: Union[str, int], timeout: int = 60) -> tuple:
        """Ключ для списка заказов производителя."""
        return (f"producer:{producer_id}:orders", timeout)