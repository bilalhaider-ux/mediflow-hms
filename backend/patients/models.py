import datetime
from django.db import models, transaction
from django.conf import settings
from django.core.validators import RegexValidator
from authentication.models import SoftDeleteModel, Branch

class Patient(SoftDeleteModel):
    GENDER_CHOICES = (
        ("M", "Male"),
        ("F", "Female"),
        ("O", "Other"),
    )
    
    # Optional link to user account for portal access
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="patient_profile"
    )
    
    branch = models.ForeignKey(Branch, on_delete=models.SET_NULL, null=True, blank=True, related_name="patients")
    
    mrn = models.CharField(max_length=20, unique=True, blank=True, db_index=True)
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    
    # Pakistan CNIC format: XXXXX-XXXXXXX-X
    cnic = models.CharField(
        max_length=15,
        validators=[
            RegexValidator(
                regex=r"^\d{5}-\d{7}-\d{1}$",
                message="CNIC must be in the format XXXXX-XXXXXXX-X"
            )
        ],
        unique=True
    )
    
    date_of_birth = models.DateField()
    gender = models.CharField(max_length=1, choices=GENDER_CHOICES)
    phone = models.CharField(max_length=20)
    email = models.EmailField(blank=True, null=True)
    address = models.TextField()
    
    # Emergency contact details
    emergency_contact_name = models.CharField(max_length=150)
    emergency_contact_phone = models.CharField(max_length=20)
    
    # QR Code payload data
    qr_code_data = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True, null=True, blank=True)

    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}".strip()

    def __str__(self):
        return f"{self.first_name} {self.last_name} ({self.mrn})"

    def save(self, *args, **kwargs):
        if not self.mrn:
            current_year = datetime.datetime.now().year
            prefix = f"HMS-{current_year}-"
            
            with transaction.atomic():
                # Query with select_for_update to handle concurrency safely
                last_patient = Patient.objects.all_with_deleted().filter(
                    mrn__startswith=prefix
                ).select_for_update().order_by("-mrn").first()
                
                if last_patient and last_patient.mrn:
                    try:
                        last_serial = int(last_patient.mrn.split("-")[-1])
                        new_serial = last_serial + 1
                    except ValueError:
                        new_serial = 1
                else:
                    new_serial = 1
                
                self.mrn = f"{prefix}{new_serial:05d}"
                self.qr_code_data = f"HMS:MRN:{self.mrn}"
                
        if not self.pk:
            self.full_clean()
        super().save(*args, **kwargs)
