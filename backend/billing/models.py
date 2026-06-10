import datetime
from decimal import Decimal
from django.db import models, transaction
from django.utils import timezone
from django.contrib.auth import get_user_model
from authentication.models import SoftDeleteModel, Branch
from patients.models import Patient
from clinical.models import Appointment
from ipd.models import BedAdmission

class Panel(SoftDeleteModel):
    name = models.CharField(max_length=150, unique=True)
    description = models.TextField(blank=True, null=True)
    discount_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal("0.00"))

    def __str__(self):
        return self.name


class Invoice(SoftDeleteModel):
    STATUS_CHOICES = (
        ("PENDING", "Pending"),
        ("PAID", "Paid"),
        ("PARTIALLY_PAID", "Partially Paid"),
        ("CANCELLED", "Cancelled"),
        ("REFUNDED", "Refunded"),
    )

    invoice_number = models.CharField(max_length=50, unique=True, blank=True)
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name="invoices")
    appointment = models.ForeignKey(Appointment, on_delete=models.SET_NULL, null=True, blank=True, related_name="invoices")
    admission = models.ForeignKey(BedAdmission, on_delete=models.SET_NULL, null=True, blank=True, related_name="invoices")
    
    panel = models.ForeignKey(Panel, on_delete=models.SET_NULL, null=True, blank=True, related_name="invoices")
    panel_approved_amount = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("0.00"))
    patient_copay_amount = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("0.00"))
    branch = models.ForeignKey(Branch, on_delete=models.SET_NULL, null=True, blank=True, related_name="invoices")
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="PENDING")
    subtotal = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("0.00"))
    tax = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("0.00"))
    discount = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("0.00"))
    total_amount = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("0.00"))
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)


    def save(self, *args, **kwargs):
        if not self.invoice_number:
            year = datetime.datetime.now().year
            with transaction.atomic():
                count = Invoice.objects.all_with_deleted().filter(
                    invoice_number__startswith=f"HMS-INV-{year}-"
                ).select_for_update().count()
                self.invoice_number = f"HMS-INV-{year}-{count + 1:05d}"
        
        self.total_amount = self.subtotal + self.tax - self.discount
        super().save(*args, **kwargs)
        
        if self.status == "PAID":
            from hr.models import DoctorFeeShare
            from clinical.models import Appointment
            
            for item in self.items.filter(item_type="CONSULTATION"):
                try:
                    appointment = Appointment.objects.get(id=item.item_id)
                    doctor = appointment.doctor
                    doc_share_amt = item.total_price * Decimal('0.80')
                    hosp_share_amt = item.total_price * Decimal('0.20')
                    
                    DoctorFeeShare.objects.get_or_create(
                        doctor=doctor,
                        invoice=self,
                        defaults={
                            "consultation_fee": item.total_price,
                            "doctor_share": doc_share_amt,
                            "facility_share": hosp_share_amt
                        }
                    )
                except Appointment.DoesNotExist:
                    pass

    def update_totals(self):
        items = self.items.all()
        subtotal = sum(item.total_price for item in items)
        self.subtotal = subtotal
        self.total_amount = self.subtotal + self.tax - self.discount
        self.save()

    def __str__(self):
        return f"{self.invoice_number} - {self.patient} ({self.status})"

class InvoiceItem(models.Model):
    ITEM_TYPE_CHOICES = (
        ("CONSULTATION", "Doctor Consultation"),
        ("LAB_TEST", "Lab Test Charges"),
        ("WARD_CHARGES", "Ward Room Charges"),
        ("OTHER", "Other Charges"),
    )

    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name="items")
    item_type = models.CharField(max_length=20, choices=ITEM_TYPE_CHOICES)
    item_id = models.PositiveIntegerField(null=True, blank=True)
    description = models.CharField(max_length=255)
    quantity = models.PositiveIntegerField(default=1)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    total_price = models.DecimalField(max_digits=10, decimal_places=2, blank=True)

    def save(self, *args, **kwargs):
        self.total_price = self.quantity * self.unit_price
        super().save(*args, **kwargs)
        self.invoice.update_totals()

    def delete(self, *args, **kwargs):
        invoice = self.invoice
        super().delete(*args, **kwargs)
        invoice.update_totals()

    def __str__(self):
        return f"{self.description} ({self.quantity} x {self.unit_price})"

class Payment(models.Model):
    PAYMENT_METHOD_CHOICES = (
        ("CASH", "Cash"),
        ("JAZZCASH", "JazzCash"),
        ("EASYPAISA", "EasyPaisa"),
        ("CARD", "Credit/Debit Card"),
    )

    STATUS_CHOICES = (
        ("PENDING", "Pending"),
        ("COMPLETED", "Completed"),
        ("FAILED", "Failed"),
    )

    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name="payments")
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    payment_method = models.CharField(max_length=20, choices=PAYMENT_METHOD_CHOICES)
    transaction_id = models.CharField(max_length=100, blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="PENDING")
    created_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        if self.status == "COMPLETED":
            total_paid = sum(p.amount for p in self.invoice.payments.filter(status="COMPLETED"))
            if total_paid >= self.invoice.total_amount:
                self.invoice.status = "PAID"
            elif total_paid > 0:
                self.invoice.status = "PARTIALLY_PAID"
            self.invoice.save()

    def __str__(self):
        return f"Payment of {self.amount} for {self.invoice.invoice_number} ({self.status})"

class InvoiceRefund(SoftDeleteModel):
    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name="refunds")
    refunded_by = models.ForeignKey(get_user_model(), on_delete=models.SET_NULL, null=True)
    refunded_amount = models.DecimalField(max_digits=10, decimal_places=2)
    reason = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Refund of {self.refunded_amount} for {self.invoice.invoice_number}"
