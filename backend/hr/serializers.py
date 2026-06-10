from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Attendance, DoctorFeeShare, PayrollSlip

User = get_user_model()

class UserSimpleSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ["id", "username", "role", "full_name", "phone_number"]

    def get_full_name(self, obj):
        return obj.get_full_name() or obj.username

class AttendanceSerializer(serializers.ModelSerializer):
    user_details = UserSimpleSerializer(source="user", read_only=True)

    class Meta:
        model = Attendance
        fields = ["id", "user", "user_details", "date", "clock_in", "clock_out", "status"]
        read_only_fields = ["id"]

class DoctorFeeShareSerializer(serializers.ModelSerializer):
    doctor_name = serializers.CharField(source="doctor.__str__", read_only=True)
    invoice_number = serializers.CharField(source="invoice.invoice_number", read_only=True)

    class Meta:
        model = DoctorFeeShare
        fields = [
            "id", "doctor", "doctor_name", "invoice", "invoice_number",
            "consultation_fee", "doctor_share", "facility_share", "created_at"
        ]

class PayrollSlipSerializer(serializers.ModelSerializer):
    user_details = UserSimpleSerializer(source="user", read_only=True)

    class Meta:
        model = PayrollSlip
        fields = [
            "id", "user", "user_details", "month", "year", "basic_salary",
            "allowances", "deductions", "doctor_share", "net_salary", "status", "created_at"
        ]
        read_only_fields = ["id", "basic_salary", "allowances", "deductions", "doctor_share", "net_salary", "created_at"]
