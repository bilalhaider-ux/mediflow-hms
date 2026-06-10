import datetime
from django.urls import reverse
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase
from patients.models import Patient
from staff.models import Department, Doctor
from clinical.models import Appointment

User = get_user_model()

class PatientPortalTests(APITestCase):
    def setUp(self):
        # Create a patient
        self.patient = Patient.objects.create(
            first_name="Zain", last_name="Mubashir", cnic="35201-2222222-2",
            date_of_birth="1995-05-05", gender="M", phone="03215555555", address="Lahore",
            emergency_contact_name="Emergency contact", emergency_contact_phone="03214444444"
        )
        
        # Doctor setup
        self.doc_user = User.objects.create_user(username="dr_fatima", password="password", role="DOCTOR")
        self.department = Department.objects.create(name="Gynae", description="Gynae")
        self.doctor = Doctor.objects.create(
            user=self.doc_user,
            department=self.department,
            specialization="Gynecologist",
            license_number="PMC-44444-D",
            consultation_fee=1500.00,
            room_number="G-01"
        )

        self.login_url = reverse("patient-portal-login")
        self.dashboard_url = reverse("patient-portal-dashboard")
        self.request_appt_url = reverse("patient-portal-request-appointment")

    def test_portal_login_successful_generates_jwt(self):
        payload = {
            "mrn": self.patient.mrn,
            "cnic": self.patient.cnic
        }
        response = self.client.post(self.login_url, payload)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)
        self.assertEqual(response.data["user"]["role"], "PATIENT")
        self.assertEqual(response.data["user"]["patient_id"], self.patient.id)

        # Verify O2O link
        self.patient.refresh_from_db()
        self.assertIsNotNone(self.patient.user)
        self.assertEqual(self.patient.user.username, self.patient.mrn.replace("-", "_").lower())

    def test_portal_login_invalid_credentials(self):
        payload = {
            "mrn": self.patient.mrn,
            "cnic": "00000-0000000-0" # Invalid CNIC
        }
        response = self.client.post(self.login_url, payload)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("error", response.data)

    def test_portal_dashboard_retrieval(self):
        # Login patient to create account and authenticate
        login_res = self.client.post(self.login_url, {
            "mrn": self.patient.mrn,
            "cnic": self.patient.cnic
        })
        token = login_res.data["access"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
        
        # Query dashboard
        response = self.client.get(self.dashboard_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["patient"]["mrn"], self.patient.mrn)
        self.assertIn("appointments", response.data)
        self.assertIn("prescriptions", response.data)
        self.assertIn("lab_orders", response.data)

    def test_portal_request_appointment(self):
        # Login patient to create account and authenticate
        login_res = self.client.post(self.login_url, {
            "mrn": self.patient.mrn,
            "cnic": self.patient.cnic
        })
        token = login_res.data["access"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

        payload = {
            "doctor": self.doctor.id,
            "appointment_date": str(datetime.date.today() + datetime.timedelta(days=2)),
            "notes": "Feeling minor headache."
        }
        response = self.client.post(self.request_appt_url, payload)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Verify appointment exists
        appt = Appointment.objects.filter(patient=self.patient).first()
        self.assertIsNotNone(appt)
        self.assertEqual(appt.doctor, self.doctor)
        self.assertEqual(appt.status, "PENDING")
        self.assertEqual(appt.appointment_type, "ONLINE")
