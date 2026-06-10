from rest_framework import permissions

class IsAdmin(permissions.BasePermission):
    """
    Allows access only to Admin users.
    """
    def has_permission(self, request, view):
        return bool(
            request.user and 
            request.user.is_authenticated and 
            (request.user.role == "ADMIN" or request.user.is_superuser)
        )

class IsDoctor(permissions.BasePermission):
    """
    Allows access only to Doctors.
    """
    def has_permission(self, request, view):
        return bool(
            request.user and 
            request.user.is_authenticated and 
            request.user.role == "DOCTOR"
        )

class IsReceptionist(permissions.BasePermission):
    """
    Allows access only to Receptionists.
    """
    def has_permission(self, request, view):
        return bool(
            request.user and 
            request.user.is_authenticated and 
            request.user.role == "RECEPTIONIST"
        )

class IsReceptionistOrAdmin(permissions.BasePermission):
    """
    Allows access to Receptionists or Admins.
    """
    def has_permission(self, request, view):
        return bool(
            request.user and 
            request.user.is_authenticated and 
            request.user.role in ("RECEPTIONIST", "ADMIN")
        )

class IsMedicalStaff(permissions.BasePermission):
    """
    Allows access to clinical staff (Doctors, Nurses, Lab Techs, Pharmacists, Admins).
    """
    def has_permission(self, request, view):
        return bool(
            request.user and 
            request.user.is_authenticated and 
            request.user.role in ("ADMIN", "DOCTOR", "PHARMACIST", "LAB_TECH")
        )

class IsStaffUser(permissions.BasePermission):
    """
    Allows access to any clinic staff (non-patients).
    """
    def has_permission(self, request, view):
        return bool(
            request.user and 
            request.user.is_authenticated and 
            request.user.role != "PATIENT"
        )

class IsBranchAdmin(permissions.BasePermission):
    """
    Allows access to Admin (SUPER_ADMIN) or Branch Admin (SUB_ADMIN).
    SUB_ADMIN is restricted to accessing objects belonging to their own branch.
    """
    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            request.user.role in ("ADMIN", "SUB_ADMIN")
        )

    def has_object_permission(self, request, view, obj):
        if request.user.role == "ADMIN" or request.user.is_superuser:
            return True
        if request.user.role == "SUB_ADMIN":
            if hasattr(obj, "branch"):
                return obj.branch == request.user.branch
            elif hasattr(obj, "user") and hasattr(obj.user, "branch"):
                return obj.user.branch == request.user.branch
        return False

class IsSuperAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            (request.user.role == "ADMIN" or request.user.is_superuser)
        )


