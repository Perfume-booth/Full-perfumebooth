import uuid
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('authentication', '0002_auditlog'),
    ]

    operations = [
        # Alter email on CustomUser to be nullable
        migrations.AlterField(
            model_name='customuser',
            name='email',
            field=models.EmailField(blank=True, db_index=True, max_length=254, null=True, unique=True),
        ),
        # Add phone field on CustomUser
        migrations.AddField(
            model_name='customuser',
            name='phone',
            field=models.CharField(blank=True, db_index=True, max_length=20, null=True, unique=True),
        ),
        # Add index for phone
        migrations.AddIndex(
            model_name='customuser',
            index=models.Index(fields=['phone'], name='user_phone_idx'),
        ),
        # Create OTPVerification model
        migrations.CreateModel(
            name='OTPVerification',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('phone', models.CharField(db_index=True, max_length=20)),
                ('code', models.CharField(max_length=6)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('expires_at', models.DateTimeField(db_index=True)),
                ('is_verified', models.BooleanField(default=False)),
            ],
            options={
                'verbose_name': 'OTP Verification',
                'verbose_name_plural': 'OTP Verifications',
                'db_table': 'auth_otp_verification',
            },
        ),
        # Create SocialAccount model
        migrations.CreateModel(
            name='SocialAccount',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('provider', models.CharField(max_length=50)),
                ('uid', models.CharField(db_index=True, max_length=255)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='social_accounts', to='authentication.customuser')),
            ],
            options={
                'verbose_name': 'Social Account',
                'verbose_name_plural': 'Social Accounts',
                'db_table': 'auth_social_account',
                'unique_together': {('provider', 'uid')},
            },
        ),
    ]
