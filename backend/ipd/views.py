from rest_framework import viewsets
from ipd.models import Ward, Bed, BedAdmission, OTRoom, OTBooking
from ipd.serializers import WardSerializer, BedSerializer, BedAdmissionSerializer, OTRoomSerializer, OTBookingSerializer
from authentication.permissions import IsAdmin, IsReceptionistOrAdmin, IsStaffUser

class WardViewSet(viewsets.ModelViewSet):
    queryset = Ward.objects.all()
    serializer_class = WardSerializer

    def get_permissions(self):
        # Admins configure wards, staff views
        if self.action in ("create", "update", "partial_update", "destroy"):
            permission_classes = [IsAdmin]
        else:
            permission_classes = [IsStaffUser]
        return [permission() for permission in permission_classes]

class BedViewSet(viewsets.ModelViewSet):
    queryset = Bed.objects.all()
    serializer_class = BedSerializer

    def get_permissions(self):
        # Admins configure beds, staff views
        if self.action in ("create", "update", "partial_update", "destroy"):
            permission_classes = [IsAdmin]
        else:
            permission_classes = [IsStaffUser]
        return [permission() for permission in permission_classes]

    def get_queryset(self):
        queryset = Bed.objects.all()
        ward_id = self.request.query_params.get("ward", None)
        is_occupied = self.request.query_params.get("is_occupied", None)
        
        if ward_id:
            queryset = queryset.filter(ward_id=ward_id)
        if is_occupied is not None:
            # Convert string query param to boolean
            val = is_occupied.lower() in ("true", "1", "yes")
            queryset = queryset.filter(is_occupied=val)
            
        return queryset

class BedAdmissionViewSet(viewsets.ModelViewSet):
    queryset = BedAdmission.objects.all()
    serializer_class = BedAdmissionSerializer

    def get_permissions(self):
        # Receptionists and Admins manage admissions/discharges
        if self.action in ("create", "update", "partial_update", "destroy"):
            permission_classes = [IsReceptionistOrAdmin]
        else:
            permission_classes = [IsStaffUser]
        return [permission() for permission in permission_classes]

    def get_queryset(self):
        queryset = BedAdmission.objects.all()
        patient_id = self.request.query_params.get("patient", None)
        status = self.request.query_params.get("status", None)
        
        if patient_id:
            queryset = queryset.filter(patient_id=patient_id)
        if status:
            queryset = queryset.filter(status=status)
            
        return queryset

class OTRoomViewSet(viewsets.ModelViewSet):
    queryset = OTRoom.objects.all()
    serializer_class = OTRoomSerializer

    def get_permissions(self):
        if self.action in ("create", "update", "partial_update", "destroy"):
            permission_classes = [IsAdmin]
        else:
            permission_classes = [IsStaffUser]
        return [permission() for permission in permission_classes]

class OTBookingViewSet(viewsets.ModelViewSet):
    queryset = OTBooking.objects.all()
    serializer_class = OTBookingSerializer
    permission_classes = [IsStaffUser]

    def get_queryset(self):
        queryset = OTBooking.objects.all()
        surgeon_id = self.request.query_params.get("surgeon", None)
        room_id = self.request.query_params.get("room", None)
        if surgeon_id:
            queryset = queryset.filter(surgeon_id=surgeon_id)
        if room_id:
            queryset = queryset.filter(room_id=room_id)
        return queryset
