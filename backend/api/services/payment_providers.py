from abc import ABC, abstractmethod
from decimal import Decimal
from typing import Any, Dict


class BasePaymentProvider(ABC):
    @abstractmethod
    def init_payment(
        self,
        *,
        payment_id: str,
        amount: Decimal,
        description: str,
        return_url: str,
    ) -> Dict[str, Any]:
        ...

    @abstractmethod
    def simulate_success(self, provider_payment_id: str) -> None:
        ...

    @abstractmethod
    def simulate_fail(self, provider_payment_id: str) -> None:
        ...

    @abstractmethod
    def refund(self, provider_payment_id: str, amount: Decimal) -> Dict[str, Any]:
        ...


class DevFakePaymentProvider(BasePaymentProvider):
    def init_payment(
        self,
        *,
        payment_id: str,
        amount: Decimal,
        description: str,
        return_url: str,
    ) -> Dict[str, Any]:
        provider_payment_id = f"dev-{payment_id}"
        payment_url = f"{return_url}?payment_id={payment_id}"
        return {
            "provider_payment_id": provider_payment_id,
            "payment_url": payment_url,
            "raw": {"dev": True, "description": description},
        }

    def simulate_success(self, provider_payment_id: str) -> None:
        return

    def simulate_fail(self, provider_payment_id: str) -> None:
        return

    def refund(self, provider_payment_id: str, amount: Decimal) -> Dict[str, Any]:
        return {"refunded_amount": str(amount)}

