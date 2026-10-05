from celery import shared_task

from .services import InventoryReservationService


@shared_task(name='apps.inventory.tasks.release_expired_inventory_reservations')
def release_expired_inventory_reservations():
    released = InventoryReservationService.release_expired()
    return {'released_reservations': released}
