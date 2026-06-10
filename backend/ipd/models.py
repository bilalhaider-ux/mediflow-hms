from django.db import models
from django.utils import timezone
from authentication.models import SoftDeleteModel
from patients.models import Patient
from staff.models import Doctor

class Ward(SoftDeleteModel):
    TYPE_CHOICES = (
        ("GENERAL", "General Ward"),
        ("ICU", "Intensive Care Unit"),
        ("PRIVATE", "Private Room"),
        ("CCU", "Cardiac Care Unit"),
        ("MATERNITY", "Maternity Ward"),
    )
    
    name = models.CharField(max_length=100, unique=True)
    ward_type = models.CharField(max_length=20, choices=TYPE_CHOICES, default="GENERAL")
    total_beds = models.PositiveIntegerField()
    cost_per_day = models.DecimalField(max_digits=10, decimal_places=2)
    floor_number = models.IntegerField(default=1)

    def __str__(self):
        return f"{self.name} ({self.get_ward_type_display()})"

class Bed(SoftDeleteModel):
    STATUS_CHOICES = (
        ("AVAILABLE", "Available"),
        ("OCCUPIED", "Occupied"),
        ("MAINTENANCE", "Maintenance"),
    )
    TYPE_CHOICES = (
        ("STANDARD", "Standard Bed"),
        ("ICU", "ICU Bed"),
        ("PRIVATE", "Private Bed"),
    )

    ward = models.ForeignKey(Ward, on_delete=models.CASCADE, related_name="beds")
    bed_number = models.CharField(max_length=30, unique=True)
    is_occupied = models.BooleanField(default=False)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="AVAILABLE")
    bed_type = models.CharField(max_length=20, choices=TYPE_CHOICES, default="STANDARD")
    notes = models.TextField(blank=True, null=True)

    def __str__(self):
        return f"{self.bed_number} ({self.ward.name})"

class BedAdmission(SoftDeleteModel):
    STATUS_CHOICES = (
        ("ADMITTED", "Admitted"),
        ("DISCHARGED", "Discharged"),
    )

    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name="admissions")
    bed = models.ForeignKey(Bed, on_delete=models.PROTECT, related_name="admissions")
    admission_date = models.DateTimeField(default=timezone.now)
    discharge_date = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="ADMITTED")
    admitting_doctor = models.ForeignKey(Doctor, on_delete=models.PROTECT, related_name="admissions")
    notes = models.TextField(blank=True, null=True)

    def __str__(self):
        return f"{self.patient} admitted in {self.bed} on {self.admission_date.date()}"

class OTRoom(SoftDeleteModel):
    name = models.CharField(max_length=100, unique=True)
    status = models.CharField(max_length=20, default="AVAILABLE") # AVAILABLE, IN_USE, CLEANING

    def __str__(self):
        return f"OT Room: {self.name}"

class OTBooking(SoftDeleteModel):
    STATUS_CHOICES = (
        ("SCHEDULED", "Scheduled"),
        ("IN_PROGRESS", "In Progress"),
        ("COMPLETED", "Completed"),
        ("CANCELLED", "Cancelled"),
    )
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name="ot_bookings")
    surgeon = models.ForeignKey(Doctor, on_delete=models.CASCADE, related_name="ot_bookings")
    anesthesiologist = models.CharField(max_length=100)
    room = models.ForeignKey(OTRoom, on_delete=models.CASCADE, related_name="bookings")
    start_time = models.DateTimeField()
    end_time = models.DateTimeField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="SCHEDULED")
    surgery_name = models.CharField(max_length=255)

    def __str__(self):
        return f"{self.surgery_name} for {self.patient} in {self.room}"
