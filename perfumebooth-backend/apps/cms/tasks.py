from celery import shared_task
from .notifications import process_notifications


@shared_task
def deliver_customer_notifications():
    return process_notifications()
