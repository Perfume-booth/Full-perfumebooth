import uuid
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from apps.authentication.models import CustomUser, CustomerAddress


class CustomerAddressTDDTests(TestCase):
    """
    TDD Test Suite for Customer Address Book & Default Address Invariant.
    """

    def setUp(self):
        self.client = APIClient()
        self.user_a = CustomUser.objects.create_user(
            email='customer_a@example.test',
            password='Password123!',
            first_name='Alice',
            last_name='Tester'
        )
        self.user_b = CustomUser.objects.create_user(
            email='customer_b@example.test',
            password='Password123!',
            first_name='Bob',
            last_name='Tester'
        )

    def auth_as(self, user):
        self.client.force_authenticate(user=user)

    def res_data(self, res):
        if isinstance(res.data, dict):
            return res.data.get('data', res.data)
        return res.data

    # 1. Unauthenticated Security
    def test_unauthenticated_requests_are_rejected(self):
        """Unauthenticated access must be rejected with 401 Unauthorized."""
        res_list = self.client.get('/api/auth/customer/addresses/')
        self.assertEqual(res_list.status_code, status.HTTP_401_UNAUTHORIZED)

        res_post = self.client.post('/api/auth/customer/addresses/', {'address1': 'Test'})
        self.assertEqual(res_post.status_code, status.HTTP_401_UNAUTHORIZED)

    # 2. Mandatory Field Validation
    def test_create_address_requires_mandatory_fields(self):
        """address1, city, and zip are strictly required; missing/blank returns 400."""
        self.auth_as(self.user_a)
        
        # Completely empty payload
        res = self.client.post('/api/auth/customer/addresses/', {})
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        
        # Missing address1
        res = self.client.post('/api/auth/customer/addresses/', {
            'city': 'Delhi', 'zip': '110001'
        })
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

        # Missing city
        res = self.client.post('/api/auth/customer/addresses/', {
            'address1': '123 Market Street', 'zip': '110001'
        })
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

        # Missing zip / pincode
        res = self.client.post('/api/auth/customer/addresses/', {
            'address1': '123 Market Street', 'city': 'Delhi'
        })
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    # 3. Pincode Validation
    def test_create_address_validates_pincode_format(self):
        """Pincode must be a valid 6-digit Indian postal code."""
        self.auth_as(self.user_a)
        for invalid_pin in ['123', 'ABCDEF', '1100001', '12 34']:
            res = self.client.post('/api/auth/customer/addresses/', {
                'address1': 'Connaught Place',
                'city': 'New Delhi',
                'zip': invalid_pin
            })
            self.assertEqual(
                res.status_code, status.HTTP_400_BAD_REQUEST,
                f"Pincode '{invalid_pin}' should have been rejected."
            )

        # Valid 6-digit pin
        res_valid = self.client.post('/api/auth/customer/addresses/', {
            'address1': 'Connaught Place',
            'city': 'New Delhi',
            'zip': '110001',
            'first_name': 'Alice'
        })
        self.assertEqual(res_valid.status_code, status.HTTP_201_CREATED)
        self.assertEqual(self.res_data(res_valid).get('zip'), '110001')

    # 4. Default Invariant: First Address is Default
    def test_first_address_created_is_automatically_default(self):
        """The customer's very first saved address must be default automatically."""
        self.auth_as(self.user_a)
        res = self.client.post('/api/auth/customer/addresses/', {
            'address1': 'Plot 42, Sector 15',
            'city': 'Gurugram',
            'province': 'Haryana',
            'zip': '122001',
            'is_default': False  # Even if sent false, first address becomes default
        })
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        d = self.res_data(res)
        self.assertTrue(d.get('is_default'))
        
        addr = CustomerAddress.objects.get(id=d['id'])
        self.assertTrue(addr.is_default)

    # 5. Default Invariant: Single Default on New Address
    def test_adding_new_default_address_unsets_previous_default(self):
        """Setting is_default=True on a new address must atomically unset previous default."""
        self.auth_as(self.user_a)
        # First address (default)
        res1 = self.client.post('/api/auth/customer/addresses/', {
            'address1': 'Address One', 'city': 'Mumbai', 'zip': '400001'
        })
        addr1_id = self.res_data(res1)['id']

        # Second address (set as default)
        res2 = self.client.post('/api/auth/customer/addresses/', {
            'address1': 'Address Two', 'city': 'Bengaluru', 'zip': '560001', 'is_default': True
        })
        addr2_id = self.res_data(res2)['id']

        # Assert addr2 is default and addr1 is no longer default
        addr1 = CustomerAddress.objects.get(id=addr1_id)
        addr2 = CustomerAddress.objects.get(id=addr2_id)
        self.assertFalse(addr1.is_default)
        self.assertTrue(addr2.is_default)

        # Invariant: exactly ONE default address for user_a
        defaults_count = CustomerAddress.objects.filter(user=self.user_a, is_default=True).count()
        self.assertEqual(defaults_count, 1)

    # 6. Default Invariant: Explicit Set-Default Endpoint
    def test_set_default_endpoint_updates_atomically(self):
        """POST /api/auth/customer/addresses/<id>/set-default/ must update single default."""
        self.auth_as(self.user_a)
        addr1 = CustomerAddress.objects.create(
            user=self.user_a, address1='Addr 1', city='Delhi', zip='110001', is_default=True
        )
        addr2 = CustomerAddress.objects.create(
            user=self.user_a, address1='Addr 2', city='Noida', zip='201301', is_default=False
        )

        res = self.client.post(f'/api/auth/customer/addresses/{addr2.id}/set-default/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        addr1.refresh_from_db()
        addr2.refresh_from_db()
        self.assertFalse(addr1.is_default)
        self.assertTrue(addr2.is_default)
        self.assertEqual(CustomerAddress.objects.filter(user=self.user_a, is_default=True).count(), 1)

    # 7. Default Invariant on PUT Update
    def test_updating_address_to_default_unsets_previous_default(self):
        """PUT /api/auth/customer/addresses/<id>/ with is_default=True must unset other defaults."""
        self.auth_as(self.user_a)
        addr1 = CustomerAddress.objects.create(
            user=self.user_a, address1='Addr 1', city='Delhi', zip='110001', is_default=True
        )
        addr2 = CustomerAddress.objects.create(
            user=self.user_a, address1='Addr 2', city='Noida', zip='201301', is_default=False
        )

        res = self.client.put(f'/api/auth/customer/addresses/{addr2.id}/', {
            'address1': 'Addr 2 Updated',
            'city': 'Noida',
            'zip': '201301',
            'is_default': True
        })
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        addr1.refresh_from_db()
        addr2.refresh_from_db()
        self.assertFalse(addr1.is_default)
        self.assertTrue(addr2.is_default)
        self.assertEqual(CustomerAddress.objects.filter(user=self.user_a, is_default=True).count(), 1)

    # 8. Deleting Default Address Promotes Next Available Address
    def test_deleting_default_address_promotes_remaining_address_to_default(self):
        """Deleting the default address automatically promotes the latest remaining address to default."""
        self.auth_as(self.user_a)
        addr1 = CustomerAddress.objects.create(
            user=self.user_a, address1='Addr 1', city='Delhi', zip='110001', is_default=False
        )
        addr2 = CustomerAddress.objects.create(
            user=self.user_a, address1='Addr 2', city='Noida', zip='201301', is_default=True
        )

        res = self.client.delete(f'/api/auth/customer/addresses/{addr2.id}/')
        self.assertEqual(res.status_code, status.HTTP_204_NO_CONTENT)

        # addr1 should now be promoted to default
        addr1.refresh_from_db()
        self.assertTrue(addr1.is_default)
        self.assertEqual(CustomerAddress.objects.filter(user=self.user_a, is_default=True).count(), 1)

    # 9. Cross-User Security Isolation
    def test_cross_user_isolation(self):
        """User B cannot view, modify, delete, or set default on User A's address."""
        addr_a = CustomerAddress.objects.create(
            user=self.user_a, address1='Secret House', city='Jaipur', zip='302001', is_default=True
        )

        # Authenticate as User B
        self.auth_as(self.user_b)

        # GET User B's addresses must not include addr_a
        res_list = self.client.get('/api/auth/customer/addresses/')
        self.assertEqual(res_list.status_code, status.HTTP_200_OK)
        addresses_returned = res_list.data.get('data', res_list.data)
        ids = [a['id'] for a in addresses_returned]
        self.assertNotIn(str(addr_a.id), ids)

        # PUT against User A's address -> 404
        res_put = self.client.put(f'/api/auth/customer/addresses/{addr_a.id}/', {
            'address1': 'Hacked', 'city': 'Hacked', 'zip': '110001'
        })
        self.assertEqual(res_put.status_code, status.HTTP_404_NOT_FOUND)

        # POST set-default against User A's address -> 404
        res_def = self.client.post(f'/api/auth/customer/addresses/{addr_a.id}/set-default/')
        self.assertEqual(res_def.status_code, status.HTTP_404_NOT_FOUND)

        # DELETE against User A's address -> 404
        res_del = self.client.delete(f'/api/auth/customer/addresses/{addr_a.id}/')
        self.assertEqual(res_del.status_code, status.HTTP_404_NOT_FOUND)

        # Ensure addr_a was not modified or deleted
        addr_a.refresh_from_db()
        self.assertEqual(addr_a.address1, 'Secret House')
        self.assertTrue(addr_a.is_default)
