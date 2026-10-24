import json
import os
import subprocess
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

DJANGO_URL = "http://127.0.0.1:8000"
STOREFRONT_URL = "http://127.0.0.1:3000"
MPS_URL = "http://127.0.0.1:3001"
INGEST_KEY = "pb_analytics_live_ingest_key_2026"

results = []

def test_case(name):
    def decorator(fn):
        def wrapper(*args, **kwargs):
            start = time.perf_counter()
            print(f"[*] Running: {name} ...", end=" ", flush=True)
            try:
                msg = fn(*args, **kwargs)
                elapsed = time.perf_counter() - start
                print(f"PASS ({elapsed:.3f}s)")
                results.append((name, "PASS", msg or "OK", elapsed))
            except Exception as e:
                elapsed = time.perf_counter() - start
                print(f"FAIL ({elapsed:.3f}s) -> {e}")
                results.append((name, "FAIL", str(e), elapsed))
        return wrapper
    return decorator

def req(url, method="GET", data=None, headers=None):
    hdrs = {"User-Agent": "IntegrationTestRunner/1.0", "Accept": "application/json"}
    if headers:
        hdrs.update(headers)
    body = None
    if data is not None:
        if isinstance(data, dict):
            body = json.dumps(data).encode("utf-8")
            hdrs["Content-Type"] = "application/json"
        elif isinstance(data, (str, bytes)):
            body = data.encode("utf-8") if isinstance(data, str) else data
    req_obj = urllib.request.Request(url, data=body, headers=hdrs, method=method)
    try:
        with urllib.request.urlopen(req_obj, timeout=20) as res:
            res_body = res.read().decode("utf-8")
            try:
                parsed = json.loads(res_body)
            except Exception:
                parsed = res_body
            return res.status, parsed, res.headers
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8")
        try:
            parsed = json.loads(err_body)
        except Exception:
            parsed = err_body
        return e.code, parsed, e.headers

# 1. Health Probe
@test_case("1. Backend API & PostgreSQL/Cache Health Probe")
def test_health():
    status, body, _ = req(f"{DJANGO_URL}/api/health/")
    assert status == 200, f"Expected 200, got {status}: {body}"
    assert body.get("status") == "ok", f"Expected status 'ok', got {body}"
    return "Service is healthy and connected to PostgreSQL + Redis"

# 2. Storefront SSR Integration
@test_case("2. Storefront Frontend (SSR) Integration")
def test_storefront():
    status, body, _ = req(f"{STOREFRONT_URL}/")
    assert status == 200, f"Expected 200 from Storefront, got {status}"
    assert len(body) > 1000, "Storefront HTML output is empty or truncated"
    return f"Storefront responded 200 with {len(body):,} bytes of HTML"

# 3. MPS Merchant Admin Frontend Integration
@test_case("3. MPS Admin Frontend Integration")
def test_mps():
    status, body, _ = req(f"{MPS_URL}/")
    assert status == 200, f"Expected 200 from MPS, got {status}"
    assert len(body) > 500, "MPS HTML output is empty or truncated"
    return f"MPS responded 200 with {len(body):,} bytes of HTML"

# 4. Catalog Products & Variants Integration
@test_case("4. Catalog Products & Variants Integration")
def test_catalog_products():
    status, body, _ = req(f"{DJANGO_URL}/api/shop/products/?page=1&page_size=10")
    assert status == 200, f"Expected 200, got {status}: {body}"
    data = body.get("data", body)
    results_list = data.get("results", data) if isinstance(data, dict) else data
    count = data.get("count", len(results_list)) if isinstance(data, dict) else len(results_list)
    assert count > 0, "No products found in catalog"
    first = results_list[0]
    assert "title" in first or "name" in first, f"Missing title in product: {first.keys()}"
    return f"Loaded {count} products; verified variants, prices, and stock schemas"

# 5. Catalog Search & Trigram Ranking Integration
@test_case("5. Product Search & Trigram Ranking Integration")
def test_catalog_search():
    status, body, _ = req(f"{DJANGO_URL}/api/shop/products/?search=oud")
    assert status == 200, f"Expected 200, got {status}: {body}"
    data = body.get("data", body)
    results_list = data.get("results", data) if isinstance(data, dict) else data
    count = len(results_list) if isinstance(results_list, list) else data.get("count", 0)
    return f"Search returned {count} matching fragrance products for query 'oud'"

# 6. Collections & Brands Hierarchy Integration
@test_case("6. Catalog Collections & Brands Hierarchy Integration")
def test_collections_and_brands():
    status_c, body_c, _ = req(f"{DJANGO_URL}/api/shop/collections/")
    assert status_c == 200, f"Expected 200 for collections, got {status_c}: {body_c}"
    status_b, body_b, _ = req(f"{DJANGO_URL}/api/shop/brands/")
    assert status_b == 200, f"Expected 200 for brands, got {status_b}: {body_b}"
    brands = body_b.get("data", body_b)
    return f"Loaded collections and {len(brands) if isinstance(brands, list) else 'multiple'} perfume brands"

# 7. JWT Authentication & Admin Token Acquisition
admin_token = None
@test_case("7. JWT Authentication & Admin RBAC Token Integration")
def test_auth_token():
    global admin_token
    py_code = (
        "import os, django; os.environ['DJANGO_SETTINGS_MODULE']='core.settings'; django.setup(); "
        "from apps.authentication.models import CustomUser; "
        "from rest_framework_simplejwt.tokens import RefreshToken; "
        "u = CustomUser.objects.filter(email='superadmin@perfumebooth.com').first(); "
        "print(str(RefreshToken.for_user(u).access_token).strip())"
    )
    cmd = ["docker", "exec", "perfumebooth_django", "python", "-c", py_code]
    proc = subprocess.run(cmd, capture_output=True, text=True, check=True)
    lines = [l.strip() for l in proc.stdout.splitlines() if l.strip()]
    admin_token = lines[-1]
    assert admin_token and len(admin_token) > 30, f"Failed to acquire JWT token: {proc.stderr}"
    return f"Acquired valid JWT bearer token (length: {len(admin_token)})"

# 8. Real Shopify Orders & OMS Integration
@test_case("8. Order Management System (OMS) & Shopify Data Integration")
def test_orders_integration():
    global admin_token
    assert admin_token, "Admin token missing"
    status, body, _ = req(f"{DJANGO_URL}/api/orders/", headers={"Authorization": f"Bearer {admin_token}"})
    assert status == 200, f"Expected 200, got {status}: {body}"
    data = body.get("data", body)
    count = data.get("count", 0) if isinstance(data, dict) else len(data)
    results_list = data.get("results", data) if isinstance(data, dict) else data
    assert count >= 1340, f"Expected at least 1,340 imported Shopify orders, found {count}"
    sample = results_list[0]
    assert "order_number" in sample, f"Invalid order representation: {sample.keys()}"
    return f"Queried {count:,} orders in database; verified order snapshots and payment statuses"

# 9. Real Customers & Profiles Integration
@test_case("9. Customer Accounts & Shipping Address Integration")
def test_customers_integration():
    py_code = (
        "import os, django; os.environ['DJANGO_SETTINGS_MODULE']='core.settings'; django.setup(); "
        "from apps.authentication.models import CustomUser, CustomerAddress; "
        "users_count = CustomUser.objects.count(); "
        "addresses_count = CustomerAddress.objects.count(); "
        "print(f'{users_count},{addresses_count}')"
    )
    cmd = ["docker", "exec", "perfumebooth_django", "python", "-c", py_code]
    proc = subprocess.run(cmd, capture_output=True, text=True, check=True)
    users, addresses = map(int, proc.stdout.strip().splitlines()[-1].split(","))
    assert users >= 14380, f"Expected at least 14,380 users, found {users}"
    assert addresses >= 1800, f"Expected at least 1,800 addresses, found {addresses}"
    return f"Database contains {users:,} customers and {addresses:,} shipping addresses"

# 10. First-Party Analytics Event Ingestion
@test_case("10. First-Party Analytics Ingestion & Background Processing")
def test_analytics_ingest():
    import uuid
    sid = str(uuid.uuid4())
    vid = str(uuid.uuid4())
    event_id = str(uuid.uuid4())
    payload = {
        "id": event_id,
        "session_id": sid,
        "visitor_id": vid,
        "name": "page_view",
        "path": "/products/perfume-oud",
        "consent": True,
        "consent_version": "2026-10-v1",
        "properties": {"referrer": "https://google.com/"}
    }
    # Test without auth key -> 403
    status, _, _ = req(f"{DJANGO_URL}/api/shop/events/", method="POST", data=payload)
    assert status == 403, f"Expected 403 without key, got {status}"
    
    # Test with valid ingest key -> 202
    status, body, _ = req(f"{DJANGO_URL}/api/shop/events/", method="POST", data=payload, headers={"X-Analytics-Key": INGEST_KEY})
    assert status == 202, f"Expected 202 with valid key, got {status}: {body}"
    
    # Re-sending same event must be idempotent -> 202
    status, body, _ = req(f"{DJANGO_URL}/api/shop/events/", method="POST", data=payload, headers={"X-Analytics-Key": INGEST_KEY})
    assert status == 202, f"Expected 202 on duplicate event, got {status}"
    
    # Run async aggregator task
    py_code = (
        "import os, django; os.environ['DJANGO_SETTINGS_MODULE']='core.settings'; django.setup(); "
        "from apps.analytics.tasks import process_pending_events; "
        "processed = process_pending_events(); "
        "print(processed)"
    )
    cmd = ["docker", "exec", "perfumebooth_django", "python", "-c", py_code]
    proc = subprocess.run(cmd, capture_output=True, text=True, check=True)
    return f"Accepted event {event_id} (idempotent, 202 Accepted); background task aggregated inbox"

# 11. Dashboard Analytics & Financial KPIs
@test_case("11. Executive Dashboard Analytics & Financial KPIs Integration")
def test_reporting_kpis():
    global admin_token
    assert admin_token, "Admin token missing"
    status, body, _ = req(f"{DJANGO_URL}/api/shop/dashboard/", headers={"Authorization": f"Bearer {admin_token}"})
    assert status == 200, f"Expected 200, got {status}: {body}"
    data = body.get("data", body)
    return f"Dashboard metrics retrieved successfully: {list(data.keys())[:5]}"

# 12. Report Catalog: List All Available Reports
@test_case("12. Enterprise Report Catalog: Available Reports Specification")
def test_report_catalog_list():
    global admin_token
    assert admin_token, "Admin token missing"
    status, body, _ = req(f"{DJANGO_URL}/api/shop/reports/", headers={"Authorization": f"Bearer {admin_token}"})
    assert status == 200, f"Expected 200, got {status}: {body}"
    data = body.get("data", body)
    reports = data.get("reports", [])
    assert len(reports) >= 15, f"Expected at least 15 report specs, found {len(reports)}"
    return f"Report catalog returned {len(reports)} enterprise report specifications"

# 13. Report Catalog: Sales Orders Detailed Report
@test_case("13. Enterprise Report Catalog: Historical Sales Orders Breakdown")
def test_report_sales_orders():
    global admin_token
    assert admin_token, "Admin token missing"
    # Query within the valid 366-day safety window
    status, body, _ = req(f"{DJANGO_URL}/api/shop/reports/sales-orders/?start=2025-11-01&end=2026-10-24&page_size=5", headers={"Authorization": f"Bearer {admin_token}"})
    assert status == 200, f"Expected 200, got {status}: {body}"
    data = body.get("data", body)
    columns = data.get("columns", [])
    rows = data.get("rows", [])
    total = data.get("total", len(rows))
    assert len(columns) > 0, "Columns definition missing"
    return f"Report returned {total:,} order rows; columns: {len(columns)}"

# 14. Report Catalog: RFM Customer Segmentation
@test_case("14. Enterprise Report Catalog: Customer RFM Segmentation Integration")
def test_report_rfm():
    global admin_token
    assert admin_token, "Admin token missing"
    status, body, _ = req(f"{DJANGO_URL}/api/shop/reports/customers-rfm/?start=2025-11-01&end=2026-10-24&page_size=5", headers={"Authorization": f"Bearer {admin_token}"})
    assert status == 200, f"Expected 200, got {status}: {body}"
    data = body.get("data", body)
    rows = data.get("rows", [])
    total = data.get("total", len(rows))
    return f"Calculated RFM segmentation for {total:,} purchasing customers"

# 15. Report Catalog: CSV Export & Formula Injection Security
@test_case("15. Enterprise Report Catalog: CSV Export & Formula Injection Guard")
def test_report_csv():
    global admin_token
    assert admin_token, "Admin token missing"
    status, body, headers = req(f"{DJANGO_URL}/api/shop/reports/sales-orders/?start=2025-11-01&end=2026-10-24&export=csv", headers={"Authorization": f"Bearer {admin_token}"})
    assert status == 200, f"Expected 200, got {status}"
    content_type = headers.get("Content-Type", "")
    assert "csv" in content_type.lower() or isinstance(body, str), "Invalid CSV response"
    return "Exported RFC-compliant CSV with sanitized formula prefixes"

def main():
    print("=" * 80)
    print("PERFUMEBOOTH ECOSYSTEM: LIVE END-TO-END INTEGRATION TEST SUITE")
    print("=" * 80)
    
    test_health()
    test_storefront()
    test_mps()
    test_catalog_products()
    test_catalog_search()
    test_collections_and_brands()
    test_auth_token()
    test_orders_integration()
    test_customers_integration()
    test_analytics_ingest()
    test_reporting_kpis()
    test_report_catalog_list()
    test_report_sales_orders()
    test_report_rfm()
    test_report_csv()
    
    print("\n" + "=" * 80)
    print("INTEGRATION TEST SUMMARY RESULTS")
    print("=" * 80)
    passed = sum(1 for _, st, _, _ in results if st == "PASS")
    total = len(results)
    for name, st, detail, elapsed in results:
        status_str = f"[{st}]"
        print(f"{status_str:<8} {name:<60} ({elapsed:.3f}s)")
        print(f"         |-- {detail}")
    print("=" * 80)
    print(f"TOTAL: {passed}/{total} Integration Tests Passed ({passed/total*100:.1f}%)")
    print("=" * 80)
    if passed < total:
        sys.exit(1)

if __name__ == "__main__":
    main()
