import logging

from django.core.cache import cache
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver

from theses.models import Committee, CommitteeMember, RegistrationPeriod
from theses.tasks import schedule_next_committee_transition, schedule_next_transition

logger = logging.getLogger(__name__)


@receiver([post_save, post_delete], sender=Committee)
def invalidate_committee_cache(sender, instance, **kwargs):
    cache.delete(f"committees_list:{instance.registration_period_id}")


@receiver([post_save, post_delete], sender=CommitteeMember)
def invalidate_committee_member_cache(sender, instance, **kwargs):
    try:
        period_id = instance.committee.registration_period_id
        cache.delete(f"committees_list:{period_id}")
    except Committee.DoesNotExist:
        pass


@receiver([post_save, post_delete], sender=RegistrationPeriod)
def invalidate_registration_period_cache(sender, instance, **kwargs):
    cache.delete(f"open_period_id:faculty:{instance.faculty_id}")


@receiver(post_save, sender=RegistrationPeriod)
def schedule_transition_on_save(sender, instance, created, update_fields, **kwargs):
    if not instance.active or instance.status == RegistrationPeriod.STATUS.CLOSED:
        return
    relevant_fields = {
        'status', 'student_registration_start', 'student_registration_days',
        'execution_duration_weeks', 'report_submission_days',
    }
    if update_fields is not None and not (set(update_fields) & relevant_fields):
        return

    schedule_next_transition(instance.pk)


@receiver(post_save, sender=Committee)
def schedule_committee_transition_on_save(sender, instance, created, update_fields, **kwargs):
    if instance.status == Committee.CommitteeStatus.COMPLETED:
        return
    relevant_fields = {'status', 'defense_date'}
    if update_fields is not None and not (set(update_fields) & relevant_fields):
        return
    schedule_next_committee_transition(instance.pk)
