from django.db import models
from django.conf import settings

class AuditLog(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="audit_logs"
    )
    action = models.CharField(max_length=150)
    ip_address = models.CharField(max_length=45, blank=True, null=True)
    details = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-timestamp"]

    def __str__(self):
        username = self.user.username if self.user else "Anonymous"
        return f"{username} - {self.action} at {self.timestamp}"
