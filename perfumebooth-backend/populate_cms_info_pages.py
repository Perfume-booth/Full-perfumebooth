import os
import sys
import re
import django
from urllib.parse import unquote
from html import unescape

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from apps.cms.models import CMSPage, CMSSection

sys.stdout.reconfigure(encoding='utf-8')

PAGES_CONFIG = [
    {
        'slug': 'info/about-us',
        'title': 'About Us',
        'html_file': 'scraped_pages/info_about-us.html',
        'desktop_banner': '/images/banners/about-us-desktop.jpg',
        'mobile_banner': '/images/banners/about-us-mobile.jpg',
        'banner_title': 'About Us',
        'banner_subtitle': 'Crafting Fragrance Excellence & Affordable Luxury',
    },
    {
        'slug': 'info/contact-us',
        'title': 'Contact Us',
        'html_file': 'scraped_pages/info_contact-us.html',
        'desktop_banner': '/images/banners/contact-us-desktop.png',
        'mobile_banner': '/images/banners/contact-us-mobile.png',
        'banner_title': "We're Here For You",
        'banner_subtitle': 'Customer Care, Collaborations & Direct Inquiries',
    },
    {
        'slug': 'info/faq',
        'title': 'FAQ',
        'html_file': 'scraped_pages/info_faq.html',
        'desktop_banner': '/images/banners/faq-desktop.jpg',
        'mobile_banner': '/images/banners/faq-mobile.jpg',
        'banner_title': 'Frequently Asked Questions',
        'banner_subtitle': 'Everything you need to know about our perfumes, shipping & membership',
    },
    {
        'slug': 'info/disclaimers',
        'title': 'Disclaimers',
        'html_file': 'scraped_pages/info_disclaimers.html',
        'desktop_banner': '/images/banners/disclaimers-desktop.jpg',
        'mobile_banner': '/images/banners/disclaimers-mobile.jpg',
        'banner_title': 'Disclaimers',
        'banner_subtitle': 'Product notes, allergy disclosures & usage guidelines',
    },
    {
        'slug': 'info/policies/privacy',
        'title': 'Privacy Policy',
        'html_file': 'scraped_pages/info_policies_privacy.html',
        'desktop_banner': '/images/banners/privacy-desktop.jpg',
        'mobile_banner': '/images/banners/privacy-mobile.jpg',
        'banner_title': 'Privacy Policy',
        'banner_subtitle': 'Your privacy, data security & trust are paramount to us',
    },
    {
        'slug': 'info/policies/shipping',
        'title': 'Shipping Policy',
        'html_file': 'scraped_pages/info_policies_shipping.html',
        'desktop_banner': '/images/banners/shipping-desktop.jpg',
        'mobile_banner': '/images/banners/shipping-mobile.jpg',
        'banner_title': 'Shipping Policy',
        'banner_subtitle': 'Dispatch timelines, couriers & safe delivery standards',
    },
    {
        'slug': 'info/policies/refund',
        'title': 'Refund and Return Policy',
        'html_file': 'scraped_pages/info_policies_refund.html',
        'desktop_banner': '/images/banners/refund-desktop.jpg',
        'mobile_banner': '/images/banners/refund-mobile.jpg',
        'banner_title': 'Refund & Return Policy',
        'banner_subtitle': 'Return guidelines, replacements & cancellations',
    },
    {
        'slug': 'info/policies/terms',
        'title': 'Terms and Conditions',
        'html_file': 'scraped_pages/info_policies_terms.html',
        'desktop_banner': '/images/banners/terms-desktop.jpg',
        'mobile_banner': '/images/banners/terms-mobile.jpg',
        'banner_title': 'Terms & Conditions',
        'banner_subtitle': 'Store user agreement & purchasing rules',
    },
]

def clean_rich_text(html_content, slug=''):
    cleaned = re.sub(r'data-mce-fragment="1"', '', html_content)
    cleaned = re.sub(r'style="[^"]*font-family:[^"]*"', '', cleaned)
    cleaned = cleaned.replace('Priv\ufffd', 'Privé').replace('\ufffd', "'")
    
    # Replace external shopify logos image with local
    cleaned = re.sub(
        r'https://cdn\.shopify\.com/s/files/1/0718/5786/4996/files/all-logos_jpg\.jpg\?v=\d+',
        '/images/banners/about-us-logos.jpg',
        cleaned
    )
    # Ensure images have responsive styling
    cleaned = re.sub(r'<img([^>]+)>', r'<img\1 style="max-width: 100%; height: auto; border-radius: 8px; margin: 16px auto; display: block;" />', cleaned)
    
    if slug == 'info/about-us':
        # Remove the awkward breadcrumb link list at top:
        cleaned = re.sub(
            r'<ul>\s*<li[^>]*>\s*<h1><a href="/about-us"[^>]*>.*?</a></h1>\s*</li>\s*</ul>',
            '<h1>About Us</h1>',
            cleaned,
            flags=re.DOTALL | re.IGNORECASE
        )
        # Clean up empty paragraphs
        cleaned = re.sub(r'<p>\s*<br\s*/?>\s*</p>', '', cleaned)

    elif slug == 'info/faq':
        # Cut off any trailing footer trust badge text
        footer_pos = cleaned.find('© 2026 PerfumeBooth')
        if footer_pos != -1:
            tag_before = cleaned.rfind('<', 0, footer_pos)
            if tag_before != -1:
                cleaned = cleaned[:tag_before].strip()
        
        # Deduplicate duplicated sentences inside <p> tags caused by Shopify desktop/mobile spans
        def fix_p(match):
            inner = match.group(1)
            # Remove empty br spans
            inner = re.sub(r'<span>\s*<br\s*/?>\s*</span>', '', inner)
            inner = re.sub(r'<br\s*/?>', ' ', inner)
            # Find all spans
            spans = re.findall(r'<span[^>]*>(.*?)</span>', inner, re.DOTALL | re.IGNORECASE)
            if spans:
                clean_spans = []
                seen_texts = set()
                for s in spans:
                    raw_txt = re.sub(r'<[^>]+>', ' ', s).strip()
                    if raw_txt and raw_txt.lower() not in seen_texts:
                        seen_texts.add(raw_txt.lower())
                        clean_spans.append(s.strip())
                if clean_spans:
                    return f"<p>{' '.join(clean_spans)}</p>"
            return f"<p>{inner.strip()}</p>"

        cleaned = re.sub(r'<p[^>]*>(.*?)</p>', fix_p, cleaned, flags=re.DOTALL | re.IGNORECASE)

    # Clean up multiple blank spaces / empty paragraphs at end
    cleaned = re.sub(r'(<p[^>]*>\s*(&nbsp;|\xa0|\s)*</p>\s*)+$', '', cleaned)
    return cleaned.strip()

for cfg in PAGES_CONFIG:
    slug = cfg['slug']
    html_path = cfg['html_file']
    
    with open(html_path, 'r', encoding='utf-8') as f:
        html = f.read()

    # Title & Meta
    title_match = re.search(r'<title>(.*?)</title>', html, re.IGNORECASE)
    raw_title = title_match.group(1) if title_match else cfg['title']
    desc_match = re.search(r'<meta\s+name="description"\s+content="(.*?)"', html, re.IGNORECASE)
    meta_desc = unescape(desc_match.group(1)).strip() if desc_match else ""

    # Robust Rich Text Extraction
    pos_start = html.find('class="rich-text"')
    rich_body = ""
    if pos_start != -1:
        tag_end = html.find('>', pos_start) + 1
        pos_end = html.find('class="mt-16', tag_end)
        if pos_end == -1:
            pos_end = html.find('PerfumeBooth Pvt. Ltd. All rights reserved', tag_end)
            if pos_end != -1:
                pos_end = html.rfind('<div', tag_end, pos_end)
            else:
                pos_end = len(html)
        else:
            pos_end = html.rfind('<div', tag_end, pos_end)

        rich_body = clean_rich_text(html[tag_end:pos_end].strip(), slug=slug)

    # 1. Update or create CMSPage
    page, created = CMSPage.objects.get_or_create(slug=slug)
    page.title = cfg['title']
    page.meta_title = raw_title
    page.meta_description = meta_desc
    page.is_published = True
    page.save()

    # Clear old sections
    page.sections.all().delete()

    # Section 0: HeroBanner
    CMSSection.objects.create(
        page=page,
        type='HeroBanner',
        sort_order=0,
        content_payload={
            'title': cfg['banner_title'],
            'subtitle': cfg['banner_subtitle'],
            'desktopSrc': cfg['desktop_banner'],
            'mobileSrc': cfg['mobile_banner']
        },
        is_visible=True
    )

    # Section Specifics
    if slug == 'info/contact-us':
        # ContactCard
        CMSSection.objects.create(
            page=page,
            type='ContactCard',
            sort_order=1,
            content_payload={
                'email': 'connect@perfumebooth.com',
                'phone': '011-46604937, +91 9266030909',
                'hours': 'Monday – Saturday: 10:00 AM – 6:30 PM (IST)',
                'address': '70B/35A, 3rd Floor, Rama Road Industrial Area, New Delhi – 110015'
            },
            is_visible=True
        )
        # RichText
        contact_body = """
<h3>We'd Love to Hear From You</h3>
<p>At PerfumeBooth, we take utmost care to ensure you have an exquisite fragrance shopping journey. If you have any inquiries regarding order tracking, product recommendations, authentic batch verifications, or corporate gifting, our dedicated customer care team is delighted to assist you.</p>
<p>You can reach out to us via email or call our direct helpline during working hours. All emails are typically responded to within 24 to 48 business hours.</p>
        """.strip()
        CMSSection.objects.create(
            page=page,
            type='RichText',
            sort_order=2,
            content_payload={
                'title': 'Customer Care',
                'body': contact_body
            },
            is_visible=True
        )

    elif slug == 'info/faq':
        # Parse structured Q&A for FaqList
        pattern = r'<h3[^>]*>(.*?)</h3>\s*<p[^>]*>(.*?)</p>'
        matches = re.findall(pattern, rich_body, re.DOTALL | re.IGNORECASE)
        faqs = []
        for q_raw, a_raw in matches:
            q = re.sub(r'<[^>]+>', ' ', q_raw)
            q = re.sub(r'\s+', ' ', q).strip()
            q = q.replace('Priv\ufffd', 'Privé').replace('\ufffd', "'")

            a = re.sub(r'<[^>]+>', ' ', a_raw)
            a = re.sub(r'\s+', ' ', a).strip()
            a = a.replace('Priv\ufffd', 'Privé').replace('\ufffd', "'")
            
            if a.lower().startswith('answer:'):
                a = a[7:].strip()
            elif a.lower().startswith('answer :'):
                a = a[8:].strip()

            if len(q) > 5 and len(a) > 10:
                faqs.append({'q': q, 'a': a})

        CMSSection.objects.create(
            page=page,
            type='FaqList',
            sort_order=1,
            content_payload={
                'title': 'Frequently Asked Questions',
                'faqs': faqs
            },
            is_visible=True
        )

        # Full authentic rich text matching live perfumebooth.com layout
        CMSSection.objects.create(
            page=page,
            type='RichText',
            sort_order=2,
            content_payload={
                'title': 'FAQ',
                'body': rich_body
            },
            is_visible=True
        )

    else:
        # Standard RichText policy pages (about-us, disclaimers, privacy, shipping, refund, terms)
        CMSSection.objects.create(
            page=page,
            type='RichText',
            sort_order=1,
            content_payload={
                'title': cfg['title'],
                'body': rich_body
            },
            is_visible=True
        )

    has_logos = 'about-us-logos' in rich_body
    print(f"✓ Saved {slug:<22} -> {page.title:<24} | Length: {len(rich_body):<6} | Has Logos: {has_logos}")

from django.core.cache import cache
cache.clear()
print("\nRedis cache cleared successfully.")
print("All 8 info pages successfully populated into database!")
