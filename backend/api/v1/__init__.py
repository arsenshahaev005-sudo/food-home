"""
API v1 endpoints - В РАЗРАБОТКЕ

TODO: Эти endpoints будут активированы после завершения миграции.
См. docs/plans/architecture-reorganization-plan.md для деталей.

Новая структура api/v1/ создана как foundation для будущей миграции.
Она временно отключена в backend/backend/urls.py и будет активирована после:
- Переноса моделей в apps/
- Реализации serializers и views
- Миграции существующих endpoints

Текущий API работает через существующие routes в api/urls.py
"""

# Импорты временно закомментированы до завершения миграции
# from api.v1.users.urls import router as users_router
# from api.v1.catalog.urls import router as catalog_router
# from api.v1.orders.urls import router as orders_router
# from api.v1.producers.urls import router as producers_router
# from api.v1.cart.urls import router as cart_router
# from api.v1.payments.urls import router as payments_router
# from api.v1.gifts.urls import router as gifts_router
#
# __all__ = [
#     'users_router',
#     'catalog_router',
#     'orders_router',
#     'producers_router',
#     'cart_router',
#     'payments_router',
#     'gifts_router',
# ]
