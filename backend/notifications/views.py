from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Notification
from .serializers import NotificationSerializer

class NotificationViewSet(viewsets.ModelViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user)

    @action(detail=True, methods=["post"], url_path="mark-read")
    def mark_read(self, request, pk=None):
        notification = self.get_object()
        notification.is_read = True
        notification.save()
        return Response({"status": "notification marked as read"})

    @action(detail=False, methods=["post"], url_path="mark-all-read")
    def mark_all_read(self, request):
        Notification.objects.filter(user=request.user, is_read=False).update(is_read=True)
        return Response({"status": "all notifications marked as read"})

from .models import WhatsAppLog
from .serializers import WhatsAppLogSerializer

class WhatsAppLogViewSet(viewsets.ModelViewSet):
    queryset = WhatsAppLog.objects.all().order_by("-sent_at")
    serializer_class = WhatsAppLogSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = WhatsAppLog.objects.all().order_by("-sent_at")
        phone = self.request.query_params.get("phone", None)
        msg_type = self.request.query_params.get("type", None)
        if phone:
            queryset = queryset.filter(phone=phone)
        if msg_type:
            queryset = queryset.filter(message_type=msg_type)
        return queryset
