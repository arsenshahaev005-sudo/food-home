import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from api.models import Dish

print('Total dishes:', Dish.objects.count())
print('\nAll dishes:')
for d in Dish.objects.all():
    print(f'  - {d.name}')
    print(f'    ID: {d.id}')
    print(f'    Producer ID: {d.producer_id}')
    print(f'    Is Archived: {d.is_archived}')
    print(f'    Is Available: {d.is_available}')
    print()
