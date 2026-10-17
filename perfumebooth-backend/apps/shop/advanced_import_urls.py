from django.urls import path
from .advanced_import_views import ImportAdvancedActionView, ImportHistoryView, ImportMappingDeleteView, ImportMappingsView

urlpatterns = [
    path('mappings/', ImportMappingsView.as_view()),
    path('mappings/<int:mapping_id>/', ImportMappingDeleteView.as_view()),
    path('history/', ImportHistoryView.as_view()),
    path('<uuid:job_id>/<str:action>/', ImportAdvancedActionView.as_view()),
]
