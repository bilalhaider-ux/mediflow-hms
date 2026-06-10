from rest_framework import serializers
from .models import Invoice, InvoiceItem, Payment, Panel, InvoiceRefund
from patients.serializers import PatientSerializer
from authentication.serializers import BranchSerializer

class PanelSerializer(serializers.ModelSerializer):
    class Meta:
        model = Panel
        fields = ["id", "name", "description", "discount_percentage", "is_active"]

class InvoiceRefundSerializer(serializers.ModelSerializer):
    refunded_by_name = serializers.CharField(source="refunded_by.get_full_name", read_only=True)

    class Meta:
        model = InvoiceRefund
        fields = ["id", "invoice", "refunded_by", "refunded_by_name", "refunded_amount", "reason", "created_at"]
        read_only_fields = ["id", "created_at", "refunded_by"]

class InvoiceItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = InvoiceItem
        fields = [
            "id", "invoice", "item_type", "item_id", 
            "description", "quantity", "unit_price", "total_price"
        ]
        read_only_fields = ["total_price"]

class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = [
            "id", "invoice", "amount", "payment_method", 
            "transaction_id", "status", "created_at"
        ]
        read_only_fields = ["created_at"]

class InvoiceSerializer(serializers.ModelSerializer):
    items = InvoiceItemSerializer(many=True, read_only=True)
    payments = PaymentSerializer(many=True, read_only=True)
    patient_detail = PatientSerializer(source="patient", read_only=True)
    panel_details = PanelSerializer(source="panel", read_only=True)
    branch_details = BranchSerializer(source="branch", read_only=True)

    class Meta:
        model = Invoice
        fields = [
            "id", "invoice_number", "patient", "patient_detail",
            "appointment", "admission", "status", "subtotal", 
            "tax", "discount", "total_amount", "panel", "panel_approved_amount",
            "patient_copay_amount", "branch", "panel_details", "branch_details",
            "created_at", "updated_at", "items", "payments"
        ]
        read_only_fields = [
            "invoice_number", "subtotal", "total_amount", 
            "created_at", "updated_at"
        ]

    def create(self, validated_data):
        from decimal import Decimal
        request = self.context.get("request")
        user = request.user if request else None
        
        # If user has a branch, set it (if not set in validated_data)
        if user and hasattr(user, "branch") and not validated_data.get("branch"):
            validated_data["branch"] = user.branch

        # Get items from initial data
        items_data = self.initial_data.get("items", [])
        
        # Create the invoice
        invoice = Invoice.objects.create(**validated_data)
        
        # Create the items
        for item_data in items_data:
            item_type = item_data.get("item_type", "OTHER")
            item_id = item_data.get("item_id", None)
            InvoiceItem.objects.create(
                invoice=invoice,
                item_type=item_type,
                item_id=item_id,
                description=item_data["description"],
                quantity=int(item_data.get("quantity", 1)),
                unit_price=Decimal(str(item_data.get("unit_price", 0)))
            )
        
        # Recalculate totals
        invoice.update_totals()
        return invoice

