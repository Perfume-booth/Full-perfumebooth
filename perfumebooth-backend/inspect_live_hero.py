import sys
sys.stdout.reconfigure(encoding='utf-8')

with open('scraped_pages/info_policies_shipping.html', 'r', encoding='utf-8') as f:
    html = f.read()

pos_main = html.find('class="max-w-4xl mx-auto px-6 py-10"')
if pos_main != -1:
    print(html[pos_main-1500:pos_main+200])
else:
    print("max-w-4xl not found")
