from rest_framework import serializers
from .models import Medicine, StockBatch, DispensationLog, DispensationItem, Supplier, SupplierLedger
from patients.serializers import PatientSerializer
from authentication.serializers import BranchSerializer

class SupplierSerializer(serializers.ModelSerializer):
    class Meta:
        model = Supplier
        fields = ["id", "name", "contact_person", "phone", "balance_due", "is_active"]

class SupplierLedgerSerializer(serializers.ModelSerializer):
    supplier_name = serializers.CharField(source="supplier.name", read_only=True)

    class Meta:
        model = SupplierLedger
        fields = ["id", "supplier", "supplier_name", "transaction_date", "description", "amount_credited", "amount_debited", "running_balance"]
        read_only_fields = ["id", "transaction_date", "running_balance"]


class MedicineSerializer(serializers.ModelSerializer):
    branch_details = BranchSerializer(source="branch", read_only=True)

    class Meta:
        model = Medicine
        fields = ["id", "name", "generic_name", "formulation", "strength", "manufacturer", "description", "reorder_level", "branch", "branch_details", "is_active"]

class StockBatchSerializer(serializers.ModelSerializer):
    medicine_name = serializers.CharField(source="medicine.name", read_only=True)
    is_expired = serializers.BooleanField(read_only=True)

    class Meta:
        model = StockBatch
        fields = [
            "id", "medicine", "medicine_name", "batch_number", "expiry_date", 
            "quantity_received", "quantity_remaining", "unit_cost", "unit_price", 
            "is_expired", "created_at"
        ]

class DispensationItemSerializer(serializers.ModelSerializer):
    medicine_name = serializers.CharField(source="medicine.name", read_only=True)
    batch_number = serializers.CharField(source="batch.batch_number", read_only=True)

    class Meta:
        model = DispensationItem
        fields = ["id", "medicine", "medicine_name", "batch", "batch_number", "quantity", "unit_price", "total_price"]
        read_only_fields = ["unit_price", "total_price"]

class DispensationLogSerializer(serializers.ModelSerializer):
    items = DispensationItemSerializer(many=True, read_only=True)
    dispensed_by_username = serializers.CharField(source="dispensed_by.username", read_only=True)
    patient_details = PatientSerializer(source="dispensed_to", read_only=True)

    class Meta:
        model = DispensationLog
        fields = [
            "id", "prescription", "dispensed_by", "dispensed_by_username", 
            "dispensed_to", "patient_details", "dispensed_at", "items"
        ]
        read_only_fields = ["dispensed_by", "dispensed_at"]
