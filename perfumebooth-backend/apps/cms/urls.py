from django.urls import path
from .views import CMSPageListView, CMSPageView, BlogPostListView, BlogPostDetailView

urlpatterns = [
    path('pages/', CMSPageListView.as_view(), name='cms-page-list'),
    path('pages/<path:slug>/', CMSPageView.as_view(), name='cms-page-detail'),
    path('blogs/', BlogPostListView.as_view(), name='cms-blog-list'),
    path('blogs/<path:slug_or_id>/', BlogPostDetailView.as_view(), name='cms-blog-detail'),
]

