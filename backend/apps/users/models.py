"""Users domain models."""
from django.db import models
from django.contrib.auth.models import AbstractUser


class User(AbstractUser):
    """Extended user model for the application."""
    pass
