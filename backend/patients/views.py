from django.db import models
from django.contrib.auth import get_user_model
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken

from patients.models import Patient
from patients.serializers import PatientSerializer
from authentication.permissions import IsReceptionistOrAdmin, IsStaffUser

from clinical.models import Appointment, Prescription, LabOrder
from clinical.serializers import AppointmentSerializer, PrescriptionSerializer, LabOrderSerializer
from staff.models import Doctor

class PatientViewSet(viewsets.ModelViewSet):
    queryset = Patient.objects.all()
    serializer_class = PatientSerializer

    def get_permissions(self):
        if self.action == "portal_login":
            return [permissions.AllowAny()]
        elif self.action in ("portal_dashboard", "portal_request_appointment"):
            return [permissions.IsAuthenticated()]

        # Only Receptionists or Admins can perform modifications (Write)
        if self.action in ("create", "update", "partial_update", "destroy"):
            permission_classes = [IsReceptionistOrAdmin]
        else:
            # Other medical staff can read patient info
            permission_classes = [IsStaffUser]
        return [permission() for permission in permission_classes]

    def get_queryset(self):
        queryset = Patient.objects.all()
        search_query = self.request.query_params.get("search", None)
        if search_query:
            queryset = queryset.filter(
                models.Q(mrn__icontains=search_query) |
                models.Q(first_name__icontains=search_query) |
                models.Q(last_name__icontains=search_query) |
                models.Q(cnic__icontains=search_query) |
                models.Q(phone__icontains=search_query)
            )
        created_after = self.request.query_params.get("created_after", None)
        created_before = self.request.query_params.get("created_before", None)
        if created_after:
            queryset = queryset.filter(created_at__date__gte=created_after)
        if created_before:
            queryset = queryset.filter(created_at__date__lte=created_before)
        return queryset

    @action(detail=False, methods=["post"], url_path="portal-login")
    def portal_login(self, request):
        mrn = request.data.get("mrn")
        cnic = request.data.get("cnic")

        if not mrn or not cnic:
            return Response({"error": "MRN and CNIC are required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            patient = Patient.objects.get(mrn=mrn, cnic=cnic)
        except Patient.DoesNotExist:
            return Response({"error": "Invalid Medical Record Number (MRN) or CNIC combination."}, status=status.HTTP_400_BAD_REQUEST)

        User = get_user_model()
        user = patient.user

        if not user:
            username = mrn.replace("-", "_").lower()
            if User.objects.filter(username=username).exists():
                username = f"{username}_{Patient.objects.count()}"
            
            user = User.objects.create_user(
                username=username,
                first_name=patient.first_name,
                last_name=patient.last_name,
                role="PATIENT"
            )
            patient.user = user
            patient.save()

        refresh = RefreshToken.for_user(user)
        return Response({
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            "user": {
                "id": user.id,
                "username": user.username,
                "role": user.role,
                "full_name": f"{patient.first_name} {patient.last_name}",
                "patient_id": patient.id
            }
        }, status=status.HTTP_200_OK)

    @action(detail=False, methods=["get"], url_path="portal-dashboard")
    def portal_dashboard(self, request):
        user = request.user
        if user.role != "PATIENT" or not hasattr(user, "patient_profile"):
            return Response({"error": "Profile not authorized for patient dashboard access."}, status=status.HTTP_403_FORBIDDEN)

        patient = user.patient_profile
        appointments = Appointment.objects.filter(patient=patient).order_by("-appointment_date")
        prescriptions = Prescription.objects.filter(patient=patient).order_by("-date_prescribed")
        lab_orders = LabOrder.objects.filter(patient=patient).order_by("-order_date")

        return Response({
            "patient": PatientSerializer(patient).data,
            "appointments": AppointmentSerializer(appointments, many=True).data,
            "prescriptions": PrescriptionSerializer(prescriptions, many=True).data,
            "lab_orders": LabOrderSerializer(lab_orders, many=True).data
        }, status=status.HTTP_200_OK)

    @action(detail=False, methods=["post"], url_path="portal-request-appointment")
    def portal_request_appointment(self, request):
        user = request.user
        if user.role != "PATIENT" or not hasattr(user, "patient_profile"):
            return Response({"error": "Profile not authorized to request appointments."}, status=status.HTTP_403_FORBIDDEN)

        patient = user.patient_profile
        doctor_id = request.data.get("doctor")
        appointment_date = request.data.get("appointment_date")
        notes = request.data.get("notes", "")

        if not doctor_id or not appointment_date:
            return Response({"error": "Doctor ID and Appointment Date are required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            doctor = Doctor.objects.get(id=doctor_id)
        except Doctor.DoesNotExist:
            return Response({"error": "Selected doctor does not exist."}, status=status.HTTP_400_BAD_REQUEST)

        # Create online pending appointment
        appointment = Appointment.objects.create(
            patient=patient,
            doctor=doctor,
            appointment_date=appointment_date,
            start_time="09:00:00",
            end_time="09:30:00",
            appointment_type="ONLINE",
            status="PENDING",
            notes=notes
        )

        return Response(AppointmentSerializer(appointment).data, status=status.HTTP_201_CREATED)

