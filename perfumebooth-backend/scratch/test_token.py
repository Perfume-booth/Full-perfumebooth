import subprocess
import urllib.request
import urllib.error

cmd = [
    'docker', 'exec', 'perfumebooth_django', 'python', '-c',
    'import os, django; os.environ["DJANGO_SETTINGS_MODULE"]="core.settings"; django.setup(); from apps.authentication.models import CustomUser; from rest_framework_simplejwt.tokens import RefreshToken; u = CustomUser.objects.filter(is_staff=True).first(); print(str(RefreshToken.for_user(u).access_token).strip())'
]
out = subprocess.check_output(cmd, text=True)
lines = [l.strip() for l in out.splitlines() if l.strip()]
print('LINES:', lines)
tok = lines[-1]
print('Token len:', len(tok))
print('Token:', tok)

req = urllib.request.Request(
    'http://127.0.0.1:8000/api/shop/reports/',
    headers={'Authorization': f'Bearer {tok}', 'Accept': 'application/json'}
)
try:
    with urllib.request.urlopen(req) as res:
        print('SUCCESS:', res.status, res.read()[:100])
except urllib.error.HTTPError as e:
    print('ERR:', e.code, e.read().decode())
