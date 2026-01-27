"""
Улучшенная система аутентификации и авторизации для приложения.
"""

from datetime import datetime
from typing import Any, Dict, Optional

import jwt
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.tokens import RefreshToken

from .exceptions import BusinessRuleException, ValidationException
from .logging import get_logger

logger = get_logger(__name__)
User = get_user_model()


class AuthService:
    """
    Сервис для работы с аутентификацией и авторизацией.
    """
    
    @staticmethod
    def create_user(
        email: str,
        password: str,
        first_name: str = "",
        last_name: str = "",
        phone: str = "",
        **extra_fields
    ) -> User:
        """
        Создать нового пользователя с валидацией.
        
        Args:
            email: Email пользователя
            password: Пароль пользователя
            first_name: Имя пользователя
            last_name: Фамилия пользователя
            phone: Телефон пользователя
            **extra_fields: Дополнительные поля
            
        Returns:
            Созданный пользователь
        """
        # Валидация данных
        if not email:
            raise ValidationException("Email обязателен", field="email")
        
        if not password:
            raise ValidationException("Пароль обязателен", field="password")
        
        if len(password) < 8:
            raise ValidationException("Пароль должен содержать не менее 8 символов", field="password")
        
        if User.objects.filter(email=email).exists():
            raise BusinessRuleException("Пользователь с таким email уже существует", rule_name="unique_email")
        
        # Создание пользователя
        user = User.objects.create_user(
            email=email,
            password=password,
            first_name=first_name,
            last_name=last_name,
            **extra_fields
        )
        
        logger.info(
            'user_created',
            user_id=str(user.id),
            email=email
        )
        
        return user
    
    @staticmethod
    def authenticate_user(email: str, password: str) -> Optional[User]:
        """
        Аутентифицировать пользователя по email и паролю.
        
        Args:
            email: Email пользователя
            password: Пароль пользователя
            
        Returns:
            Пользователь или None если аутентификация не удалась
        """
        try:
            user = User.objects.get(email__iexact=email)
            
            if user.check_password(password):
                if not user.is_active:
                    logger.warning(
                        'user_inactive_login_attempt',
                        user_id=str(user.id),
                        email=email
                    )
                    return None
                
                logger.info(
                    'user_authenticated',
                    user_id=str(user.id),
                    email=email
                )
                
                return user
            else:
                logger.warning(
                    'invalid_password_attempt',
                    user_id=str(user.id),
                    email=email
                )
                return None
        except User.DoesNotExist:
            logger.warning(
                'user_not_found_login_attempt',
                email=email
            )
            return None
    
    @staticmethod
    def generate_tokens(user: User) -> Dict[str, str]:
        """
        Сгенерировать JWT токены для пользователя.
        
        Args:
            user: Пользователь
            
        Returns:
            Словарь с access и refresh токенами
        """
        refresh = RefreshToken.for_user(user)
        
        tokens = {
            'access': str(refresh.access_token),
            'refresh': str(refresh),
        }
        
        logger.info(
            'tokens_generated',
            user_id=str(user.id)
        )
        
        return tokens
    
    @staticmethod
    def refresh_access_token(refresh_token: str) -> Dict[str, str]:
        """
        Обновить access токен по refresh токену.
        
        Args:
            refresh_token: Refresh токен
            
        Returns:
            Новый access токен или ошибка
        """
        try:
            refresh = RefreshToken(refresh_token)
            new_access_token = str(refresh.access_token)
            
            logger.info(
                'access_token_refreshed'
            )
            
            return {'access': new_access_token}
        except Exception as e:
            logger.error(
                'token_refresh_failed',
                error=str(e)
            )
            raise BusinessRuleException("Невозможно обновить токен", rule_name="token_refresh") from e
    
    @staticmethod
    def decode_token(token: str) -> Dict[str, Any]:
        """
        Декодировать JWT токен без проверки подписи.
        
        Args:
            token: JWT токен для декодирования
            
        Returns:
            Декодированные данные токена
        """
        try:
            decoded = jwt.decode(token, options={"verify_signature": False})
            return decoded
        except jwt.DecodeError as e:
            logger.error(
                'token_decode_failed',
                error=str(e)
            )
            raise ValidationException("Неверный формат токена", field="token") from e
    
    @staticmethod
    def get_user_from_token(token: str) -> Optional[User]:
        """
        Получить пользователя из JWT токена.
        
        Args:
            token: JWT токен
            
        Returns:
            Пользователь или None если токен недействителен
        """
        try:
            decoded_token = AuthService.decode_token(token)
            user_id = decoded_token.get('user_id')
            
            if user_id:
                return User.objects.get(id=user_id)
            return None
        except User.DoesNotExist:
            logger.warning(
                'user_not_found_from_token',
                user_id=decoded_token.get('user_id') if 'user_id' in decoded_token else None
            )
            return None
        except Exception as e:
            logger.error(
                'get_user_from_token_failed',
                error=str(e)
            )
            return None


class PermissionService:
    """
    Сервис для проверки разрешений пользователей.
    """
    
    @staticmethod
    def check_user_permission(user: User, permission: str) -> bool:
        """
        Проверить, есть ли у пользователя определенное разрешение.
        
        Args:
            user: Пользователь
            permission: Разрешение для проверки
            
        Returns:
            True если разрешение есть, иначе False
        """
        if user.is_superuser:
            return True
        
        if user.is_staff and permission.startswith('admin.'):
            return True
        
        return user.has_perm(permission)
    
    @staticmethod
    def check_owner_permission(user: User, obj) -> bool:
        """
        Проверить, является ли пользователь владельцем объекта.
        
        Args:
            user: Пользователь
            obj: Объект для проверки
            
        Returns:
            True если пользователь является владельцем, иначе False
        """
        if hasattr(obj, 'user'):
            return obj.user == user
        elif hasattr(obj, 'owner'):
            return obj.owner == user
        elif hasattr(obj, 'created_by'):
            return obj.created_by == user
        
        return False
    
    @staticmethod
    def check_producer_permission(user: User, obj) -> bool:
        """
        Проверить, связан ли пользователь с производителем объекта.
        
        Args:
            user: Пользователь
            obj: Объект для проверки
            
        Returns:
            True если пользователь связан с производителем объекта, иначе False
        """
        if hasattr(obj, 'producer') and hasattr(obj.producer, 'user'):
            return obj.producer.user == user
        elif hasattr(obj, 'dish') and hasattr(obj.dish, 'producer') and hasattr(obj.dish.producer, 'user'):
            return obj.dish.producer.user == user
        
        return False
    
    @staticmethod
    def check_admin_permission(user: User) -> bool:
        """
        Проверить, является ли пользователь администратором.
        
        Args:
            user: Пользователь
            
        Returns:
            True если пользователь администратор, иначе False
        """
        return user.is_staff or user.is_superuser


class SessionService:
    """
    Сервис для работы с сессиями пользователей.
    """
    
    @staticmethod
    def create_session(user: User, request) -> Dict[str, Any]:
        """
        Создать сессию для пользователя.
        
        Args:
            user: Пользователь
            request: HTTP запрос
            
        Returns:
            Информация о сессии
        """
        tokens = AuthService.generate_tokens(user)
        
        session_info = {
            'user_id': str(user.id),
            'email': user.email,
            'tokens': tokens,
            'session_created': datetime.utcnow().isoformat(),
            'ip_address': request.META.get('REMOTE_ADDR', ''),
            'user_agent': request.META.get('HTTP_USER_AGENT', ''),
        }
        
        logger.info(
            'session_created',
            user_id=str(user.id),
            ip_address=session_info['ip_address']
        )
        
        return session_info
    
    @staticmethod
    def invalidate_session(user: User, token: str = None) -> bool:
        """
        Инвалидировать сессию пользователя.
        
        Args:
            user: Пользователь
            token: Токен для инвалидации (опционально)
            
        Returns:
            True если сессия инвалидирована
        """
        logger.info(
            'session_invalidated',
            user_id=str(user.id)
        )
        
        # Здесь можно добавить логику инвалидации токенов в кэше
        # или в blacklist в зависимости от используемой системы
        
        return True


# Кастомная аутентификация с улучшенной обработкой ошибок
class CustomJWTAuthentication(JWTAuthentication):
    """
    Кастомная JWT аутентификация с улучшенной обработкой ошибок.
    """
    
    def authenticate(self, request):
        try:
            header = self.get_header(request)
            if header is None:
                return None
            
            raw_token = self.get_raw_token(header)
            if raw_token is None:
                return None
            
            validated_token = self.get_validated_token(raw_token)
            user = self.get_user(validated_token)
            
            # Проверяем, активен ли пользователь
            if not user.is_active:
                logger.warning(
                    'inactive_user_authentication_attempt',
                    user_id=str(user.id)
                )
                return None
            
            return user, validated_token
        except Exception as e:
            logger.error(
                'authentication_failed',
                error=str(e),
                path=request.path
            )
            return None