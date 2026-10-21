import csv
import io
import re
from django.http import HttpResponse
from rest_framework import permissions
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView
from apps.authentication.views import HasRolePermission
from .report_catalog import CATALOG, report_data


def safe_cell(value):
    text = '' if value is None else str(value)
    # Keep numeric values numeric; neutralise untrusted spreadsheet formulas.
    if isinstance(value, str) and (re.match(r'^\s*[=+@-]', text) or text.startswith(('\t', '\r', '\n'))):
        return "'" + text
    return text


class ReportCatalogView(APIView):
    permission_classes = [permissions.IsAuthenticated, HasRolePermission]
    allowed_roles = ['Super Admin', 'Admin', 'E-commerce Executive']

    def get(self, request):
        return Response({'reports': CATALOG}, headers={'Cache-Control': 'private, no-store'})


class ReportDetailView(ReportCatalogView):
    def get(self, request, report_id):
        output = report_data(report_id, request.query_params)
        rows = output['rows']
        if request.query_params.get('export') == 'csv':
            if output['status'] != 'available':
                raise ValidationError(output['reason'])
            stream = io.StringIO(newline='')
            writer = csv.writer(stream, quoting=csv.QUOTE_ALL)
            for row in [[output['title']], ['Start', output['start']], ['End (exclusive)', output['end']],
                        ['Timezone', output['timezone']], ['Generated', output['generatedAt']],
                        *[[note] for note in output['notes']], [], output['columns'], *rows]:
                writer.writerow([safe_cell(value) for value in row])
            response = HttpResponse('\ufeff' + stream.getvalue(), content_type='text/csv; charset=utf-8')
            response['Content-Disposition'] = f'attachment; filename="{report_id}.csv"'
            response['Cache-Control'] = 'private, no-store'
            return response
        try:
            page = int(request.query_params.get('page', 1))
            size = int(request.query_params.get('page_size', 100))
        except (ValueError, TypeError):
            raise ValidationError('Page and page_size must be integers.')
        if page < 1 or not 1 <= size <= 200:
            raise ValidationError('Page must be positive; page_size must be 1–200.')
        output.update(total=len(rows), page=page, page_size=size, rows=rows[(page-1)*size:page*size])
        return Response(output, headers={'Cache-Control': 'private, no-store'})
