"""
Улучшенная система разрешений для API.
"""

from rest_framework import permissions


class IsOwnerOrReadOnly(permissions.BasePermission):
    """
    Разрешение, позволяющее редактировать объект только его владельцу.
    Для остальных разрешено только чтение.
    """
    
    def has_object_permission(self, request, view, obj):
        # Разрешения на чтение для всех запросов
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # Проверяем, является ли пользователь владельцем объекта
        # Предполагаем, что у объекта есть атрибут 'user' или 'owner'
        if hasattr(obj, 'user'):
            return obj.user == request.user
        elif hasattr(obj, 'owner'):
            return obj.owner == request.user
        return False


class IsOwner(permissions.BasePermission):
    """
    Разрешение, позволяющее взаимодействовать с объектом только его владельцу.
    """
    
    def has_object_permission(self, request, view, obj):
        # Проверяем, является ли пользователь владельцем объекта
        if hasattr(obj, 'user'):
            return obj.user == request.user
        elif hasattr(obj, 'owner'):
            return obj.owner == request.user
        elif hasattr(obj, 'created_by'):
            return obj.created_by == request.user
        return False


class IsAdminOrReadOnly(permissions.BasePermission):
    """
    Разрешение, позволяющее доступ только администраторам или только чтение.
    """
    
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return request.user and request.user.is_staff


class IsAdmin(permissions.BasePermission):
    """
    Разрешение, позволяющее доступ только администраторам.
    """
    
    def has_permission(self, request, view):
        return request.user and request.user.is_staff
    
    def has_object_permission(self, request, view, obj):
        return request.user and request.user.is_staff


class IsAuthenticatedAndActive(permissions.BasePermission):
    """
    Разрешение, требующее аутентификации и активности пользователя.
    """
    
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.is_active


class OrderPermissions(permissions.BasePermission):
    """
    Пользовательские разрешения для заказов.
    """
    
    def has_object_permission(self, request, view, obj):
        # Любой аутентифицированный пользователь может читать заказ
        if request.method in permissions.SAFE_METHODS:
            return request.user.is_authenticated
        
        # Владелец заказа может обновлять/удалять свой заказ
        if hasattr(obj, 'user') and obj.user == request.user:
            return True
        
        # Продавец может обновлять заказы своих блюд
        if hasattr(obj, 'dish') and hasattr(obj.dish, 'producer') and \
           hasattr(obj.dish.producer, 'user') and obj.dish.producer.user == request.user:
            return True
        
        # Администратор может делать всё
        if request.user.is_staff:
            return True
        
        return False


class ProducerPermissions(permissions.BasePermission):
    """
    Пользовательские разрешения для производителей.
    """
    
    def has_object_permission(self, request, view, obj):
        # Любой может читать информацию о производителе
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # Только владелец производителя может обновлять/удалять
        if hasattr(obj, 'user') and obj.user == request.user:
            return True
        
        # Администратор может делать всё
        if request.user.is_staff:
            return True
        
        return False