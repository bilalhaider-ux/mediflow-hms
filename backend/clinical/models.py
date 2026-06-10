from django.db import models, transaction
from django.utils import timezone
from django.contrib.auth import get_user_model
from authentication.models import SoftDeleteModel, Branch
from patients.models import Patient
from staff.models import Doctor

class PatientVitals(SoftDeleteModel):
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name="vitals")
    recorded_by = models.ForeignKey(get_user_model(), on_delete=models.SET_NULL, null=True, related_name="recorded_vitals")
    recorded_at = models.DateTimeField(auto_now_add=True)
    blood_pressure = models.CharField(max_length=20, help_text="e.g. 120/80")
    pulse = models.PositiveIntegerField(help_text="bpm")
    temperature = models.DecimalField(max_digits=4, decimal_places=1, help_text="F")
    oxygen_saturation = models.PositiveIntegerField(help_text="%")
    weight = models.DecimalField(max_digits=5, decimal_places=2, help_text="kg")
    height = models.DecimalField(max_digits=5, decimal_places=2, help_text="cm")

    def __str__(self):
        return f"Vitals for {self.patient} at {self.recorded_at.date()}"


class Appointment(SoftDeleteModel):
    STATUS_CHOICES = (
        ("PENDING", "Pending"),
        ("ACTIVE", "Active / Checked In"),
        ("COMPLETED", "Completed"),
        ("CANCELLED", "Cancelled"),
    )
    
    TYPE_CHOICES = (
        ("WALK_IN", "Walk-in"),
        ("ONLINE", "Online"),
    )

    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name="appointments")
    doctor = models.ForeignKey(Doctor, on_delete=models.CASCADE, related_name="appointments")
    branch = models.ForeignKey(Branch, on_delete=models.SET_NULL, null=True, blank=True, related_name="appointments")
    appointment_date = models.DateField(db_index=True)
    start_time = models.TimeField()
    end_time = models.TimeField()
    token_number = models.PositiveIntegerField(blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="PENDING")
    appointment_type = models.CharField(max_length=20, choices=TYPE_CHOICES, default="WALK_IN")
    notes = models.TextField(blank=True, null=True)

    class Meta:
        ordering = ["appointment_date", "token_number"]
        unique_together = ("doctor", "appointment_date", "token_number")

    @property
    def time(self):
        return self.start_time

    @property
    def appointment_datetime(self):
        import datetime
        from django.utils import timezone
        if self.appointment_date and self.start_time:
            dt = datetime.datetime.combine(self.appointment_date, self.start_time)
            try:
                return timezone.make_aware(dt, timezone.get_current_timezone())
            except ValueError:
                return dt
        return None

    def __str__(self):
        return f"{self.patient} - {self.doctor} ({self.appointment_date} #{self.token_number})"

    def save(self, *args, **kwargs):
        if not self.token_number:
            with transaction.atomic():
                # Get total appointments for this doctor on this date, using select_for_update for concurrency safety
                existing_count = Appointment.objects.all_with_deleted().filter(
                    doctor=self.doctor,
                    appointment_date=self.appointment_date
                ).select_for_update().count()
                
                self.token_number = existing_count + 1
        
        super().save(*args, **kwargs)

class Prescription(SoftDeleteModel):
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name="prescriptions")
    doctor = models.ForeignKey(Doctor, on_delete=models.CASCADE, related_name="prescriptions")
    appointment = models.OneToOneField(Appointment, on_delete=models.SET_NULL, null=True, blank=True, related_name="prescription")
    date_prescribed = models.DateTimeField(default=timezone.now)
    diagnosis = models.TextField()
    icd_code = models.CharField(max_length=20, blank=True, null=True)
    icd_description = models.CharField(max_length=255, blank=True, null=True)
    notes = models.TextField(blank=True, null=True)

    def __str__(self):
        return f"Prescription for {self.patient} by {self.doctor} ({self.date_prescribed.date()})"

class PrescriptionItem(models.Model):
    prescription = models.ForeignKey(Prescription, on_delete=models.CASCADE, related_name="items")
    medicine = models.ForeignKey("pharmacy.Medicine", on_delete=models.SET_NULL, null=True, blank=True, related_name="prescription_items")
    medicine_name = models.CharField(max_length=150)
    dosage = models.CharField(max_length=50)  # e.g., "1-0-1" or "5ml"
    duration = models.CharField(max_length=50)  # e.g., "5 days"
    instructions = models.CharField(max_length=250, blank=True, null=True)  # e.g., "Before meal"

    def __str__(self):
        return f"{self.medicine_name} - {self.dosage}"

class LabTest(SoftDeleteModel):
    name = models.CharField(max_length=150, unique=True)
    code = models.CharField(max_length=30, unique=True)
    description = models.TextField(blank=True, null=True)
    cost = models.DecimalField(max_digits=10, decimal_places=2)

    def __str__(self):
        return f"{self.name} ({self.code})"

class LabOrder(SoftDeleteModel):
    STATUS_CHOICES = (
        ("ORDERED", "Ordered"),
        ("SAMPLE_COLLECTED", "Sample Collected"),
        ("COMPLETED", "Completed"),
        ("CANCELLED", "Cancelled"),
    )

    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name="lab_orders")
    doctor = models.ForeignKey(Doctor, on_delete=models.CASCADE, related_name="lab_orders")
    prescription = models.ForeignKey(Prescription, on_delete=models.SET_NULL, null=True, blank=True, related_name="lab_orders")
    tests = models.ManyToManyField(LabTest, related_name="orders")
    order_date = models.DateTimeField(default=timezone.now)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="ORDERED")
    results_summary = models.TextField(blank=True, null=True)
    results_file = models.FileField(upload_to="lab_results/", blank=True, null=True)

    def save(self, *args, **kwargs):
        is_completed = self.status == "COMPLETED"
        has_summary = bool(self.results_summary)
        has_file = bool(self.results_file)

        super().save(*args, **kwargs)

        if is_completed and has_summary and not has_file:
            from clinical.tasks import generate_lab_report_pdf_task
            transaction.on_commit(lambda: generate_lab_report_pdf_task.delay(self.id))

    def __str__(self):
        return f"Lab Order #{self.id} for {self.patient} - Status: {self.status}"

