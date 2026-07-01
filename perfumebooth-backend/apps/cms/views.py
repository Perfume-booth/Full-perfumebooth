"""
CMS Views — Page layout JSON endpoints consumed by Next.js
"""
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.core.cache import cache
import json

from .models import CMSPage, CMSSection
from apps.authentication.views import HasRolePermission
from apps.authentication.helpers import log_action


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

