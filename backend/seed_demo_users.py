import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth import get_user_model
from staff.models import Department, Doctor
from ipd.models import Ward, Bed
from clinical.models import LabTest

User = get_user_model()

def seed():
    # 1. Create admin
    if not User.objects.all_with_deleted().filter(username="admin").exists():
        User.objects.create_superuser(
            username="admin",
            email="admin@hms.pk",
            password="password",
            role="ADMIN",
            first_name="HMS",
            last_name="Administrator"
        )
        print("Admin user created: admin / password")

    # 2. Create Receptionist
    if not User.objects.all_with_deleted().filter(username="receptionist").exists():
        User.objects.create_user(
            username="receptionist",
            email="receptionist@hms.pk",
            password="password",
            role="RECEPTIONIST",
            first_name="Sana",
            last_name="Ahmed"
        )
        print("Receptionist user created: receptionist / password")

    # 3. Create Departments - All standard hospital departments
    dept_data = [
        ("Cardiology", "Heart specialty, ECG diagnostics, and cardiac consulting ward"),
        ("Pediatrics", "Children ward, childcare OPD, and neonatal services"),
        ("General Medicine", "Internal medicine, primary care, and general OPD consultations"),
        ("Orthopedics", "Bone, joint, and muscular disorders — fracture clinic"),
        ("Gynecology & Obstetrics", "Women's health, maternity, prenatal and postnatal care"),
        ("ENT", "Ear, Nose, and Throat — audiology and head/neck surgery"),
        ("Neurology", "Brain, spinal cord, and nervous system disorders"),
        ("Dermatology", "Skin, hair, and nail conditions — cosmetic dermatology"),
        ("Ophthalmology", "Eye care, vision correction, and ophthalmic surgery"),
        ("Radiology", "Diagnostic imaging — X-Ray, MRI, CT scan, ultrasound"),
        ("Psychiatry", "Mental health, behavioral therapy, and counseling"),
        ("Urology", "Urinary tract and male reproductive system disorders"),
        ("Gastroenterology", "Digestive system — stomach, liver, and intestinal disorders"),
        ("Pulmonology", "Respiratory system — lungs, asthma, and COPD treatment"),
        ("Nephrology", "Kidney diseases, dialysis management, and renal transplant"),
        ("Oncology", "Cancer treatment, chemotherapy, and tumor management"),
        ("Endocrinology", "Hormonal and metabolic disorders — diabetes, thyroid"),
        ("Emergency Medicine", "Trauma, acute care, and emergency critical services"),
    ]
    for name, desc in dept_data:
        Department.objects.get_or_create(name=name, defaults={"description": desc})
    cardiology = Department.objects.get(name="Cardiology")
    print(f"Departments seeded: {len(dept_data)} departments")

    # 4. Create Doctor
    if not User.objects.all_with_deleted().filter(username="doctor_ahmad").exists():
        doc_user = User.objects.create_user(
            username="doctor_ahmad",
            email="ahmad@hms.pk",
            password="password",
            role="DOCTOR",
            first_name="Ahmad",
            last_name="Khan"
        )
        Doctor.objects.create(
            user=doc_user,
            department=cardiology,
            specialization="Consultant Cardiologist",
            license_number="PMC-12345-D",
            consultation_fee=2000.00,
            room_number="OPD-10"
        )
        print("Doctor user created: doctor_ahmad / password")

    # 5. Create Wards and Beds
    icu, _ = Ward.objects.get_or_create(
        name="Intensive Care Unit (ICU)",
        defaults={"ward_type": "ICU", "total_beds": 4, "cost_per_day": 8000.00}
    )
    for i in range(1, 5):
        Bed.objects.get_or_create(ward=icu, bed_number=f"ICU-{i:02d}")

    gw, _ = Ward.objects.get_or_create(
        name="General Male Ward",
        defaults={"ward_type": "GENERAL", "total_beds": 8, "cost_per_day": 1200.00}
    )
    for i in range(1, 9):
        Bed.objects.get_or_create(ward=gw, bed_number=f"GW-M-{i:02d}")
    print("IPD Wards & Beds seeded.")

    # 6. Create Lab Tests catalog
    LabTest.objects.get_or_create(name="Complete Blood Count", defaults={"code": "CBC", "cost": 650.00})
    LabTest.objects.get_or_create(name="Blood Glucose (Fasting)", defaults={"code": "FBG", "cost": 300.00})
    LabTest.objects.get_or_create(name="Lipid Profile", defaults={"code": "LIPID", "cost": 1200.00})
    LabTest.objects.get_or_create(name="Liver Function Test", defaults={"code": "LFT", "cost": 1500.00})
    LabTest.objects.get_or_create(name="Chest X-Ray", defaults={"code": "CXR", "cost": 1800.00})
    print("Lab Test Catalog seeded.")

if __name__ == "__main__":
    seed()
