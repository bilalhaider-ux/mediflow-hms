import os
from django.conf import settings
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

def generate_lab_report_pdf(lab_order):
    """
    Generates a professional PDF report for a completed LabOrder and saves it to media/lab_results/.
    """
    # Ensure media directory exists
    dir_path = os.path.join(settings.MEDIA_ROOT, "lab_results")
    os.makedirs(dir_path, exist_ok=True)

    filename = f"report_{lab_order.id}.pdf"
    filepath = os.path.join(dir_path, filename)

    # Setup document
    doc = SimpleDocTemplate(filepath, pagesize=letter,
                            rightMargin=40, leftMargin=40, topMargin=40, bottomMargin=40)
    story = []

    # Custom styling colors - Google Blue and soft blue accents
    c_primary = colors.HexColor("#1a73e8")  # Google Blue
    c_secondary = colors.HexColor("#5f6368") # Soft Slate
    c_bg = colors.HexColor("#f4f8fd")        # Light Blue Gray Card bg

    styles = getSampleStyleSheet()
    
    # Custom styles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=24,
        leading=28,
        textColor=c_primary,
        alignment=1, # Center
        spaceAfter=6
    )
    
    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=10,
        leading=12,
        textColor=c_secondary,
        alignment=1,
        spaceAfter=15
    )

    h2_style = ParagraphStyle(
        'H2',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=14,
        leading=16,
        textColor=c_primary,
        spaceBefore=10,
        spaceAfter=8
    )

    body_style = ParagraphStyle(
        'Body',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=14,
        textColor=colors.HexColor("#3c4043")
    )

    body_bold = ParagraphStyle(
        'BodyBold',
        parent=body_style,
        fontName='Helvetica-Bold'
    )

    # 1. Facility Header
    story.append(Paragraph("MEDI FLOW CLINICAL CENTER", title_style))
    story.append(Paragraph("Queens Road, Lahore, Pakistan | Phone: +92-42-111-222-333", subtitle_style))
    story.append(Spacer(1, 10))

    # 2. Patient & Order Metadata Block (Table format with soft borders)
    patient = lab_order.patient
    doctor = lab_order.doctor
    
    meta_data = [
        [
            Paragraph("Patient Name:", body_bold),
            Paragraph(f"{patient.first_name} {patient.last_name}", body_style),
            Paragraph("Order Date:", body_bold),
            Paragraph(lab_order.order_date.strftime("%d-%b-%Y %I:%M %p"), body_style),
        ],
        [
            Paragraph("MRN:", body_bold),
            Paragraph(patient.mrn, body_style),
            Paragraph("Referring Doctor:", body_bold),
            Paragraph(f"Dr. {doctor.user.get_full_name() or doctor.user.username}", body_style),
        ],
        [
            Paragraph("CNIC:", body_bold),
            Paragraph(patient.cnic or "N/A", body_style),
            Paragraph("Order ID:", body_bold),
            Paragraph(f"#{lab_order.id}", body_style),
        ]
    ]

    meta_table = Table(meta_data, colWidths=[90, 180, 110, 150])
    meta_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), c_bg),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor("#dadce0")),
        ('INNERGRID', (0, 0), (-1, -1), 0.25, colors.HexColor("#e8eaed")),
    ]))
    
    story.append(meta_table)
    story.append(Spacer(1, 20))

    # 3. Investigation Results Section
    story.append(Paragraph("LABORATORY TEST RESULTS", h2_style))
    
    # Parse results summary
    # Expecting parameters to be formatted like "Hemoglobin: 14.5 g/dL" or just a text block
    results_data = [
        [Paragraph("Test Parameter / Detail", body_bold), Paragraph("Observed Value", body_bold)]
    ]

    lines = (lab_order.results_summary or "").split("\n")
    for line in lines:
        if ":" in line:
            parts = line.split(":", 1)
            results_data.append([
                Paragraph(parts[0].strip(), body_bold),
                Paragraph(parts[1].strip(), body_style)
            ])
        elif line.strip():
            results_data.append([
                Paragraph(line.strip(), body_style),
                Paragraph("", body_style)
            ])

    if len(results_data) == 1:
        results_data.append([Paragraph("No specific parameter results provided.", body_style), Paragraph("", body_style)])

    results_table = Table(results_data, colWidths=[270, 260])
    results_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), c_primary),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOX', (0, 0), (-1, -1), 0.5, c_primary),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#e8eaed")),
    ]))
    
    # Set header cell text colors to white explicitly by styling
    for i in range(2):
        results_data[0][i].style.textColor = colors.white

    story.append(results_table)
    story.append(Spacer(1, 40))

    # 4. Signatures
    sig_data = [
        [
            Paragraph("Prepared By:<br/><br/>_______________________<br/>Lab Technician", body_style),
            Paragraph("Verified By:<br/><br/>_______________________<br/>Pathologist / Director", body_style)
        ]
    ]
    sig_table = Table(sig_data, colWidths=[260, 270])
    sig_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    story.append(sig_table)
    story.append(Spacer(1, 30))

    # Footer note
    footer_style = ParagraphStyle(
        'Footer',
        parent=body_style,
        fontSize=8,
        textColor=c_secondary,
        alignment=1
    )
    story.append(Paragraph("This is a computer-generated diagnostic report and does not require a physical signature.<br/>Please consult your physician for clinical correlation.", footer_style))

    # Build PDF
    doc.build(story)
    
    # Save the file path on the model
    lab_order.results_file = f"lab_results/{filename}"
    lab_order.save()
