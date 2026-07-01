# pyrefly: ignore [missing-import]
from django.core.management.base import BaseCommand
# pyrefly: ignore [missing-import]
from apps.authentication.models import CustomUser, Role, UserRole

class Command(BaseCommand):
    help = 'Seeds standard roles and creates mock merchant accounts for testing.'

    def handle(self, *args, **options):
        # 1. Define roles
        roles_data = [
            {'name': 'Super Admin', 'permissions': {'all': True}},
            {'name': 'Admin', 'permissions': {'catalog': True, 'orders': True, 'cms': True, 'staff': False}},
            {'name': 'Content Manager', 'permissions': {'catalog': False, 'orders': False, 'cms': True, 'staff': False}},
            {'name': 'E-commerce Executive', 'permissions': {'catalog': True, 'orders': True, 'cms': False, 'staff': False}},
        ]

        roles = {}
        for r_data in roles_data:
            role, created = Role.objects.get_or_create(
                name=r_data['name'],
                defaults={'permissions': r_data['permissions']}
            )
            roles[r_data['name']] = role
            if created:
                self.stdout.write(self.style.SUCCESS(f'Created role: "{role.name}"'))

        # 2. Define test users
        users_data = [
            {
                'email': 'superadmin@perfumebooth.com',
                'first_name': 'Super',
                'last_name': 'Admin',
                'role': 'Super Admin',
                'is_staff': True,
                'is_superuser': True
            },
            {
                'email': 'admin@perfumebooth.com',
                'first_name': 'Shop',
                'last_name': 'Admin',
                'role': 'Admin',
                'is_staff': True,
                'is_superuser': False
            },
            {
                'email': 'cms@perfumebooth.com',
                'first_name': 'Content',
                'last_name': 'Manager',
                'role': 'Content Manager',
                'is_staff': True,
                'is_superuser': False
            },
            {
                'email': 'exec@perfumebooth.com',
                'first_name': 'E-commerce',
                'last_name': 'Executive',
                'role': 'E-commerce Executive',
                'is_staff': True,
                'is_superuser': False
            },
        ]

        password = 'adminpassword'

        for u_data in users_data:
            email = u_data['email']
            role_name = u_data['role']
            
            if CustomUser.objects.filter(email=email).exists():
                user = CustomUser.objects.get(email=email)
                user.set_password(password)
                user.first_name = u_data['first_name']
                user.last_name = u_data['last_name']
                user.is_staff = u_data['is_staff']
                user.is_superuser = u_data['is_superuser']
                user.save()
                self.stdout.write(self.style.WARNING(f'User {email} already exists. Updated password and profile.'))
            else:
                if u_data['is_superuser']:
                    user = CustomUser.objects.create_superuser(
                        email=email,
                        password=password,
                        first_name=u_data['first_name'],
                        last_name=u_data['last_name'],
                    )
                else:
                    user = CustomUser.objects.create_user(
                        email=email,
                        password=password,
                        first_name=u_data['first_name'],
                        last_name=u_data['last_name'],
                        is_staff=u_data['is_staff'],
                        is_superuser=u_data['is_superuser']
                    )
                self.stdout.write(self.style.SUCCESS(f'Successfully created user {email}.'))

            # Set user role
            UserRole.objects.get_or_create(user=user, role=roles[role_name])
            self.stdout.write(self.style.SUCCESS(f'Assigned "{role_name}" role to {email}.'))

        self.stdout.write(self.style.SUCCESS('All roles and mock accounts seeded successfully.'))

