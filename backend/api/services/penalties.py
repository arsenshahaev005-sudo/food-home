from django.db import transaction

from api.models import Producer


class PenaltyService:
    def add_penalty(self, producer, points):
        if producer is None:
            return
        if not isinstance(producer, Producer):
            return
        if points <= 0:
            return
        with transaction.atomic():
            producer.penalty_points = producer.penalty_points + int(points)
            producer.save(update_fields=["penalty_points"])

