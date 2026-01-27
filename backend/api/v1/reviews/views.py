"""Reviews API v1 views."""
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from api.models import Review
from api.services.review_service import ReviewService

from .serializers import (
    ReviewCorrectionAcceptSerializer,
    ReviewCorrectionRequestSerializer,
    ReviewSerializer,
)


class ReviewViewSet(viewsets.ModelViewSet):
    """ViewSet для управления отзывами."""

    queryset = Review.objects.select_related('user', 'order', 'producer').all()
    serializer_class = ReviewSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Фильтрация отзывов по правам доступа."""
        user = self.request.user
        queryset = super().get_queryset()

        # Если пользователь - производитель, показываем только отзывы о его товарах
        if hasattr(user, 'producer'):
            queryset = queryset.filter(producer=user.producer)
        # Иначе показываем только отзывы пользователя
        else:
            queryset = queryset.filter(user=user)

        return queryset

    @action(detail=True, methods=['post'])
    def request_correction(self, request, pk=None):
        """
        Продавец запрашивает исправление оценки.
        """
        review = self.get_object()
        producer = request.user.producer

        # Проверяем, что отзыв принадлежит этому производителю
        if review.producer != producer:
            return Response(
                {"error": "Review does not belong to this producer"},
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = ReviewCorrectionRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        try:
            updated_review = ReviewService.request_review_correction(
                review=review,
                producer=producer,
                refund_amount=serializer.validated_data['refund_amount']
            )
            return Response(
                ReviewSerializer(updated_review).data,
                status=status.HTTP_200_OK
            )
        except ValueError as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=True, methods=['post'])
    def accept_correction(self, request, pk=None):
        """
        Покупатель принимает и исправляет оценку.
        """
        review = self.get_object()
        buyer = request.user

        # Проверяем, что отзыв принадлежит этому покупателю
        if review.user != buyer:
            return Response(
                {"error": "Review does not belong to this user"},
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = ReviewCorrectionAcceptSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        try:
            updated_review = ReviewService.accept_review_correction(
                review=review,
                buyer=buyer,
                new_ratings=serializer.validated_data
            )
            return Response(
                ReviewSerializer(updated_review).data,
                status=status.HTTP_200_OK
            )
        except ValueError as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=True, methods=['post'])
    def reject_correction(self, request, pk=None):
        """
        Покупатель отклоняет предложение.
        """
        review = self.get_object()
        buyer = request.user

        # Проверяем, что отзыв принадлежит этому покупателю
        if review.user != buyer:
            return Response(
                {"error": "Review does not belong to this user"},
                status=status.HTTP_403_FORBIDDEN
            )

        try:
            updated_review = ReviewService.reject_review_correction(
                review=review,
                buyer=buyer
            )
            return Response(
                ReviewSerializer(updated_review).data,
                status=status.HTTP_200_OK
            )
        except ValueError as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
