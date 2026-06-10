from django.db.models.signals import post_save
from django.dispatch import receiver
from django.conf import settings
from clinical.models import Appointment, LabOrder
from pharmacy.models import DispensationLog
from notifications.models import Notification, WhatsAppLog
from billing.models import Invoice
from notifications.services import WhatsAppService


@receiver(post_save, sender=Appointment)
def appointment_notification(sender, instance, created, **kwargs):
    # Notify Patient
    if instance.patient.user:
        action = "scheduled" if created else "updated"
        Notification.objects.create(
            user=instance.patient.user,
            title=f"Appointment {action.capitalize()}",
            message=f"Your appointment with Dr. {instance.doctor.user.get_full_name()} is {action} for {instance.appointment_date} at {instance.start_time}."
        )
    # Notify Doctor
    if instance.doctor.user:
        action = "assigned" if created else "updated"
        Notification.objects.create(
            user=instance.doctor.user,
            title=f"Appointment {action.capitalize()}",
            message=f"Appointment {action} with patient {instance.patient.first_name} {instance.patient.last_name} for {instance.appointment_date} at {instance.start_time}."
        )
    
    # WhatsApp Alert
    if created:
        WhatsAppService.send_message(
            phone=instance.patient.phone,
            message=f"Hi {instance.patient.first_name}, your appointment with Dr. {instance.doctor.user.get_full_name()} is confirmed for {instance.appointment_date} at {instance.start_time}. Token: #{instance.token_number}.",
            message_type="TOKEN"
        )

@receiver(post_save, sender=Appointment)
def schedule_reminder(sender, instance, created, **kwargs):
    if created and instance.appointment_date:
        from datetime import timedelta
        from django.utils import timezone
        from notifications.tasks import send_appointment_reminder
        reminder_time = instance.appointment_datetime - timedelta(hours=24)
        if reminder_time < timezone.now():
            reminder_time = timezone.now() + timedelta(minutes=1)
        send_appointment_reminder.apply_async(
            args=[instance.id], eta=reminder_time)

@receiver(post_save, sender=LabOrder)
def lab_order_notification(sender, instance, created, **kwargs):
    if not created and instance.status == "COMPLETED" and instance.patient.user:
        Notification.objects.create(
            user=instance.patient.user,
            title="Lab Test Results Available",
            message=f"Your diagnostic results for {instance.tests.first().name if instance.tests.exists() else 'lab tests'} are ready. You can now download the report from your portal."
        )
    if not created and instance.status == "COMPLETED":
        WhatsAppService.send_message(
            phone=instance.patient.phone,
            message=f"Hi {instance.patient.first_name}, your lab results are ready. Download the PDF report here: {settings.SITE_URL.rstrip('/')}/media/lab_results/report_{instance.id}.pdf",
            message_type="LAB_REPORT"
        )

@receiver(post_save, sender=DispensationLog)
def pharmacy_dispensation_notification(sender, instance, created, **kwargs):
    if created and instance.dispensed_to.user:
        medicines = ", ".join([item.medicine.name for item in instance.items.all()])
        Notification.objects.create(
            user=instance.dispensed_to.user,
            title="Prescription Dispensed",
            message=f"Your medications ({medicines}) have been dispensed by the pharmacy."
        )

@receiver(post_save, sender=Invoice)
def invoice_whatsapp_notification(sender, instance, created, **kwargs):
    if created:
        WhatsAppService.send_message(
            phone=instance.patient.phone,
            message=f"Hi {instance.patient.first_name}, invoice {instance.invoice_number} has been generated for amount Rs. {instance.total_amount}. Status: {instance.status}.",
            message_type="BILL"
        )
    elif instance.status == "PAID":
        WhatsAppService.send_message(
            phone=instance.patient.phone,
            message=f"Thank you {instance.patient.first_name}! Payment of Rs. {instance.total_amount} received for invoice {instance.invoice_number}.",
            message_type="BILL"
        )
