from django.urls import path
from .views import (
    CMSPageListView, CMSPageView, BlogPostListView, BlogPostDetailView,
    ContactSubmissionCreateView, NewsletterSubscribeView, NewsletterStatusView,
    MediaAssetListView, MediaAssetUploadView, MediaAssetDeleteView, MediaFolderCreateView
)

urlpatterns = [
    path('pages/', CMSPageListView.as_view(), name='cms-page-list'),
    path('pages/<path:slug>/', CMSPageView.as_view(), name='cms-page-detail'),
    path('blogs/', BlogPostListView.as_view(), name='cms-blog-list'),
    path('blogs/<path:slug_or_id>/', BlogPostDetailView.as_view(), name='cms-blog-detail'),
    path('contact/', ContactSubmissionCreateView.as_view(), name='cms-contact-submit'),
    path('newsletter/subscribe/', NewsletterSubscribeView.as_view(), name='cms-newsletter-subscribe'),
    path('newsletter/status/', NewsletterStatusView.as_view(), name='cms-newsletter-status'),
    path('media/', MediaAssetListView.as_view(), name='cms-media-list'),
    path('media/upload/', MediaAssetUploadView.as_view(), name='cms-media-upload'),
    path('media/<uuid:asset_id>/', MediaAssetDeleteView.as_view(), name='cms-media-delete'),
    path('media/folders/', MediaFolderCreateView.as_view(), name='cms-media-folders'),
]

