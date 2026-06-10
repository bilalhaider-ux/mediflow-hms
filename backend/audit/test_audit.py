from django.urls import reverse
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase
from patients.models import Patient
from audit.models import AuditLog

User = get_user_model()

class AuditAppTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(username="admin", password="password", role="ADMIN")
        self.receptionist = User.objects.create_user(username="receptionist", password="password", role="RECEPTIONIST")
        
        self.patient = Patient.objects.create(
            first_name="Asim", last_name="Majeed", cnic="35201-7777777-7",
            date_of_birth="1999-09-09", gender="M", phone="03007777777", address="Lahore",
            emergency_contact_name="Emergency Contact", emergency_contact_phone="03001112222"
        )
        
        self.patient_detail_url = reverse("patient-detail", kwargs={"pk": self.patient.id})
        self.kpi_stream_url = reverse("kpi-stream")

    def test_audit_log_middleware_patient_views(self):
        # Authenticate receptionist
        self.client.force_authenticate(user=self.receptionist)

        # 1. View patient details
        response = self.client.get(self.patient_detail_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Verify AuditLog was captured by middleware
        log = AuditLog.objects.filter(action="PATIENT_RECORD_VIEW").first()
        self.assertIsNotNone(log)
        self.assertEqual(log.user, self.receptionist)
        self.assertIn(str(self.patient.id), log.details)

    def test_kpi_stream_response_headers(self):
        self.client.force_authenticate(user=self.admin)
        
        response = self.client.get(self.kpi_stream_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Check event stream content type header
        self.assertEqual(response["Content-Type"], "text/event-stream")
        self.assertEqual(response["Cache-Control"], "no-cache")
