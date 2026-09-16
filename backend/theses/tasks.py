import logging

from celery import shared_task
from django.db import transaction
from django.utils import timezone
from django.core.mail import send_mail
from django.conf import settings

from theses.models import Committee, RegistrationPeriod

logger = logging.getLogger(__name__)
STATUS = RegistrationPeriod.STATUS
STATUS_COMMITTEE = Committee.CommitteeStatus
    

@shared_task
def transition_single_period(period_id, expected_status):
    with transaction.atomic():
        try:
            period = RegistrationPeriod.objects.select_for_update().get(
                pk=period_id, active=True,
            )
        except RegistrationPeriod.DoesNotExist:
            logger.warning("Period %s không tồn tại hoặc đã inactive.", period_id)
            return

        if period.status != expected_status:
            logger.info(
                "Period %s status đã đổi (%s -> %s), bỏ qua job cũ.",
                period_id, expected_status, period.status,
            )
            return

        now = timezone.now()
        new_status = _resolve_status(period, now)

        if new_status:
            if (period.status == STATUS.STUDENT_REGISTRATION
                    and new_status == STATUS.IN_PROGRESS):
                _resolve_unassigned_registrations(period)

            period.status = new_status
            period.save(update_fields=["status", "updated_date"])
            logger.info(
                "Period %s: %s -> %s (theo lịch)", period_id, expected_status, new_status,
            )

    schedule_next_transition(period_id)


def _resolve_status(period, now):
    if period.status == STATUS.SCHEDULED and now >= period.student_registration_start:
        return STATUS.STUDENT_REGISTRATION
    if period.status == STATUS.STUDENT_REGISTRATION and now >= period.student_registration_end:
        return STATUS.IN_PROGRESS
    if period.status == STATUS.IN_PROGRESS and now >= period.report_submission_start:
        return STATUS.REPORT_SUBMISSION
    if period.status == STATUS.REPORT_SUBMISSION and now >= period.report_submission_end:
        return STATUS.CLOSED
    return None


def schedule_next_transition(period_id):
    try:
        period = RegistrationPeriod.objects.get(pk=period_id, active=True)
    except RegistrationPeriod.DoesNotExist:
        return

    next_time = _next_transition_point(period)

    if next_time is None:
        return

    transition_single_period.apply_async(
        args=[period_id, period.status],
        eta=next_time,
    )
    logger.info(
        "Đã lên lịch chuyển period %s (đang %s) vào lúc %s",
        period_id, period.status, next_time,
    )


def _next_transition_point(period):
    if period.status == STATUS.SCHEDULED:
        return period.student_registration_start
    if period.status == STATUS.STUDENT_REGISTRATION:
        return period.student_registration_end
    if period.status == STATUS.IN_PROGRESS:
        return period.report_submission_start
    if period.status == STATUS.REPORT_SUBMISSION:
        return period.report_submission_end
    return None



def _resolve_unassigned_registrations(period):
    """Hết hạn đăng ký -> xét lại từng registration còn chờ giảng viên,
    ưu tiên các nguyện vọng theo priority, hết sạch thì đẩy cho giáo vụ."""
    from theses.models import ProjectRegistration, RegistrationLecturer
    from theses.services import _reevaluate_main_candidate

    registrations = ProjectRegistration.objects.filter(
        registration_period=period,
        active=True,
        status=ProjectRegistration.STATUS.WAITING_LECTURER_AND_PENDING,
    )

    count = registrations.count()
    if count == 0:
        return

    for registration in registrations:
        with transaction.atomic():
            _reevaluate_main_candidate(registration, expire_pending=True)

    logger.info(
        "Period %s: đã xét lại %s registration hết hạn đăng ký.",
        period.id, count,
    )


# ============================================
# Committee auto-transition
# ============================================

@shared_task
def transition_single_committee(committee_id, expected_status):
    with transaction.atomic():
        try:
            committee = Committee.objects.select_for_update().get(
                pk=committee_id, active=True,
            )
        except Committee.DoesNotExist:
            logger.warning("Committee %s không tồn tại hoặc đã inactive.", committee_id)
            return

        if committee.status != expected_status:
            logger.info(
                "Committee %s status đã đổi (%s -> %s), bỏ qua job cũ.",
                committee_id, expected_status, committee.status,
            )
            return

        now = timezone.now()
        new_status = _resolve_committee_status(committee, now)

        if new_status:
            committee.status = new_status
            committee.save(update_fields=["status", "updated_date"])
            logger.info(
                "Committee %s: %s -> %s (theo lịch)", committee_id, expected_status, new_status,
            )

    schedule_next_committee_transition(committee_id)


def _resolve_committee_status(committee, now):
    if committee.status == STATUS_COMMITTEE.NOT_STARTED and now >= committee.defense_date:
        return STATUS_COMMITTEE.IN_PROGRESS
    if committee.status == STATUS_COMMITTEE.IN_PROGRESS and now >= _end_of_defense_day(committee):
        return STATUS_COMMITTEE.COMPLETED
    return None


def _end_of_defense_day(committee):
    local = timezone.localtime(committee.defense_date)
    end_of_day = local.replace(hour=23, minute=59, second=59, microsecond=0)
    if timezone.is_naive(end_of_day):
        return timezone.make_aware(end_of_day)
    return end_of_day


def schedule_next_committee_transition(committee_id):
    try:
        committee = Committee.objects.get(pk=committee_id, active=True)
    except Committee.DoesNotExist:
        return

    next_time = _next_committee_transition_point(committee)

    if next_time is None:
        return

    transition_single_committee.apply_async(
        args=[committee_id, committee.status],
        eta=next_time,
    )
    logger.info(
        "Đã lên lịch chuyển committee %s (đang %s) vào lúc %s",
        committee_id, committee.status, next_time,
    )


def _next_committee_transition_point(committee):
    if committee.status == STATUS_COMMITTEE.NOT_STARTED:
        return committee.defense_date
    if committee.status == STATUS_COMMITTEE.IN_PROGRESS:
        return _end_of_defense_day(committee)
    return None


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_email_task(self, subject, message, recipient_list, html_message=None):

    try:
        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=recipient_list,
            html_message=html_message,
            fail_silently=False,
        )
        logger.info("Đã gửi email tới %s: %s", recipient_list, subject)
    except Exception as exc:
        logger.error("Gửi email thất bại tới %s: %s", recipient_list, exc)
        raise self.retry(exc=exc)
