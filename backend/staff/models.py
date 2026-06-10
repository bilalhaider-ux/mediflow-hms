from decimal import Decimal
from django.db import models
from django.conf import settings
from django.utils import timezone
from authentication.models import SoftDeleteModel

class Department(SoftDeleteModel):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True, null=True)

    def __str__(self):
        return self.name

class Doctor(SoftDeleteModel):
    DOCTOR_TYPE_CHOICES = (
        ("GENERAL", "General Physician"),
        ("CARDIOLOGIST", "Cardiologist"),
        ("NEUROLOGIST", "Neurologist"),
        ("ORTHOPEDIC", "Orthopedic Surgeon"),
        ("PEDIATRICIAN", "Pediatrician"),
        ("GYNECOLOGIST", "Gynecologist"),
        ("DERMATOLOGIST", "Dermatologist"),
        ("ENT", "ENT Specialist"),
        ("OPHTHALMOLOGIST", "Ophthalmologist"),
        ("UROLOGIST", "Urologist"),
        ("PSYCHIATRIST", "Psychiatrist"),
        ("PULMONOLOGIST", "Pulmonologist"),
        ("GASTROENTEROLOGIST", "Gastroenterologist"),
        ("NEPHROLOGIST", "Nephrologist"),
        ("ONCOLOGIST", "Oncologist"),
        ("ENDOCRINOLOGIST", "Endocrinologist"),
        ("RHEUMATOLOGIST", "Rheumatologist"),
        ("SURGEON", "General Surgeon"),
        ("ANESTHETIST", "Anesthetist"),
        ("RADIOLOGIST", "Radiologist"),
        ("PATHOLOGIST", "Pathologist"),
        ("DENTIST", "Dentist"),
        ("PHYSIOTHERAPIST", "Physiotherapist"),
        ("OTHER", "Other"),
    )

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="doctor_profile"
    )
    department = models.ForeignKey(
        Department,
        on_delete=models.PROTECT,
        related_name="doctors"
    )
    doctor_type = models.CharField(max_length=30, choices=DOCTOR_TYPE_CHOICES, default="GENERAL")
    specialization = models.CharField(max_length=150)
    license_number = models.CharField(max_length=50, unique=True)  # PMDC/PMC registration number
    consultation_fee = models.DecimalField(max_digits=10, decimal_places=2)
    room_number = models.CharField(max_length=20)
    base_salary = models.DecimalField(max_digits=10, decimal_places=2, default=120000.00)

    @property
    def full_name(self):
        return self.user.get_full_name() or self.user.username

    def __str__(self):
        return f"Dr. {self.user.get_full_name() or self.user.username} ({self.specialization})"

class DoctorSchedule(models.Model):
    DAY_CHOICES = (
        (0, "Monday"),
        (1, "Tuesday"),
        (2, "Wednesday"),
        (3, "Thursday"),
        (4, "Friday"),
        (5, "Saturday"),
        (6, "Sunday"),
    )
    
    doctor = models.ForeignKey(
        Doctor,
        on_delete=models.CASCADE,
        related_name="schedules"
    )
    day_of_week = models.IntegerField(choices=DAY_CHOICES)
    start_time = models.TimeField()
    end_time = models.TimeField()
    max_patients = models.PositiveIntegerField(default=30)

    class Meta:
        unique_together = ("doctor", "day_of_week")

    def __str__(self):
        return f"{self.doctor} - {self.get_day_of_week_display()} ({self.start_time} - {self.end_time})"

class StaffProfile(SoftDeleteModel):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="staff_profile"
    )
    department = models.ForeignKey(
        Department,
        on_delete=models.PROTECT,
        related_name="staff_members",
        blank=True,
        null=True
    )
    designation = models.CharField(max_length=100)
    employee_id = models.CharField(max_length=50, unique=True, blank=True, null=True)
    join_date = models.DateField(default=timezone.now)
    base_salary = models.DecimalField(max_digits=10, decimal_places=2, default=40000.00)

    def __str__(self):
        return f"{self.user.get_full_name() or self.user.username} - {self.designation}"
