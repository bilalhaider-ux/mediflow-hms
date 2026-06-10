from .models import AuditLog

class AuditLogMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        
        # Only log successful modifications or detail reads
        if response.status_code >= 400:
            return response

        path = request.path
        method = request.method
        user = request.user if request.user.is_authenticated else None

        if path.startswith("/static/") or path.startswith("/media/") or path.startswith("/admin/"):
            return response

        action = None
        details = ""

        # Mappings of sensitive endpoints
        if "/api/patients/" in path:
            parts = path.strip("/").split("/")
            if method == "GET" and len(parts) > 2:
                action = "PATIENT_RECORD_VIEW"
                details = f"Viewed patient medical details for ID: {parts[-1]}"
            elif method == "POST":
                action = "PATIENT_RECORD_CREATE"
                details = "Registered a new patient record."
            elif method in ["PUT", "PATCH"]:
                action = "PATIENT_RECORD_UPDATE"
                details = f"Updated details for patient ID: {parts[-1]}"

        elif "/api/invoices/" in path:
            parts = path.strip("/").split("/")
            if "/pay/" in path and method == "POST":
                action = "BILL_PAYMENT"
                details = f"Processed payment receipt for Invoice ID: {parts[-2]}"
            elif method == "POST":
                action = "INVOICE_CREATE"
                details = "Generated a new customer invoice."

        elif "/api/lab-orders/" in path:
            parts = path.strip("/").split("/")
            if method == "POST":
                action = "LAB_ORDER_CREATE"
                details = "Requested clinical laboratory tests."
            elif method in ["PUT", "PATCH"]:
                action = "LAB_ORDER_COMPLETE"
                details = f"Completed results parameters for Lab Order ID: {parts[-1]}"

        elif "/api/invoices" in path and method == "POST": # Fallback
            action = "INVOICE_CREATE"
            details = "Generated a new customer invoice."

        # Record dispensation log
        elif "dispensations" in path and method == "POST":
            action = "INVENTORY_DISPENSE"
            details = "Dispensed prescribed medicine stocks."

        if action and user:
            x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
            ip = x_forwarded_for.split(',')[0] if x_forwarded_for else request.META.get('REMOTE_ADDR')

            AuditLog.objects.create(
                user=user,
                action=action,
                ip_address=ip,
                details=details
            )

        return response
