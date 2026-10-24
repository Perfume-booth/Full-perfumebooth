"""
CMS Views — Page layout JSON endpoints consumed by Next.js
"""
import os
import re
import json
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.core.cache import cache
from django.core.mail import send_mail
from django.conf import settings
from django.shortcuts import get_object_or_404
from django.utils.text import slugify

from PIL import Image
from core.validators import validate_image_upload, validate_media_upload
from apps.shop.views import format_media_url
from .models import (
    CMSPage, CMSSection, BlogPost, ContactSubmission, NewsletterSubscriber,
    MediaFolder, MediaAsset
)
from apps.orders.models import Order
from apps.authentication.views import HasRolePermission
from apps.authentication.helpers import log_action

EMAIL_REGEX = re.compile(r'^[^\s@]+@[^\s@]+\.[^\s@]+$')


class CMSPageView(APIView):
    """
    GET, PUT, DELETE /api/cms/pages/<slug>/
    Manages individual page layouts and their component sections.
    """
    
    def get_permissions(self):
        if self.request.method == 'GET':
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated(), HasRolePermission()]

    allowed_roles = ['Super Admin', 'Admin', 'Content Manager']

    def get(self, request, slug: str):
        cache_key = f'cms:page:{slug}'
        cached = cache.get(cache_key)
        
        # Check if user is merchant to bypass draft filters
        is_merchant = request.user and request.user.is_authenticated and any(
            role in ['Super Admin', 'Admin', 'Content Manager'] 
            for role in request.user.roles.values_list('role__name', flat=True)
        )

        if cached and not is_merchant:
            return Response(cached)

        try:
            page = CMSPage.objects.prefetch_related('sections').get(slug=slug)
            if not is_merchant and not page.is_published:
                return Response({'detail': 'Page is not published.'}, status=404)
        except CMSPage.DoesNotExist:
            return Response({'detail': 'Page not found.'}, status=404)

        sections_query = page.sections.all()
        if not is_merchant:
            sections_query = sections_query.filter(is_visible=True)
            
        data = {
            'id': str(page.id),
            'title': page.title,
            'slug': page.slug,
            'meta_title': page.meta_title or page.title,
            'meta_description': page.meta_description,
            'is_published': page.is_published,
            'sections': [
                {
                    'id': str(s.id),
                    'type': s.type,
                    'sort_order': s.sort_order,
                    'content': s.content_payload,
                    'is_visible': s.is_visible,
                }
                for s in sections_query.order_by('sort_order')
            ],
        }

        if not is_merchant:
            cache.set(cache_key, data, timeout=3600)
            
        return Response(data)

    def put(self, request, slug: str):
        try:
            page = CMSPage.objects.get(slug=slug)
        except CMSPage.DoesNotExist:
            return Response({'detail': 'Page not found.'}, status=404)

        page.title = request.data.get('title', page.title)
        page.meta_title = request.data.get('meta_title', page.meta_title)
        page.meta_description = request.data.get('meta_description', page.meta_description)
        page.is_published = str(request.data.get('is_published', page.is_published)).lower() == 'true'
        page.save()

        # Update or create sections
        sections_data = request.data.get('sections', [])
        
        # Keep track of active section IDs to delete any removed ones
        active_ids = []
        
        for idx, s_data in enumerate(sections_data):
            s_id = s_data.get('id')
            s_type = s_data.get('type', 'HeroBanner')
            s_payload = s_data.get('content', {})
            s_visible = str(s_data.get('is_visible', 'true')).lower() == 'true'
            
            if s_id and not s_id.startswith('temp-'):
                try:
                    section = CMSSection.objects.get(id=s_id, page=page)
                    section.sort_order = idx
                    section.content_payload = s_payload
                    section.is_visible = s_visible
                    section.save()
                    active_ids.append(section.id)
                except CMSSection.DoesNotExist:
                    pass
            else:
                section = CMSSection.objects.create(
                    page=page,
                    type=s_type,
                    sort_order=idx,
                    content_payload=s_payload,
                    is_visible=s_visible
                )
                active_ids.append(section.id)
                
        # Delete removed sections
        page.sections.exclude(id__in=active_ids).delete()
        
        cache.clear()
        log_action(request.user, f"Updated CMS Page layout: '{page.title}' (slug: {page.slug})", request)
        return Response({'detail': 'CMS Page layout updated successfully.'})

    def delete(self, request, slug: str):
        try:
            page = CMSPage.objects.get(slug=slug)
        except CMSPage.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=404)
        page.delete()
        cache.clear()
        return Response({'detail': 'CMS Page deleted successfully.'})


class CMSPageListView(APIView):
    """GET, POST /api/cms/pages/ — List pages or create new pages."""
    
    def get_permissions(self):
        if self.request.method == 'GET':
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated(), HasRolePermission()]

    allowed_roles = ['Super Admin', 'Admin', 'Content Manager']

    def get(self, request):
        is_merchant = request.user and request.user.is_authenticated and any(
            role in ['Super Admin', 'Admin', 'Content Manager'] 
            for role in request.user.roles.values_list('role__name', flat=True)
        )
        
        # Auto-seed standard info/policy pages with exact user requested routes
        DEFAULT_PAGES = [
            ('home', 'Homepage', [
                ('HeroBanner', {
                    'title': 'Luxury Fragrances',
                    'subtitle': 'Architectural perfumes from world-class houses.',
                    'slides': [
                        {'id': 1, 'image': 'https://cdn.shopify.com/s/files/1/0718/5786/4996/files/caneza-for-web-2_jpg_4bd6dc18-fa6c-4301-afa0-a4173564f86b.jpg?v=1790659291', 'mobileImage': 'https://cdn.shopify.com/s/files/1/0718/5786/4996/files/caneza-for-web-2_jpg_4bd6dc18-fa6c-4301-afa0-a4173564f86b.jpg?v=1790659291', 'href': '/caneza', 'alt_text': 'Caneza'},
                        {'id': 2, 'image': 'https://cdn.shopify.com/s/files/1/0718/5786/4996/files/ARABIYAT_PRESTIGE.webp?v=1784546289', 'mobileImage': 'https://cdn.shopify.com/s/files/1/0718/5786/4996/files/ap.jpg?v=1778130171', 'href': '/arabiyat-prestige', 'alt_text': 'Arabiyat Prestige Premium Fragrances'},
                        {'id': 3, 'image': 'https://cdn.shopify.com/s/files/1/0718/5786/4996/files/al-haramain-banner-24001030.webp?v=17845462886', 'mobileImage': 'https://cdn.shopify.com/s/files/1/0718/5786/4996/files/al-banner.jpg?v=1778130178', 'href': '/al-haramain', 'alt_text': 'Al Haramain Exclusive Perfumes'},
                        {'id': 4, 'image': 'https://cdn.shopify.com/s/files/1/0718/5786/4996/files/otoori-website.webp?v=1784546289', 'mobileImage': 'https://cdn.shopify.com/s/files/1/0718/5786/4996/files/otoori.jpg?v=1778130173', 'href': '/otoori', 'alt_text': 'Otoori Luxury Attars and Perfumes'},
                        {'id': 5, 'image': 'https://cdn.shopify.com/s/files/1/0718/5786/4996/files/mpf-website.webp?v=1784546288', 'mobileImage': 'https://cdn.shopify.com/s/files/1/0718/5786/4996/files/mpf.jpg?v=1778130170', 'href': '/mpf', 'alt_text': 'MPF Signature Scents Collection'},
                        {'id': 6, 'image': 'https://cdn.shopify.com/s/files/1/0718/5786/4996/files/new-nb-for-web_jpg.jpg?v=1787821501', 'mobileImage': 'https://cdn.shopify.com/s/files/1/0718/5786/4996/files/new-nb-for-web_jpg.jpg?v=1787821501', 'href': '/new-nb', 'alt_text': 'New NB Signature Scents Collection'},
                        {'id': 7, 'image': 'https://cdn.shopify.com/s/files/1/0718/5786/4996/files/lomani_web.png?v=1787821500', 'mobileImage': 'https://cdn.shopify.com/s/files/1/0718/5786/4996/files/lomani_web.png?v=1787821500', 'href': '/lomani', 'alt_text': 'Lomani Signature Scents Collection'},
                        {'id': 8, 'image': 'https://cdn.shopify.com/s/files/1/0718/5786/4996/files/anfar-for-website_jpg.jpg?v=1787821501', 'mobileImage': 'https://cdn.shopify.com/s/files/1/0718/5786/4996/files/anfar-for-website_jpg.jpg?v=1787821501', 'href': '/anfar', 'alt_text': 'Anfar Signature Scents Collection'}
                    ]
                }),
                ('TopCategories', {
                    'title': 'Explore Categories',
                    'categories': [
                        {'label': 'Perfumes', 'title': 'Exclusive Perfumes', 'image': 'https://cdn.shopify.com/s/files/1/0718/5786/4996/files/perfume.png?v=1778139272', 'href': '/perfumes'},
                        {'label': 'Attars', 'title': 'Pure Attars', 'image': 'https://cdn.shopify.com/s/files/1/0718/5786/4996/files/attar.png?v=1778139272', 'href': '/attars'},
                        {'label': 'Deodorants', 'title': 'Fresh Deodorants', 'image': 'https://cdn.shopify.com/s/files/1/0718/5786/4996/files/deo_888a2919-741e-4acc-a2d1-692e69d8e819.png?v=1778139272', 'href': '/deodorants'},
                        {'label': 'Gift Sets', 'title': 'Perfect Gift Sets', 'image': 'https://cdn.shopify.com/s/files/1/0718/5786/4996/files/gift-sets.png?v=1778139271', 'href': '/gift-sets'},
                        {'label': 'Scent Shots', 'title': 'Try More Fragrances', 'image': 'https://cdn.shopify.com/s/files/1/0718/5786/4996/files/scent.png?v=1778139274', 'href': '/scent-shot'},
                        {'label': 'Body Mists', 'title': 'Refreshing Mists', 'image': 'https://cdn.shopify.com/s/files/1/0718/5786/4996/files/mist.png?v=1778139272', 'href': '/mist'}
                    ]
                }),
                ('GenderSection', {
                    'title': 'Shop By',
                    'italicPart': 'Gender',
                    'cards': [
                        {'id': 'men', 'label': 'Men', 'tagline': 'Bold. Powerful. Magnetic.', 'desktopImage': 'https://cdn.shopify.com/s/files/1/0718/5786/4996/files/FOR-MEN-1.webp?v=1784546289', 'mobileImage': 'https://cdn.shopify.com/s/files/1/0718/5786/4996/files/FOR-MEN-mobile.jpg_1.jpg?v=1782809007', 'href': '/men', 'accent': '#b8924a', 'glow': 'rgba(184,146,74,0.3)'},
                        {'id': 'women', 'label': 'Women', 'tagline': 'Graceful. Radiant. Enchanting.', 'desktopImage': 'https://cdn.shopify.com/s/files/1/0718/5786/4996/files/FOR-WOMEN-1.webp?v=1784546288', 'mobileImage': 'https://cdn.shopify.com/s/files/1/0718/5786/4996/files/FOR-WOMEN-mobile.jpg_1.jpg?v=1782809007', 'href': '/women', 'accent': '#e8a0b8', 'glow': 'rgba(232,160,184,0.3)'},
                        {'id': 'unisex', 'label': 'Unisex', 'tagline': 'Boundless. Free. Singular.', 'desktopImage': 'https://cdn.shopify.com/s/files/1/0718/5786/4996/files/FOR-UNISEX-1.webp?v=1784546288', 'mobileImage': 'https://cdn.shopify.com/s/files/1/0718/5786/4996/files/FOR-UNISEX-mobile.jpg_1.jpg?v=1782809006', 'href': '/unisex', 'accent': '#8bbfd8', 'glow': 'rgba(139,191,216,0.3)'}
                    ]
                }),
                ('VideoSection', {
                    'title': 'Signature',
                    'italicPart': 'Films',
                    'items': [
                        {'label': 'Al Haramain', 'video': 'https://cdn.shopify.com/videos/c/o/v/801c3f868981473ebdda06f0124b3e24.mp4', 'href': '/al-haramain'},
                        {'label': 'Arabiyat Prestige', 'video': 'https://cdn.shopify.com/videos/c/o/v/bf6cee54d3a54c02bacfae2f78062c59.mp4', 'href': '/arabiyat-prestige'},
                        {'label': 'Al Haramain', 'video': 'https://cdn.shopify.com/videos/c/o/v/68e9382119d848c9a6324a3d5c6f45ce.mp4', 'href': '/al-haramain'},
                        {'label': 'Arabiyat Prestige', 'video': 'https://cdn.shopify.com/videos/c/o/v/9c0ff88aa047479588b8972589ab061b.mp4', 'href': '/products/arabiyat-prestige-bahiya-garnet-edp-100ml-unisex'},
                        {'label': 'Lomani', 'video': 'https://cdn.shopify.com/videos/c/o/v/f3503e6be44e427cb6966f4e31fa2b2e.mp4', 'href': '/lomani'},
                        {'label': 'Arabiyat Prestige', 'video': 'https://cdn.shopify.com/videos/c/o/v/3e8d7db2fa484d6c9c659c78cdabb230.mp4', 'href': '/arabiyat-prestige'},
                        {'label': 'Al-Haramain', 'video': 'https://cdn.shopify.com/videos/c/o/v/490d9ea75336470f8bddb06d558076d6.mp4', 'href': '/al-haramain'},
                        {'label': 'MPF', 'video': 'https://cdn.shopify.com/videos/c/o/v/28aee50ee417466ea254e2683ba9123a.mp4', 'href': '/mpf'}
                    ]
                }),
                ('NewLaunches', {
                    'title': 'New',
                    'italicPart': 'Arrivals',
                    'viewAllLink': '/collections/new-launches'
                }),
                ('ScentGrid', {
                    'title': 'Explore By',
                    'italicPart': 'Notes',
                    'items': [
                        {'label': 'Oud', 'mood': 'Deep, Mystical, Regal', 'image': 'https://cdn.shopify.com/s/files/1/0718/5786/4996/files/woody.webp?v=1784546288', 'href': '/oud'},
                        {'label': 'Floral', 'mood': 'Elegant, Blooming, Romantic', 'image': 'https://cdn.shopify.com/s/files/1/0718/5786/4996/files/floral.webp?v=1784546289', 'href': '/floral'},
                        {'label': 'Citrus', 'mood': 'Zesty, Energetic, Bright', 'image': 'https://cdn.shopify.com/s/files/1/0718/5786/4996/files/fresh-citrus.webp?v=1784546288', 'href': '/citrus'},
                        {'label': 'Woody', 'mood': 'Earthy, Grounded, Warm', 'image': 'https://cdn.shopify.com/s/files/1/0718/5786/4996/files/earthy-woody.webp?v=1784546291', 'href': '/woody'},
                        {'label': 'Aquatic', 'mood': 'Cool, Serene, Breathless', 'image': 'https://cdn.shopify.com/s/files/1/0718/5786/4996/files/aquatic_1.webp?v=1784546289', 'href': '/aquatic'},
                        {'label': 'Spicy', 'mood': 'Bold, Intriguing, Fiery', 'image': 'https://cdn.shopify.com/s/files/1/0718/5786/4996/files/spicy_1.webp?v=1784546289', 'href': '/spicy'},
                        {'label': 'Oriental', 'mood': 'Exotic, Rich, Enchanting', 'image': 'https://cdn.shopify.com/s/files/1/0718/5786/4996/files/oriental_1.webp?v=1784546289', 'href': '/oriental'},
                        {'label': 'Fresh', 'mood': 'Clean, Crisp, Vital', 'image': 'https://cdn.shopify.com/s/files/1/0718/5786/4996/files/fresh.webp?v=1784546288', 'href': '/fresh'}
                    ]
                }),
                ('TrendingSection', {
                    'title': 'Trending',
                    'italicPart': 'Perfumes',
                    'viewAllLink': '/trending-perfumes',
                    'collectionHandle': 'trending-perfumes'
                }),
                ('BestSellerSection', {
                    'title': 'Our',
                    'italicPart': 'Best Sellers',
                    'viewAllLink': '/best-selling-perfumes',
                    'collectionHandle': 'best-selling-perfumes'
                }),
                ('RecentlyViewed', {
                    'title': 'Recently',
                    'italicPart': 'Viewed'
                }),
                ('BrandSlider', {
                    'title': 'Global',
                    'italicPart': 'Brands',
                    'brands': [
                        {'name': 'Otoori', 'logo': 'https://cdn.shopify.com/s/files/1/0718/5786/4996/files/otoori-logo-beverly-web.jpg?v=1787650165', 'href': '/otoori'},
                        {'name': 'New NB', 'logo': 'https://cdn.shopify.com/s/files/1/0718/5786/4996/files/new-nb-logo-beverly-web.jpg?v=1787650165', 'href': '/new-nb'},
                        {'name': 'Lomani', 'logo': 'https://cdn.shopify.com/s/files/1/0718/5786/4996/files/lomani-logo-beverly-web.jpg?v=1787650165', 'href': '/lomani'},
                        {'name': 'MPF', 'logo': 'https://cdn.shopify.com/s/files/1/0718/5786/4996/files/mpf-logo-beverly-web.jpg?v=1787650165', 'href': '/mpf'},
                        {'name': 'Arabiyat Prestige', 'logo': 'https://cdn.shopify.com/s/files/1/0718/5786/4996/files/arabiyat-prestige-logo-beverly-web.jpg?v=1787650165', 'href': '/arabiyat-prestige'},
                        {'name': 'Al Haramain', 'logo': 'https://cdn.shopify.com/s/files/1/0718/5786/4996/files/al-haramain-logo-beverly-web.jpg?v=1787650166', 'href': '/al-haramain'},
                        {'name': 'Anfar', 'logo': 'https://cdn.shopify.com/s/files/1/0718/5786/4996/files/anfar-logo-beverly-web.jpg?v=1787650165', 'href': '/anfar'},
                        {'name': 'Caneza', 'logo': 'https://cdn.shopify.com/s/files/1/0718/5786/4996/files/caneza-logo-beverly-web.jpg?v=1787650165', 'href': '/caneza'},
                        {'name': 'Al Wataniyah', 'logo': 'https://cdn.shopify.com/s/files/1/0718/5786/4996/files/an-wataniah-logo-beverly-web.jpg?v=1787650166', 'href': '/al-watania'}
                    ]
                }),
                ('BlogSection', {
                    'title': 'The PerfumeBooth Journal',
                    'limit': 4
                }),
                ('InstagramFeed', {
                    'title': 'Follow Us On',
                    'italicPart': 'Instagram',
                    'viewAllLink': 'https://www.instagram.com/perfumeboothindia/',
                    'posts': [
                        {'id': 'ig-1', 'image': 'https://cdn.shopify.com/s/files/1/0718/5786/4996/files/1_937d780d-e810-458e-959a-db88b913959b.webp?v=1778479565', 'alt': 'Exclusive woody fragrance notes', 'link': 'https://www.instagram.com/p/CjK2gGnPStj/'},
                        {'id': 'ig-3', 'image': 'https://cdn.shopify.com/s/files/1/0718/5786/4996/files/16.webp?v=1778479565', 'alt': 'Bright citrus perfume vibes', 'link': 'https://www.instagram.com/p/Bzc9V8wB8sX/'},
                        {'id': 'ig-4', 'image': 'https://cdn.shopify.com/s/files/1/0718/5786/4996/files/15.webp?v=1778479566', 'alt': 'Grounded earthy woody notes', 'link': 'https://www.instagram.com/p/B2-7YyYFKpG/'},
                        {'id': 'ig-5', 'image': 'https://cdn.shopify.com/s/files/1/0718/5786/4996/files/2_24d003cb-398d-4149-bfaa-626d30dc7dfc.webp?v=1778479565', 'alt': 'Cool aquatic fragrance lifestyle', 'link': 'https://www.instagram.com/p/CZ8uCIJlK7z/'},
                        {'id': 'ig-6', 'image': 'https://cdn.shopify.com/s/files/1/0718/5786/4996/files/17.webp?v=1778479565', 'alt': 'Bold and intriguing spicy scents', 'link': 'https://www.instagram.com/perfumeboothindia/'},
                        {'id': 'ig-7', 'image': 'https://cdn.shopify.com/s/files/1/0718/5786/4996/files/New_NB_Red_A_Premium_Quality_Perfume_WithFragrance-_Lemon_Rose_Orange_Blossom_Amber_Wood.webp?v=1782801488', 'alt': 'Bold and intriguing spicy scents', 'link': 'https://www.instagram.com/p/CfVzjYxlesn/'}
                    ]
                })
            ]),
            ('men', 'Men\'s Fragrances', [
                ('HeroBanner', {'title': 'Bold & Masculine Fragrances', 'subtitle': 'Discover woody, spicy, and oriental perfumes designed for impact.', 'buttonText': 'Explore Collection', 'buttonLink': '/products'})
            ]),
            ('women', 'Women\'s Fragrances', [
                ('HeroBanner', {'title': 'Elegant & Floral Fragrances', 'subtitle': 'Immerse yourself in opulent floral and sweet gourmet accords.', 'buttonText': 'Explore Collection', 'buttonLink': '/products'})
            ]),
            ('blog', 'Blog', [
                ('HeroBanner', {'title': 'The PerfumeBooth Journal', 'subtitle': 'Insiders guide to notes, longevity, and niche perfumery.'}),
                ('RichText', {'title': 'Guide to Fragrance Concentration: EDP vs Extrait', 'body': 'Understanding fragrance concentration is key to choosing your signature scent.\n\nExtrait de Parfum features a 20-40% oil concentration providing 12+ hours of sillage, making it the most opulent choice for fragrance lovers.'})
            ]),
            ('info/about-us', 'About Us', [
                ('HeroBanner', {'title': 'Our Scent Heritage', 'subtitle': 'Crafting unforgettable olfactory experiences since 2018.'}),
                ('RichText', {'title': 'The PerfumeBooth Story', 'body': 'PerfumeBooth was founded on a singular vision: to bring authentic, high-concentration luxury fragrances directly to connoisseurs.\n\nWe collaborate exclusively with master perfumers across Dubai, Paris, and Grasse to curate fragrances that make an unforgettable impression.'})
            ]),
            ('info/contact-us', 'Contact Us', [
                ('HeroBanner', {'title': "We're Here For You", 'subtitle': 'Elevate your senses. Our bespoke service team awaits.'}),
                ('ContactCard', {'email': 'admin@perfumebooth.com', 'phone': '+91 9266030909 / 011-46604937', 'hours': 'Mon to Sat, 10am to 6pm', 'address': '70B/35A, 3rd Floor, Rama Road Industrial Area, New Delhi – 110015'}),
                ('RichText', {'title': 'Send Us A Message', 'body': 'Fill out your inquiries and one of our dedicated fragrance specialists will be in touch shortly.'})
            ]),
            ('info/disclaimers', 'Disclaimers', [
                ('RichText', {'title': 'Product & Legal Disclaimers', 'body': '1. Authenticity: All products sold on PerfumeBooth are 100% genuine and sourced directly from verified brand manufacturers.\n\n2. Product Imagery: Bottle designs and packaging colors may slightly vary due to manufacturer batch updates.\n\n3. Sensitivity Test: We recommend performing a patch test prior to applying perfume directly to skin.'})
            ]),
            ('info/policies/privacy', 'Privacy Policy', [
                ('RichText', {'title': 'Privacy Policy & Data Protection', 'body': 'Your privacy is paramount at PerfumeBooth.\n\n1. Information Collection: We collect essential shipping and contact details solely to fulfill your orders and provide real-time tracking updates.\n\n2. Security: All transaction credentials are processed using SSL 256-bit encryption compliant with PCI-DSS standards. We never store raw credit card numbers.\n\n3. Third Parties: We do not sell or rent customer data to any third-party advertisers.'})
            ]),
            ('info/policies/shipping', 'Shipping Policy', [
                ('RichText', {'title': 'Express Shipping & Delivery', 'body': 'We dispatch all orders within 24 business hours using premium air express logistics partners.\n\n- Standard Delivery: 3-5 business days across India.\n- Dispatch Notification: You will receive SMS and email tracking links upon dispatch.\n- Tamper-Evident Packaging: All perfumes are shipped in shock-resistant protective casing.'})
            ]),
            ('info/policies/refund', 'Refund and Return Policy', [
                ('RichText', {'title': 'Return & Replacement Guarantee', 'body': 'We offer a 7-day hassle-free replacement guarantee for damaged or defective shipments.\n\nDue to hygiene standards for personal fragrance products, opened bottles cannot be returned unless verified damaged during transit.'})
            ]),
            ('info/policies/terms', 'Terms and Conditions', [
                ('RichText', {'title': 'Terms of Service', 'body': 'Welcome to PerfumeBooth. By accessing or purchasing from our platform, you agree to these terms.\n\nAll brand names, bottle designs, and fragrance formulas displayed are the intellectual property of their respective manufacturer houses.\n\nOrders are subject to availability and verification.'})
            ]),
            ('info/faq', 'FAQ', [
                ('FaqList', {'title': 'Frequently Asked Questions', 'faqs': [
                    {'q': 'Are all perfumes 100% authentic?', 'a': 'Yes, all products are directly imported from authorized brand distributors and guaranteed 100% genuine.'},
                    {'q': 'How can I track my order?', 'a': 'Once your order is shipped, you will receive an SMS and email with live tracking details.'},
                    {'q': 'What payment methods do you accept?', 'a': 'We accept UPI, Credit/Debit cards, Net Banking, Wallet payments, and Cash on Delivery (COD).'}
                ]})
            ])
        ]
        for item in DEFAULT_PAGES:
            slug, title = item[0], item[1]
            page, created = CMSPage.objects.get_or_create(slug=slug, defaults={'title': title, 'meta_title': title, 'is_published': True})
            if (created or (slug == 'home' and page.sections.count() < 12)) and len(item) > 2:
                if slug == 'home':
                    page.sections.all().delete()
                for idx, (sec_type, payload) in enumerate(item[2]):
                    CMSSection.objects.create(page=page, type=sec_type, sort_order=idx, content_payload=payload, is_visible=True)

        pages_query = CMSPage.objects.all()
        if not is_merchant:
            pages_query = pages_query.filter(is_published=True)
            
        pages = pages_query.values(
            'id', 'slug', 'title', 'meta_title', 'is_published', 'published_at'
        )
        return Response(list(pages))

    def post(self, request):
        title = request.data.get('title')
        slug = request.data.get('slug')
        meta_title = request.data.get('meta_title', title)
        meta_description = request.data.get('meta_description', '')
        
        if CMSPage.objects.filter(slug=slug).exists():
            return Response({'detail': 'A page with this slug already exists.'}, status=400)
            
        page = CMSPage.objects.create(
            title=title,
            slug=slug,
            meta_title=meta_title,
            meta_description=meta_description,
            is_published=False
        )
        
        cache.clear()
        return Response({
            'id': str(page.id),
            'slug': page.slug,
            'detail': 'CMS Page created successfully.'
        }, status=status.HTTP_201_CREATED)


class BlogPostListView(APIView):
    """
    GET  /api/cms/blogs/       -> List blog articles
    POST /api/cms/blogs/       -> Create blog article
    """
    def get_permissions(self):
        if self.request.method == 'GET':
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated(), HasRolePermission()]

    allowed_roles = ['Super Admin', 'Admin', 'Content Manager']

    def get(self, request):
        is_merchant = request.user and request.user.is_authenticated and any(
            role in ['Super Admin', 'Admin', 'Content Manager'] 
            for role in request.user.roles.values_list('role__name', flat=True)
        )
        queryset = BlogPost.objects.all()
        if not is_merchant:
            queryset = queryset.filter(is_published=True)
            
        posts = list(queryset.values(
            'id', 'title', 'slug', 'author', 'cover_image',
            'excerpt', 'content_html', 'tags', 'read_time',
            'is_published', 'published_at', 'updated_at'
        ))
        return Response(posts)

    def post(self, request):
        data = request.data
        title = data.get('title', 'Untitled Scent Journal')
        slug = data.get('slug')
        if not slug and title:
            slug = slugify(title)

        if BlogPost.objects.filter(slug=slug).exists():
            return Response({'detail': 'A blog post with this slug already exists.'}, status=400)

        post = BlogPost.objects.create(
            title=title,
            slug=slug,
            author=data.get('author', 'PerfumeBooth Editorial'),
            cover_image=data.get('cover_image', ''),
            excerpt=data.get('excerpt', ''),
            content_html=data.get('content_html', ''),
            tags=data.get('tags', []),
            read_time=data.get('read_time', '5 min read'),
            is_published=data.get('is_published', True)
        )
        cache.clear()
        log_action(request.user, f"Created Blog Article: '{post.title}'", request)
        return Response({
            'id': str(post.id),
            'slug': post.slug,
            'detail': 'Blog article created successfully.'
        }, status=status.HTTP_201_CREATED)


class BlogPostDetailView(APIView):
    """
    GET    /api/cms/blogs/<slug_or_id>/ -> Retrieve post detail
    PUT    /api/cms/blogs/<slug_or_id>/ -> Update post
    DELETE /api/cms/blogs/<slug_or_id>/ -> Delete post
    """
    def get_permissions(self):
        if self.request.method == 'GET':
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated(), HasRolePermission()]

    allowed_roles = ['Super Admin', 'Admin', 'Content Manager']

    def _get_post(self, slug_or_id):
        try:
            return BlogPost.objects.get(id=slug_or_id)
        except Exception:
            return get_object_or_404(BlogPost, slug=slug_or_id)

    def get(self, request, slug_or_id):
        post = self._get_post(slug_or_id)
        is_merchant = request.user and request.user.is_authenticated and any(
            role in ['Super Admin', 'Admin', 'Content Manager'] 
            for role in request.user.roles.values_list('role__name', flat=True)
        )
        if not is_merchant and not post.is_published:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

        return Response({
            'id': str(post.id),
            'title': post.title,
            'slug': post.slug,
            'author': post.author,
            'cover_image': post.cover_image,
            'excerpt': post.excerpt,
            'content_html': post.content_html,
            'tags': post.tags,
            'read_time': post.read_time,
            'is_published': post.is_published,
            'published_at': post.published_at,
            'updated_at': post.updated_at
        })

    def put(self, request, slug_or_id):
        post = self._get_post(slug_or_id)
        data = request.data
        post.title = data.get('title', post.title)
        if 'slug' in data and data['slug']:
            post.slug = data['slug']
        post.author = data.get('author', post.author)
        post.cover_image = data.get('cover_image', post.cover_image)
        post.excerpt = data.get('excerpt', post.excerpt)
        post.content_html = data.get('content_html', post.content_html)
        post.tags = data.get('tags', post.tags)
        post.read_time = data.get('read_time', post.read_time)
        if 'is_published' in data:
            post.is_published = data['is_published']
        post.save()
        cache.clear()
        log_action(request.user, f"Updated Blog Article: '{post.title}'", request)
        return Response({'detail': 'Blog article updated successfully.'})

    def delete(self, request, slug_or_id):
        post = self._get_post(slug_or_id)
        title = post.title
        post.delete()
        cache.clear()
        log_action(request.user, f"Deleted Blog Article: '{title}'", request)
        return Response({'detail': 'Blog article deleted successfully.'})


class ContactSubmissionCreateView(APIView):
    """
    POST /api/cms/contact/
    Durable ingestion of contact form submissions into PostgreSQL.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        name = (request.data.get('name') or '').strip()
        email = (request.data.get('email') or '').strip()
        phone = (request.data.get('phone') or '').strip()
        subject = (request.data.get('subject') or 'General Inquiry').strip()
        message = (request.data.get('message') or '').strip()

        if not name or not email or not message:
            return Response(
                {'detail': 'Name, email, and message are required fields.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not EMAIL_REGEX.match(email):
            return Response(
                {'detail': 'Please enter a valid email address.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Get client IP
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0].strip()
        else:
            ip = request.META.get('REMOTE_ADDR')

        submission = ContactSubmission.objects.create(
            name=name,
            email=email,
            phone=phone,
            subject=subject,
            message=message,
            ip_address=ip or None,
            status=ContactSubmission.Status.PENDING
        )

        # Send alert email if configured (fail-safe so DB persistence is never lost)
        try:
            recipient = getattr(settings, 'CONTACT_RECIPIENT_EMAIL', 'online@beverly-in.com')
            send_mail(
                subject=f"New Contact Inquiry from {name}: {subject}",
                message=f"Name: {name}\nEmail: {email}\nPhone: {phone or 'Not provided'}\n\nMessage:\n{message}",
                from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'PerfumeBooth <onboarding@resend.dev>'),
                recipient_list=[recipient],
                fail_silently=True,
            )
        except Exception:
            pass

        return Response({
            'success': True,
            'message': 'Inquiry submitted successfully.',
            'id': str(submission.id)
        }, status=status.HTTP_201_CREATED)


class NewsletterSubscribeView(APIView):
    """
    POST /api/cms/newsletter/subscribe/
    Persist newsletter subscribers to PostgreSQL.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = (request.data.get('email') or '').strip().lower()
        source = (request.data.get('source') or 'website_footer').strip()

        if not email or not EMAIL_REGEX.match(email):
            return Response(
                {'error': 'Please enter a valid email address.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        subscriber, created = NewsletterSubscriber.objects.update_or_create(
            email=email,
            defaults={'is_active': True, 'source': source}
        )

        return Response({
            'success': True,
            'message': 'Subscribed successfully',
            'created': created
        }, status=status.HTTP_200_OK)


class NewsletterStatusView(APIView):
    """
    GET /api/cms/newsletter/status/?email=...
    Check if an email is subscribed and whether they have placed orders.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        # Do not expose subscription or purchase history for arbitrary email addresses.
        email = request.user.email.strip().lower() if request.user.is_authenticated else ''

        if not email:
            return Response({
                'isSubscribed': False,
                'hasOrders': False,
                'success': True
            })

        is_sub = NewsletterSubscriber.objects.filter(email=email, is_active=True).exists()
        has_orders = Order.objects.filter(customer_email__iexact=email).exists()
        if not has_orders and request.user and request.user.is_authenticated and request.user.email.lower() == email:
            has_orders = request.user.orders.exists()

        return Response({
            'isSubscribed': is_sub,
            'hasOrders': has_orders,
            'success': True
        })


class MediaAssetListView(APIView):
    """
    GET /api/cms/media/
    Lists media assets with filtering by folder and search term,
    along with folder directory metrics for Filament-style media browsing.
    """
    def get_permissions(self):
        return [permissions.IsAuthenticated(), HasRolePermission()]

    allowed_roles = ['Super Admin', 'Admin', 'Content Manager']

    def get(self, request):
        folder = request.query_params.get('folder', 'all').strip()
        search = request.query_params.get('search', '').strip()

        qs = MediaAsset.objects.all()
        if folder and folder != 'all':
            qs = qs.filter(folder=folder)
        if search:
            qs = qs.filter(name__icontains=search)

        assets = []
        for asset in qs[:200]:
            url = format_media_url(asset.file.url if asset.file else None, request)
            assets.append({
                'id': str(asset.id),
                'name': asset.name,
                'folder': asset.folder,
                'url': url,
                'file_type': asset.file_type,
                'file_size': asset.file_size,
                'width': asset.width,
                'height': asset.height,
                'alt_text': asset.alt_text,
                'created_at': asset.created_at.isoformat() if asset.created_at else None,
            })

        # Calculate counts per folder
        from django.db.models import Count
        folder_counts = dict(
            MediaAsset.objects.values('folder').annotate(c=Count('id')).values_list('folder', 'c')
        )
        total_count = MediaAsset.objects.count()

        # System default folders
        system_folders = [
            {'name': 'All Files', 'slug': 'all', 'count': total_count},
            {'name': 'Banners & Hero', 'slug': 'banners', 'count': folder_counts.get('banners', 0)},
            {'name': 'Videos & Reels', 'slug': 'videos', 'count': folder_counts.get('videos', 0)},
            {'name': 'Homepage Sections', 'slug': 'homepage', 'count': folder_counts.get('homepage', 0)},
            {'name': 'Categories', 'slug': 'categories', 'count': folder_counts.get('categories', 0)},
            {'name': 'Brand Logos', 'slug': 'brands', 'count': folder_counts.get('brands', 0)},
            {'name': 'Gender Showcase', 'slug': 'gender', 'count': folder_counts.get('gender', 0)},
            {'name': 'Scent Notes', 'slug': 'scent', 'count': folder_counts.get('scent', 0)},
            {'name': 'Instagram & Social', 'slug': 'instagram', 'count': folder_counts.get('instagram', 0)},
            {'name': 'Info & Policy Pages', 'slug': 'info', 'count': folder_counts.get('info', 0)},
            {'name': 'General Uploads', 'slug': 'general', 'count': folder_counts.get('general', 0)},
        ]

        # Add custom folders
        custom_folders = MediaFolder.objects.all()
        seen_slugs = {f['slug'] for f in system_folders}
        for cf in custom_folders:
            if cf.slug not in seen_slugs:
                system_folders.append({
                    'name': cf.name,
                    'slug': cf.slug,
                    'count': folder_counts.get(cf.slug, 0)
                })
                seen_slugs.add(cf.slug)

        return Response({
            'assets': assets,
            'folders': system_folders,
            'total': total_count,
            'selected_folder': folder
        })


class MediaAssetUploadView(APIView):
    """
    POST /api/cms/media/upload/
    Multipart file upload endpoint supporting single or multi-media drops (images & streaming videos).
    Validates with validate_media_upload, parses dimensions for images, and returns asset URLs.
    """
    def get_permissions(self):
        return [permissions.IsAuthenticated(), HasRolePermission()]

    allowed_roles = ['Super Admin', 'Admin', 'Content Manager']

    def post(self, request):
        folder = request.data.get('folder', 'general').strip() or 'general'
        alt_text = request.data.get('alt_text', '').strip()

        # Support multi-file 'files' or single 'file'
        files = request.FILES.getlist('files')
        if not files:
            single = request.FILES.get('file')
            if single:
                files = [single]

        if not files:
            return Response({'error': 'No file was uploaded.'}, status=status.HTTP_400_BAD_REQUEST)

        uploaded_assets = []
        for f in files:
            try:
                media_kind = validate_media_upload(f)
            except Exception as e:
                return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

            width = None
            height = None
            ext = os.path.splitext(f.name)[1].lower()
            if media_kind == 'image':
                try:
                    f.seek(0)
                    with Image.open(f) as img:
                        width, height = img.size
                    f.seek(0)
                except Exception:
                    pass
                file_type = getattr(f, 'content_type', 'image/jpeg') or 'image/jpeg'
            else:
                content_type_map = {
                    '.mp4': 'video/mp4',
                    '.webm': 'video/webm',
                    '.mov': 'video/quicktime',
                    '.m4v': 'video/mp4',
                }
                file_type = getattr(f, 'content_type', '') or content_type_map.get(ext, 'video/mp4')

            asset = MediaAsset.objects.create(
                file=f,
                name=f.name,
                folder=folder,
                file_type=file_type,
                file_size=f.size,
                width=width,
                height=height,
                alt_text=alt_text or f.name
            )

            if folder not in ['all', 'banners', 'videos', 'homepage', 'categories', 'brands', 'gender', 'scent', 'instagram', 'info', 'general']:
                MediaFolder.objects.get_or_create(slug=folder, defaults={'name': folder.replace('-', ' ').title()})

            url = format_media_url(asset.file.url, request)
            uploaded_assets.append({
                'id': str(asset.id),
                'name': asset.name,
                'folder': asset.folder,
                'url': url,
                'file_type': asset.file_type,
                'file_size': asset.file_size,
                'width': asset.width,
                'height': asset.height,
                'alt_text': asset.alt_text,
                'created_at': asset.created_at.isoformat(),
            })

        log_action(
            request.user,
            f"Uploaded {len(uploaded_assets)} media asset(s) to folder '{folder}'",
            request
        )

        return Response({
            'success': True,
            'assets': uploaded_assets,
            'first_url': uploaded_assets[0]['url'] if uploaded_assets else None
        }, status=status.HTTP_201_CREATED)


class MediaAssetDeleteView(APIView):
    """
    DELETE /api/cms/media/<uuid:asset_id>/
    Removes media file and record.
    """
    def get_permissions(self):
        return [permissions.IsAuthenticated(), HasRolePermission()]

    allowed_roles = ['Super Admin', 'Admin', 'Content Manager']

    def delete(self, request, asset_id):
        asset = get_object_or_404(MediaAsset, id=asset_id)
        file_name = asset.name
        if asset.file:
            try:
                asset.file.delete(save=False)
            except Exception:
                pass
        asset.delete()

        log_action(request.user, f"Deleted media asset {file_name}", request)

        return Response({'success': True, 'detail': 'Media asset deleted successfully.'})


class MediaFolderCreateView(APIView):
    """
    POST /api/cms/media/folders/
    Allows merchants to create new custom folders.
    """
    def get_permissions(self):
        return [permissions.IsAuthenticated(), HasRolePermission()]

    allowed_roles = ['Super Admin', 'Admin', 'Content Manager']

    def post(self, request):
        name = request.data.get('name', '').strip()
        if not name:
            return Response({'error': 'Folder name is required.'}, status=status.HTTP_400_BAD_REQUEST)
        slug = slugify(name)
        folder, created = MediaFolder.objects.get_or_create(slug=slug, defaults={'name': name})
        return Response({
            'success': True,
            'folder': {'id': str(folder.id), 'name': folder.name, 'slug': folder.slug, 'created': created}
        })


