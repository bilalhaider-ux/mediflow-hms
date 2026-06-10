from rest_framework import serializers
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from authentication.models import Branch

class BranchSerializer(serializers.ModelSerializer):
    manager_name = serializers.CharField(source="manager.get_full_name", read_only=True)

    class Meta:
        model = Branch
        fields = ("id", "name", "city", "address", "is_active", "phone", "email", "manager", "manager_name")


User = get_user_model()

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        # Add custom claims
        token["username"] = user.username
        token["role"] = user.role
        token["email"] = user.email
        token["full_name"] = user.get_full_name()
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        # Add user info to response body as well
        data["user"] = {
            "id": self.user.id,
            "username": self.user.username,
            "email": self.user.email,
            "role": self.user.role,
            "full_name": self.user.get_full_name(),
            "branch_id": self.user.branch.id if self.user.branch else None
        }
        return data

class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False)
    branch_details = BranchSerializer(source="branch", read_only=True)

    class Meta:
        model = User
        fields = ("id", "username", "email", "password", "first_name", "last_name", "role", "phone_number", "branch", "branch_details", "is_active")
        read_only_fields = ("id",)

    def create(self, validated_data):
        password = validated_data.pop("password", None)
        user = User.objects.create(**validated_data)
        if password:
            user.set_password(password)
            user.save()
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop("password", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        instance.save()
        return instance

from authentication.models import HospitalSettings

class HospitalInfoSerializer(serializers.ModelSerializer):
    class Meta:
        model = HospitalSettings
        fields = ("hospital_name", "tagline", "logo", "address", "phone", "email")

class FinancialSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = HospitalSettings
        fields = ("tax_percentage", "invoice_prefix", "currency_symbol", "doctor_fee_share")

class NotificationSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = HospitalSettings
        fields = ("whatsapp_enabled", "sms_enabled", "email_enabled", "reminder_hours")

class WorkingHoursSerializer(serializers.ModelSerializer):
    class Meta:
        model = HospitalSettings
        fields = ("opd_start_time", "opd_end_time", "off_days", "max_slots_per_hour")

