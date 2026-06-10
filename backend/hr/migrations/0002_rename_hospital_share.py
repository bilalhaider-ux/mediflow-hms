from django.db import migrations

class Migration(migrations.Migration):

    dependencies = [
        ('hr', '0001_initial'),
    ]

    operations = [
        migrations.RenameField(
            model_name='doctorfeeshare',
            old_name='hospital_share',
            new_name='facility_share',
        ),
    ]
