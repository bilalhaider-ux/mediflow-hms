from django.db import models
from django.conf import settings

class Notification(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notifications"
    )
    title = models.CharField(max_length=200)
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.title} for {self.user.username}"

class WhatsAppLog(models.Model):
    phone = models.CharField(max_length=20)
    message_body = models.TextField()
    message_type = models.CharField(max_length=50) # TOKEN, BILL, LAB_REPORT
    sent_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"WhatsApp to {self.phone} - Type: {self.message_type}"
