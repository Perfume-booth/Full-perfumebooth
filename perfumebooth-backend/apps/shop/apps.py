from django.apps import AppConfig


class ShopConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.shop'
    label = 'shop'
    verbose_name = 'Shop — Catalog & Inventory'

    def ready(self):
        # Connect post_save signal for embedding generation
        import apps.shop.signals  # noqa: F401
