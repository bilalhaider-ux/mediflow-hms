from celery import shared_task
from clinical.models import LabOrder
from clinical.reports import generate_lab_report_pdf

@shared_task
def generate_lab_report_pdf_task(lab_order_id):
    try:
        # Fetch lab order without triggering signals/recursion
        lab_order = LabOrder.objects.get(id=lab_order_id)
        generate_lab_report_pdf(lab_order)
    except LabOrder.DoesNotExist:
        pass
