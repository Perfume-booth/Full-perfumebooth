import subprocess

script = """
import os, django
os.environ['DJANGO_SETTINGS_MODULE'] = 'core.settings'
django.setup()

from apps.authentication.models import CustomUser
from rest_framework_simplejwt.tokens import RefreshToken, AccessToken
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError

u = CustomUser.objects.filter(is_staff=True).first()
tok = str(RefreshToken.for_user(u).access_token).strip()
print('Generated token:', tok)

try:
    validated = AccessToken(tok)
    print('Direct validation succeeded! Payload:', validated.payload)
except TokenError as e:
    print('Direct validation failed with TokenError:', e)
except Exception as e:
    print('Direct validation failed with Exception:', type(e), e)
"""

cmd = ['docker', 'exec', 'perfumebooth_django', 'python', '-c', script]
out = subprocess.check_output(cmd, text=True)
print(out)
