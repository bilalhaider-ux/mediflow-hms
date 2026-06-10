import django
import os
import datetime
from decimal import Decimal

os.environ['DJANGO_SETTINGS_MODULE'] = 'config.settings'
django.setup()

from django.contrib.auth import get_user_model
from authentication.models import Branch, HospitalSettings
from staff.models import Department, Doctor, DoctorSchedule
from patients.models import Patient
from clinical.models import Appointment, PatientVitals, Prescription, PrescriptionItem, LabTest, LabOrder
from billing.models import Invoice, InvoiceItem, Payment

User = get_user_model()

def seed_data():
    print("Starting HMS Demo Data Seeding...")
    
    # Disable Celery async task execution
    from django.conf import settings
    settings.CELERY_TASK_ALWAYS_EAGER = True
    
    # Mock celery tasks to do nothing
    from unittest.mock import MagicMock
    from clinical import tasks as clinical_tasks
    from notifications import tasks as notification_tasks
    clinical_tasks.generate_lab_report_pdf_task.delay = MagicMock()
    notification_tasks.send_appointment_reminder.apply_async = MagicMock()
    
    # Temporarily disconnect signals to prevent Celery tasks / twilio blocking
    from django.db.models.signals import post_save
    from clinical.models import Appointment, LabOrder
    from billing.models import Invoice
    from notifications.signals import appointment_notification, schedule_reminder, lab_order_notification, invoice_whatsapp_notification
    
    post_save.disconnect(appointment_notification, sender=Appointment)
    post_save.disconnect(schedule_reminder, sender=Appointment)
    post_save.disconnect(lab_order_notification, sender=LabOrder)
    post_save.disconnect(invoice_whatsapp_notification, sender=Invoice)
    
    # 1. Ensure a Branch exists
    branch, created = Branch.objects.get_or_create(
        name="Main Campus Lahore",
        defaults={
            "city": "Lahore",
            "address": "Jail Road, Lahore",
            "phone": "+9242111222333",
            "email": "main@mediflow.com"
        }
    )
    print(f"Branch: {branch.name} (Created: {created})")

    # Ensure Admin exists
    admin_user = User.objects.filter(username="admin").first()
    if admin_user:
        admin_user.branch = branch
        admin_user.save()
    
    # Ensure Receptionist exists
    recept_user = User.objects.filter(username="receptionist").first()
    if recept_user:
        recept_user.branch = branch
        recept_user.save()

    # 2. Get departments
    depts_dict = {d.name: d for d in Department.objects.all()}
    def get_dept(name):
        if name in depts_dict:
            return depts_dict[name]
        d, _ = Department.objects.get_or_create(name=name, defaults={"description": f"{name} Department"})
        depts_dict[name] = d
        return d

    cardio_dept = get_dept("Cardiology")
    neuro_dept = get_dept("Neurology")
    peds_dept = get_dept("Pediatrics")
    gyn_dept = get_dept("Gynecology & Obstetrics")

    # 3. Create Doctors & Users
    doctors_data = [
        {
            "username": "dr_hassan",
            "email": "hassan@mediflow.com",
            "first_name": "Hassan",
            "last_name": "Awan",
            "doctor_type": "CARDIOLOGIST",
            "department": cardio_dept,
            "specialization": "Interventional Cardiology",
            "license_number": "PMC-99999-D",
            "consultation_fee": Decimal("1500.00"),
            "room_number": "OPD-10",
        },
        {
            "username": "dr_zainab",
            "email": "zainab@mediflow.com",
            "first_name": "Zainab",
            "last_name": "Siddiqui",
            "doctor_type": "NEUROLOGIST",
            "department": neuro_dept,
            "specialization": "Neuro-electrophysiology",
            "license_number": "PMC-88888-N",
            "consultation_fee": Decimal("2000.00"),
            "room_number": "OPD-12",
        },
        {
            "username": "dr_usman",
            "email": "usman@mediflow.com",
            "first_name": "Usman",
            "last_name": "Tariq",
            "doctor_type": "PEDIATRICIAN",
            "department": peds_dept,
            "specialization": "Neonatal Care",
            "license_number": "PMC-77777-P",
            "consultation_fee": Decimal("1200.00"),
            "room_number": "OPD-15",
        },
        {
            "username": "dr_fatima",
            "email": "fatima@mediflow.com",
            "first_name": "Fatima",
            "last_name": "Bashir",
            "doctor_type": "GYNECOLOGIST",
            "department": gyn_dept,
            "specialization": "Reproductive Endocrinology",
            "license_number": "PMC-66666-G",
            "consultation_fee": Decimal("1800.00"),
            "room_number": "OPD-18",
        }
    ]

    seeded_docs = []
    for d_data in doctors_data:
        # Create User account
        u, u_created = User.objects.get_or_create(
            username=d_data["username"],
            defaults={
                "email": d_data["email"],
                "first_name": d_data["first_name"],
                "last_name": d_data["last_name"],
                "role": "DOCTOR",
                "branch": branch
            }
        )
        if u_created:
            u.set_password("password")
            u.save()

        # Create Doctor Profile
        doc, doc_created = Doctor.objects.get_or_create(
            user=u,
            defaults={
                "department": d_data["department"],
                "doctor_type": d_data["doctor_type"],
                "specialization": d_data["specialization"],
                "license_number": d_data["license_number"],
                "consultation_fee": d_data["consultation_fee"],
                "room_number": d_data["room_number"],
                "base_salary": Decimal("150000.00")
            }
        )
        seeded_docs.append(doc)
        print(f"Doctor: Dr. {doc.user.get_full_name()} (Created: {doc_created})")

        # Create doctor schedule shifts (Mon-Fri)
        for day in range(5):
            DoctorSchedule.objects.get_or_create(
                doctor=doc,
                day_of_week=day,
                defaults={
                    "start_time": datetime.time(9, 0),
                    "end_time": datetime.time(14, 0),
                    "max_patients": 30
                }
            )

    # 4. Create Patients
    Patient.objects.all_with_deleted().hard_delete()
    patients_data = [
        {
            "mrn_seed": "HMS-2026-00001",
            "first_name": "Ali",
            "last_name": "Ahmad",
            "cnic": "35201-1111111-1",
            "date_of_birth": datetime.date(1985, 3, 12),
            "gender": "M",
            "phone": "+923001112222",
            "email": "ali.ahmad@example.com",
            "address": "Model Town, Lahore",
            "emergency_contact_name": "Sana Ahmad",
            "emergency_contact_phone": "+923001112223"
        },
        {
            "mrn_seed": "HMS-2026-00002",
            "first_name": "Zainab",
            "last_name": "Khan",
            "cnic": "35202-2222222-2",
            "date_of_birth": datetime.date(1995, 5, 15),
            "gender": "F",
            "phone": "+923334567890",
            "email": "zainab.khan@example.com",
            "address": "Gulberg, Lahore",
            "emergency_contact_name": "Ahmad Khan",
            "emergency_contact_phone": "+923334567891"
        },
        {
            "mrn_seed": "HMS-2026-00003",
            "first_name": "Muhammad",
            "last_name": "Raza",
            "cnic": "35202-3333333-3",
            "date_of_birth": datetime.date(1988, 10, 20),
            "gender": "M",
            "phone": "+923009876543",
            "email": "raza@example.com",
            "address": "DHA Phase 5, Lahore",
            "emergency_contact_name": "Ali Raza",
            "emergency_contact_phone": "+923009876544"
        },
        {
            "mrn_seed": "HMS-2026-00004",
            "first_name": "Ayesha",
            "last_name": "Bibi",
            "cnic": "35202-4444444-4",
            "date_of_birth": datetime.date(1990, 12, 5),
            "gender": "F",
            "phone": "+923123456789",
            "email": "ayesha@example.com",
            "address": "Johar Town, Lahore",
            "emergency_contact_name": "Bilal Ahmad",
            "emergency_contact_phone": "+923123456780"
        }
    ]

    seeded_patients = []
    for p_data in patients_data:
        # Check by cnic
        pat = Patient.objects.filter(cnic=p_data["cnic"]).first()
        if not pat:
            pat = Patient(
                first_name=p_data["first_name"],
                last_name=p_data["last_name"],
                cnic=p_data["cnic"],
                date_of_birth=p_data["date_of_birth"],
                gender=p_data["gender"],
                phone=p_data["phone"],
                email=p_data["email"],
                address=p_data["address"],
                emergency_contact_name=p_data["emergency_contact_name"],
                emergency_contact_phone=p_data["emergency_contact_phone"],
                branch=branch
            )
            # Override mrn prefix to match seeds if desired
            pat.save()
        seeded_patients.append(pat)
        print(f"Patient: {pat.full_name} ({pat.mrn})")

    # 5. Create Appointments
    # Clear old appointments to avoid cluttering or token conflicts
    Appointment.objects.all_with_deleted().hard_delete()
    
    # Appt 1: Completed - Ayesha Bibi with Dr. Usman Tariq (Pediatrician)
    appt1 = Appointment.objects.create(
        patient=seeded_patients[3], # Ayesha Bibi
        doctor=seeded_docs[2], # Dr. Usman Tariq
        branch=branch,
        appointment_date=datetime.date.today() - datetime.timedelta(days=1),
        start_time=datetime.time(10, 0),
        end_time=datetime.time(10, 30),
        status="COMPLETED",
        appointment_type="WALK_IN",
        notes="Routine baby checkup for mild congestion."
    )

    # Appt 2: Active Check-In - Muhammad Raza with Dr. Zainab Siddiqui (Neurologist)
    appt2 = Appointment.objects.create(
        patient=seeded_patients[2], # Muhammad Raza
        doctor=seeded_docs[1], # Dr. Zainab Siddiqui
        branch=branch,
        appointment_date=datetime.date.today(),
        start_time=datetime.time(11, 0),
        end_time=datetime.time(11, 30),
        status="ACTIVE",
        appointment_type="WALK_IN",
        notes="Experiencing chronic migraines and sleep deprivation."
    )

    # Appt 3: Pending - Zainab Khan with Dr. Hassan Awan (Cardiologist)
    appt3 = Appointment.objects.create(
        patient=seeded_patients[1], # Zainab Khan
        doctor=seeded_docs[0], # Dr. Hassan Awan
        branch=branch,
        appointment_date=datetime.date.today() + datetime.timedelta(days=1),
        start_time=datetime.time(12, 0),
        end_time=datetime.time(12, 30),
        status="PENDING",
        appointment_type="ONLINE",
        notes="High blood pressure readings, scheduled routine check."
    )
    print("Created demo Appointments.")

    # 6. Patient Vitals
    PatientVitals.objects.create(
        patient=seeded_patients[2],
        recorded_by=recept_user or admin_user,
        blood_pressure="135/85",
        pulse=78,
        temperature=Decimal("98.6"),
        oxygen_saturation=99,
        weight=Decimal("72.5"),
        height=Decimal("178.0")
    )
    
    # 7. Create Prescriptions
    Prescription.objects.all_with_deleted().hard_delete()
    pres1 = Prescription.objects.create(
        patient=seeded_patients[3], # Ayesha Bibi
        doctor=seeded_docs[2], # Dr. Usman
        appointment=appt1,
        diagnosis="Infantile Congestion and Rhinitis",
        notes="Keep child warm. Give plenty of warm liquids. Return if fever rises above 101F."
    )
    
    # Create medicines if none exist
    from pharmacy.models import Medicine, StockBatch
    med1, _ = Medicine.objects.get_or_create(
        name="Panadol Pediatric Suspension",
        defaults={"generic_name": "Paracetamol", "formulation": "SYRUP", "strength": "120mg/5ml", "branch": branch}
    )
    med2, _ = Medicine.objects.get_or_create(
        name="Secnil Syrup",
        defaults={"generic_name": "Sodium Chloride", "formulation": "SYRUP", "strength": "100ml", "branch": branch}
    )
    StockBatch.objects.get_or_create(
        medicine=med1,
        batch_number="B-PAN-120",
        defaults={
            "expiry_date": datetime.date(2028, 12, 31),
            "quantity_received": 100,
            "quantity_remaining": 80,
            "unit_cost": Decimal("50.00"),
            "unit_price": Decimal("85.00")
        }
    )
    StockBatch.objects.get_or_create(
        medicine=med2,
        batch_number="B-SEC-100",
        defaults={
            "expiry_date": datetime.date(2028, 12, 31),
            "quantity_received": 100,
            "quantity_remaining": 90,
            "unit_cost": Decimal("80.00"),
            "unit_price": Decimal("120.00")
        }
    )

    PrescriptionItem.objects.create(
        prescription=pres1,
        medicine=med1,
        medicine_name=med1.name,
        dosage="2.5ml thrice daily",
        duration="3 days",
        instructions="After meals"
    )
    PrescriptionItem.objects.create(
        prescription=pres1,
        medicine=med2,
        medicine_name=med2.name,
        dosage="5ml once daily",
        duration="5 days",
        instructions="Before bedtime"
    )
    print("Created demo Prescriptions.")

    # 8. Lab Tests & Orders
    LabTest.objects.all_with_deleted().hard_delete()
    LabOrder.objects.all_with_deleted().hard_delete()
    
    cbc_test = LabTest.objects.create(
        name="Complete Blood Count (CBC)",
        code="CBC",
        description="Analyzes hematocrit, hemoglobin, red blood cells, and platelets.",
        cost=Decimal("600.00")
    )
    lft_test = LabTest.objects.create(
        name="Liver Function Test (LFT)",
        code="LFT",
        description="Assesses enzymes and protein levels in the liver.",
        cost=Decimal("1200.00")
    )
    
    # Completed lab order for Zainab Khan by Dr. Hassan
    lab_order = LabOrder.objects.create(
        patient=seeded_patients[1],
        doctor=seeded_docs[0],
        status="COMPLETED",
        results_summary="Hb: 12.8 g/dl (Normal), WBC: 6,400/cumm (Normal), Platelets: 280,000/cumm (Normal). Hematological parameters are within expected physiological limits."
    )
    lab_order.tests.add(cbc_test)
    print("Created demo Lab Tests and Orders.")

    # 9. Invoices
    Invoice.objects.all_with_deleted().hard_delete()
    # Invoice for Appt 1 (Completed) -> Paid
    inv1 = Invoice.objects.create(
        patient=seeded_patients[3],
        appointment=appt1,
        status="PAID",
        subtotal=Decimal("1200.00"), # Consultation Fee
        tax=Decimal("60.00"),
        discount=Decimal("0.00"),
        branch=branch
    )
    InvoiceItem.objects.create(
        invoice=inv1,
        item_type="CONSULTATION",
        item_id=appt1.id,
        description="Dr. Usman Tariq Consultation",
        quantity=1,
        unit_price=Decimal("1200.00")
    )
    Payment.objects.create(
        invoice=inv1,
        amount=Decimal("1260.00"),
        payment_method="CASH",
        status="COMPLETED"
    )

    # Invoice for Appt 2 (Active) -> Pending
    inv2 = Invoice.objects.create(
        patient=seeded_patients[2],
        appointment=appt2,
        status="PENDING",
        subtotal=Decimal("2000.00"), # Consultation Fee
        tax=Decimal("100.00"),
        discount=Decimal("0.00"),
        branch=branch
    )
    InvoiceItem.objects.create(
        invoice=inv2,
        item_type="CONSULTATION",
        item_id=appt2.id,
        description="Dr. Zainab Siddiqui Consultation",
        quantity=1,
        unit_price=Decimal("2000.00")
    )
    print("Created demo Invoices & Payments.")
    
    # 10. Ensure seeded patient HMS-2026-00001 is linked for easy testing
    first_p = seeded_patients[0]
    # Update first patient name to match HMS-2026-00001 if mrn differs
    first_p.mrn = "HMS-2026-00001"
    first_p.cnic = "35201-1111111-1"
    first_p.save()
    
    print("HMS Demo Data Seeding Completed Successfully!")

if __name__ == "__main__":
    seed_data()
