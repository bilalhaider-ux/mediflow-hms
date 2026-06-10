import django, os
os.environ['DJANGO_SETTINGS_MODULE'] = 'config.settings'
django.setup()
from staff.models import Doctor
from patients.models import Patient
from clinical.models import Appointment

with open('db_status.txt', 'w') as f:
    f.write(f"Doc Count: {Doctor.objects.count()}\n")
    f.write(f"Patient Count: {Patient.objects.count()}\n")
    f.write(f"Appt Count: {Appointment.objects.count()}\n")
    for d in Doctor.objects.all():
        f.write(f"Doc: {d.id} {d.user.username}\n")
