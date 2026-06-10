from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.contrib.auth import get_user_model
from staff.models import Department, Doctor, DoctorSchedule, StaffProfile
from staff.serializers import (
    DepartmentSerializer,
    DoctorSerializer,
    DoctorScheduleSerializer,
    StaffProfileSerializer
)
from authentication.permissions import IsAdmin, IsStaffUser

User = get_user_model()

class DepartmentViewSet(viewsets.ModelViewSet):
    queryset = Department.objects.all()
    serializer_class = DepartmentSerializer

    def get_permissions(self):
        # Admins can manage departments, all staff can read
        if self.action in ("create", "update", "partial_update", "destroy"):
            permission_classes = [IsAdmin]
        else:
            permission_classes = [IsStaffUser]
        return [permission() for permission in permission_classes]

class DoctorViewSet(viewsets.ModelViewSet):
    queryset = Doctor.objects.all()
    serializer_class = DoctorSerializer

    def get_permissions(self):
        # Admins can manage doctor profiles, all staff can view
        if self.action in ("create", "update", "partial_update", "destroy", "register_doctor", "change_password"):
            permission_classes = [IsAdmin]
        else:
            permission_classes = [IsStaffUser]
        return [permission() for permission in permission_classes]

    def get_queryset(self):
        queryset = Doctor.objects.all()
        # Filter by department if provided
        dept_id = self.request.query_params.get("department", None)
        if dept_id:
            queryset = queryset.filter(department_id=dept_id)
        return queryset

    @action(detail=False, methods=["post"], url_path="register-doctor")
    def register_doctor(self, request):
        """
        One-step doctor registration: creates User account + Doctor profile.
        No need to pre-create a User account separately.
        """
        data = request.data
        username = data.get("username", "").strip()
        password = data.get("password", "")
        email = data.get("email", "").strip()
        first_name = data.get("first_name", "").strip()
        last_name = data.get("last_name", "").strip()
        phone_number = data.get("phone_number", "").strip()
        doctor_type = data.get("doctor_type", "GENERAL").strip()
        specialization = data.get("specialization", "").strip()
        department_id = data.get("department")
        license_number = data.get("license_number", "").strip()
        consultation_fee = data.get("consultation_fee")
        room_number = data.get("room_number", "").strip()

        # Validations
        if not username:
            return Response({"error": "Username is required."}, status=status.HTTP_400_BAD_REQUEST)
        if not password or len(password) < 6:
            return Response({"error": "Password must be at least 6 characters."}, status=status.HTTP_400_BAD_REQUEST)
        if not first_name:
            return Response({"error": "First name is required."}, status=status.HTTP_400_BAD_REQUEST)
        if not specialization:
            return Response({"error": "Specialization is required."}, status=status.HTTP_400_BAD_REQUEST)
        if not department_id:
            return Response({"error": "Department is required."}, status=status.HTTP_400_BAD_REQUEST)
        if not license_number:
            return Response({"error": "PMDC/License number is required."}, status=status.HTTP_400_BAD_REQUEST)
        if not consultation_fee:
            return Response({"error": "Consultation fee is required."}, status=status.HTTP_400_BAD_REQUEST)
        if not room_number:
            return Response({"error": "Room number is required."}, status=status.HTTP_400_BAD_REQUEST)

        # Check username uniqueness (including soft-deleted)
        if User.objects.all_with_deleted().filter(username=username).exists():
            return Response({"error": f"Username '{username}' is already taken."}, status=status.HTTP_400_BAD_REQUEST)

        # Check license uniqueness
        if Doctor.objects.filter(license_number=license_number).exists():
            return Response({"error": f"PMDC number '{license_number}' is already registered."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            department = Department.objects.get(pk=department_id)
        except Department.DoesNotExist:
            return Response({"error": "Invalid department."}, status=status.HTTP_400_BAD_REQUEST)

        # Validate doctor_type
        valid_types = [choice[0] for choice in Doctor.DOCTOR_TYPE_CHOICES]
        if doctor_type not in valid_types:
            doctor_type = "GENERAL"

        # Create user
        user = User.objects.create_user(
            username=username,
            password=password,
            email=email or f"{username}@hms.pk",
            first_name=first_name,
            last_name=last_name,
            role="DOCTOR",
            phone_number=phone_number,
        )

        # Create doctor profile
        doctor = Doctor.objects.create(
            user=user,
            department=department,
            doctor_type=doctor_type,
            specialization=specialization,
            license_number=license_number,
            consultation_fee=float(consultation_fee),
            room_number=room_number,
        )

        serializer = DoctorSerializer(doctor)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="change-password")
    def change_password(self, request, pk=None):
        """Admin can change a doctor's password."""
        doctor = self.get_object()
        new_password = request.data.get("new_password", "")
        if not new_password or len(new_password) < 6:
            return Response({"error": "Password must be at least 6 characters."}, status=status.HTTP_400_BAD_REQUEST)
        doctor.user.set_password(new_password)
        doctor.user.save()
        return Response({"message": f"Password changed successfully for Dr. {doctor.user.get_full_name()}."})

class DoctorScheduleViewSet(viewsets.ModelViewSet):
    queryset = DoctorSchedule.objects.all()
    serializer_class = DoctorScheduleSerializer

    def get_permissions(self):
        # Admins and Doctors can create/update schedules, others can read
        if self.action in ("create", "update", "partial_update", "destroy"):
            permission_classes = [IsAdmin | permissions.BasePermission]  # Custom check below
        else:
            permission_classes = [IsStaffUser]
        return [permission() for permission in permission_classes]

    def get_queryset(self):
        queryset = DoctorSchedule.objects.all()
        doctor_id = self.request.query_params.get("doctor", None)
        if doctor_id:
            queryset = queryset.filter(doctor_id=doctor_id)
        return queryset

    def perform_create(self, serializer):
        # Check permissions: Doctors can only create schedules for themselves, Admins can do for anyone
        doctor = serializer.validated_data.get("doctor")
        if self.request.user.role == "DOCTOR" and doctor.user != self.request.user:
            raise permissions.exceptions.PermissionDenied("Doctors can only manage their own schedule.")
        serializer.save()

    def perform_update(self, serializer):
        doctor = serializer.instance.doctor
        if self.request.user.role == "DOCTOR" and doctor.user != self.request.user:
            raise permissions.exceptions.PermissionDenied("Doctors can only manage their own schedule.")
        serializer.save()

class StaffProfileViewSet(viewsets.ModelViewSet):
    queryset = StaffProfile.objects.all()
    serializer_class = StaffProfileSerializer
    permission_classes = [IsAdmin]
