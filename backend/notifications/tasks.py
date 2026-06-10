from celery import shared_task
from clinical.models import Appointment
from notifications.services import WhatsAppService

@shared_task(bind=True, max_retries=3)
def send_appointment_reminder(self, appointment_id=None):
    # Handle direct test execution where self is passed as appointment_id
    if appointment_id is None:
        appointment_id = self
        self = None

    try:
        appointment = Appointment.objects.get(id=appointment_id)
        patient = appointment.patient
        msg = (f"Assalam o Alaikum {patient.full_name},\n"
               f"Aap ka appointment kal {appointment.time} baje hai\n"
               f"Doctor: {appointment.doctor.full_name}")
        WhatsAppService().send(patient.phone, msg)
    except Appointment.DoesNotExist:
        return f"Appointment {appointment_id} does not exist. Skipping."
    except Exception as exc:
        if self:
            raise self.retry(exc=exc, countdown=60)
        else:
            raise exc

@shared_task
def daily_appointment_reminder_sweep():
    import datetime
    from django.utils import timezone
    from notifications.models import WhatsAppLog

    # Find all PENDING appointments scheduled for tomorrow
    tomorrow = timezone.localdate() + datetime.timedelta(days=1)
    appointments = Appointment.objects.filter(
        appointment_date=tomorrow,
        status="PENDING"
    )

    sent_count = 0
    for appt in appointments:
        # Avoid duplicate reminders if already scheduled/sent today
        already_sent = WhatsAppLog.objects.filter(
            phone=appt.patient.phone,
            message_type="REMINDER",
            sent_at__date=timezone.localdate()
        ).exists()

        if not already_sent:
            message = (
                f"Dear {appt.patient.first_name}, this is a reminder for your upcoming appointment with "
                f"Dr. {appt.doctor.user.get_full_name()} scheduled for tomorrow {appt.appointment_date} "
                f"at {appt.start_time}. Token: #{appt.token_number}."
            )
            WhatsAppService.send_message(
                phone=appt.patient.phone,
                message=message,
                message_type="REMINDER"
            )
            sent_count += 1

    return f"Daily reminder sweep complete. Dispatched {sent_count} reminders."

