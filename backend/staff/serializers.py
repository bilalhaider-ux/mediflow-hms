from rest_framework import serializers
from django.contrib.auth import get_user_model
from staff.models import Department, Doctor, DoctorSchedule, StaffProfile
from authentication.serializers import UserSerializer

User = get_user_model()

class DepartmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Department
        fields = ("id", "name", "description", "is_active")
        read_only_fields = ("id", "is_active")

class DoctorScheduleSerializer(serializers.ModelSerializer):
    day_name = serializers.CharField(source="get_day_of_week_display", read_only=True)

    class Meta:
        model = DoctorSchedule
        fields = ("id", "doctor", "day_of_week", "day_name", "start_time", "end_time", "max_patients")
        read_only_fields = ("id",)

class DoctorSerializer(serializers.ModelSerializer):
    user_details = UserSerializer(source="user", read_only=True)
    user = serializers.PrimaryKeyRelatedField(queryset=User.objects.filter(role="DOCTOR"))
    department_name = serializers.CharField(source="department.name", read_only=True)
    doctor_type_display = serializers.CharField(source="get_doctor_type_display", read_only=True)
    schedules = DoctorScheduleSerializer(many=True, read_only=True)

    class Meta:
        model = Doctor
        fields = (
            "id",
            "user",
            "user_details",
            "department",
            "department_name",
            "doctor_type",
            "doctor_type_display",
            "specialization",
            "license_number",
            "consultation_fee",
            "room_number",
            "schedules",
            "base_salary",
            "is_active"
        )
        read_only_fields = ("id", "is_active")

class StaffProfileSerializer(serializers.ModelSerializer):
    user_details = UserSerializer(source="user", read_only=True)
    user = serializers.PrimaryKeyRelatedField(queryset=User.objects.exclude(role="PATIENT"))
    department_name = serializers.CharField(source="department.name", read_only=True)

    class Meta:
        model = StaffProfile
        fields = (
            "id",
            "user",
            "user_details",
            "department",
            "department_name",
            "designation",
            "base_salary",
            "is_active"
        )
        read_only_fields = ("id", "is_active")
