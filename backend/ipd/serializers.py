from django.db import transaction
from rest_framework import serializers
from patients.models import Patient
from staff.models import Doctor
from ipd.models import Ward, Bed, BedAdmission, OTRoom, OTBooking
from patients.serializers import PatientSerializer
from staff.serializers import DoctorSerializer

class WardSerializer(serializers.ModelSerializer):
    class Meta:
        model = Ward
        fields = ("id", "name", "ward_type", "total_beds", "cost_per_day", "is_active", "floor_number")

class BedSerializer(serializers.ModelSerializer):
    ward_name = serializers.CharField(source="ward.name", read_only=True)

    class Meta:
        model = Bed
        fields = ("id", "ward", "ward_name", "bed_number", "is_occupied", "is_active", "status", "bed_type", "notes")
        read_only_fields = ("id", "is_occupied")

class BedAdmissionSerializer(serializers.ModelSerializer):
    patient_details = PatientSerializer(source="patient", read_only=True)
    doctor_details = DoctorSerializer(source="admitting_doctor", read_only=True)
    bed_details = BedSerializer(source="bed", read_only=True)

    class Meta:
        model = BedAdmission
        fields = (
            "id",
            "patient",
            "patient_details",
            "bed",
            "bed_details",
            "admission_date",
            "discharge_date",
            "status",
            "admitting_doctor",
            "doctor_details",
            "notes"
        )
        read_only_fields = ("id", "admission_date")

    def validate(self, data):
        bed = data.get("bed") or (self.instance.bed if self.instance else None)
        status = data.get("status") or (self.instance.status if self.instance else None)
        discharge_date = data.get("discharge_date") or (self.instance.discharge_date if self.instance else None)

        # 1. On creation: check if bed is already occupied
        if not self.instance:
            if bed and bed.is_occupied:
                raise serializers.ValidationError("This bed is already occupied by another patient.")
        
        # 2. On update / discharge: check discharge date
        if status == "DISCHARGED" and not discharge_date:
            raise serializers.ValidationError("Discharge date must be provided when status is Discharged.")
            
        if discharge_date and self.instance and discharge_date < self.instance.admission_date:
            raise serializers.ValidationError("Discharge date cannot be before admission date.")

        return data

    def create(self, validated_data):
        bed = validated_data["bed"]
        
        with transaction.atomic():
            # Mark bed as occupied
            bed.is_occupied = True
            bed.save()
            
            admission = BedAdmission.objects.create(**validated_data)
            
        return admission

    def update(self, instance, validated_data):
        old_bed = instance.bed
        new_bed = validated_data.get("bed", old_bed)
        status = validated_data.get("status", instance.status)
        old_status = instance.status

        with transaction.atomic():
            if old_bed != new_bed:
                # Swapping beds: release old, occupy new
                if new_bed.is_occupied:
                    raise serializers.ValidationError("The newly selected bed is occupied.")
                old_bed.is_occupied = False
                old_bed.save()
                new_bed.is_occupied = True
                new_bed.save()

            if status == "DISCHARGED":
                # Release the bed
                current_bed = new_bed or old_bed
                current_bed.is_occupied = False
                current_bed.save()

            instance = super().update(instance, validated_data)
            
            # Trigger invoice on discharge transition
            if status == "DISCHARGED" and old_status != "DISCHARGED":
                from billing.utils import create_admission_invoice
                create_admission_invoice(instance)
            
        return instance

class OTRoomSerializer(serializers.ModelSerializer):
    class Meta:
        model = OTRoom
        fields = ("id", "name", "status", "is_active")

class OTBookingSerializer(serializers.ModelSerializer):
    patient_details = PatientSerializer(source="patient", read_only=True)
    surgeon_details = DoctorSerializer(source="surgeon", read_only=True)
    room_name = serializers.CharField(source="room.name", read_only=True)

    class Meta:
        model = OTBooking
        fields = (
            "id",
            "patient",
            "patient_details",
            "surgeon",
            "surgeon_details",
            "anesthesiologist",
            "room",
            "room_name",
            "start_time",
            "end_time",
            "status",
            "surgery_name"
        )
