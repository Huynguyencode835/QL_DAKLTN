from rest_framework import generics, viewsets

from .base import PeriodBaseMixin
from .period_actions import PeriodActionsMixin
from .registration_actions import RegistrationActionsMixin
from .schedule_actions import ScheduleActionsMixin
from .report_matrix_actions import ReportMatrixActionsMixin
from .committee_actions import CommitteeActionsMixin
from .reviewer_actions import ReviewerActionsMixin


class RegistrationPeriodViewSet(
    PeriodBaseMixin,
    PeriodActionsMixin,
    RegistrationActionsMixin,
    ScheduleActionsMixin,
    ReportMatrixActionsMixin,
    CommitteeActionsMixin,
    ReviewerActionsMixin,
    viewsets.ViewSet,
    generics.ListAPIView,
    generics.CreateAPIView,
    generics.RetrieveAPIView,
    generics.UpdateAPIView,
    generics.DestroyAPIView,
):
    pass