from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone
from .models import StockBatch, DispensationItem

def dispense_medicine_fifo(dispensation, medicine, quantity):
    """
    Deducts stock sequentially from the oldest unexpired batches of a medicine (FIFO).
    Raises ValidationError if overall quantity is insufficient.
    """
    today = timezone.now().date()
    
    with transaction.atomic():
        # Filter unexpired batches with stock, ordered by oldest expiry
        batches = StockBatch.objects.filter(
            medicine=medicine,
            expiry_date__gt=today,
            quantity_remaining__gt=0
        ).order_by("expiry_date")
        
        total_available = sum(b.quantity_remaining for b in batches)
        if total_available < quantity:
            raise ValidationError(
                f"Insufficient unexpired stock for {medicine.name}. "
                f"Requested: {quantity}, Available: {total_available} units."
            )
            
        remaining_to_dispense = quantity
        for batch in batches:
            if remaining_to_dispense <= 0:
                break
                
            dispense_qty = min(batch.quantity_remaining, remaining_to_dispense)
            
            DispensationItem.objects.create(
                dispensation=dispensation,
                medicine=medicine,
                batch=batch,
                quantity=dispense_qty,
                unit_price=batch.unit_price
            )
            
            remaining_to_dispense -= dispense_qty
