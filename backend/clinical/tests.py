import datetime
from django.urls import reverse
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase
from patients.models import Patient
from staff.models import Department, Doctor, DoctorSchedule
from clinical.models import Appointment, Prescription, PrescriptionItem, LabTest, LabOrder

User = get_user_model()

class ClinicalAppTests(APITestCase):
    def setUp(self):
        # Create users
        self.admin = User.objects.create_user(username="admin", password="password", role="ADMIN")
        self.receptionist = User.objects.create_user(username="receptionist", password="password", role="RECEPTIONIST")
        self.doc_user = User.objects.create_user(username="doctor", password="password", role="DOCTOR", first_name="Ahmad")
        self.patient_user = User.objects.create_user(username="patient_user", password="password", role="PATIENT")

        # Create department
        self.department = Department.objects.create(name="Cardiology", description="Cardiology")

        # Create doctor
        self.doctor = Doctor.objects.create(
            user=self.doc_user,
            department=self.department,
            specialization="Cardiologist",
            license_number="PMC-11111-D",
            consultation_fee=1500.00,
            room_number="OPD-01"
        )

        # Create doctor schedule: Mondays (0) from 09:00 to 12:00, max 3 patients (for testing limit)
        self.schedule = DoctorSchedule.objects.create(
            doctor=self.doctor,
            day_of_week=0,
            start_time="09:00:00",
            end_time="12:00:00",
            max_patients=3
        )

        # Create patients
        self.p1 = Patient.objects.create(
            first_name="Zahid", last_name="Khan", cnic="35201-1111111-1",
            date_of_birth="1990-01-01", gender="M", phone="03001111111", address="Lahore",
            emergency_contact_name="Contact", emergency_contact_phone="03002222222"
        )
        self.p2 = Patient.objects.create(
            first_name="Sara", last_name="Ali", cnic="35201-2222222-2",
            date_of_birth="1992-02-02", gender="F", phone="03003333333", address="Lahore",
            emergency_contact_name="Contact", emergency_contact_phone="03002222222"
        )
        self.p3 = Patient.objects.create(
            first_name="Asad", last_name="Shah", cnic="35201-3333333-3",
            date_of_birth="1994-03-03", gender="M", phone="03004444444", address="Lahore",
            emergency_contact_name="Contact", emergency_contact_phone="03002222222"
        )

        self.appt_url = reverse("appointment-list")
        self.pres_url = reverse("prescription-list")
        self.test_url = reverse("lab-test-list")
        self.order_url = reverse("lab-order-list")

        # Define a Monday date: e.g. 2026-06-08
        self.monday_date = "2026-06-08"
        # Define a Tuesday date: e.g. 2026-06-09 (doctor not scheduled)
        self.tuesday_date = "2026-06-09"

    def test_model_str_methods(self):
        appt = Appointment.objects.create(
            patient=self.p1, doctor=self.doctor, appointment_date=self.monday_date,
            start_time="09:00:00", end_time="09:30:00"
        )
        self.assertIn("Zahid Khan", str(appt))
        
        pres = Prescription.objects.create(
            patient=self.p1, doctor=self.doctor, appointment=appt, diagnosis="Fever"
        )
        self.assertIn("Prescription for", str(pres))
        
        item = PrescriptionItem.objects.create(
            prescription=pres, medicine_name="Panadol", dosage="1-0-1", duration="3 days"
        )
        self.assertEqual(str(item), "Panadol - 1-0-1")
        
        lab_test = LabTest.objects.create(name="Blood Test", code="BLD", cost=400.00)
        self.assertEqual(str(lab_test), "Blood Test (BLD)")
        
        order = LabOrder.objects.create(patient=self.p1, doctor=self.doctor, status="ORDERED")
        self.assertIn("Lab Order", str(order))

    def test_appointment_booking_validations(self):
        self.client.force_authenticate(user=self.receptionist)

        # 1. Valid booking on Monday
        response = self.client.post(self.appt_url, {
            "patient": self.p1.id,
            "doctor": self.doctor.id,
            "appointment_date": self.monday_date,
            "start_time": "09:00:00",
            "end_time": "09:30:00"
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["token_number"], 1)

        # 2. Duplicate Booking / Overlapping slot fails
        response = self.client.post(self.appt_url, {
            "patient": self.p2.id,
            "doctor": self.doctor.id,
            "appointment_date": self.monday_date,
            "start_time": "09:15:00",
            "end_time": "09:45:00"
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("non_field_errors", response.data)

        # 3. Booking on Tuesday (unscheduled day) fails
        response = self.client.post(self.appt_url, {
            "patient": self.p2.id,
            "doctor": self.doctor.id,
            "appointment_date": self.tuesday_date,
            "start_time": "09:00:00",
            "end_time": "09:30:00"
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        # 4. Booking outside shift timings fails (e.g. 08:30)
        response = self.client.post(self.appt_url, {
            "patient": self.p2.id,
            "doctor": self.doctor.id,
            "appointment_date": self.monday_date,
            "start_time": "08:30:00",
            "end_time": "09:00:00"
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_appointment_capacity_limit(self):
        self.client.force_authenticate(user=self.receptionist)

        # Book patient 1 (token 1)
        self.client.post(self.appt_url, {
            "patient": self.p1.id, "doctor": self.doctor.id,
            "appointment_date": self.monday_date, "start_time": "09:00:00", "end_time": "09:30:00"
        })
        # Book patient 2 (token 2)
        self.client.post(self.appt_url, {
            "patient": self.p2.id, "doctor": self.doctor.id,
            "appointment_date": self.monday_date, "start_time": "10:00:00", "end_time": "10:30:00"
        })
        # Book patient 3 (token 3)
        self.client.post(self.appt_url, {
            "patient": self.p3.id, "doctor": self.doctor.id,
            "appointment_date": self.monday_date, "start_time": "11:00:00", "end_time": "11:30:00"
        })
        
        # Book patient 4 (should fail as capacity is 3)
        self.patient_data_extra = {
            "first_name": "Extra", "last_name": "User", "cnic": "35201-9999999-9",
            "date_of_birth": "1994-03-03", "gender": "M", "phone": "03004444444", "address": "Lahore",
            "emergency_contact_name": "Contact", "emergency_contact_phone": "03002222222"
        }
        p4 = Patient.objects.create(**self.patient_data_extra)
        response = self.client.post(self.appt_url, {
            "patient": p4.id, "doctor": self.doctor.id,
            "appointment_date": self.monday_date, "start_time": "11:30:00", "end_time": "12:00:00"
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_appointment_views_filters(self):
        appt = Appointment.objects.create(
            patient=self.p1, doctor=self.doctor, appointment_date=self.monday_date,
            start_time="09:00:00", end_time="09:30:00", status="PENDING"
        )
        self.client.force_authenticate(user=self.receptionist)
        
        # Filter by doctor, date, and status
        response = self.client.get(self.appt_url, {
            "doctor": self.doctor.id,
            "date": self.monday_date,
            "status": "PENDING"
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    def test_doctor_prescription_crud(self):
        # Create appointment
        appt = Appointment.objects.create(
            patient=self.p1, doctor=self.doctor, appointment_date=self.monday_date,
            start_time="09:00:00", end_time="09:30:00"
        )
        
        # Test Doctor can create prescription
        self.client.force_authenticate(user=self.doc_user)
        response = self.client.post(self.pres_url, {
            "patient": self.p1.id,
            "doctor": self.doctor.id,
            "appointment": appt.id,
            "diagnosis": "Hypertension",
            "notes": "Take rest",
            "items": [
                {
                    "medicine_name": "Panadol 500mg",
                    "dosage": "1-0-1",
                    "duration": "5 days",
                    "instructions": "After meal"
                }
            ]
        }, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["diagnosis"], "Hypertension")
        self.assertEqual(len(response.data["items"]), 1)
        
        pres_id = response.data["id"]

        # Test filter prescription by patient
        response = self.client.get(self.pres_url, {"patient": self.p1.id})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

        # Test receptionist cannot create prescription
        self.client.force_authenticate(user=self.receptionist)
        response = self.client.post(self.pres_url, {
            "patient": self.p1.id,
            "doctor": self.doctor.id,
            "diagnosis": "Cold",
            "items": []
        }, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_lab_order_and_tests(self):
        # Create lab test catalog
        self.client.force_authenticate(user=self.admin)
        test_res = self.client.post(self.test_url, {
            "name": "Complete Blood Count",
            "code": "CBC",
            "description": "General hematology profile",
            "cost": 500.00
        })
        self.assertEqual(test_res.status_code, status.HTTP_201_CREATED)
        test_id = test_res.data["id"]

        # Doctor orders lab test
        self.client.force_authenticate(user=self.doc_user)
        order_res = self.client.post(self.order_url, {
            "patient": self.p1.id,
            "doctor": self.doctor.id,
            "tests": [test_id],
            "status": "ORDERED"
        }, format="json")
        self.assertEqual(order_res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(order_res.data["status"], "ORDERED")
        
        order_id = order_res.data["id"]

        # Filter lab orders
        response = self.client.get(self.order_url, {"patient": self.p1.id, "status": "ORDERED"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
