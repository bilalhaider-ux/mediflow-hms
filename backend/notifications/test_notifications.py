from django.urls import reverse
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase
from notifications.models import Notification

User = get_user_model()

class NotificationTests(APITestCase):
    def setUp(self):
        self.user1 = User.objects.create_user(username="staff1", password="password", role="RECEPTIONIST")
        self.user2 = User.objects.create_user(username="staff2", password="password", role="DOCTOR")
        
        self.notif1 = Notification.objects.create(
            user=self.user1,
            title="Alert 1",
            message="Test message 1"
        )
        self.notif2 = Notification.objects.create(
            user=self.user1,
            title="Alert 2",
            message="Test message 2"
        )
        self.notif3 = Notification.objects.create(
            user=self.user2,
            title="Alert 3",
            message="Test message 3"
        )

        self.list_url = reverse("notification-list")
        self.mark_read_url = lambda pk: reverse("notification-mark-read", kwargs={"pk": pk})
        self.mark_all_read_url = reverse("notification-mark-all-read")

    def test_list_notifications_isolated(self):
        self.client.force_authenticate(user=self.user1)
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Handle paginated response
        if isinstance(response.data, dict) and "results" in response.data:
            results = response.data["results"]
        else:
            results = response.data
        # Should only list user1's notifications
        self.assertEqual(len(results), 2)
        titles = [n["title"] for n in results]
        self.assertIn("Alert 1", titles)
        self.assertNotIn("Alert 3", titles)


    def test_mark_notification_as_read(self):
        self.client.force_authenticate(user=self.user1)
        url = self.mark_read_url(self.notif1.id)
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        self.notif1.refresh_from_db()
        self.assertTrue(self.notif1.is_read)

    def test_mark_all_notifications_as_read(self):
        self.client.force_authenticate(user=self.user1)
        response = self.client.post(self.mark_all_read_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        unread_count = Notification.objects.filter(user=self.user1, is_read=False).count()
        self.assertEqual(unread_count, 0)


from unittest.mock import patch, MagicMock
from django.utils import timezone
import datetime
from django.test import override_settings
from notifications.models import WhatsAppLog
from notifications.services import WhatsAppService
from notifications.tasks import send_appointment_reminder, daily_appointment_reminder_sweep
from clinical.models import Appointment, Doctor
from patients.models import Patient
from staff.models import Department

@override_settings(CELERY_TASK_ALWAYS_EAGER=True, CELERY_ALWAYS_EAGER=True)
class WhatsAppReminderTests(APITestCase):
    def setUp(self):
        self.user_doctor = User.objects.create_user(username="dr_ali", password="password", role="DOCTOR", first_name="Ali", last_name="Ahmed")
        self.dept = Department.objects.create(name="Cardiology")
        self.doctor = Doctor.objects.create(
            user=self.user_doctor,
            license_number="12345-P",
            specialization="Cardiologist",
            department=self.dept,
            consultation_fee=1500.00,
            room_number="OPD-1"
        )
        
        self.patient = Patient.objects.create(
            first_name="Zain",
            last_name="Khan",
            phone="03001234567",
            gender="M",
            date_of_birth="1990-01-01",
            cnic="35201-1234567-1",
            address="Lahore, Pakistan",
            emergency_contact_name="Umer Khan",
            emergency_contact_phone="03007654321"
        )

    @patch("notifications.services.Client")
    def test_whatsapp_service_number_formatting_and_logging(self, mock_twilio_client):
        # Mock Twilio dispatch
        mock_instance = MagicMock()
        mock_twilio_client.return_value = mock_instance
        
        # Test phone number cleanup/formatting
        with patch.dict("os.environ", {"TWILIO_ACCOUNT_SID": "test_sid", "TWILIO_AUTH_TOKEN": "test_token", "TWILIO_WHATSAPP_NUMBER": "whatsapp:+14155238886"}):
            success = WhatsAppService.send_message(
                phone="03001234567",
                message="Test Message",
                message_type="TOKEN"
            )
            # Verify twilio client was called with correct parameters
            mock_twilio_client.assert_called_once_with("test_sid", "test_token")
            mock_instance.messages.create.assert_called_once_with(
                body="Test Message",
                from_="whatsapp:+14155238886",
                to="whatsapp:+923001234567"
            )
            self.assertTrue(success)
            
            # Verify WhatsAppLog was created
            log = WhatsAppLog.objects.filter(phone="03001234567").first()
            self.assertIsNotNone(log)
            self.assertEqual(log.message_body, "Test Message")
            self.assertEqual(log.message_type, "TOKEN")

    @patch("notifications.tasks.WhatsAppService.send")
    def test_send_appointment_reminder_task(self, mock_send):
        appt = Appointment.objects.create(
            patient=self.patient,
            doctor=self.doctor,
            appointment_date=timezone.localdate() + datetime.timedelta(days=1),
            start_time=datetime.time(10, 0),
            end_time=datetime.time(10, 30),
            token_number=5,
            status="PENDING"
        )
        mock_send.reset_mock()
        
        send_appointment_reminder(appt.id)
        mock_send.assert_called_once()
        args, kwargs = mock_send.call_args
        self.assertEqual(args[0], self.patient.phone)
        self.assertIn("Assalam o Alaikum Zain Khan", args[1])
        self.assertIn("Doctor: Ali Ahmed", args[1])

    @patch("notifications.tasks.send_appointment_reminder.apply_async")
    def test_appointment_created_signal_schedules_reminder(self, mock_apply_async):
        appt = Appointment.objects.create(
            patient=self.patient,
            doctor=self.doctor,
            appointment_date=timezone.localdate() + datetime.timedelta(days=2),
            start_time=datetime.time(10, 0),
            end_time=datetime.time(10, 30),
            token_number=6,
            status="PENDING"
        )
        # Verify Celery apply_async was called
        mock_apply_async.assert_called_once()
        kwargs = mock_apply_async.call_args[1]
        self.assertEqual(mock_apply_async.call_args[0], ())
        self.assertEqual(kwargs["args"], [appt.id])
        self.assertIsNotNone(kwargs["eta"])

