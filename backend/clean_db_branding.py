import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth import get_user_model
from staff.models import Department, Doctor
from patients.models import Patient
from billing.models import Invoice, Panel
from ipd.models import Ward, Bed, BedAdmission, OTRoom, OTBooking
from pharmacy.models import Supplier, Medicine
from authentication.models import Branch

User = get_user_model()

print("Running DB branding update...")

# 1. Update Users
users_updated = 0
for user in User.objects.all():
    changed = False
    if "CGH" in user.first_name:
        user.first_name = user.first_name.replace("CGH", "HMS")
        changed = True
    if "Hospital" in user.first_name:
        user.first_name = user.first_name.replace("Hospital", "HMS")
        changed = True
    if "CGH" in user.last_name:
        user.last_name = user.last_name.replace("CGH", "HMS")
        changed = True
    if "Hospital" in user.last_name:
        user.last_name = user.last_name.replace("Hospital", "HMS")
        changed = True
    if "cgh" in user.username:
        user.username = user.username.replace("cgh", "hms")
        changed = True
    if changed:
        user.save()
        users_updated += 1
print(f"Updated {users_updated} user records.")

# 2. Update Branches
branches_updated = 0
for b in Branch.objects.all():
    changed = False
    if "Hospital" in b.name:
        b.name = b.name.replace("Hospital", "HMS")
        changed = True
    if "City General" in b.name:
        b.name = b.name.replace("City General", "Medi Flow")
        changed = True
    if changed:
        b.save()
        branches_updated += 1
print(f"Updated {branches_updated} branch records.")

# 3. Update Panels
panels_updated = 0
for p in Panel.objects.all():
    changed = False
    if "Hospital" in p.name:
        p.name = p.name.replace("Hospital", "HMS")
        changed = True
    if changed:
        p.save()
        panels_updated += 1
print(f"Updated {panels_updated} panel records.")

# 4. Update Wards
wards_updated = 0
for w in Ward.objects.all():
    changed = False
    if "Hospital" in w.name:
        w.name = w.name.replace("Hospital", "HMS")
        changed = True
    if changed:
        w.save()
        wards_updated += 1
print(f"Updated {wards_updated} ward records.")

print("DB branding update completed successfully.")
