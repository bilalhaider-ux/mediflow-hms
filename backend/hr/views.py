from datetime import datetime, time
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from django.contrib.auth import get_user_model
from django.db import models
from .models import Attendance, DoctorFeeShare, PayrollSlip
from .serializers import AttendanceSerializer, DoctorFeeShareSerializer, PayrollSlipSerializer
from authentication.permissions import IsStaffUser, IsAdmin, IsReceptionistOrAdmin, IsDoctor

User = get_user_model()

class AttendanceViewSet(viewsets.ModelViewSet):
    queryset = Attendance.objects.all().order_by("-date")
    serializer_class = AttendanceSerializer
    permission_classes = [IsStaffUser]

    def get_queryset(self):
        queryset = super().get_queryset()
        if self.request.user.role != "ADMIN":
            queryset = queryset.filter(user=self.request.user)
        return queryset

    @action(detail=False, methods=["post"])
    def clock_in(self, request):
        user = request.user
        now = timezone.localtime(timezone.now())
        today = now.date()
        clock_time = now.time()

        # Check if already clocked in today
        attendance, created = Attendance.objects.get_or_create(
            user=user,
            date=today,
            defaults={
                "clock_in": clock_time,
                "status": "LATE" if clock_time > time(9, 15, 0) else "PRESENT"
            }
        )

        if not created:
            return Response({"error": "Already clocked in today."}, status=status.HTTP_400_BAD_REQUEST)

        return Response(AttendanceSerializer(attendance).data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=["post"])
    def clock_out(self, request):
        user = request.user
        now = timezone.localtime(timezone.now())
        today = now.date()
        clock_time = now.time()

        try:
            attendance = Attendance.objects.get(user=user, date=today)
            if attendance.clock_out:
                return Response({"error": "Already clocked out today."}, status=status.HTTP_400_BAD_REQUEST)
            attendance.clock_out = clock_time
            attendance.save()
            return Response(AttendanceSerializer(attendance).data, status=status.HTTP_200_OK)
        except Attendance.DoesNotExist:
            # Fallback: clock in and clock out together if they forgot to clock in
            attendance = Attendance.objects.create(
                user=user,
                date=today,
                clock_in=clock_time,
                clock_out=clock_time,
                status="LATE" if clock_time > time(9, 15, 0) else "PRESENT"
            )
            return Response(AttendanceSerializer(attendance).data, status=status.HTTP_201_CREATED)

class DoctorFeeShareViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = DoctorFeeShare.objects.all().order_by("-created_at")
    serializer_class = DoctorFeeShareSerializer
    permission_classes = [IsStaffUser]

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user
        if user.role == "DOCTOR":
            if hasattr(user, "doctor_profile"):
                queryset = queryset.filter(doctor=user.doctor_profile)
            else:
                queryset = queryset.none()
        elif user.role in ("ADMIN", "SUB_ADMIN"):
            if user.role == "SUB_ADMIN":
                queryset = queryset.filter(doctor__user__branch=user.branch)
        else:
            queryset = queryset.none()

        month = self.request.query_params.get("month", None)
        year = self.request.query_params.get("year", None)
        if month:
            queryset = queryset.filter(created_at__month=month)
        if year:
            queryset = queryset.filter(created_at__year=year)

        return queryset

class PayrollSlipViewSet(viewsets.ModelViewSet):
    queryset = PayrollSlip.objects.all().order_by("-year", "-month")
    serializer_class = PayrollSlipSerializer

    def get_permissions(self):
        if self.action in ["create", "destroy", "generate_monthly_payroll", "update", "partial_update"]:
            return [IsAdmin()]
        return [IsStaffUser()]

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user
        if user.role != "ADMIN":
            queryset = queryset.filter(user=user)
        return queryset

    @action(detail=False, methods=["post"])
    def generate_monthly_payroll(self, request):
        month = request.data.get("month")
        year = request.data.get("year")

        if not month or not year:
            return Response({"error": "Month and year are required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            month = int(month)
            year = int(year)
        except ValueError:
            return Response({"error": "Invalid month or year value."}, status=status.HTTP_400_BAD_REQUEST)

        # Generate payroll slips for all staff members (non-patient users)
        staff_users = User.objects.exclude(role="PATIENT")
        generated_slips = []

        for staff_user in staff_users:
            payroll_details = PayrollSlip.calculate_monthly_payroll(staff_user, month, year)
            
            # Get or create payroll slip for this staff member
            slip, created = PayrollSlip.objects.get_or_create(
                user=staff_user,
                month=month,
                year=year,
                defaults={
                    "basic_salary": payroll_details["basic_salary"],
                    "allowances": payroll_details["allowances"],
                    "deductions": payroll_details["deductions"],
                    "doctor_share": payroll_details["doctor_share"],
                    "status": "PENDING"
                }
            )

            if not created:
                # Update details if already exists
                slip.basic_salary = payroll_details["basic_salary"]
                slip.allowances = payroll_details["allowances"]
                slip.deductions = payroll_details["deductions"]
                slip.doctor_share = payroll_details["doctor_share"]
                slip.save()

            generated_slips.append(slip)

        return Response(PayrollSlipSerializer(generated_slips, many=True).data, status=status.HTTP_200_OK)
