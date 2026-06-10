from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db import models
from .models import Invoice, InvoiceItem, Payment, Panel, InvoiceRefund
from .serializers import InvoiceSerializer, PaymentSerializer, PanelSerializer, InvoiceRefundSerializer
from .gateways import MockMobileWalletGateway
from authentication.permissions import IsStaffUser, IsReceptionistOrAdmin

class PanelViewSet(viewsets.ModelViewSet):
    queryset = Panel.objects.all()
    serializer_class = PanelSerializer
    permission_classes = [IsStaffUser]


class InvoiceViewSet(viewsets.ModelViewSet):
    queryset = Invoice.objects.all().order_by("-created_at")
    serializer_class = InvoiceSerializer
    
    def get_permissions(self):
        if self.action in ["create", "destroy", "pay", "add_item", "refund"]:
            return [IsReceptionistOrAdmin()]
        return [IsStaffUser()]

    def get_queryset(self):
        queryset = super().get_queryset()
        search = self.request.query_params.get("search", None)
        if search:
            queryset = queryset.filter(
                models.Q(patient__first_name__icontains=search) |
                models.Q(patient__last_name__icontains=search) |
                models.Q(patient__mrn__icontains=search) |
                models.Q(invoice_number__icontains=search)
            )
        status_param = self.request.query_params.get("status", None)
        if status_param:
            queryset = queryset.filter(status=status_param)
        
        month = self.request.query_params.get("month", None)
        year = self.request.query_params.get("year", None)
        if month:
            queryset = queryset.filter(created_at__month=month)
        if year:
            queryset = queryset.filter(created_at__year=year)
            
        return queryset

    @action(detail=True, methods=["post"])
    def pay(self, request, pk=None):
        invoice = self.get_object()
        if invoice.status == "PAID":
            return Response({"error": "Invoice is already fully paid."}, status=status.HTTP_400_BAD_REQUEST)
        
        amount = request.data.get("amount")
        payment_method = request.data.get("payment_method")
        phone_number = request.data.get("phone_number", "")

        if not amount or not payment_method:
            return Response({"error": "Amount and payment_method are required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            amount = float(amount)
        except ValueError:
            return Response({"error": "Invalid amount value."}, status=status.HTTP_400_BAD_REQUEST)

        if payment_method in ["JAZZCASH", "EASYPAISA"]:
            if not phone_number:
                return Response({"error": "Phone number is required for mobile wallet payments."}, status=status.HTTP_400_BAD_REQUEST)
            
            gw_response = MockMobileWalletGateway.initiate_payment(phone_number, amount, payment_method)
            
            pay_record = Payment.objects.create(
                invoice=invoice,
                amount=amount,
                payment_method=payment_method,
                transaction_id=gw_response["transaction_id"],
                status=gw_response["status"]
            )
            
            if pay_record.status == "COMPLETED":
                return Response({
                    "message": gw_response["message"],
                    "payment": PaymentSerializer(pay_record).data
                }, status=status.HTTP_200_OK)
            else:
                return Response({
                    "error": gw_response["message"],
                    "payment": PaymentSerializer(pay_record).data
                }, status=status.HTTP_400_BAD_REQUEST)
                
        else: # CASH or CARD
            import random
            random_digits = "".join(random.choices("0123456789", k=8))
            txn_id = f"TXN-CSH-{random_digits}" if payment_method == "CASH" else f"TXN-CRD-{random_digits}"
            pay_record = Payment.objects.create(
                invoice=invoice,
                amount=amount,
                payment_method=payment_method,
                transaction_id=txn_id,
                status="COMPLETED"
            )
            return Response({
                "message": "Payment verified and recorded.",
                "payment": PaymentSerializer(pay_record).data
            }, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"])
    def add_item(self, request, pk=None):
        invoice = self.get_object()
        item_type = request.data.get("item_type")
        item_id = request.data.get("item_id")
        description = request.data.get("description")
        quantity = request.data.get("quantity", 1)
        unit_price = request.data.get("unit_price")

        if not item_type or not description or unit_price is None:
            return Response({"error": "item_type, description, and unit_price are required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            quantity = int(quantity)
            unit_price = float(unit_price)
        except ValueError:
            return Response({"error": "Invalid quantity or unit price value."}, status=status.HTTP_400_BAD_REQUEST)

        InvoiceItem.objects.create(
            invoice=invoice,
            item_type=item_type,
            item_id=item_id,
            description=description,
            quantity=quantity,
            unit_price=unit_price
        )

        return Response(InvoiceSerializer(invoice).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="refund")
    def refund(self, request, pk=None):
        invoice = self.get_object()
        amount = request.data.get("amount")
        reason = request.data.get("reason", "")
        passcode = request.data.get("passcode")

        if passcode != "admin123":
            return Response({"error": "Unauthorized: Invalid manager passcode."}, status=status.HTTP_403_FORBIDDEN)

        if not amount:
            return Response({"error": "Amount is required for refund."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            amount = float(amount)
        except ValueError:
            return Response({"error": "Invalid refund amount value."}, status=status.HTTP_400_BAD_REQUEST)

        # Record refund
        refund_record = InvoiceRefund.objects.create(
            invoice=invoice,
            refunded_by=request.user,
            refunded_amount=amount,
            reason=reason
        )

        # Update invoice status
        invoice.status = "REFUNDED"
        invoice.save()

        return Response({
            "message": "Refund processed successfully.",
            "refund": {
                "id": refund_record.id,
                "amount": refund_record.refunded_amount,
                "reason": refund_record.reason
            }
        }, status=status.HTTP_200_OK)
