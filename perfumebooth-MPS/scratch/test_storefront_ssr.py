import urllib.request
import re

url = "http://localhost:3000/all"
print(f"Fetching {url} ...")
try:
    req = urllib.request.Request(
        url, 
        headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
    )
    with urllib.request.urlopen(req) as response:
        html = response.read().decode('utf-8')
        
    print("Fetch successful! Analyzing HTML...")
    
    # Check for product title
    if "Aromatic Oud" in html:
        print("✅ SUCCESS: 'Aromatic Oud' found in SSR HTML!")
    else:
        print("❌ FAILED: 'Aromatic Oud' NOT found in SSR HTML.")
        
    # Find all occurrences of brands to see what's rendered
    brands = ["Al Haramain", "Arabiyat Prestige", "Lomani", "Louis Cardin", "MPF", "New NB", "Otoori", "Swiss Arabian", "Lattafa", "Creed", "Versace"]
    print("\nChecking brands in HTML:")
    for b in brands:
        count = len(re.findall(re.escape(b), html, re.IGNORECASE))
        print(f"  - {b}: {count} occurrences")
        
except Exception as e:
    print("Error:", e)
