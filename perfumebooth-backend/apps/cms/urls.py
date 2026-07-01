from django.urls import path
from .views import CMSPageListView, CMSPageView

urlpatterns = [
    path('pages/', CMSPageListView.as_view(), name='cms-page-list'),
    path('pages/<slug:slug>/', CMSPageView.as_view(), name='cms-page-detail'),
]
