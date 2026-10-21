import urllib.request
import re
import sys
sys.stdout.reconfigure(encoding='utf-8')

url = "https://www.perfumebooth.com/_next/static/css/a398171f65a209ef.css"
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
with urllib.request.urlopen(req) as resp:
    css = resp.read().decode('utf-8')

pos = css.find('--color-gold:')
if pos != -1:
    print(css[pos-100:pos+200])
else:
    print("Not found as --color-gold:")
    # search where color-gold appears
    for m in re.finditer(r'--color-gold', css):
        p = m.start()
        print(css[p-50:p+100])
        break
