from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import action
from clinical.models import Appointment, Prescription, LabTest, LabOrder, PatientVitals
from clinical.serializers import (
    AppointmentSerializer,
    PrescriptionSerializer,
    LabTestSerializer,
    LabOrderSerializer,
    PatientVitalsSerializer
)
from authentication.permissions import IsAdmin, IsDoctor, IsReceptionistOrAdmin, IsStaffUser


class PatientVitalsViewSet(viewsets.ModelViewSet):
    queryset = PatientVitals.objects.all()
    serializer_class = PatientVitalsSerializer
    permission_classes = [IsStaffUser]

    def get_queryset(self):
        queryset = PatientVitals.objects.all()
        patient_id = self.request.query_params.get("patient", None)
        if patient_id:
            queryset = queryset.filter(patient_id=patient_id)
        return queryset.order_by("-recorded_at")

class AppointmentViewSet(viewsets.ModelViewSet):
    queryset = Appointment.objects.all()
    serializer_class = AppointmentSerializer

    def get_permissions(self):
        # Write operations require Receptionist or Admin
        if self.action in ("create", "update", "partial_update", "destroy"):
            permission_classes = [IsReceptionistOrAdmin]
        else:
            permission_classes = [IsStaffUser]
        return [permission() for permission in permission_classes]

    def get_queryset(self):
        queryset = Appointment.objects.all()
        doctor_id = self.request.query_params.get("doctor", None)
        date = self.request.query_params.get("date", None)
        status = self.request.query_params.get("status", None)
        patient_id = self.request.query_params.get("patient", None)
        month = self.request.query_params.get("month", None)
        year = self.request.query_params.get("year", None)
        date_after = self.request.query_params.get("date_after", None)
        date_before = self.request.query_params.get("date_before", None)

        if doctor_id:
            queryset = queryset.filter(doctor_id=doctor_id)
        if date:
            queryset = queryset.filter(appointment_date=date)
        if status:
            queryset = queryset.filter(status=status)
        if patient_id:
            queryset = queryset.filter(patient_id=patient_id)
        if month:
            queryset = queryset.filter(appointment_date__month=month)
        if year:
            queryset = queryset.filter(appointment_date__year=year)
        if date_after:
            queryset = queryset.filter(appointment_date__gte=date_after)
        if date_before:
            queryset = queryset.filter(appointment_date__lte=date_before)
            
        return queryset

class PrescriptionViewSet(viewsets.ModelViewSet):
    queryset = Prescription.objects.all()
    serializer_class = PrescriptionSerializer

    def get_permissions(self):
        # Only Doctors can prescribe
        if self.action in ("create", "update", "partial_update", "destroy"):
            permission_classes = [IsDoctor]
        else:
            permission_classes = [IsStaffUser]
        return [permission() for permission in permission_classes]

    def get_queryset(self):
        queryset = Prescription.objects.all()
        patient_id = self.request.query_params.get("patient", None)
        if patient_id:
            queryset = queryset.filter(patient_id=patient_id)
        return queryset

    @action(detail=False, methods=["post"], permission_classes=[permissions.IsAuthenticated], url_path="ddi-check")
    def ddi_check(self, request):
        medicines = request.data.get("medicines", [])
        med_names = [str(m).strip().lower() for m in medicines if m]
        
        conflicts = []
        rules = [
            (
                {"aspirin", "warfarin"},
                "High risk of severe internal bleeding. Avoid concurrent use."
            ),
            (
                {"metformin", "contrast"},
                "Risk of lactic acidosis. Suspend Metformin 48 hours prior to contrast imaging."
            ),
            (
                {"ibuprofen", "aspirin"},
                "Aspirin cardioprotection may be reduced. Increased risk of gastrointestinal bleeding."
            ),
            (
                {"lisinopril", "spironolactone"},
                "Risk of severe hyperkalemia (high blood potassium)."
            )
        ]
        
        for req_set, warning in rules:
            matched = []
            for rule_part in req_set:
                for name in med_names:
                    if rule_part in name:
                        matched.append(rule_part)
                        break
            if len(matched) >= len(req_set):
                conflicts.append({
                    "drugs": list(req_set),
                    "severity": "HIGH",
                    "warning": warning
                })
                
        return Response({"conflicts": conflicts})

class LabTestViewSet(viewsets.ModelViewSet):
    queryset = LabTest.objects.all()
    serializer_class = LabTestSerializer

    def get_permissions(self):
        # Admin manages tests catalog, staff reads
        if self.action in ("create", "update", "partial_update", "destroy"):
            permission_classes = [IsAdmin]
        else:
            permission_classes = [IsStaffUser]
        return [permission() for permission in permission_classes]

class LabOrderViewSet(viewsets.ModelViewSet):
    queryset = LabOrder.objects.all()
    serializer_class = LabOrderSerializer

    def get_permissions(self):
        # Doctors can order tests
        if self.action in ("create", "destroy"):
            permission_classes = [IsDoctor]
        elif self.action in ("update", "partial_update"):
            # Doctors or LabTechs can modify order status/add results
            permission_classes = [IsStaffUser]
        else:
            permission_classes = [IsStaffUser]
        return [permission() for permission in permission_classes]

    def get_queryset(self):
        queryset = LabOrder.objects.all()
        patient_id = self.request.query_params.get("patient", None)
        status = self.request.query_params.get("status", None)
        if patient_id:
            queryset = queryset.filter(patient_id=patient_id)
        if status:
            queryset = queryset.filter(status=status)
        return queryset


import os
import json
import datetime
import urllib.request
from urllib.error import HTTPError, URLError
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated

class DailyRoomCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        api_key = os.environ.get("DAILY_API_KEY", "")
        room_name = request.data.get("room_name", "")
        
        # If API key is not set, fallback to mock/demo room URL
        if not api_key:
            import uuid
            mock_name = room_name or f"mediflow-{uuid.uuid4().hex[:8]}"
            mock_url = f"https://mediflow-test.daily.co/{mock_name}"
            return Response({
                "url": mock_url,
                "name": mock_name,
                "warning": "DAILY_API_KEY not configured. Running in demo fallback mode."
            }, status=status.HTTP_200_OK)

        url = "https://api.daily.co/v1/rooms"
        payload = {
            "properties": {
                "exp": int(datetime.datetime.now().timestamp()) + 3600, # 1 hour expiry
                "enable_chat": True
            }
        }
        if room_name:
            payload["name"] = room_name

        data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(url, data=data, method="POST")
        req.add_header("Authorization", f"Bearer {api_key}")
        req.add_header("Content-Type", "application/json")

        try:
            with urllib.request.urlopen(req) as response:
                res_data = json.loads(response.read().decode("utf-8"))
                return Response(res_data, status=status.HTTP_201_CREATED)
        except HTTPError as e:
            err_content = e.read().decode("utf-8")
            try:
                err_json = json.loads(err_content)
                # If room already exists, try to return join URL
                if e.code == 400 and "already exists" in err_json.get("info", ""):
                    subdomain = "mediflow" # Fallback or fetch from settings
                    return Response({
                        "url": f"https://{subdomain}.daily.co/{room_name}",
                        "name": room_name
                    }, status=status.HTTP_200_OK)
                return Response(err_json, status=e.code)
            except Exception:
                return Response({"error": err_content}, status=e.code)
        except URLError as e:
            return Response({"error": str(e.reason)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


