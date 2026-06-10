import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from patients.models import Patient
from billing.models import Invoice

print("Checking Patient and Invoice prefixes...")

patients_updated = 0
for p in Patient.objects.all():
    if p.mrn and p.mrn.startswith("CGH-"):
        old_mrn = p.mrn
        p.mrn = p.mrn.replace("CGH-", "HMS-")
        p.save()
        patients_updated += 1
        print(f"Updated Patient MRN: {old_mrn} -> {p.mrn}")

invoices_updated = 0
for inv in Invoice.objects.all():
    if inv.invoice_number and inv.invoice_number.startswith("CGH-"):
        old_inv = inv.invoice_number
        inv.invoice_number = inv.invoice_number.replace("CGH-", "HMS-")
        inv.save()
        invoices_updated += 1
        print(f"Updated Invoice Number: {old_inv} -> {inv.invoice_number}")

print(f"Updated {patients_updated} patients, {invoices_updated} invoices.")
