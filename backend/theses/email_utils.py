import os
import logging

from django.utils import timezone
from django.template.loader import render_to_string
from django.conf import settings

from theses.tasks import send_email_task

logger = logging.getLogger(__name__)

FRONTEND_URL = os.getenv('FRONTEND_URL', 'http://localhost:5173')


def send_notification_email(template_name, subject, recipient_emails, context):
    if not recipient_emails:
        return

    clean_emails = list(set(e for e in recipient_emails if e))
    if not clean_emails:
        return

    context.setdefault('app_name', 'Hệ thống Quản lý Đồ án')
    context.setdefault('year', timezone.now().year)
    context.setdefault('frontend_url', FRONTEND_URL)

    try:
        html_message = render_to_string(f'email/{template_name}.html', context)
        send_email_task.delay(subject, '', clean_emails, html_message)
        logger.info("Đã enqueue email '%s' tới %s", subject, clean_emails)
    except Exception:
        logger.exception("Lỗi render/gửi email '%s'", subject)
