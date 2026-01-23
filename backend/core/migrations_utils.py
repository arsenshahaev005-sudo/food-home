"""
Утилиты для улучшенного управления миграциями.
"""

from django.db import migrations, models
from django.db.migrations.operations.fields import AddField
from django.db.migrations.operations.models import CreateModel, DeleteModel
from django.db.migrations.operations.indexes import AddIndex, RemoveIndex
from django.db.migrations import RunPython, RunSQL
from typing import List, Dict, Any


class MigrationHelper:
    """
    Утилита для помощи в создании миграций.
    """
    
    @staticmethod
    def add_common_indexes(model_name: str) -> List[AddIndex]:
        """
        Добавить общие индексы для модели.
        
        Args:
            model_name: Название модели
            
        Returns:
            Список операций добавления индексов
        """
        return [
            AddIndex(
                model_name=model_name,
                index=models.Index(fields=['created_at'], name=f'{model_name.lower()}_created_at_idx'),
            ),
            AddIndex(
                model_name=model_name,
                index=models.Index(fields=['updated_at'], name=f'{model_name.lower()}_updated_at_idx'),
            ),
            AddIndex(
                model_name=model_name,
                index=models.Index(fields=['status'], name=f'{model_name.lower()}_status_idx'),
            ),
        ]
    
    @staticmethod
    def add_uuid_primary_key(model_name: str) -> List[AddField]:
        """
        Добавить UUID первичный ключ к модели.
        
        Args:
            model_name: Название модели
            
        Returns:
            Список операций добавления поля
        """
        return [
            AddField(
                model_name=model_name,
                name='id',
                field=models.UUIDField(primary_key=True, default=None, editable=False),
                preserve_default=False,
            ),
        ]
    
    @staticmethod
    def create_base_model_fields() -> List[models.Field]:
        """
        Создать список базовых полей для моделей.
        
        Returns:
            Список полей
        """
        return [
            models.UUIDField(primary_key=True, default=None, editable=False),
            models.DateTimeField(auto_now_add=True, db_index=True),
            models.DateTimeField(auto_now=True, db_index=True),
        ]


def create_order_related_models_migration():
    """
    Создать миграцию для создания связанных моделей заказа.
    """
    operations = [
        # Создание модели OrderDelivery
        migrations.CreateModel(
            name='OrderDelivery',
            fields=[
                ('id', models.UUIDField(primary_key=True, default=None, editable=False)),
                ('delivery_type', models.CharField(max_length=20, choices=[
                    ('BUILDING', 'To Building'),
                    ('DOOR', 'To Door')
                ], default='BUILDING')),
                ('delivery_price', models.DecimalField(max_digits=10, decimal_places=2, default=0)),
                ('delivery_address_text', models.TextField(blank=True, default="")),
                ('apartment', models.CharField(max_length=50, blank=True, default="")),
                ('entrance', models.CharField(max_length=50, blank=True, default="")),
                ('floor', models.CharField(max_length=50, blank=True, default="")),
                ('intercom', models.CharField(max_length=50, blank=True, default="")),
                ('delivery_comment', models.TextField(blank=True, default="")),
                ('delivery_latitude', models.DecimalField(max_digits=9, decimal_places=6, blank=True, null=True)),
                ('delivery_longitude', models.DecimalField(max_digits=9, decimal_places=6, blank=True, null=True)),
                ('recipient_address_text', models.TextField(blank=True)),
                ('recipient_latitude', models.DecimalField(max_digits=9, decimal_places=6, blank=True, null=True)),
                ('recipient_longitude', models.DecimalField(max_digits=9, decimal_places=6, blank=True, null=True)),
                ('recipient_specified_time', models.DateTimeField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True, db_index=True)),
                ('updated_at', models.DateTimeField(auto_now=True, db_index=True)),
            ],
            options={
                'db_table': 'order_delivery',
                'verbose_name': 'Order Delivery',
                'verbose_name_plural': 'Order Deliveries',
            },
        ),
        
        # Создание модели OrderFinance
        migrations.CreateModel(
            name='OrderFinance',
            fields=[
                ('id', models.UUIDField(primary_key=True, default=None, editable=False)),
                ('tips_amount', models.DecimalField(max_digits=10, decimal_places=2, default=0)),
                ('commission_rate_snapshot', models.DecimalField(max_digits=5, decimal_places=4, default=0.0)),
                ('commission_amount', models.DecimalField(max_digits=10, decimal_places=2, default=0)),
                ('producer_gross_amount', models.DecimalField(max_digits=10, decimal_places=2, default=0)),
                ('producer_net_amount', models.DecimalField(max_digits=10, decimal_places=2, default=0)),
                ('refunded_total_amount', models.DecimalField(max_digits=10, decimal_places=2, default=0)),
                ('refunded_tips_amount', models.DecimalField(max_digits=10, decimal_places=2, default=0)),
                ('refunded_commission_amount', models.DecimalField(max_digits=10, decimal_places=2, default=0)),
                ('payable_amount', models.DecimalField(max_digits=10, decimal_places=2, default=0)),
                ('payout_status', models.CharField(
                    max_length=20,
                    choices=[
                        ('NOT_ACCRUED', 'Not Accrued'),
                        ('ACCRUED', 'Accrued'),
                        ('PAID_OUT', 'Paid Out'),
                    ],
                    default='NOT_ACCRUED',
                )),
                ('payout_accrued_at', models.DateTimeField(blank=True, null=True)),
                ('payout_paid_at', models.DateTimeField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True, db_index=True)),
                ('updated_at', models.DateTimeField(auto_now=True, db_index=True)),
            ],
            options={
                'db_table': 'order_finance',
                'verbose_name': 'Order Finance',
                'verbose_name_plural': 'Order Finances',
            },
        ),
        
        # Создание модели OrderGift
        migrations.CreateModel(
            name='OrderGift',
            fields=[
                ('id', models.UUIDField(primary_key=True, default=None, editable=False)),
                ('is_gift', models.BooleanField(default=False)),
                ('is_anonymous', models.BooleanField(default=False)),
                ('recipient_phone', models.CharField(max_length=50, blank=True)),
                ('recipient_name', models.CharField(max_length=255, blank=True)),
                ('gift_proof_image', models.URLField(blank=True)),
                ('recipient_token', models.CharField(max_length=64, unique=True, blank=True, null=True, db_index=True)),
                ('recipient_token_expires_at', models.DateTimeField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True, db_index=True)),
                ('updated_at', models.DateTimeField(auto_now=True, db_index=True)),
            ],
            options={
                'db_table': 'order_gift',
                'verbose_name': 'Order Gift',
                'verbose_name_plural': 'Order Gifts',
            },
        ),
        
        # Создание модели OrderReschedule
        migrations.CreateModel(
            name='OrderReschedule',
            fields=[
                ('id', models.UUIDField(primary_key=True, default=None, editable=False)),
                ('reschedule_requested_by_seller', models.BooleanField(default=False)),
                ('reschedule_new_time', models.DateTimeField(blank=True, null=True)),
                ('reschedule_approved_by_buyer', models.BooleanField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True, db_index=True)),
                ('updated_at', models.DateTimeField(auto_now=True, db_index=True)),
            ],
            options={
                'db_table': 'order_reschedule',
                'verbose_name': 'Order Reschedule',
                'verbose_name_plural': 'Order Reschedules',
            },
        ),
        
        # Создание модели OrderPromo
        migrations.CreateModel(
            name='OrderPromo',
            fields=[
                ('id', models.UUIDField(primary_key=True, default=None, editable=False)),
                ('discount_amount', models.DecimalField(max_digits=10, decimal_places=2, default=0)),
                ('created_at', models.DateTimeField(auto_now_add=True, db_index=True)),
                ('updated_at', models.DateTimeField(auto_now=True, db_index=True)),
            ],
            options={
                'db_table': 'order_promo',
                'verbose_name': 'Order Promo',
                'verbose_name_plural': 'Order Promos',
            },
        ),
        
        # Создание модели OrderTimeline
        migrations.CreateModel(
            name='OrderTimeline',
            fields=[
                ('id', models.UUIDField(primary_key=True, default=None, editable=False)),
                ('created_at', models.DateTimeField(auto_now_add=True, db_index=True)),
                ('acceptance_deadline', models.DateTimeField(blank=True, null=True)),
                ('accepted_at', models.DateTimeField(blank=True, null=True)),
                ('ready_at', models.DateTimeField(blank=True, null=True)),
                ('delivered_at', models.DateTimeField(blank=True, null=True)),
                ('cancelled_at', models.DateTimeField(blank=True, null=True)),
                ('cancelled_by', models.CharField(max_length=20, choices=[
                    ('BUYER', 'Buyer'),
                    ('SELLER', 'Seller'),
                    ('ADMIN', 'Admin'),
                    ('SYSTEM', 'System'),
                ], blank=True, null=True)),
                ('cancelled_reason', models.TextField(blank=True)),
                ('estimated_cooking_time', models.PositiveIntegerField(default=0, help_text="Total minutes")),
                ('finished_photo', models.URLField(blank=True)),
                ('updated_at', models.DateTimeField(auto_now=True, db_index=True)),
            ],
            options={
                'db_table': 'order_timeline',
                'verbose_name': 'Order Timeline',
                'verbose_name_plural': 'Order Timelines',
            },
        ),
        
        # Создание модели OrderToppings
        migrations.CreateModel(
            name='OrderToppings',
            fields=[
                ('id', models.UUIDField(primary_key=True, default=None, editable=False)),
                ('selected_toppings', models.JSONField(default=list, blank=True, help_text="List of {name, price} selected toppings")),
                ('created_at', models.DateTimeField(auto_now_add=True, db_index=True)),
                ('updated_at', models.DateTimeField(auto_now=True, db_index=True)),
            ],
            options={
                'db_table': 'order_toppings',
                'verbose_name': 'Order Toppings',
                'verbose_name_plural': 'Order Toppings',
            },
        ),
        
        # Добавление внешних ключей к модели Order
        migrations.AddField(
            model_name='order',
            name='delivery_info',
            field=models.OneToOneField(to='api.OrderDelivery', on_delete=models.CASCADE, 
                                    related_name='order', null=True, blank=True),
        ),
        migrations.AddField(
            model_name='order',
            name='finance_info',
            field=models.OneToOneField(to='api.OrderFinance', on_delete=models.CASCADE, 
                                    related_name='order', null=True, blank=True),
        ),
        migrations.AddField(
            model_name='order',
            name='gift_info',
            field=models.OneToOneField(to='api.OrderGift', on_delete=models.CASCADE, 
                                    related_name='order', null=True, blank=True),
        ),
        migrations.AddField(
            model_name='order',
            name='reschedule_info',
            field=models.OneToOneField(to='api.OrderReschedule', on_delete=models.CASCADE, 
                                    related_name='order', null=True, blank=True),
        ),
        migrations.AddField(
            model_name='order',
            name='promo_info',
            field=models.OneToOneField(to='api.OrderPromo', on_delete=models.CASCADE, 
                                    related_name='order', null=True, blank=True),
        ),
        migrations.AddField(
            model_name='order',
            name='timeline_info',
            field=models.OneToOneField(to='api.OrderTimeline', on_delete=models.CASCADE, 
                                    related_name='order', null=True, blank=True),
        ),
        migrations.AddField(
            model_name='order',
            name='toppings_info',
            field=models.OneToOneField(to='api.OrderToppings', on_delete=models.CASCADE, 
                                    related_name='order', null=True, blank=True),
        ),
    ]
    
    return operations


def create_indexes_for_performance():
    """
    Создать миграцию для добавления индексов производительности.
    """
    return [
        # Индексы для модели Order
        migrations.AddIndex(
            model_name='order',
            index=models.Index(fields=['status', 'created_at'], name='order_status_created_idx'),
        ),
        migrations.AddIndex(
            model_name='order',
            index=models.Index(fields=['user', 'status'], name='order_user_status_idx'),
        ),
        migrations.AddIndex(
            model_name='order',
            index=models.Index(fields=['producer', 'status'], name='order_producer_status_idx'),
        ),
        migrations.AddIndex(
            model_name='order',
            index=models.Index(fields=['tinkoff_payment_id'], name='order_tinkoff_payment_id_idx'),
        ),
        migrations.AddIndex(
            model_name='order',
            index=models.Index(fields=['recipient_token'], name='order_recipient_token_idx'),
        ),
        
        # Индексы для модели Dish
        migrations.AddIndex(
            model_name='dish',
            index=models.Index(fields=['producer', 'is_available'], name='dish_producer_available_idx'),
        ),
        migrations.AddIndex(
            model_name='dish',
            index=models.Index(fields=['category', 'is_available'], name='dish_category_available_idx'),
        ),
        migrations.AddIndex(
            model_name='dish',
            index=models.Index(fields=['rating', 'is_available'], name='dish_rating_available_idx'),
        ),
        
        # Индексы для модели Producer
        migrations.AddIndex(
            model_name='producer',
            index=models.Index(fields=['city', 'is_hidden'], name='producer_city_hidden_idx'),
        ),
        migrations.AddIndex(
            model_name='producer',
            index=models.Index(fields=['rating', 'is_hidden'], name='producer_rating_hidden_idx'),
        ),
        
        # Индексы для модели Review
        migrations.AddIndex(
            model_name='review',
            index=models.Index(fields=['order'], name='review_order_idx'),
        ),
        migrations.AddIndex(
            model_name='review',
            index=models.Index(fields=['producer'], name='review_producer_idx'),
        ),
    ]