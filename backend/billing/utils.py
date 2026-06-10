import datetime
from django.db import transaction
from billing.models import Invoice, InvoiceItem
from clinical.models import Appointment, LabOrder
from ipd.models import BedAdmission

def create_appointment_invoice(appointment):
    """
    Creates a PENDING invoice for a doctor consultation appointment.
    """
    with transaction.atomic():
        invoice = Invoice.objects.create(
            patient=appointment.patient,
            appointment=appointment,
            status="PENDING",
            subtotal=appointment.doctor.consultation_fee,
            total_amount=appointment.doctor.consultation_fee
        )
        InvoiceItem.objects.create(
            invoice=invoice,
            item_type="CONSULTATION",
            item_id=appointment.id,
            description=f"Consultation Fee - Dr. {appointment.doctor.user.get_full_name() or appointment.doctor.user.username}",
            quantity=1,
            unit_price=appointment.doctor.consultation_fee
        )
        return invoice

def create_lab_order_invoice(lab_order):
    """
    Creates a PENDING invoice for a clinical lab order containing multiple tests.
    """
    with transaction.atomic():
        invoice = Invoice.objects.create(
            patient=lab_order.patient,
            status="PENDING"
        )
        
        subtotal = 0
        for test in lab_order.tests.all():
            InvoiceItem.objects.create(
                invoice=invoice,
                item_type="LAB_TEST",
                item_id=lab_order.id,
                description=f"Lab Test: {test.name} ({test.code})",
                quantity=1,
                unit_price=test.cost
            )
            subtotal += test.cost
            
        invoice.subtotal = subtotal
        invoice.total_amount = subtotal
        invoice.save()
        return invoice

def create_admission_invoice(admission):
    """
    Creates a PENDING invoice for an IPD ward admission stay when discharged.
    """
    if not admission.discharge_date:
        return None
        
    duration = admission.discharge_date - admission.admission_date
    days = max(1, duration.days)  # Count at least 1 day
    cost_per_day = admission.bed.ward.cost_per_day
    total_cost = days * cost_per_day

    with transaction.atomic():
        invoice = Invoice.objects.create(
            patient=admission.patient,
            admission=admission,
            status="PENDING",
            subtotal=total_cost,
            total_amount=total_cost
        )
        InvoiceItem.objects.create(
            invoice=invoice,
            item_type="WARD_CHARGES",
            item_id=admission.id,
            description=f"Ward Stay: {admission.bed.ward.name} - {admission.bed.bed_number} ({days} days)",
            quantity=days,
            unit_price=cost_per_day
        )
        return invoice
