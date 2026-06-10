import datetime
from django.urls import reverse
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase
from patients.models import Patient

User = get_user_model()

class PatientModelAndAPITests(APITestCase):
    def setUp(self):
        # Create users with different roles
        self.admin = User.objects.create_user(
            username="admin", password="password", role="ADMIN"
        )
        self.receptionist = User.objects.create_user(
            username="receptionist", password="password", role="RECEPTIONIST"
        )
        self.doctor = User.objects.create_user(
            username="doctor", password="password", role="DOCTOR"
        )
        self.patient_user = User.objects.create_user(
            username="patient_user", password="password", role="PATIENT"
        )
        
        # Patient data helper
        self.patient_data = {
            "first_name": "Muhammad",
            "last_name": "Bilal",
            "cnic": "35201-1234567-1",
            "date_of_birth": "1995-08-15",
            "gender": "M",
            "phone": "03001234567",
            "email": "bilal@example.com",
            "address": "Gulberg III, Lahore",
            "emergency_contact_name": "Ahmad",
            "emergency_contact_phone": "03007654321"
        }
        
        self.list_url = reverse("patient-list")

    def test_patient_mrn_auto_generation(self):
        # Create first patient
        p1 = Patient.objects.create(**self.patient_data)
        current_year = datetime.datetime.now().year
        self.assertEqual(p1.mrn, f"HMS-{current_year}-00001")
        self.assertEqual(p1.qr_code_data, f"HMS:MRN:HMS-{current_year}-00001")
        self.assertEqual(str(p1), f"Muhammad Bilal (HMS-{current_year}-00001)")
        
        # Create second patient (different CNIC)
        self.patient_data["cnic"] = "35201-7654321-2"
        p2 = Patient.objects.create(**self.patient_data)
        self.assertEqual(p2.mrn, f"HMS-{current_year}-00002")

    def test_patient_mrn_invalid_serial_fallback(self):
        # Create a patient with custom invalid MRN serial format directly to test ValueError fallback
        p1 = Patient.objects.create(**self.patient_data)
        p1.mrn = f"HMS-{datetime.datetime.now().year}-ABCDE"
        p1.save()
        
        # Create next patient, serial parsing of ABCDE raises ValueError and resets to 00001
        self.patient_data["cnic"] = "35201-7654321-2"
        p2 = Patient.objects.create(**self.patient_data)
        current_year = datetime.datetime.now().year
        self.assertEqual(p2.mrn, f"HMS-{current_year}-00001")

    def test_patient_cnic_validation(self):
        # Invalid CNIC format (too short, no hyphens)
        self.patient_data["cnic"] = "3520112345671"
        with self.assertRaises(Exception):
            Patient.objects.create(**self.patient_data)

    def test_receptionist_can_create_patient(self):
        self.client.force_authenticate(user=self.receptionist)
        response = self.client.post(self.list_url, self.patient_data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["first_name"], "Muhammad")
        self.assertIn("mrn", response.data)

    def test_duplicate_cnic_validation_api(self):
        self.client.force_authenticate(user=self.receptionist)
        # Create first
        self.client.post(self.list_url, self.patient_data)
        
        # Try second with same CNIC
        self.patient_data["first_name"] = "DifferentName"
        response = self.client.post(self.list_url, self.patient_data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("cnic", response.data)

    def test_invalid_cnic_format_api(self):
        self.client.force_authenticate(user=self.receptionist)
        self.patient_data["cnic"] = "35201-12345"
        response = self.client.post(self.list_url, self.patient_data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_doctor_cannot_create_patient(self):
        self.client.force_authenticate(user=self.doctor)
        response = self.client.post(self.list_url, self.patient_data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_doctor_can_read_patient(self):
        patient = Patient.objects.create(**self.patient_data)
        self.client.force_authenticate(user=self.doctor)
        detail_url = reverse("patient-detail", args=[patient.id])
        response = self.client.get(detail_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["first_name"], "Muhammad")

    def test_patient_user_cannot_access_staff_patient_list(self):
        self.client.force_authenticate(user=self.patient_user)
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_patient_soft_delete(self):
        patient = Patient.objects.create(**self.patient_data)
        self.client.force_authenticate(user=self.receptionist)
        detail_url = reverse("patient-detail", args=[patient.id])
        
        # Soft Delete via API
        response = self.client.delete(detail_url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        
        # Check exclusion from active queryset
        self.assertFalse(Patient.objects.filter(pk=patient.id).exists())
        # Check existence in all records
        self.assertTrue(Patient.objects.all_with_deleted().filter(pk=patient.id).exists())

    def test_patient_search(self):
        # Create patients
        p1 = Patient.objects.create(**self.patient_data)
        self.patient_data["first_name"] = "Ayesha"
        self.patient_data["cnic"] = "35201-9999999-9"
        self.patient_data["phone"] = "03211112222"
        p2 = Patient.objects.create(**self.patient_data)
        
        self.client.force_authenticate(user=self.doctor)
        
        # Search by name
        response = self.client.get(self.list_url, {"search": "Ayesha"})
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["first_name"], "Ayesha")
        
        # Search by phone
        response = self.client.get(self.list_url, {"search": "03001234567"})
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["first_name"], "Muhammad")
