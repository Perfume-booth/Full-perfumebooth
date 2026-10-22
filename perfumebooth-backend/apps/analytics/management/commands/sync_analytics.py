from datetime import date, timedelta
from django.core.management.base import BaseCommand, CommandError
from apps.analytics.providers import REQUIRED, sync_day


class Command(BaseCommand):
    help = 'Read-only provider fetch into idempotent local daily reporting snapshots (maximum 31 days).'

    def add_arguments(self, parser):
        parser.add_argument('provider', choices=list(REQUIRED))
        parser.add_argument('--start', required=True)
        parser.add_argument('--end', required=True)

    def handle(self, *args, **options):
        try:
            start, end = date.fromisoformat(options['start']), date.fromisoformat(options['end'])
        except ValueError:
            raise CommandError('Use YYYY-MM-DD dates.')
        if start > end or (end-start).days > 30 or end >= date.today():
            raise CommandError('Choose at most 31 days, ending before today.')
        day = start
        while day <= end:
            if not sync_day(options['provider'], day):
                raise CommandError(f'Sync failed for {day}; check credentials, permissions and API version. No partial snapshot saved.')
            self.stdout.write(f'Synced {options["provider"]} {day}')
            day += timedelta(days=1)
