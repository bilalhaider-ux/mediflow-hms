from decimal import Decimal
from django.db import models
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.conf import settings
from django.utils import timezone
from authentication.models import SoftDeleteModel, Branch
from clinical.models import Prescription
from patients.models import Patient

class Supplier(SoftDeleteModel):
    name = models.CharField(max_length=150)
    contact_person = models.CharField(max_length=100)
    phone = models.CharField(max_length=20)
    balance_due = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))

    def __str__(self):
        return self.name

class SupplierLedger(models.Model):
    supplier = models.ForeignKey(Supplier, on_delete=models.CASCADE, related_name="ledger")
    transaction_date = models.DateTimeField(auto_now_add=True)
    description = models.CharField(max_length=255)
    amount_credited = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("0.00")) # Purchase amount
    amount_debited = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("0.00"))  # Cash Paid
    running_balance = models.DecimalField(max_digits=12, decimal_places=2)

    def __str__(self):
        return f"{self.supplier.name} - {self.description} ({self.transaction_date.date()})"


class Medicine(SoftDeleteModel):
    FORMULATION_CHOICES = (
        ("TABLET", "Tablet"),
        ("CAPSULE", "Capsule"),
        ("SYRUP", "Syrup"),
        ("INJECTION", "Injection"),
        ("OINTMENT", "Ointment"),
        ("OTHER", "Other"),
    )

    name = models.CharField(max_length=150, unique=True)
    generic_name = models.CharField(max_length=150)
    formulation = models.CharField(max_length=20, choices=FORMULATION_CHOICES, default="TABLET")
    strength = models.CharField(max_length=50)
    manufacturer = models.CharField(max_length=150, blank=True, null=True)
    description = models.TextField(blank=True, null=True)
    reorder_level = models.PositiveIntegerField(default=10)
    branch = models.ForeignKey(Branch, on_delete=models.SET_NULL, null=True, blank=True, related_name="medicines")

    def __str__(self):
        return f"{self.name} {self.strength} ({self.generic_name})"

class StockBatch(models.Model):
    medicine = models.ForeignKey(Medicine, on_delete=models.CASCADE, related_name="batches")
    batch_number = models.CharField(max_length=50)
    expiry_date = models.DateField()
    quantity_received = models.PositiveIntegerField()
    quantity_remaining = models.PositiveIntegerField()
    unit_cost = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("0.00"))
    unit_price = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("0.00"))
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["expiry_date"]
        unique_together = ("medicine", "batch_number")

    @property
    def is_expired(self):
        return self.expiry_date <= timezone.now().date()

    def __str__(self):
        return f"{self.medicine.name} - Batch {self.batch_number} (Exp: {self.expiry_date})"

class DispensationLog(models.Model):
    prescription = models.ForeignKey(Prescription, on_delete=models.SET_NULL, null=True, blank=True, related_name="dispensations")
    dispensed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="dispensations")
    dispensed_to = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name="dispensations")
    dispensed_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Dispensation #{self.id} for {self.dispensed_to} at {self.dispensed_at}"

class DispensationItem(models.Model):
    dispensation = models.ForeignKey(DispensationLog, on_delete=models.CASCADE, related_name="items")
    medicine = models.ForeignKey(Medicine, on_delete=models.PROTECT)
    batch = models.ForeignKey(StockBatch, on_delete=models.PROTECT)
    quantity = models.PositiveIntegerField()
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    total_price = models.DecimalField(max_digits=10, decimal_places=2)

    def save(self, *args, **kwargs):
        self.total_price = Decimal(str(self.quantity)) * self.unit_price
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.medicine.name} x{self.quantity} (Batch {self.batch.batch_number})"


@receiver(post_save, sender=DispensationItem)
def deduct_stock_on_dispensation(sender, instance, created, **kwargs):
    if created:
        batch = instance.batch
        batch.quantity_remaining = models.F('quantity_remaining') - instance.quantity
        batch.save(update_fields=['quantity_remaining'])
