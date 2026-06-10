from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.core.exceptions import ValidationError
from django.utils import timezone
from django.db import transaction, models
from .models import Medicine, StockBatch, DispensationLog, Supplier, SupplierLedger
from .serializers import (
    MedicineSerializer, StockBatchSerializer, DispensationLogSerializer,
    SupplierSerializer, SupplierLedgerSerializer
)
from .services import dispense_medicine_fifo
from authentication.permissions import IsStaffUser, IsAdmin


class MedicineViewSet(viewsets.ModelViewSet):
    queryset = Medicine.objects.all().order_by("name")
    serializer_class = MedicineSerializer
    permission_classes = [IsStaffUser]

    def get_queryset(self):
        queryset = super().get_queryset()
        search = self.request.query_params.get("search", None)
        branch_id = self.request.query_params.get("branch", None)
        if search:
            queryset = queryset.filter(
                models.Q(name__icontains=search) |
                models.Q(generic_name__icontains=search)
            )
        if branch_id:
            queryset = queryset.filter(branch_id=branch_id)
        return queryset

    @action(detail=False, methods=["get"], url_path="low-stock-reorder")
    def low_stock_reorder(self, request):
        medicines = Medicine.objects.all()
        reorder_list = []
        for med in medicines:
            today = timezone.now().date()
            batches = med.batches.filter(expiry_date__gt=today)
            total_qty = sum(b.quantity_remaining for b in batches)
            if total_qty < med.reorder_level:
                reorder_list.append({
                    "medicine_id": med.id,
                    "name": med.name,
                    "generic_name": med.generic_name,
                    "formulation": med.formulation,
                    "strength": med.strength,
                    "current_stock": total_qty,
                    "reorder_level": med.reorder_level,
                    "suggested_reorder_qty": med.reorder_level * 2 - total_qty
                })
        return Response(reorder_list)

class StockBatchViewSet(viewsets.ModelViewSet):
    queryset = StockBatch.objects.all().order_by("expiry_date")
    serializer_class = StockBatchSerializer
    permission_classes = [IsStaffUser]

    def get_queryset(self):
        queryset = super().get_queryset()
        medicine_id = self.request.query_params.get("medicine", None)
        if medicine_id:
            queryset = queryset.filter(medicine_id=medicine_id)
        return queryset

    @action(detail=False, methods=["get"])
    def alerts(self, request):
        """
        Lists batches that are expiring in 30 days or have quantity_remaining below 50.
        """
        today = timezone.now().date()
        expiring_threshold = today + timezone.timedelta(days=30)
        
        expiring_batches = StockBatch.objects.filter(
            expiry_date__lte=expiring_threshold,
            quantity_remaining__gt=0
        )
        
        low_stock_batches = StockBatch.objects.filter(
            quantity_remaining__lt=50,
            quantity_remaining__gt=0
        )
        
        # Merge queries and remove duplicates
        all_alerts = (expiring_batches | low_stock_batches).distinct().order_by("expiry_date")
        
        return Response(StockBatchSerializer(all_alerts, many=True).data)

class DispensationLogViewSet(viewsets.ModelViewSet):
    queryset = DispensationLog.objects.all().order_by("-dispensed_at")
    serializer_class = DispensationLogSerializer
    
    def get_permissions(self):
        # View only for staff, write only for pharmacist/admin
        if self.action in ["create", "destroy", "update", "partial_update"]:
            # Standard custom permission checked inside views
            return [IsStaffUser()]
        return [IsStaffUser()]

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        prescription_id = request.data.get("prescription")
        dispensed_to_id = request.data.get("dispensed_to")
        items_data = request.data.get("items", [])

        if not dispensed_to_id or not items_data:
            return Response(
                {"error": "dispensed_to and items list are required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Create log
        dispensation = DispensationLog.objects.create(
            prescription_id=prescription_id,
            dispensed_to_id=dispensed_to_id,
            dispensed_by=request.user
        )

        try:
            # Process each item using FIFO engine
            for item in items_data:
                med_id = item.get("medicine")
                qty = item.get("quantity")
                
                if not med_id or not qty:
                    raise ValidationError("Medicine ID and Quantity are required for each item.")
                
                medicine = Medicine.objects.get(id=med_id)
                dispense_medicine_fifo(dispensation, medicine, int(qty))
                
        except Medicine.DoesNotExist:
            transaction.set_rollback(True)
            return Response({"error": "One or more selected medicines do not exist."}, status=status.HTTP_400_BAD_REQUEST)
        except ValidationError as e:
            transaction.set_rollback(True)
            return Response({"error": str(e.message if hasattr(e, "message") else e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            transaction.set_rollback(True)
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        # Re-fetch with details
        serializer = self.get_serializer(dispensation)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

class SupplierViewSet(viewsets.ModelViewSet):
    queryset = Supplier.objects.all().order_by("name")
    serializer_class = SupplierSerializer
    permission_classes = [IsStaffUser]

class SupplierLedgerViewSet(viewsets.ModelViewSet):
    queryset = SupplierLedger.objects.all().order_by("-transaction_date")
    serializer_class = SupplierLedgerSerializer
    permission_classes = [IsStaffUser]

    def get_queryset(self):
        queryset = SupplierLedger.objects.all()
        supplier_id = self.request.query_params.get("supplier", None)
        if supplier_id:
            queryset = queryset.filter(supplier_id=supplier_id)
        return queryset
