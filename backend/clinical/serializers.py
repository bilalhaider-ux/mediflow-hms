import datetime
from django.db import models
from rest_framework import serializers
from patients.models import Patient
from staff.models import Doctor, DoctorSchedule
from clinical.models import Appointment, Prescription, PrescriptionItem, LabTest, LabOrder, PatientVitals
from patients.serializers import PatientSerializer
from staff.serializers import DoctorSerializer

class PatientVitalsSerializer(serializers.ModelSerializer):
    patient_details = PatientSerializer(source="patient", read_only=True)
    recorded_by_name = serializers.CharField(source="recorded_by.get_full_name", read_only=True)

    class Meta:
        model = PatientVitals
        fields = (
            "id",
            "patient",
            "patient_details",
            "recorded_by",
            "recorded_by_name",
            "recorded_at",
            "blood_pressure",
            "pulse",
            "temperature",
            "oxygen_saturation",
            "weight",
            "height"
        )
        read_only_fields = ("id", "recorded_at", "recorded_by")

    def create(self, validated_data):
        request = self.context.get("request")
        if request and request.user:
            validated_data["recorded_by"] = request.user
        return super().create(validated_data)


class AppointmentSerializer(serializers.ModelSerializer):
    patient_details = PatientSerializer(source="patient", read_only=True)
    doctor_details = DoctorSerializer(source="doctor", read_only=True)

    class Meta:
        model = Appointment
        fields = (
            "id",
            "patient",
            "patient_details",
            "doctor",
            "doctor_details",
            "appointment_date",
            "start_time",
            "end_time",
            "token_number",
            "status",
            "appointment_type",
            "notes"
        )
        read_only_fields = ("id", "token_number")

    def create(self, validated_data):
        appointment = super().create(validated_data)
        from billing.utils import create_appointment_invoice
        create_appointment_invoice(appointment)
        return appointment

    def validate(self, data):
        doctor = data.get("doctor") or (self.instance.doctor if self.instance else None)
        date = data.get("appointment_date") or (self.instance.appointment_date if self.instance else None)
        start_time = data.get("start_time") or (self.instance.start_time if self.instance else None)
        end_time = data.get("end_time") or (self.instance.end_time if self.instance else None)

        if not doctor or not date or not start_time or not end_time:
            return data

        if start_time >= end_time:
            raise serializers.ValidationError("Start time must be before end time.")

        # 1. Verify doctor's active schedule for this day of week
        day_of_week = date.weekday()  # Monday is 0, Sunday is 6
        schedule = DoctorSchedule.objects.filter(doctor=doctor, day_of_week=day_of_week).first()
        
        if not schedule:
            raise serializers.ValidationError(
                f"Doctor is not scheduled to consult on {date.strftime('%A')}s."
            )
            
        # Check if times fit within shift times
        if start_time < schedule.start_time or end_time > schedule.end_time:
            raise serializers.ValidationError(
                f"Selected time slot is outside doctor's shift: {schedule.start_time.strftime('%H:%M')} - {schedule.end_time.strftime('%H:%M')}."
            )

        # 2. Check total booking capacity limit
        existing_bookings = Appointment.objects.all_with_deleted().filter(
            doctor=doctor,
            appointment_date=date,
            status="PENDING"
        )
        if self.instance:
            existing_bookings = existing_bookings.exclude(pk=self.instance.pk)
            
        if existing_bookings.count() >= schedule.max_patients:
            raise serializers.ValidationError(
                f"Doctor has reached maximum booking capacity ({schedule.max_patients} patients) for this date."
            )

        # 3. Check for overlapping appointments
        overlapping = Appointment.objects.filter(
            doctor=doctor,
            appointment_date=date,
            status="PENDING",
            start_time__lt=end_time,
            end_time__gt=start_time
        )
        if self.instance:
            overlapping = overlapping.exclude(pk=self.instance.pk)
            
        if overlapping.exists():
            raise serializers.ValidationError(
                "Time slot overlaps with an existing pending appointment."
            )

        return data

class PrescriptionItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = PrescriptionItem
        fields = ("id", "medicine_name", "dosage", "duration", "instructions")

class PrescriptionSerializer(serializers.ModelSerializer):
    items = PrescriptionItemSerializer(many=True)
    patient_details = PatientSerializer(source="patient", read_only=True)
    doctor_details = DoctorSerializer(source="doctor", read_only=True)

    class Meta:
        model = Prescription
        fields = (
            "id",
            "patient",
            "patient_details",
            "doctor",
            "doctor_details",
            "appointment",
            "date_prescribed",
            "diagnosis",
            "icd_code",
            "icd_description",
            "notes",
            "items"
        )
        read_only_fields = ("id", "date_prescribed")

    def create(self, validated_data):
        items_data = validated_data.pop("items", [])
        prescription = Prescription.objects.create(**validated_data)
        for item_data in items_data:
            PrescriptionItem.objects.create(prescription=prescription, **item_data)
        return prescription

class LabTestSerializer(serializers.ModelSerializer):
    class Meta:
        model = LabTest
        fields = ("id", "name", "code", "description", "cost", "is_active")

class LabOrderSerializer(serializers.ModelSerializer):
    patient_details = PatientSerializer(source="patient", read_only=True)
    doctor_details = DoctorSerializer(source="doctor", read_only=True)
    test_details = LabTestSerializer(source="tests", many=True, read_only=True)

    class Meta:
        model = LabOrder
        fields = (
            "id",
            "patient",
            "patient_details",
            "doctor",
            "doctor_details",
            "prescription",
            "tests",
            "test_details",
            "order_date",
            "status",
            "results_summary",
            "results_file"
        )
        read_only_fields = ("id", "order_date")

    def create(self, validated_data):
        tests = validated_data.pop("tests", [])
        lab_order = LabOrder.objects.create(**validated_data)
        lab_order.tests.set(tests)
        
        from billing.utils import create_lab_order_invoice
        create_lab_order_invoice(lab_order)
        
        return lab_order
