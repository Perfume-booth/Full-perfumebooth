from django.urls import path
from .notification_views import SubscribeView, RestockSubscribeView, ManageNotificationView
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
    path('newsletter/subscribe/', SubscribeView.as_view(), name='cms-newsletter-subscribe'),
    path('notifications/restock/', RestockSubscribeView.as_view(), name='cms-restock-subscribe'),
    path('notifications/manage/', ManageNotificationView.as_view(), name='cms-notification-manage'),
    path('newsletter/status/', NewsletterStatusView.as_view(), name='cms-newsletter-status'),
    path('media/', MediaAssetListView.as_view(), name='cms-media-list'),
    path('media/upload/', MediaAssetUploadView.as_view(), name='cms-media-upload'),
    path('media/<uuid:asset_id>/', MediaAssetDeleteView.as_view(), name='cms-media-delete'),
    path('media/folders/', MediaFolderCreateView.as_view(), name='cms-media-folders'),
]

