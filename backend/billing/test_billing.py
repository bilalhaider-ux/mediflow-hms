import datetime
from django.urls import reverse
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase
from patients.models import Patient
from staff.models import Department, Doctor, DoctorSchedule
from clinical.models import Appointment, LabTest, LabOrder
from billing.models import Invoice, InvoiceItem, Payment

User = get_user_model()

class BillingAppTests(APITestCase):
    def setUp(self):
        # Create users
        self.admin = User.objects.create_user(username="admin", password="password", role="ADMIN")
        self.receptionist = User.objects.create_user(username="receptionist", password="password", role="RECEPTIONIST")
        self.doc_user = User.objects.create_user(username="doctor", password="password", role="DOCTOR")
        
        self.department = Department.objects.create(name="Pediatrics", description="Pediatrics")
        self.doctor = Doctor.objects.create(
            user=self.doc_user,
            department=self.department,
            specialization="Pediatrician",
            license_number="PMC-22222-D",
            consultation_fee=1000.00,
            room_number="OPD-02"
        )
        
        self.schedule = DoctorSchedule.objects.create(
            doctor=self.doctor,
            day_of_week=0, # Monday
            start_time="09:00:00",
            end_time="12:00:00",
            max_patients=5
        )

        self.patient = Patient.objects.create(
            first_name="Bilal", last_name="Ahmad", cnic="35201-4444444-4",
            date_of_birth="1995-05-05", gender="M", phone="03005555555", address="Lahore",
            emergency_contact_name="Contact", emergency_contact_phone="03002222222"
        )

        self.invoice_list_url = reverse("invoice-list")

    def test_invoice_creation_on_appointment(self):
        # Authenticate receptionist
        self.client.force_authenticate(user=self.receptionist)
        
        # Book appointment
        response = self.client.post(reverse("appointment-list"), {
            "patient": self.patient.id,
            "doctor": self.doctor.id,
            "appointment_date": "2026-06-08", # A Monday
            "start_time": "09:00:00",
            "end_time": "09:30:00"
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Verify invoice was created automatically
        invoice = Invoice.objects.filter(patient=self.patient, appointment_id=response.data["id"]).first()
        self.assertIsNotNone(invoice)
        self.assertEqual(invoice.status, "PENDING")
        self.assertEqual(invoice.subtotal, 1000.00)
        self.assertEqual(invoice.total_amount, 1000.00)
        
        # Verify invoice number format HMS-INV-YYYY-XXXXX
        self.assertTrue(invoice.invoice_number.startswith(f"HMS-INV-{datetime.datetime.now().year}-"))

    def test_invoice_item_calculation(self):
        invoice = Invoice.objects.create(patient=self.patient, status="PENDING")
        
        # Add a consultation item
        item1 = InvoiceItem.objects.create(
            invoice=invoice,
            item_type="CONSULTATION",
            description="Consultation Fee",
            quantity=1,
            unit_price=1000.00
        )
        
        # Subtotal should equal total price of item
        self.assertEqual(item1.total_price, 1000.00)
        
        # Refresh invoice
        invoice.refresh_from_db()
        self.assertEqual(invoice.subtotal, 1000.00)
        self.assertEqual(invoice.total_amount, 1000.00)

        # Add another item
        InvoiceItem.objects.create(
            invoice=invoice,
            item_type="OTHER",
            description="Syringe & Bandage",
            quantity=2,
            unit_price=150.00
        )
        
        invoice.refresh_from_db()
        self.assertEqual(invoice.subtotal, 1300.00)
        self.assertEqual(invoice.total_amount, 1300.00)

        # Set discount
        invoice.discount = 100.00
        invoice.save()
        
        self.assertEqual(invoice.total_amount, 1200.00)

    def test_payment_processing_flows(self):
        invoice = Invoice.objects.create(patient=self.patient, subtotal=1500.00, total_amount=1500.00)
        self.client.force_authenticate(user=self.receptionist)
        
        pay_url = reverse("invoice-pay", kwargs={"pk": invoice.id})

        # 1. Cash Payment
        response = self.client.post(pay_url, {
            "amount": 1500.00,
            "payment_method": "CASH"
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        invoice.refresh_from_db()
        self.assertEqual(invoice.status, "PAID")
        self.assertEqual(invoice.payments.count(), 1)
        self.assertEqual(invoice.payments.first().status, "COMPLETED")

    def test_mobile_wallet_simulated_success(self):
        invoice = Invoice.objects.create(patient=self.patient, subtotal=800.00, total_amount=800.00)
        self.client.force_authenticate(user=self.receptionist)
        pay_url = reverse("invoice-pay", kwargs={"pk": invoice.id})

        # EasyPaisa success
        response = self.client.post(pay_url, {
            "amount": 800.00,
            "payment_method": "EASYPAISA",
            "phone_number": "03451234567"
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("Successfully charged", response.data["message"])
        self.assertEqual(response.data["payment"]["status"], "COMPLETED")
        
        invoice.refresh_from_db()
        self.assertEqual(invoice.status, "PAID")

    def test_mobile_wallet_simulated_failure(self):
        invoice = Invoice.objects.create(patient=self.patient, subtotal=1200.00, total_amount=1200.00)
        self.client.force_authenticate(user=self.receptionist)
        pay_url = reverse("invoice-pay", kwargs={"pk": invoice.id})

        # EasyPaisa failure (phone number ends with 999)
        response = self.client.post(pay_url, {
            "amount": 1200.00,
            "payment_method": "JAZZCASH",
            "phone_number": "03001234999"
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("declined", response.data["error"])
        
        invoice.refresh_from_db()
        self.assertEqual(invoice.status, "PENDING")
        self.assertEqual(invoice.payments.first().status, "FAILED")
