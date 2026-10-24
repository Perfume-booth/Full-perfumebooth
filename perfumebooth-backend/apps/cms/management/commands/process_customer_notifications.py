from django.core.management.base import BaseCommand
from apps.cms.notifications import process_notifications


class Command(BaseCommand):
    help = 'Send pending confirmation/restock emails once (requires notification delivery enabled).'

    def handle(self, *args, **options):
        self.stdout.write(f'Sent {process_notifications()} email(s).')
