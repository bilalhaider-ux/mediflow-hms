from django.contrib.auth.models import AbstractUser, UserManager
from django.db import models
from django.utils import timezone

class SoftDeleteQuerySet(models.QuerySet):
    def delete(self):
        return super().update(deleted_at=timezone.now(), is_active=False)

    def hard_delete(self):
        return super().delete()

    def alive(self):
        return self.filter(deleted_at__isnull=True)

    def dead(self):
        return self.filter(deleted_at__isnull=False)

class SoftDeleteManager(models.Manager):
    def get_queryset(self):
        return SoftDeleteQuerySet(self.model, using=self._db).alive()

    def all_with_deleted(self):
        return SoftDeleteQuerySet(self.model, using=self._db)

class CustomUserManager(UserManager):
    def get_queryset(self):
        return SoftDeleteQuerySet(self.model, using=self._db).alive()

    def all_with_deleted(self):
        return SoftDeleteQuerySet(self.model, using=self._db)

class SoftDeleteModel(models.Model):
    is_active = models.BooleanField(default=True)
    deleted_at = models.DateTimeField(null=True, blank=True)

    objects = SoftDeleteManager()

    class Meta:
        abstract = True

    def delete(self, *args, **kwargs):
        self.deleted_at = timezone.now()
        self.is_active = False
        self.save()

    def restore(self):
        self.deleted_at = None
        self.is_active = True
        self.save()
        
    def hard_delete(self, *args, **kwargs):
        super().delete(*args, **kwargs)

class Branch(SoftDeleteModel):
    name = models.CharField(max_length=100, unique=True)
    city = models.CharField(max_length=50)
    address = models.TextField(blank=True, null=True)
    phone = models.CharField(max_length=20, blank=True, null=True)
    email = models.EmailField(blank=True, null=True)
    manager = models.ForeignKey("User", on_delete=models.SET_NULL, null=True, blank=True, related_name="managed_branches")

    def __str__(self):
        return f"{self.name} ({self.city})"

class User(AbstractUser, SoftDeleteModel):
    ROLE_CHOICES = (
        ("ADMIN", "Administrator"),
        ("SUB_ADMIN", "Branch Administrator"),
        ("DOCTOR", "Doctor"),
        ("RECEPTIONIST", "Receptionist"),
        ("PHARMACIST", "Pharmacist"),
        ("LAB_TECH", "Lab Technician"),
        ("PATIENT", "Patient"),
    )
    
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default="PATIENT")
    phone_number = models.CharField(max_length=20, blank=True, null=True)
    branch = models.ForeignKey(Branch, on_delete=models.SET_NULL, null=True, blank=True, related_name="users")
    
    objects = CustomUserManager()
    
    def __str__(self):
        return f"{self.username} ({self.role})"

class HospitalSettings(models.Model):
    hospital_name = models.CharField(max_length=200, default="MediFlow")
    tagline = models.CharField(max_length=200, blank=True, null=True)
    logo = models.ImageField(upload_to="hospital_logos/", blank=True, null=True)
    address = models.TextField(blank=True, null=True)
    phone = models.CharField(max_length=20, blank=True, null=True)
    email = models.EmailField(blank=True, null=True)

    # Financial Settings
    tax_percentage = models.DecimalField(default=0, max_digits=5, decimal_places=2)
    invoice_prefix = models.CharField(max_length=20, default="HMS-INV")
    currency_symbol = models.CharField(max_length=10, default="Rs.")
    doctor_fee_share = models.DecimalField(default=80, max_digits=5, decimal_places=2)

    # Notification Toggles
    whatsapp_enabled = models.BooleanField(default=True)
    sms_enabled = models.BooleanField(default=True)
    email_enabled = models.BooleanField(default=True)
    reminder_hours = models.IntegerField(default=24)

    # Working Hours
    opd_start_time = models.TimeField(default="09:00:00")
    opd_end_time = models.TimeField(default="17:00:00")
    off_days = models.CharField(max_length=100, default="Sunday")
    max_slots_per_hour = models.IntegerField(default=4)

    @classmethod
    def get(cls):
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj

    def __str__(self):
        return f"Hospital Settings: {self.hospital_name}"

