from rest_framework import viewsets, status
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.views import TokenObtainPairView
from authentication.models import Branch
from authentication.serializers import CustomTokenObtainPairSerializer, UserSerializer, BranchSerializer
from authentication.permissions import IsAdmin, IsSuperAdmin

User = get_user_model()

class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer

class BranchViewSet(viewsets.ModelViewSet):
    queryset = Branch.objects.filter(deleted_at__isnull=True)
    serializer_class = BranchSerializer
    permission_classes = [IsSuperAdmin]

class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAdmin]
    
    def get_queryset(self):
        # Allow filtering by role or search
        queryset = User.objects.all()
        role = self.request.query_params.get("role", None)
        if role:
            queryset = queryset.filter(role=role)
        return queryset

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from authentication.models import HospitalSettings
from authentication.serializers import (
    HospitalInfoSerializer,
    FinancialSettingsSerializer,
    NotificationSettingsSerializer,
    WorkingHoursSerializer
)


class ChangeOwnPasswordView(APIView):
    """Any authenticated user can change their own password."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        current_password = request.data.get("current_password", "")
        new_password = request.data.get("new_password", "")
        confirm_password = request.data.get("confirm_password", "")

        if not current_password:
            return Response({"error": "Current password is required."}, status=status.HTTP_400_BAD_REQUEST)
        if not new_password or len(new_password) < 6:
            return Response({"error": "New password must be at least 6 characters."}, status=status.HTTP_400_BAD_REQUEST)
        if new_password != confirm_password:
            return Response({"error": "New password and confirm password do not match."}, status=status.HTTP_400_BAD_REQUEST)
        if not user.check_password(current_password):
            return Response({"error": "Current password is incorrect."}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(new_password)
        user.save()
        return Response({"message": "Password changed successfully."})


class AdminResetPasswordView(APIView):
    """Admin can reset any user's password by username."""
    permission_classes = [IsSuperAdmin]

    def post(self, request):
        username = request.data.get("username", "").strip()
        new_password = request.data.get("new_password", "")

        if not username:
            return Response({"error": "Username is required."}, status=status.HTTP_400_BAD_REQUEST)
        if not new_password or len(new_password) < 6:
            return Response({"error": "New password must be at least 6 characters."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            target_user = User.objects.get(username=username)
        except User.DoesNotExist:
            return Response({"error": f"No user found with username '{username}'."}, status=status.HTTP_404_NOT_FOUND)

        target_user.set_password(new_password)
        target_user.save()
        return Response({"message": f"Password reset successfully for user '{username}'."})


class BaseSettingsView(APIView):
    permission_classes = [IsSuperAdmin]
    serializer_class = None

    def get(self, request):
        settings_obj = HospitalSettings.get()
        serializer = self.serializer_class(settings_obj, context={"request": request})
        return Response(serializer.data)

    def put(self, request):
        settings_obj = HospitalSettings.get()
        serializer = self.serializer_class(settings_obj, data=request.data, partial=True, context={"request": request})
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=400)

class HospitalInfoView(BaseSettingsView):
    serializer_class = HospitalInfoSerializer
    parser_classes = (MultiPartParser, FormParser, JSONParser)

class FinancialSettingsView(BaseSettingsView):
    serializer_class = FinancialSettingsSerializer

class NotificationSettingsView(BaseSettingsView):
    serializer_class = NotificationSettingsSerializer

class WorkingHoursView(BaseSettingsView):
    serializer_class = WorkingHoursSerializer


