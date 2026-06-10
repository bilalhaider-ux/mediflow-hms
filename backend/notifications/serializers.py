from rest_framework import serializers
from .models import Notification

class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ["id", "title", "message", "is_read", "created_at"]
        read_only_fields = ["id", "title", "message", "created_at"]

from .models import WhatsAppLog

class WhatsAppLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = WhatsAppLog
        fields = ["id", "phone", "message_body", "message_type", "sent_at"]
        read_only_fields = ["id", "sent_at"]
