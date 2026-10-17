from django.shortcuts import get_object_or_404
from django.db.models import BooleanField, Case, Value, When
from rest_framework import permissions
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.authentication.views import HasRolePermission
from .advanced_imports import cancel_schedule, schedule_import, undo_import, validate_mapping
from .models import ImportMapping, ProductImportJob


class ImportStaffView(APIView):
    permission_classes = [permissions.IsAuthenticated, HasRolePermission]
    allowed_roles = ['Super Admin', 'Admin', 'E-commerce Executive']


class ImportMappingsView(ImportStaffView):
    def get(self, request):
        from .product_imports import HEADER_MAP
        return Response({'mappings': list(ImportMapping.objects.filter(owner=request.user).order_by('name').values('id', 'name', 'columns')),
                         'fields': sorted(set(HEADER_MAP.values()))})

    def post(self, request):
        name = request.data.get('name')
        if not isinstance(name, str) or not name.strip() or len(name.strip()) > 100:
            return Response({'detail': 'Enter a mapping name of 1–100 characters.'}, status=400)
        try:
            columns = validate_mapping(request.data.get('columns'))
        except (ValueError, TypeError) as exc:
            return Response({'detail': str(exc)}, status=400)
        mapping, _ = ImportMapping.objects.update_or_create(owner=request.user, name=name.strip(), defaults={'columns': columns})
        return Response({'id': mapping.id, 'name': mapping.name, 'columns': mapping.columns})


class ImportMappingDeleteView(ImportStaffView):
    def delete(self, request, mapping_id):
        get_object_or_404(ImportMapping, pk=mapping_id, owner=request.user).delete()
        return Response(status=204)


class ImportHistoryView(ImportStaffView):
    def get(self, request):
        # History needs metadata, not 50 complete workbook previews/snapshots.
        jobs = ProductImportJob.objects.filter(created_by=request.user).annotate(
            has_snapshot=Case(When(snapshot={}, then=Value(False)), default=Value(True), output_field=BooleanField()),
        ).order_by('-created_at').values('id', 'filename', 'status', 'schedule_state', 'scheduled_at', 'sale_ends_at', 'undone_at', 'error_message', 'has_snapshot')[:50]
        result = []
        for item in jobs:
            item['job_id'] = str(item.pop('id'))
            item['can_undo'] = item.pop('has_snapshot') and item['status'] == 'applied' and not item['undone_at']
            result.append(item)
        return Response({'jobs': result})


class ImportAdvancedActionView(ImportStaffView):
    def post(self, request, job_id, action):
        from .views import _catalog_import_payload
        try:
            if action == 'undo':
                job = undo_import(job_id, request.user)
            elif action == 'schedule':
                job = schedule_import(job_id, request.user, request.data.get('starts_at'), request.data.get('ends_at'))
            elif action == 'cancel-schedule':
                job = cancel_schedule(job_id, request.user)
            else:
                return Response({'detail': 'Unknown action.'}, status=404)
        except ProductImportJob.DoesNotExist:
            return Response({'detail': 'Import not found.'}, status=404)
        except PermissionError as exc:
            return Response({'detail': str(exc)}, status=403)
        except ValueError as exc:
            return Response({'detail': str(exc)}, status=409)
        return Response(_catalog_import_payload(job))
