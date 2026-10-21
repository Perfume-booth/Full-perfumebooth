import urllib.request
import re
import sys
sys.stdout.reconfigure(encoding='utf-8')

for css_file in ["a398171f65a209ef.css", "c33f851738cd2e0b.css"]:
    url = f"https://www.perfumebooth.com/_next/static/css/{css_file}"
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req) as resp:
        css = resp.read().decode('utf-8')
        pos = css.find('--color-')
        if pos != -1:
            print(f"CSS variables in {css_file}:")
            root_start = css.rfind(':root', 0, pos)
            root_end = css.find('}', pos)
            print(css[root_start:root_end+1])
