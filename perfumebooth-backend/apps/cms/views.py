"""
CMS Views — Page layout JSON endpoints consumed by Next.js
"""
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.core.cache import cache
import json

from .models import CMSPage, CMSSection, BlogPost
from apps.authentication.views import HasRolePermission
from apps.authentication.helpers import log_action
from django.shortcuts import get_object_or_404
from django.utils.text import slugify


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
                ('HeroBanner', {'title': 'Architectural Fragrances', 'subtitle': 'Explore luxury perfumes from world-class houses.', 'buttonText': 'Shop All', 'buttonLink': '/products'}),
                ('ProductGrid', {'title': 'Trending Scents', 'limit': 4, 'categoryTag': 'Citrus'})
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
            if created and len(item) > 2:
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


