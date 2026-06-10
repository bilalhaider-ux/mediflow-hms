from django.urls import reverse
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase
from staff.models import Department, Doctor, DoctorSchedule, StaffProfile

User = get_user_model()

class StaffModelAndAPITests(APITestCase):
    def setUp(self):
        # Create users
        self.admin = User.objects.create_user(
            username="admin", password="password", role="ADMIN"
        )
        self.receptionist = User.objects.create_user(
            username="receptionist", password="password", role="RECEPTIONIST"
        )
        
        self.doc_user1 = User.objects.create_user(
            username="doctor_ahmad", password="password", role="DOCTOR", first_name="Ahmad"
        )
        self.doc_user2 = User.objects.create_user(
            username="doctor_fatima", password="password", role="DOCTOR", first_name="Fatima"
        )

        # Create department
        self.department = Department.objects.create(
            name="Cardiology", description="Heart Specialist Clinic"
        )

        # Create doctor profiles
        self.doctor1 = Doctor.objects.create(
            user=self.doc_user1,
            department=self.department,
            specialization="Cardiologist",
            license_number="PMC-12345-D",
            consultation_fee=2000.00,
            room_number="OPD-10"
        )
        self.doctor2 = Doctor.objects.create(
            user=self.doc_user2,
            department=self.department,
            specialization="Pediatric Cardiologist",
            license_number="PMC-67890-D",
            consultation_fee=2500.00,
            room_number="OPD-12"
        )

        self.dept_list_url = reverse("department-list")
        self.doc_list_url = reverse("doctor-list")
        self.sched_list_url = reverse("doctor-schedule-list")

    def test_model_str_methods(self):
        # Department str
        self.assertEqual(str(self.department), "Cardiology")
        
        # Doctor str
        self.assertEqual(str(self.doctor1), "Dr. Ahmad (Cardiologist)")
        
        # Schedule str
        schedule = DoctorSchedule.objects.create(
            doctor=self.doctor1, day_of_week=0, start_time="09:00:00", end_time="14:00:00"
        )
        self.assertEqual(str(schedule), "Dr. Ahmad (Cardiologist) - Monday (09:00:00 - 14:00:00)")
        
        # Staff profile str
        staff_profile = StaffProfile.objects.create(
            user=self.receptionist, department=self.department, designation="Front Desk Lead"
        )
        self.assertEqual(str(staff_profile), "receptionist - Front Desk Lead")

    def test_admin_can_create_department(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.post(self.dept_list_url, {
            "name": "Neurology",
            "description": "Brain and nerve clinic"
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(Department.objects.filter(name="Neurology").exists())

    def test_admin_can_update_department(self):
        self.client.force_authenticate(user=self.admin)
        dept_url = reverse("department-detail", args=[self.department.id])
        response = self.client.patch(dept_url, {"description": "Updated cardiology"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_receptionist_cannot_create_department(self):
        self.client.force_authenticate(user=self.receptionist)
        response = self.client.post(self.dept_list_url, {
            "name": "Neurology"
        })
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_doctor_can_manage_own_schedule(self):
        self.client.force_authenticate(user=self.doc_user1)
        
        # Create schedule for self
        response = self.client.post(self.sched_list_url, {
            "doctor": self.doctor1.id,
            "day_of_week": 0,  # Monday
            "start_time": "09:00:00",
            "end_time": "14:00:00",
            "max_patients": 20
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Update schedule for self
        sched_id = response.data["id"]
        detail_url = reverse("doctor-schedule-detail", args=[sched_id])
        response = self.client.patch(detail_url, {"max_patients": 25})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["max_patients"], 25)

    def test_doctor_cannot_manage_other_doctor_schedule(self):
        self.client.force_authenticate(user=self.doc_user1)
        
        # Try to create schedule for doctor2
        response = self.client.post(self.sched_list_url, {
            "doctor": self.doctor2.id,
            "day_of_week": 1,  # Tuesday
            "start_time": "10:00:00",
            "end_time": "15:00:00"
        })
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        # Try to update schedule for doctor2
        schedule = DoctorSchedule.objects.create(
            doctor=self.doctor2, day_of_week=0, start_time="09:00:00", end_time="14:00:00"
        )
        detail_url = reverse("doctor-schedule-detail", args=[schedule.id])
        response = self.client.patch(detail_url, {"max_patients": 35})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_staff_can_view_doctors(self):
        self.client.force_authenticate(user=self.receptionist)
        response = self.client.get(self.doc_list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)

    def test_filter_doctors_by_department(self):
        self.client.force_authenticate(user=self.receptionist)
        response = self.client.get(self.doc_list_url, {"department": self.department.id})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)

    def test_filter_schedules_by_doctor(self):
        schedule = DoctorSchedule.objects.create(
            doctor=self.doctor1, day_of_week=0, start_time="09:00:00", end_time="14:00:00"
        )
        self.client.force_authenticate(user=self.receptionist)
        response = self.client.get(self.sched_list_url, {"doctor": self.doctor1.id})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
