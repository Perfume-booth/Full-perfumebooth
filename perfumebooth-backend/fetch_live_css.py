import urllib.request
import re
import sys
sys.stdout.reconfigure(encoding='utf-8')

with open('scraped_pages/info_policies_shipping.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Find all css links
css_links = re.findall(r'href="(/_next/static/css/[^"]+)"', html)
print("CSS links found:", css_links)

for css_url in css_links:
    full_url = f"https://www.perfumebooth.com{css_url}"
    print("Fetching:", full_url)
    try:
        req = urllib.request.Request(full_url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req) as resp:
            css_content = resp.read().decode('utf-8')
            print("  CSS content length:", len(css_content))
            # Find rich-text in css
            matches = [m.start() for m in re.finditer(r'rich-text', css_content)]
            print("  Matches for rich-text:", len(matches))
            for idx in matches:
                start = max(0, idx - 50)
                end = min(len(css_content), idx + 200)
                print("   ", css_content[start:end])
    except Exception as e:
        print("  Error:", e)
