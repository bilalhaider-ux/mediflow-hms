import re
from rest_framework import serializers
from patients.models import Patient

class PatientSerializer(serializers.ModelSerializer):
    class Meta:
        model = Patient
        fields = (
            "id",
            "user",
            "mrn",
            "first_name",
            "last_name",
            "cnic",
            "date_of_birth",
            "gender",
            "phone",
            "email",
            "address",
            "emergency_contact_name",
            "emergency_contact_phone",
            "qr_code_data",
            "is_active"
        )
        read_only_fields = ("id", "mrn", "qr_code_data", "is_active")

    def validate_cnic(self, value):
        if not re.match(r"^\d{5}-\d{7}-\d{1}$", value):
            raise serializers.ValidationError("CNIC must follow the format XXXXX-XXXXXXX-X")
        
        # Check uniqueness (including soft deleted)
        existing = Patient.objects.all_with_deleted().filter(cnic=value)
        if self.instance:
            existing = existing.exclude(pk=self.instance.pk)
        if existing.exists():
            raise serializers.ValidationError("A patient with this CNIC already exists in the system.")
            
        return value
