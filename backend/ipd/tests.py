from django.urls import reverse
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase
from patients.models import Patient
from staff.models import Department, Doctor
from ipd.models import Ward, Bed, BedAdmission

User = get_user_model()

class IPDAppTests(APITestCase):
    def setUp(self):
        # Create users
        self.admin = User.objects.create_user(username="admin", password="password", role="ADMIN")
        self.receptionist = User.objects.create_user(username="receptionist", password="password", role="RECEPTIONIST")
        self.doctor = User.objects.create_user(username="doctor", password="password", role="DOCTOR")

        # Create doctor profile
        self.dept = Department.objects.create(name="Internal Medicine")
        self.doctor_profile = Doctor.objects.create(
            user=self.doctor, department=self.dept, specialization="Physician",
            license_number="PMC-22222-D", consultation_fee=1000.00, room_number="OPD-02"
        )

        # Create patient
        self.patient1 = Patient.objects.create(
            first_name="Haris", last_name="Javed", cnic="35201-4444444-4",
            date_of_birth="1988-04-04", gender="M", phone="03005555555", address="Lahore",
            emergency_contact_name="Contact", emergency_contact_phone="03002222222"
        )
        self.patient2 = Patient.objects.create(
            first_name="Maryum", last_name="Bibi", cnic="35201-5555555-5",
            date_of_birth="1991-05-05", gender="F", phone="03006666666", address="Lahore",
            emergency_contact_name="Contact", emergency_contact_phone="03002222222"
        )

        # Wards and Beds URL
        self.ward_url = reverse("ward-list")
        self.bed_url = reverse("bed-list")
        self.adm_url = reverse("bed-admission-list")

    def test_model_str_methods(self):
        ward = Ward.objects.create(name="Ward A", ward_type="GENERAL", total_beds=5, cost_per_day=1000.00)
        self.assertEqual(str(ward), "Ward A (General Ward)")
        
        bed = Bed.objects.create(ward=ward, bed_number="BED-A")
        self.assertEqual(str(bed), "BED-A (Ward A)")
        
        adm = BedAdmission.objects.create(
            patient=self.patient1, bed=bed, admitting_doctor=self.doctor_profile, status="ADMITTED"
        )
        self.assertIn("admitted in BED-A", str(adm))

    def test_ward_and_bed_workflows(self):
        self.client.force_authenticate(user=self.admin)

        # 1. Create a Ward
        ward_res = self.client.post(self.ward_url, {
            "name": "ICU-A",
            "ward_type": "ICU",
            "total_beds": 5,
            "cost_per_day": 5000.00
        })
        self.assertEqual(ward_res.status_code, status.HTTP_201_CREATED)
        ward_id = ward_res.data["id"]

        # 2. Create a Bed
        bed_res = self.client.post(self.bed_url, {
            "ward": ward_id,
            "bed_number": "ICU-A-01"
        })
        self.assertEqual(bed_res.status_code, status.HTTP_201_CREATED)
        self.assertFalse(bed_res.data["is_occupied"])
        bed_id = bed_res.data["id"]

        # 3. Admit patient 1 (via Receptionist)
        self.client.force_authenticate(user=self.receptionist)
        adm_res = self.client.post(self.adm_url, {
            "patient": self.patient1.id,
            "bed": bed_id,
            "admitting_doctor": self.doctor_profile.id,
            "status": "ADMITTED"
        })
        self.assertEqual(adm_res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(adm_res.data["status"], "ADMITTED")

        # Verify bed is now marked occupied
        bed = Bed.objects.get(pk=bed_id)
        self.assertTrue(bed.is_occupied)

        # 4. Attempting to admit patient 2 to the SAME bed fails
        adm_res_fail = self.client.post(self.adm_url, {
            "patient": self.patient2.id,
            "bed": bed_id,
            "admitting_doctor": self.doctor_profile.id,
            "status": "ADMITTED"
        })
        self.assertEqual(adm_res_fail.status_code, status.HTTP_400_BAD_REQUEST)

        # 5. Discharge patient 1 (bed is released)
        admission_id = adm_res.data["id"]
        detail_url = reverse("bed-admission-detail", args=[admission_id])
        
        discharge_res = self.client.patch(detail_url, {
            "status": "DISCHARGED",
            "discharge_date": "2026-06-10T12:00:00Z"
        })
        self.assertEqual(discharge_res.status_code, status.HTTP_200_OK)
        
        # Verify bed is now released/unoccupied
        bed.refresh_from_db()
        self.assertFalse(bed.is_occupied)

    def test_bed_swap_validation(self):
        # Setup ward and two beds
        ward = Ward.objects.create(name="ICU-B", ward_type="ICU", total_beds=5, cost_per_day=5000.00)
        bed1 = Bed.objects.create(ward=ward, bed_number="ICU-B-01")
        bed2 = Bed.objects.create(ward=ward, bed_number="ICU-B-02", is_occupied=True)
        
        # Admit patient to bed 1
        admission = BedAdmission.objects.create(
            patient=self.patient1, bed=bed1, admitting_doctor=self.doctor_profile, status="ADMITTED"
        )
        # Mark bed1 occupied manually for database consistency
        bed1.is_occupied = True
        bed1.save()

        self.client.force_authenticate(user=self.receptionist)
        detail_url = reverse("bed-admission-detail", args=[admission.id])

        # Swap to occupied bed2 should fail
        response = self.client.patch(detail_url, {"bed": bed2.id})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_query_filters(self):
        ward = Ward.objects.create(name="ICU-C", ward_type="ICU", total_beds=5, cost_per_day=5000.00)
        bed = Bed.objects.create(ward=ward, bed_number="ICU-C-01", is_occupied=False)
        admission = BedAdmission.objects.create(
            patient=self.patient1, bed=bed, admitting_doctor=self.doctor_profile, status="ADMITTED"
        )

        self.client.force_authenticate(user=self.receptionist)
        
        # Bed filters
        response = self.client.get(self.bed_url, {"ward": ward.id, "is_occupied": "false"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

        # Bed admission filters
        response = self.client.get(self.adm_url, {"patient": self.patient1.id, "status": "ADMITTED"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
