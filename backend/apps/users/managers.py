"""Users domain custom managers."""
from django.contrib.auth.models import UserManager as BaseUserManager


class UserManager(BaseUserManager):
    """Custom user manager with additional query methods."""
    pass
