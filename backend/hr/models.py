from decimal import Decimal
from django.db import models
from django.conf import settings
from django.utils import timezone
from authentication.models import SoftDeleteModel
from staff.models import Doctor

class Attendance(SoftDeleteModel):
    STATUS_CHOICES = (
        ("PRESENT", "Present"),
        ("LATE", "Late"),
        ("ABSENT", "Absent"),
        ("LEAVE", "Leave"),
    )

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="attendances")
    date = models.DateField(default=timezone.now)
    clock_in = models.TimeField(null=True, blank=True)
    clock_out = models.TimeField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="PRESENT")

    class Meta:
        unique_together = ("user", "date")

    def __str__(self):
        return f"{self.user} - {self.date} ({self.status})"

class DoctorFeeShare(models.Model):
    doctor = models.ForeignKey(Doctor, on_delete=models.CASCADE, related_name="fee_shares")
    invoice = models.ForeignKey("billing.Invoice", on_delete=models.CASCADE, related_name="fee_shares")
    consultation_fee = models.DecimalField(max_digits=10, decimal_places=2)
    doctor_share = models.DecimalField(max_digits=10, decimal_places=2)
    facility_share = models.DecimalField(max_digits=10, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("doctor", "invoice")

    def __str__(self):
        return f"Dr. {self.doctor.user.username} share: Rs. {self.doctor_share} (Inv #{self.invoice.invoice_number})"

class PayrollSlip(models.Model):
    STATUS_CHOICES = (
        ("PENDING", "Pending"),
        ("PAID", "Paid"),
    )

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="payroll_slips")
    month = models.PositiveIntegerField()
    year = models.PositiveIntegerField()
    basic_salary = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("0.00"))
    allowances = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("0.00"))
    deductions = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("0.00"))
    doctor_share = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("0.00"))
    net_salary = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("0.00"))
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="PENDING")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("user", "month", "year")

    def save(self, *args, **kwargs):
        self.net_salary = self.basic_salary + self.allowances - self.deductions + self.doctor_share
        super().save(*args, **kwargs)

    @classmethod
    def calculate_monthly_payroll(cls, user, month, year):
        # 1. Determine basic salary based on StaffProfile or Doctor profile
        if user.role == "DOCTOR" and hasattr(user, "doctor_profile"):
            basic_salary = user.doctor_profile.base_salary
        elif hasattr(user, "staff_profile"):
            basic_salary = user.staff_profile.base_salary
        else:
            basic_salary = Decimal("30000.00")
        
        # 2. Deductions based on attendance (Late check-ins = Rs. 500 each)
        late_count = Attendance.objects.filter(
            user=user,
            date__month=month,
            date__year=year,
            status="LATE"
        ).count()
        deductions = Decimal(str(late_count)) * Decimal("500.00")

        # 3. Doctor Consultation shares
        doc_share = Decimal("0.00")
        if user.role == "DOCTOR" and hasattr(user, "doctor_profile"):
            shares = DoctorFeeShare.objects.filter(
                doctor=user.doctor_profile,
                created_at__month=month,
                created_at__year=year
            )
            doc_share = sum(share.doctor_share for share in shares) or Decimal("0.00")

        # 4. Standard Allowances
        allowances = Decimal("5000.00")

        return {
            "basic_salary": basic_salary,
            "allowances": allowances,
            "deductions": deductions,
            "doctor_share": doc_share,
        }

    def __str__(self):
        return f"Payroll Slip for {self.user} - {self.month}/{self.year} ({self.status})"


class StaffIncentive(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="incentives")
    invoice = models.ForeignKey("billing.Invoice", on_delete=models.CASCADE, related_name="staff_incentives", null=True, blank=True)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    reason = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Incentive for {self.user.username} - Rs. {self.amount} ({self.reason})"
