import hashlib
import requests
import json
from django.conf import settings

class TinkoffClient:
    def __init__(self, terminal_key, password):
        self.terminal_key = terminal_key
        self.password = password
        self.base_url = "https://securepay.tinkoff.ru/v2"

    def _generate_token(self, data):
        """
        Generates the signature (Token) for the request.
        Sorts arguments alphabetically, concatenates values, appends password, and hashes with SHA-256.
        """
        # Filter out fields that shouldn't be in the token (if any specific ones, usually Receipt or Data might need handling)
        # Standard Tinkoff algorithm:
        # 1. Add Password to params
        # 2. Sort by key
        # 3. Concatenate values
        # 4. SHA256
        
        params = data.copy()
        params['Password'] = self.password
        
        # Sort keys
        sorted_keys = sorted(params.keys())
        
        # Concatenate values
        concatenated = ''.join(str(params[key]) for key in sorted_keys)
        
        # Hash
        return hashlib.sha256(concatenated.encode('utf-8')).hexdigest()

    def init_payment(self, order_id, amount, description="Payment", customer_key=None):
        """
        Initialize a payment session.
        amount is in kopecks (e.g. 1000 = 10 RUB)
        """
        data = {
            "TerminalKey": self.terminal_key,
            "Amount": amount,
            "OrderId": str(order_id),
            "Description": description,
        }
        
        if customer_key:
            data['CustomerKey'] = customer_key
            # If saving card, might need Recurrent='Y' or PayType='O' depending on scenario
            
        data['Token'] = self._generate_token(data)

        try:
            response = requests.post(f"{self.base_url}/Init", json=data)
            return response.json()
        except Exception as e:
            return {"Success": False, "Message": str(e)}

    def get_qr(self, payment_id):
        """
        Get SBP QR Code payload for a specific payment ID.
        """
        data = {
            "TerminalKey": self.terminal_key,
            "PaymentId": payment_id,
            "DataType": "PAYLOAD" # PAYLOAD returns the raw string for QR, IMAGE returns an image
        }
        
        data['Token'] = self._generate_token(data)
        
        try:
            response = requests.post(f"{self.base_url}/GetQr", json=data)
            return response.json()
        except Exception as e:
            return {"Success": False, "Message": str(e)}

# Mock client for development
class MockTinkoffClient:
    def init_payment(self, order_id, amount, description="Payment", customer_key=None):
        return {
            "Success": True,
            "PaymentId": "mock_payment_id_12345",
            "PaymentURL": "https://securepay.tinkoff.ru/rest/Authorize/12345"
        }
        
    def get_qr(self, payment_id):
        return {
            "Success": True,
            "Data": "https://sbp.nspk.ru/pay?id=10000000000000000000000000000000",
            "PaymentId": payment_id
        }

def get_client():
    # In a real app, load these from settings/env
    TERMINAL_KEY = getattr(settings, 'TINKOFF_TERMINAL_KEY', None)
    PASSWORD = getattr(settings, 'TINKOFF_PASSWORD', None)
    
    if TERMINAL_KEY and PASSWORD:
        return TinkoffClient(TERMINAL_KEY, PASSWORD)
    return MockTinkoffClient()
