import datetime
from django.urls import reverse
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from rest_framework import status
from rest_framework.test import APITestCase
from patients.models import Patient
from clinical.models import Prescription
from pharmacy.models import Medicine, StockBatch, DispensationLog
from pharmacy.services import dispense_medicine_fifo

User = get_user_model()

class PharmacyAppTests(APITestCase):
    def setUp(self):
        # Users
        self.admin = User.objects.create_user(username="admin", password="password", role="ADMIN")
        self.pharmacist = User.objects.create_user(username="pharmacist", password="password", role="PHARMACIST")
        
        # Patient & Doctor details
        self.patient = Patient.objects.create(
            first_name="Ahmad", last_name="Zahid", cnic="35201-6666666-6",
            date_of_birth="1996-06-06", gender="M", phone="03006666666", address="Lahore",
            emergency_contact_name="Emergency Contact", emergency_contact_phone="03001112222"
        )
        
        # Medicine Setup
        self.medicine = Medicine.objects.create(
            name="Panadol 500mg",
            generic_name="Paracetamol",
            formulation="TABLET",
            strength="500mg"
        )
        
        # Create 2 batches with different expiry dates (FIFO order)
        # Batch 1: Expiring in 10 days, Quantity = 100
        self.batch1 = StockBatch.objects.create(
            medicine=self.medicine,
            batch_number="B01",
            expiry_date=datetime.date.today() + datetime.timedelta(days=10),
            quantity_received=100,
            quantity_remaining=100,
            unit_price=1.50
        )
        
        # Batch 2: Expiring in 60 days, Quantity = 100
        self.batch2 = StockBatch.objects.create(
            medicine=self.medicine,
            batch_number="B02",
            expiry_date=datetime.date.today() + datetime.timedelta(days=60),
            quantity_received=100,
            quantity_remaining=100,
            unit_price=1.50
        )

        self.dispense_url = reverse("dispensation-list")
        self.alerts_url = reverse("stock-batch-alerts")

    def test_fifo_stock_deduction(self):
        # Create a dispensation log
        disp_log = DispensationLog.objects.create(
            dispensed_to=self.patient,
            dispensed_by=self.pharmacist
        )

        # Dispense 150 units (should take 100 from batch1 and 50 from batch2)
        dispense_medicine_fifo(disp_log, self.medicine, 150)

        self.batch1.refresh_from_db()
        self.batch2.refresh_from_db()

        self.assertEqual(self.batch1.quantity_remaining, 0)
        self.assertEqual(self.batch2.quantity_remaining, 50)
        self.assertEqual(disp_log.items.count(), 2)

    def test_fifo_insufficient_stock_raises_error(self):
        disp_log = DispensationLog.objects.create(
            dispensed_to=self.patient,
            dispensed_by=self.pharmacist
        )

        # Attempt to dispense 250 units (available = 200)
        with self.assertRaises(ValidationError):
            dispense_medicine_fifo(disp_log, self.medicine, 250)

    def test_low_stock_and_expiry_alerts(self):
        # Create low stock batch
        StockBatch.objects.create(
            medicine=self.medicine,
            batch_number="B_LOW",
            expiry_date=datetime.date.today() + datetime.timedelta(days=120),
            quantity_received=100,
            quantity_remaining=10, # low stock (less than 50)
            unit_price=2.00
        )

        self.client.force_authenticate(user=self.pharmacist)
        response = self.client.get(self.alerts_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify both low stock and expiring batches show up
        batch_numbers = [item["batch_number"] for item in response.data]
        self.assertIn("B01", batch_numbers) # Expiring in 10 days
        self.assertIn("B_LOW", batch_numbers) # Low stock
