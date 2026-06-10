from django.urls import reverse
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

User = get_user_model()

class ExportsTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(username="admin", password="password", role="ADMIN")
        self.doctor = User.objects.create_user(username="doctor", password="password", role="DOCTOR")
        
        self.export_url = reverse("financial-report-export")

    def test_export_pdf_requires_admin(self):
        # 1. Non-authenticated
        response = self.client.get(self.export_url + "?month=6&year=2026")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        
        # 2. Doctor role
        self.client.force_authenticate(user=self.doctor)
        response2 = self.client.get(self.export_url + "?month=6&year=2026")
        self.assertEqual(response2.status_code, status.HTTP_403_FORBIDDEN)

    def test_export_pdf_successful_compilation(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.get(self.export_url + "?month=6&year=2026")
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response["Content-Type"], "application/pdf")
        self.assertIn("attachment; filename=", response["Content-Disposition"])
