# -*- coding: utf-8 -*-
"""
Скрипт для создания администратора и тестовых пользователей.
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from django.contrib.auth import get_user_model
from api.models import Profile

User = get_user_model()

def create_users():
    """Создание администратора и тестовых пользователей."""
    
    # Проверяем, существует ли администратор
    admin_email = 'admin@foodhome.com'
    if not User.objects.filter(email=admin_email).exists():
        admin = User.objects.create_superuser(
            username='admin',
            email=admin_email,
            password='admin123',
            first_name='Admin',
            last_name='User'
        )
        Profile.objects.create(user=admin, phone='+79990000000')
        print(f'+ Created admin: {admin_email}')
    else:
        print(f'+ Admin already exists: {admin_email}')
    
    # Проверяем, существует ли тестовый пользователь
    test_email = 'test@example.com'
    if not User.objects.filter(email=test_email).exists():
        test_user = User.objects.create_user(
            username='testuser',
            email=test_email,
            password='test123',
            first_name='Test',
            last_name='User'
        )
        Profile.objects.create(user=test_user, phone='+79001234567')
        print(f'+ Created test user: {test_email}')
    else:
        print(f'+ Test user already exists: {test_email}')
    
    # Создаем тестового продавца
    seller_email = 'seller@example.com'
    if not User.objects.filter(email=seller_email).exists():
        seller = User.objects.create_user(
            username='seller',
            email=seller_email,
            password='seller123',
            first_name='Seller',
            last_name='User'
        )
        Profile.objects.create(user=seller, phone='+79001234568')
        print(f'+ Created test seller: {seller_email}')
    else:
        print(f'+ Test seller already exists: {seller_email}')
    
    # Выводим статистику
    print(f'\nUser statistics:')
    print(f'  Total users: {User.objects.count()}')
    print(f'  Active users: {User.objects.filter(is_active=True).count()}')
    print(f'  Admins: {User.objects.filter(is_superuser=True).count()}')

if __name__ == '__main__':
    create_users()
