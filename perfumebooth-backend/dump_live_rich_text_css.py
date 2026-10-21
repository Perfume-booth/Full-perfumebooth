import urllib.request
import re
import sys
sys.stdout.reconfigure(encoding='utf-8')

css_url = "https://www.perfumebooth.com/_next/static/css/a398171f65a209ef.css"
req = urllib.request.Request(css_url, headers={'User-Agent': 'Mozilla/5.0'})
with urllib.request.urlopen(req) as resp:
    css = resp.read().decode('utf-8')

start = css.find('.rich-text')
end = css.find('.custom-scrollbar', start)
print(css[start:end])
