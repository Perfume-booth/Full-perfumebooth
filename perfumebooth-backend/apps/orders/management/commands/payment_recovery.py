from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from apps.orders.models import PaymentAttempt, PaymentOutbox
from apps.orders.payments import reconcile, bind_provider, gateway


class Command(BaseCommand):
    help = 'Inspect/reconcile a payment attempt or resolve an ambiguous outbox delivery.'

    def add_arguments(self, parser):
        parser.add_argument('--attempt', type=int)
        parser.add_argument('--gateway-order', help='Bind a verified existing provider order (also supports legacy pending orders).')
        parser.add_argument('--order', help='Internal order UUID for an existing legacy order; use with --gateway-order.')
        parser.add_argument('--outbox', type=int)
        parser.add_argument('--resolution', choices=['delivered', 'retry'])
        parser.add_argument('--confirmed-provider-state', action='store_true')

    def handle(self, *args, **options):
        if options['order']:
            if not options['gateway_order'] or options['attempt'] or options['outbox']:
                raise CommandError('--order requires --gateway-order and cannot be combined with other targets.')
            from apps.orders.models import Order
            order = Order.objects.get(pk=options['order'])
            attempt, _ = PaymentAttempt.objects.get_or_create(order=order)
            options['attempt'] = attempt.pk
        if options['attempt']:
            attempt = PaymentAttempt.objects.select_related('order').get(pk=options['attempt'])
            if options['gateway_order']:
                import re
                if not re.fullmatch(r'order_[A-Za-z0-9]+', options['gateway_order']):
                    raise CommandError('Invalid gateway order ID.')
                bind_provider(attempt.pk, gateway('GET', 'orders/' + options['gateway_order']))
                attempt.refresh_from_db()
            reconcile(attempt)
            attempt.refresh_from_db()
            self.stdout.write(f'Attempt {attempt.pk}: {attempt.status}; {attempt.last_error}')
        elif options['outbox']:
            with transaction.atomic():
                entry = PaymentOutbox.objects.select_for_update().get(pk=options['outbox'])
                if options['resolution']:
                    if not options['confirmed_provider_state'] or entry.status != 'review':
                        raise CommandError('Resolution requires review status and --confirmed-provider-state after checking the provider.')
                    entry.status = 'done' if options['resolution'] == 'delivered' else 'pending'
                    entry.last_error = 'Operator confirmed provider state'
                    entry.save()
                self.stdout.write(f'Outbox {entry.pk}: {entry.kind}, {entry.status}; {entry.last_error}')
        else:
            for attempt in PaymentAttempt.objects.filter(status__in=['unknown', 'creating', 'review']).order_by('pk')[:100]:
                self.stdout.write(f'Attempt {attempt.pk}: order={attempt.order_id}, {attempt.status}; {attempt.last_error}')
            for entry in PaymentOutbox.objects.filter(status='review').order_by('pk')[:100]:
                self.stdout.write(f'Outbox {entry.pk}: order={entry.order_id}, {entry.kind}; {entry.last_error}')
