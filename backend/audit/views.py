import json
import time
from io import BytesIO
from rest_framework import viewsets, permissions
from rest_framework.decorators import api_view, permission_classes
from django.http import StreamingHttpResponse, HttpResponse
from django.utils import timezone
from .models import AuditLog
from .serializers import AuditLogSerializer
from authentication.permissions import IsAdmin
from patients.models import Patient
from ipd.models import Bed
from billing.models import Payment
from hr.models import DoctorFeeShare

from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors

class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = AuditLog.objects.all().order_by("-timestamp")
    serializer_class = AuditLogSerializer
    permission_classes = [IsAdmin]

    def get_queryset(self):
        queryset = super().get_queryset()
        action_param = self.request.query_params.get("action", None)
        if action_param:
            queryset = queryset.filter(action=action_param)
        return queryset

def kpi_event_generator():
    """
    Generator that streams live system KPI stats as Server-Sent Events (SSE).
    """
    while True:
        try:
            today = timezone.now().date()
            
            # Compute KPIs
            patients_count = Patient.objects.all().count()
            
            total_beds = Bed.objects.all().count()
            occupied_beds = Bed.objects.filter(is_occupied=True).count()
            
            # Sum of today's settled payments
            payments = Payment.objects.filter(
                status="COMPLETED", 
                created_at__date=today
            )
            today_revenue = sum(p.amount for p in payments)
            
            # Fetch recent 5 audit logs
            recent_logs = []
            logs = AuditLog.objects.all().order_by("-timestamp")[:5]
            for log in logs:
                recent_logs.append({
                    "id": log.id,
                    "user": log.user.username if log.user else "System",
                    "action": log.action,
                    "ip": log.ip_address,
                    "details": log.details,
                    "time": log.timestamp.strftime("%I:%M:%S %p")
                })

            data = {
                "patients_count": patients_count,
                "beds_occupied": occupied_beds,
                "beds_total": total_beds,
                "today_revenue": float(today_revenue),
                "recent_logs": recent_logs
            }

            yield f"data: {json.dumps(data)}\n\n"
            time.sleep(3)
        except GeneratorExit:
            break
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
            time.sleep(5)

@api_view(["GET"])
@permission_classes([IsAdmin])
def kpi_stream(request):
    """
    Endpoint that streams live system KPIs to the admin dashboard.
    """
    response = StreamingHttpResponse(kpi_event_generator(), content_type="text/event-stream")
    response['Cache-Control'] = 'no-cache'
    response['X-Accel-Buffering'] = 'no'
    return response

@api_view(["GET"])
@permission_classes([IsAdmin])
def financial_report_export(request):
    """
    Exports monthly system financial collections and doctor splits to PDF.
    """
    month_str = request.query_params.get("month")
    year_str = request.query_params.get("year")

    if not month_str or not year_str:
        return Response({"error": "Month and Year query parameters are required."}, status=400)

    try:
        month = int(month_str)
        year = int(year_str)
    except ValueError:
        return Response({"error": "Month and Year must be valid integers."}, status=400)

    # Fetch data
    payments = Payment.objects.filter(status="COMPLETED", created_at__year=year, created_at__month=month)
    fee_shares = DoctorFeeShare.objects.filter(invoice__created_at__year=year, invoice__created_at__month=month)

    total_revenue = sum(p.amount for p in payments)
    total_doctor_payouts = sum(fs.doctor_share for fs in fee_shares)
    total_facility_share = sum(fs.facility_share for fs in fee_shares)

    # Setup document
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=40,
        leftMargin=40,
        topMargin=40,
        bottomMargin=40
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "ReportTitle",
        parent=styles["Heading1"],
        fontName="Helvetica-Bold",
        fontSize=18,
        textColor=colors.HexColor("#1a73e8"),
        spaceAfter=15,
        alignment=1 # Center
    )
    subtitle_style = ParagraphStyle(
        "ReportSubtitle",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=10,
        textColor=colors.HexColor("#5f6368"),
        spaceAfter=20,
        alignment=1 # Center
    )
    section_title = ParagraphStyle(
        "SectionTitle",
        parent=styles["Heading2"],
        fontName="Helvetica-Bold",
        fontSize=12,
        textColor=colors.HexColor("#202124"),
        spaceBefore=15,
        spaceAfter=10
    )

    story = []

    # Header
    story.append(Paragraph("Medi Flow Enterprise HMS", title_style))
    story.append(Paragraph(f"Monthly Financial Audit Report - {month:02d}/{year}", subtitle_style))
    story.append(Spacer(1, 10))

    # Summary table
    summary_data = [
        ["Key Metrics", "Amount (Rs.)"],
        ["Total Collections (Settled Payments)", f"{float(total_revenue):,.2f}"],
        ["Total Doctor Split Payouts", f"{float(total_doctor_payouts):,.2f}"],
        ["Total Facility Share Retained", f"{float(total_facility_share):,.2f}"],
    ]
    summary_table = Table(summary_data, colWidths=[300, 200])
    summary_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (1,0), colors.HexColor("#1a73e8")),
        ('TEXTCOLOR', (0,0), (1,0), colors.white),
        ('FONTNAME', (0,0), (1,0), 'Helvetica-Bold'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
        ('TOPPADDING', (0,0), (-1,-1), 8),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#dadce0")),
        ('FONTNAME', (0,1), (-1,-1), 'Helvetica'),
        ('FONTNAME', (0,1), (0,-1), 'Helvetica-Bold'),
        ('BACKGROUND', (0,1), (-1,-1), colors.HexColor("#f8f9fa")),
    ]))
    story.append(summary_table)
    story.append(Spacer(1, 15))

    # Payments Details Section
    story.append(Paragraph("Payment Transactions Breakdown", section_title))
    
    # Group payments by method
    cash_total = sum(p.amount for p in payments if p.payment_method == "CASH")
    card_total = sum(p.amount for p in payments if p.payment_method == "CARD")
    wallet_total = sum(p.amount for p in payments if p.payment_method == "MOBILE_WALLET")

    payments_data = [
        ["Payment Method", "Count", "Total Amount (Rs.)"],
        ["Cash", str(payments.filter(payment_method="CASH").count()), f"{float(cash_total):,.2f}"],
        ["Credit/Debit Card", str(payments.filter(payment_method="CARD").count()), f"{float(card_total):,.2f}"],
        ["Mobile Wallet (EasyPaisa/JazzCash)", str(payments.filter(payment_method="MOBILE_WALLET").count()), f"{float(wallet_total):,.2f}"],
        ["Total Payments Settled", str(payments.count()), f"{float(total_revenue):,.2f}"],
    ]
    payments_table = Table(payments_data, colWidths=[220, 100, 180])
    payments_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (2,0), colors.HexColor("#f1f3f4")),
        ('TEXTCOLOR', (0,0), (2,0), colors.HexColor("#202124")),
        ('FONTNAME', (0,0), (2,0), 'Helvetica-Bold'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#dadce0")),
        ('FONTNAME', (0,1), (-1,-1), 'Helvetica'),
        ('LINEBELOW', (0,-1), (2,-1), 1.5, colors.HexColor("#202124")),
        ('FONTNAME', (0,-1), (2,-1), 'Helvetica-Bold'),
    ]))
    story.append(payments_table)
    story.append(Spacer(1, 15))

    # Doctor Share splits table
    story.append(Paragraph("Doctor Consultation Fee Splits Summary", section_title))
    doctor_shares_list = [["Doctor Name", "Total Consultation Fee", "Doctor Share (80%)", "Facility Share (20%)"]]
    
    # Aggregate by doctor
    from django.db.models import Sum
    doc_shares = fee_shares.values('doctor__user__first_name', 'doctor__user__last_name').annotate(
        total_fees=Sum('consultation_fee'),
        doc_share=Sum('doctor_share'),
        hosp_share=Sum('facility_share')
    )

    for ds in doc_shares:
        doc_name = f"Dr. {ds['doctor__user__first_name']} {ds['doctor__user__last_name']}"
        doctor_shares_list.append([
            doc_name,
            f"{float(ds['total_fees']):,.2f}",
            f"{float(ds['doc_share']):,.2f}",
            f"{float(ds['hosp_share']):,.2f}"
        ])
    
    if len(doctor_shares_list) == 1:
        doctor_shares_list.append(["No doctor payout shares generated in this period.", "-", "-", "-"])

    shares_table = Table(doctor_shares_list, colWidths=[200, 100, 100, 100])
    shares_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (3,0), colors.HexColor("#f1f3f4")),
        ('TEXTCOLOR', (0,0), (3,0), colors.HexColor("#202124")),
        ('FONTNAME', (0,0), (3,0), 'Helvetica-Bold'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#dadce0")),
        ('FONTNAME', (0,1), (-1,-1), 'Helvetica'),
    ]))
    story.append(shares_table)
    story.append(Spacer(1, 30))

    # Signatures
    sig_data = [
        ["Report Compiled By: System Autogen", "Approved By: Chief Financial Officer"],
        ["Date: " + timezone.now().strftime("%Y-%m-%d"), "Signature: ______________________"]
    ]
    sig_table = Table(sig_data, colWidths=[250, 250])
    sig_table.setStyle(TableStyle([
        ('FONTNAME', (0,0), (-1,-1), 'Helvetica-Bold'),
        ('FONTSIZE', (0,0), (-1,-1), 9),
        ('TEXTCOLOR', (0,0), (-1,-1), colors.HexColor("#5f6368")),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(sig_table)

    doc.build(story)
    
    # Return response
    pdf_val = buffer.getvalue()
    buffer.close()
    
    from rest_framework.response import Response
    from django.http import HttpResponse
    response = HttpResponse(pdf_val, content_type='application/pdf')
    response['Content-Disposition'] = f'attachment; filename="financial_report_{month:02d}_{year}.pdf"'
    return response
