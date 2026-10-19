"""
Tests for CMS Media Library & Folder System (Filament style)
"""
import io
from PIL import Image
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status

from apps.authentication.models import Role, UserRole
from apps.cms.models import MediaAsset, MediaFolder


def create_test_image(filename="test.png", size=(100, 100), color=(255, 0, 0)):
    file_obj = io.BytesIO()
    image = Image.new("RGBA", size=size, color=color)
    image.save(file_obj, "png")
    file_obj.seek(0)
    return SimpleUploadedFile(filename, file_obj.read(), content_type="image/png")


def unwrap(res):
    payload = res.json()
    if isinstance(payload, dict) and 'data' in payload:
        return payload['data']
    return payload


class MediaLibraryTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        User = get_user_model()

        self.role, _ = Role.objects.get_or_create(name='Content Manager', defaults={'permissions': {'cms': True}})
        self.staff_user = User.objects.create_user(
            email='media_staff@perfumebooth.com',
            password='StaffPassword123!',
            is_staff=True
        )
        UserRole.objects.create(user=self.staff_user, role=self.role)

        self.anon_client = APIClient()

    def test_media_list_and_folders(self):
        self.client.force_authenticate(user=self.staff_user)

        # Upload an asset first
        img = create_test_image("banner1.png", (1920, 800))
        upload_res = self.client.post('/api/cms/media/upload/', {
            'file': img,
            'folder': 'banners',
            'alt_text': 'Summer Banner'
        }, format='multipart')
        self.assertEqual(upload_res.status_code, status.HTTP_201_CREATED)

        # List media
        res = self.client.get('/api/cms/media/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        data = unwrap(res)

        self.assertIn('assets', data)
        self.assertIn('folders', data)
        self.assertEqual(len(data['assets']), 1)
        self.assertEqual(data['assets'][0]['name'], 'banner1.png')
        self.assertEqual(data['assets'][0]['folder'], 'banners')
        self.assertEqual(data['assets'][0]['width'], 1920)
        self.assertEqual(data['assets'][0]['height'], 800)

        # Check folder count
        banner_folder = next((f for f in data['folders'] if f['slug'] == 'banners'), None)
        self.assertIsNotNone(banner_folder)
        self.assertEqual(banner_folder['count'], 1)

    def test_create_custom_folder(self):
        self.client.force_authenticate(user=self.staff_user)
        res = self.client.post('/api/cms/media/folders/', {'name': 'Holiday 2026 Collection'}, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        data = unwrap(res)
        self.assertTrue(data['success'])
        self.assertEqual(data['folder']['slug'], 'holiday-2026-collection')

    def test_delete_media_asset(self):
        self.client.force_authenticate(user=self.staff_user)
        img = create_test_image("to_delete.png")
        upload_res = self.client.post('/api/cms/media/upload/', {'file': img, 'folder': 'general'}, format='multipart')
        data = unwrap(upload_res)
        asset_id = data['assets'][0]['id']

        # Delete asset
        del_res = self.client.delete(f'/api/cms/media/{asset_id}/')
        self.assertEqual(del_res.status_code, status.HTTP_200_OK)
        self.assertFalse(MediaAsset.objects.filter(id=asset_id).exists())

    def test_unauthorized_access_rejected(self):
        res = self.anon_client.get('/api/cms/media/')
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)
