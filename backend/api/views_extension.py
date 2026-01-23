
class PaymentMethodViewSet(viewsets.ModelViewSet):
    serializer_class = PaymentMethodSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return PaymentMethod.objects.filter(user=self.request.user).order_by('-is_default', '-created_at')

    def perform_create(self, serializer):
        # If this is the first method, make it default
        is_default = False
        if not PaymentMethod.objects.filter(user=self.request.user).exists():
            is_default = True
        
        serializer.save(user=self.request.user, is_default=is_default)

    @action(detail=True, methods=['post'])
    def set_default(self, request, pk=None):
        method = self.get_object()
        PaymentMethod.objects.filter(user=request.user).update(is_default=False)
        method.is_default = True
        method.save()
        return Response({'detail': 'Set as default'})


class UserDeviceViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = UserDeviceSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return UserDevice.objects.filter(user=self.request.user).order_by('-last_active')

    @action(detail=True, methods=['post'])
    def logout(self, request, pk=None):
        # Logic to invalidate token would go here
        # For now just delete the device record
        device = self.get_object()
        device.delete()
        return Response({'detail': 'Device logged out'})


class NotificationViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user).order_by('-created_at')

    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        notification = self.get_object()
        notification.is_read = True
        notification.save()
        return Response({'detail': 'Marked as read'})

    @action(detail=False, methods=['post'])
    def mark_all_read(self, request):
        Notification.objects.filter(user=request.user, is_read=False).update(is_read=True)
        return Response({'detail': 'All marked as read'})


class HelpArticleViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = HelpArticle.objects.filter(is_published=True)
    serializer_class = HelpArticleSerializer
    permission_classes = [AllowAny]
    search_fields = ['question', 'answer', 'category']
    filter_backends = [SearchFilter]


class BecomeSellerView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if hasattr(request.user, 'producer'):
            return Response({'detail': 'You are already a seller'}, status=status.HTTP_400_BAD_REQUEST)

        # Create producer profile
        data = request.data
        name = data.get('name', f"{request.user.first_name}'s Kitchen")
        city = data.get('city', 'Unknown')
        
        producer = Producer.objects.create(
            user=request.user,
            name=name,
            city=city,
            producer_type=data.get('producer_type', 'SELF_EMPLOYED')
        )
        
        return Response(ProducerSerializer(producer).data, status=status.HTTP_201_CREATED)
