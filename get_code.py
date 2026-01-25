import os
import sys
import django

# Add the backend directory to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from api.models import PendingRegistration

# Get the verification code for test@example.com
pending_reg = PendingRegistration.objects.filter(email='test@example.com').first()
if pending_reg:
    print(f"Verification code: {pending_reg.verification_code}")
else:
    print("No pending registration found for test@example.com")
