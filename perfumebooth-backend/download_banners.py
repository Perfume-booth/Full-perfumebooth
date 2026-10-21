import os
import shutil
import urllib.request

BANNER_MAP = {
    'about-us-desktop.jpg': 'https://cdn.shopify.com/s/files/1/0718/5786/4996/files/about_782d7c52-96ce-47ad-b030-d50b3961e3a4.jpg?v=1778134332',
    'about-us-mobile.jpg': 'https://cdn.shopify.com/s/files/1/0718/5786/4996/files/about.jpg?v=1778130177',
    'about-us-logos.jpg': 'https://cdn.shopify.com/s/files/1/0718/5786/4996/files/all-logos_jpg.jpg?v=1787643344',
    
    'contact-us-desktop.png': 'https://cdn.shopify.com/s/files/1/0718/5786/4996/files/contact_139b629a-4e56-42a7-9441-4750a1995629.png?v=1779253483',
    'contact-us-mobile.png': 'https://cdn.shopify.com/s/files/1/0718/5786/4996/files/contact_139b629a-4e56-42a7-9441-4750a1995629.png?v=1779253483',

    'faq-desktop.jpg': 'https://cdn.shopify.com/s/files/1/0718/5786/4996/files/faq.jpg?v=1778133307',
    'faq-mobile.jpg': 'https://cdn.shopify.com/s/files/1/0718/5786/4996/files/fag.jpg?v=1778130176',

    'disclaimers-desktop.jpg': 'https://cdn.shopify.com/s/files/1/0718/5786/4996/files/disclaimers.jpg?v=1778133307',
    'disclaimers-mobile.jpg': 'https://cdn.shopify.com/s/files/1/0718/5786/4996/files/disclaimer.jpg?v=1778130177',

    'privacy-desktop.jpg': 'https://cdn.shopify.com/s/files/1/0718/5786/4996/files/policy_12aa518e-be27-496d-8071-fa705ab3272a.jpg?v=1778133307',
    'privacy-mobile.jpg': 'https://cdn.shopify.com/s/files/1/0718/5786/4996/files/policy.jpg?v=1778130177',

    'shipping-desktop.jpg': 'https://cdn.shopify.com/s/files/1/0718/5786/4996/files/Shipping_0e5a3f4a-d7db-4672-b172-d55ad85be6c0.jpg?v=1778133308',
    'shipping-mobile.jpg': 'https://cdn.shopify.com/s/files/1/0718/5786/4996/files/shipping.jpg?v=1778130176',

    'refund-desktop.jpg': 'https://cdn.shopify.com/s/files/1/0718/5786/4996/files/refunds.jpg?v=1778133307',
    'refund-mobile.jpg': 'https://cdn.shopify.com/s/files/1/0718/5786/4996/files/return.jpg?v=1778130177',

    'terms-desktop.jpg': 'https://cdn.shopify.com/s/files/1/0718/5786/4996/files/terms.jpg?v=1778133307',
    'terms-mobile.jpg': 'https://cdn.shopify.com/s/files/1/0718/5786/4996/files/TERMS-AND-CONDITIONS-900-600_jpg.jpg?v=1778136087',
}

storefront_dir = r'd:\Full-Perfumebooth\perfumebooth\public\images\banners'
mps_dir = r'd:\Full-Perfumebooth\perfumebooth-MPS\public\images\banners'

os.makedirs(storefront_dir, exist_ok=True)
os.makedirs(mps_dir, exist_ok=True)

headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}

for fname, url in BANNER_MAP.items():
    dest1 = os.path.join(storefront_dir, fname)
    dest2 = os.path.join(mps_dir, fname)
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = resp.read()
            with open(dest1, 'wb') as f:
                f.write(data)
            with open(dest2, 'wb') as f:
                f.write(data)
        print(f"Downloaded {fname} ({len(data)} bytes) to both apps")
    except Exception as e:
        print(f"Failed {fname}: {e}")
