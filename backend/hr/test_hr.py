import datetime
from django.urls import reverse
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase
from staff.models import Department, Doctor, DoctorSchedule
from patients.models import Patient
from clinical.models import Appointment
from billing.models import Invoice, InvoiceItem
from hr.models import Attendance, DoctorFeeShare, PayrollSlip

User = get_user_model()

class HRAppTests(APITestCase):
    def setUp(self):
        # Create users
        self.admin = User.objects.create_user(username="admin", password="password", role="ADMIN")
        self.doc_user = User.objects.create_user(
            username="doctor_ahmad", password="password", role="DOCTOR", first_name="Ahmad", last_name="Ali"
        )
        self.recep_user = User.objects.create_user(
            username="recep_sana", password="password", role="RECEPTIONIST", first_name="Sana"
        )

        self.department = Department.objects.create(name="Emergency", description="Emergency")
        self.doctor = Doctor.objects.create(
            user=self.doc_user,
            department=self.department,
            specialization="ER Doctor",
            license_number="PMC-33333-D",
            consultation_fee=1200.00,
            room_number="ER-01"
        )
        
        self.patient = Patient.objects.create(
            first_name="Haris", last_name="Mughal", cnic="35201-5555555-5",
            date_of_birth="1998-08-08", gender="M", phone="03123456789", address="Lahore",
            emergency_contact_name="Emergency Name", emergency_contact_phone="03123456780"
        )

        # Set up endpoints
        self.clock_in_url = reverse("attendance-clock-in")
        self.clock_out_url = reverse("attendance-clock-out")
        self.payroll_gen_url = reverse("payroll-generate-monthly-payroll")

    def test_attendance_clock_in_status(self):
        # Authenticate receptionist
        self.client.force_authenticate(user=self.recep_user)
        
        # Clock in
        response = self.client.post(self.clock_in_url)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Refresh and verify
        att = Attendance.objects.filter(user=self.recep_user, date=datetime.date.today()).first()
        self.assertIsNotNone(att)
        self.assertIsNotNone(att.clock_in)
        self.assertIsNone(att.clock_out)
        
        # Try clocking in again today - should fail
        response2 = self.client.post(self.clock_in_url)
        self.assertEqual(response2.status_code, status.HTTP_400_BAD_REQUEST)

        # Clock out
        response3 = self.client.post(self.clock_out_url)
        self.assertEqual(response3.status_code, status.HTTP_200_OK)
        self.assertIsNotNone(response3.data["clock_out"])

    def test_doctor_fee_shares(self):
        # Create an appointment for a Monday (June 8, 2026)
        appt = Appointment.objects.create(
            patient=self.patient,
            doctor=self.doctor,
            appointment_date="2026-06-08",
            start_time="09:00:00",
            end_time="09:30:00"
        )
        
        # Verify invoice is auto-created
        invoice = Invoice.objects.filter(appointment=appt).first()
        self.assertIsNotNone(invoice)
        self.assertEqual(invoice.status, "PENDING")

        # Mark invoice as PAID
        invoice.status = "PAID"
        invoice.save()

        # DoctorFeeShare should trigger automatically
        share = DoctorFeeShare.objects.filter(doctor=self.doctor, invoice=invoice).first()
        self.assertIsNotNone(share)
        self.assertEqual(share.consultation_fee, 1200.00)
        self.assertEqual(share.doctor_share, 960.00) # 80%
        self.assertEqual(share.facility_share, 240.00) # 20%

    def test_monthly_payroll_calculations(self):
        # 1. Create 2 LATE attendances for receptionist
        Attendance.objects.create(user=self.recep_user, date="2026-06-01", clock_in="09:30:00", status="LATE")
        Attendance.objects.create(user=self.recep_user, date="2026-06-02", clock_in="09:45:00", status="LATE")
        Attendance.objects.create(user=self.recep_user, date="2026-06-03", clock_in="08:50:00", status="PRESENT")

        # Calculate payroll for June 2026
        payroll_details = PayrollSlip.calculate_monthly_payroll(self.recep_user, 6, 2026)
        
        # Receptionist basic is 40,000, allowance is 5,000, deduction is 2 * 500 = 1,000
        self.assertEqual(payroll_details["basic_salary"], 40000.00)
        self.assertEqual(payroll_details["allowances"], 5000.00)
        self.assertEqual(payroll_details["deductions"], 1000.00)
        self.assertEqual(payroll_details["doctor_share"], 0.00)

        # 2. Save slip and verify net salary
        slip = PayrollSlip.objects.create(
            user=self.recep_user,
            month=6,
            year=2026,
            basic_salary=payroll_details["basic_salary"],
            allowances=payroll_details["allowances"],
            deductions=payroll_details["deductions"],
            doctor_share=payroll_details["doctor_share"]
        )
        self.assertEqual(slip.net_salary, 44000.00) # 40000 + 5000 - 1000

    def test_admin_generate_payroll_action(self):
        self.client.force_authenticate(user=self.admin)

        # Trigger payroll generation via endpoint
        response = self.client.post(self.payroll_gen_url, {"month": 6, "year": 2026})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify payroll slips were generated
        slips_count = PayrollSlip.objects.filter(month=6, year=2026).count()
        self.assertGreaterEqual(slips_count, 2) # Should generate for doctor & receptionist (excluding patients)
