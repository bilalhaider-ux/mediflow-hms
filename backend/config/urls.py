from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView
from authentication.views import (
    CustomTokenObtainPairView, 
    UserViewSet, 
    BranchViewSet,
    HospitalInfoView,
    FinancialSettingsView,
    NotificationSettingsView,
    WorkingHoursView,
    ChangeOwnPasswordView,
    AdminResetPasswordView
)
from patients.views import PatientViewSet
from staff.views import DepartmentViewSet, DoctorViewSet, DoctorScheduleViewSet, StaffProfileViewSet
from clinical.views import AppointmentViewSet, PrescriptionViewSet, LabTestViewSet, LabOrderViewSet, PatientVitalsViewSet, DailyRoomCreateView
from ipd.views import WardViewSet, BedViewSet, BedAdmissionViewSet, OTRoomViewSet, OTBookingViewSet
from billing.views import InvoiceViewSet, PanelViewSet
from hr.views import AttendanceViewSet, DoctorFeeShareViewSet, PayrollSlipViewSet
from pharmacy.views import MedicineViewSet, StockBatchViewSet, DispensationLogViewSet, SupplierViewSet, SupplierLedgerViewSet
from audit.views import AuditLogViewSet, kpi_stream, financial_report_export
from notifications.views import NotificationViewSet, WhatsAppLogViewSet
from telemedicine.views import CreateRoomView

# Set up API router
router = DefaultRouter()
router.register("branches", BranchViewSet, basename="branch")
router.register("auth/users", UserViewSet, basename="user")
router.register("patients", PatientViewSet, basename="patient")
router.register("departments", DepartmentViewSet, basename="department")
router.register("doctors", DoctorViewSet, basename="doctor")
router.register("doctor-schedules", DoctorScheduleViewSet, basename="doctor-schedule")
router.register("staff", StaffProfileViewSet, basename="staff-profile")

# Clinical App Routes
router.register("appointments", AppointmentViewSet, basename="appointment")
router.register("prescriptions", PrescriptionViewSet, basename="prescription")
router.register("lab-tests", LabTestViewSet, basename="lab-test")
router.register("lab-orders", LabOrderViewSet, basename="lab-order")
router.register("vitals", PatientVitalsViewSet, basename="vitals")

# IPD App Routes
router.register("wards", WardViewSet, basename="ward")
router.register("beds", BedViewSet, basename="bed")
router.register("bed-admissions", BedAdmissionViewSet, basename="bed-admission")
router.register("ot-rooms", OTRoomViewSet, basename="ot-room")
router.register("ot-bookings", OTBookingViewSet, basename="ot-booking")

# Billing & HR Routes
router.register("invoices", InvoiceViewSet, basename="invoice")
router.register("billing/panels", PanelViewSet, basename="billing-panel")
router.register("hr/attendance", AttendanceViewSet, basename="attendance")
router.register("hr/fee-shares", DoctorFeeShareViewSet, basename="fee-share")
router.register("hr/payroll", PayrollSlipViewSet, basename="payroll")

# Pharmacy & Audit Routes
router.register("pharmacy/medicines", MedicineViewSet, basename="medicine")
router.register("pharmacy/batches", StockBatchViewSet, basename="stock-batch")
router.register("pharmacy/dispensations", DispensationLogViewSet, basename="dispensation")
router.register("pharmacy/suppliers", SupplierViewSet, basename="supplier")
router.register("pharmacy/ledgers", SupplierLedgerViewSet, basename="supplier-ledger")
router.register("audit/logs", AuditLogViewSet, basename="audit-log")
router.register("notifications", NotificationViewSet, basename="notification")
router.register("notifications/whatsapp", WhatsAppLogViewSet, basename="whatsapp-log")

urlpatterns = [
    path("admin/", admin.site.urls),
    
    # JWT Auth Endpoints
    path("api/auth/login/", CustomTokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("api/auth/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("api/auth/change-password/", ChangeOwnPasswordView.as_view(), name="change-own-password"),
    path("api/auth/reset-password/", AdminResetPasswordView.as_view(), name="admin-reset-password"),
    
    # SSE KPI Realtime Stream
    path("api/admin/kpis/stream/", kpi_stream, name="kpi-stream"),
    
    # Admin Reports Export
    path("api/admin/exports/financial-report/", financial_report_export, name="financial-report-export"),
    
    # Telemedicine Daily Call Room Creation
    path("api/telemedicine/create-room/", CreateRoomView.as_view(), name="telemedicine-create-room"),
    
    # System Settings Endpoints
    path("api/settings/hospital/", HospitalInfoView.as_view(), name="settings-hospital"),
    path("api/settings/financial/", FinancialSettingsView.as_view(), name="settings-financial"),
    path("api/settings/notifications/", NotificationSettingsView.as_view(), name="settings-notifications"),
    path("api/settings/hours/", WorkingHoursView.as_view(), name="settings-hours"),
    
    # Route Alias for IPD Admissions
    path("api/ipd/admissions/", BedAdmissionViewSet.as_view({"get": "list"}), name="ipd-admissions"),
    
    # API Routers
    path("api/", include(router.urls)),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)


