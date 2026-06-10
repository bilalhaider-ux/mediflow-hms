from django.test import TestCase
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from authentication.permissions import IsDoctor, IsReceptionist, IsMedicalStaff, IsStaffUser

User = get_user_model()

class DummyRequest:
    def __init__(self, user):
        self.user = user

class UserModelTest(TestCase):
    def test_create_user_with_role(self):
        user = User.objects.create_user(
            username="doctor_ali",
            email="ali@hms.pk",
            password="securepassword123",
            role="DOCTOR",
            first_name="Ali",
            last_name="Khan"
        )
        self.assertEqual(user.role, "DOCTOR")
        self.assertTrue(user.is_active)
        self.assertIsNone(user.deleted_at)
        self.assertEqual(str(user), "doctor_ali (DOCTOR)")

    def test_soft_delete_queryset_methods(self):
        user1 = User.objects.create_user(username="u1", role="DOCTOR")
        user2 = User.objects.create_user(username="u2", role="PATIENT")
        
        # Test QuerySet alive
        self.assertEqual(User.objects.all().alive().count(), 2)
        
        # Soft delete user1
        user1.delete()
        
        # Test dead
        self.assertEqual(User.objects.all_with_deleted().dead().count(), 1)
        self.assertEqual(User.objects.all_with_deleted().dead().first().username, "u1")
        
        # QuerySet delete (bulk soft delete)
        User.objects.filter(username="u2").delete()
        self.assertEqual(User.objects.filter(username="u2").count(), 0)
        self.assertEqual(User.objects.all_with_deleted().filter(username="u2").first().is_active, False)
        
        # Hard delete
        User.objects.all_with_deleted().filter(username="u2").hard_delete()
        self.assertFalse(User.objects.all_with_deleted().filter(username="u2").exists())

    def test_soft_delete_user(self):
        user = User.objects.create_user(
            username="receptionist_sana",
            email="sana@hms.pk",
            password="securepassword123",
            role="RECEPTIONIST"
        )
        user.delete()
        
        # Check that default manager excludes soft-deleted user
        self.assertFalse(User.objects.filter(username="receptionist_sana").exists())
        
        # Check all_with_deleted retrieves them
        all_users = User.objects.all_with_deleted()
        self.assertTrue(all_users.filter(username="receptionist_sana").exists())
        
        deleted_user = all_users.get(username="receptionist_sana")
        self.assertFalse(deleted_user.is_active)
        self.assertIsNotNone(deleted_user.deleted_at)
        
        # Restore user
        deleted_user.restore()
        self.assertTrue(User.objects.filter(username="receptionist_sana").exists())
        self.assertTrue(deleted_user.is_active)
        self.assertIsNone(deleted_user.deleted_at)

class JWTAuthTestCase(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            username="admin_user",
            email="admin@hms.pk",
            password="adminpassword",
            role="ADMIN",
            first_name="Super",
            last_name="Admin"
        )
        self.login_url = reverse("token_obtain_pair")

    def test_jwt_login_success(self):
        response = self.client.post(self.login_url, {
            "username": "admin_user",
            "password": "adminpassword"
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)
        self.assertIn("user", response.data)
        
        user_info = response.data["user"]
        self.assertEqual(user_info["role"], "ADMIN")
        self.assertEqual(user_info["full_name"], "Super Admin")

    def test_jwt_login_invalid_credentials(self):
        response = self.client.post(self.login_url, {
            "username": "admin_user",
            "password": "wrongpassword"
        })
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_user_viewset_crud(self):
        self.client.force_authenticate(user=self.admin)
        
        # Create user
        response = self.client.post(reverse("user-list"), {
            "username": "new_doc",
            "email": "new_doc@hms.pk",
            "password": "securepwd123",
            "role": "DOCTOR"
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        user_id = response.data["id"]
        
        # List users with role filter
        response = self.client.get(reverse("user-list"), {"role": "DOCTOR"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        
        # Update user
        response = self.client.patch(reverse("user-detail", args=[user_id]), {
            "first_name": "UpdatedName"
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["first_name"], "UpdatedName")
        
        # Delete user (soft delete)
        response = self.client.delete(reverse("user-detail", args=[user_id]))
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

    def test_permission_classes(self):
        doc = User.objects.create_user(username="doc", role="DOCTOR")
        rec = User.objects.create_user(username="rec", role="RECEPTIONIST")
        pat = User.objects.create_user(username="pat", role="PATIENT")
        
        # Test IsDoctor
        perm = IsDoctor()
        self.assertTrue(perm.has_permission(DummyRequest(doc), None))
        self.assertFalse(perm.has_permission(DummyRequest(rec), None))
        
        # Test IsReceptionist
        perm = IsReceptionist()
        self.assertTrue(perm.has_permission(DummyRequest(rec), None))
        self.assertFalse(perm.has_permission(DummyRequest(doc), None))
        
        # Test IsMedicalStaff
        perm = IsMedicalStaff()
        self.assertTrue(perm.has_permission(DummyRequest(doc), None))
        self.assertFalse(perm.has_permission(DummyRequest(rec), None))
        
        # Test IsStaffUser
        perm = IsStaffUser()
        self.assertTrue(perm.has_permission(DummyRequest(rec), None))
        self.assertFalse(perm.has_permission(DummyRequest(pat), None))
