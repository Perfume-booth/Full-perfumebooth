import urllib.request
import urllib.error
import json

def check(url, method='GET', data=None, headers=None):
    headers = headers or {}
    if data and isinstance(data, dict):
        data = json.dumps(data).encode('utf-8')
        headers['Content-Type'] = 'application/json'
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            return resp.status, resp.read().decode()
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()

# 1. Public catalog endpoint
s1, _ = check('http://127.0.0.1:8000/api/v1/catalog/brands/')
print(f"1. GET /api/v1/catalog/brands/ (Public): {s1} (Expected: 200)")

# 2. Unauthenticated brand mutation
s2, _ = check('http://127.0.0.1:8000/api/v1/catalog/brands/', method='POST', data={'brand': 'Malicious'})
print(f"2. POST /api/v1/catalog/brands/ (Unauthenticated): {s2} (Expected: 401)")

# 3. Unauthenticated Shiprocket webhook
s3, _ = check('http://127.0.0.1:8000/api/orders/shiprocket/webhook/', method='POST', data={'order_id': 'PB-1001'})
print(f"3. POST /api/orders/shiprocket/webhook/ (Unauthenticated): {s3} (Expected: 401)")

# 4. Authenticated Shiprocket webhook with valid token (order not found -> 404)
s4, _ = check(
    'http://127.0.0.1:8000/api/orders/shiprocket/webhook/',
    method='POST',
    data={'order_id': 'NONEXISTENT-ORDER'},
    headers={'X-API-Key': 'shiprocket-webhook-token'}
)
print(f"4. POST /api/orders/shiprocket/webhook/ (With Valid Token): {s4} (Expected: 404)")

# 5. Password reset poisoning attempt with untrusted origin
s5, b5 = check(
    'http://127.0.0.1:8000/api/auth/customer/password-reset/',
    method='POST',
    data={'email': 'superadmin@perfumebooth.com', 'frontend_url': 'https://evil-attacker.com'}
)
print(f"5. POST /api/auth/customer/password-reset/ (Host Poisoning Attempt): {s5} (Expected: 200 sanitized)")

# 6. Unsigned Apple JWT attack
s6, b6 = check(
    'http://127.0.0.1:8000/api/auth/customer/social/',
    method='POST',
    data={'provider': 'apple', 'token': 'forged.fake.token'}
)
print(f"6. POST /api/auth/customer/social/ (Forged Apple Token): {s6} (Expected: 400)")
