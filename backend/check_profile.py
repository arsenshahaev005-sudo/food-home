import os

import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from api.models import Dish, Profile

print('All Seller Profiles:')
seller_profiles = Profile.objects.filter(role='SELLER')
for p in seller_profiles:
    print(f'  - User: {p.user.email}')
    print(f'    Producer ID: {p.producer_id}')
    print(f'    Dishes count: {Dish.objects.filter(producer_id=p.producer_id).count()}')
    print()
