from django.utils import timezone
from rest_framework import status
from rest_framework.exceptions import NotFound, ValidationError as DRFValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from theses.models import (
    User, RegistrationPeriod,
)
from theses.permissions import (
    CanCreateRegistration, IsStaffRole,
    IsRegistrationOwnerOrStaff, IsLecturerOrStaff, IsLecturerRole, IsStaffSameFacultyForPeriod,
)
from theses.serializeres import registrationPeriodSerializer


class PeriodBaseMixin:
    queryset = RegistrationPeriod.objects.filter(active=True)
    http_method_names = ['get', 'post', 'patch', 'delete', 'head', 'options']

    def get_serializer_class(self):
        if self.action == 'list':
            return registrationPeriodSerializer.RegistrationPeriodBasicSerializer
        return registrationPeriodSerializer.RegistrationPeriodSerializer

    def get_queryset(self):
        qs = RegistrationPeriod.objects.filter(
            active=True, faculty=self.request.user.faculty,
        )
        if self.request.user.role != User.Role.STAFF:
            qs = qs.exclude(status=RegistrationPeriod.STATUS.DRAFT)
        period_type = self.request.query_params.get('period_type')
        if period_type:
            qs = qs.filter(period_type=period_type)
        return qs

    def get_permissions(self):
        if self.action == 'registrations':
            if self.request.method == 'POST':
                return [CanCreateRegistration()]
        if self.action == 'create':
            return [IsStaffRole()]
        if self.action == 'schedules' and self.request.method == 'POST':
            return [IsLecturerRole()]
        if self.action in ('update', 'partial_update', 'destroy', 'publish', 'create_thesis', 'convert_to_thesis', 'registration_Thesis'):
            return [IsStaffSameFacultyForPeriod()]
        if self.action in ('committees', 'committee_detail'):
            if self.request.method == 'GET':
                return [IsAuthenticated()]
            return [IsStaffSameFacultyForPeriod()]
        if self.action in ('reviewer_sessions', 'reviewer_session_detail'):
            if self.request.method == 'GET':
                return [IsAuthenticated()]
            return [IsStaffSameFacultyForPeriod()]
        if self.action == 'reviewer_eligible_registrations':
            return [IsStaffSameFacultyForPeriod()]
        if self.action in ('registration_detail', 'approve_registration',
                        'reject_registration', 'add_lecturer_to_registration'):
            return [IsRegistrationOwnerOrStaff()]
        if self.action == 'list':
            return [IsLecturerOrStaff()]
        return [IsAuthenticated()]

    def get_object(self):
        pk = self.kwargs.get('pk')
        if pk in ('current', 'current-project', 'current-thesis'):
            user = self.request.user
            filters = dict(
                active=True,
                faculty=user.faculty,
                status__in=RegistrationPeriod.OPEN_STATUSES,
            )
            if pk == 'current-project':
                filters['period_type'] = 'project'
            elif pk == 'current-thesis':
                filters['period_type'] = 'thesis'
            period = RegistrationPeriod.objects.filter(**filters).first()
            if not period:
                raise NotFound('Hiện tại khoa của bạn chưa có đợt đăng ký nào đang mở.')
            self.check_object_permissions(self.request, period)
            return period
        return super().get_object()

    def _check_draft(self, period):
        if period.status != RegistrationPeriod.STATUS.DRAFT:
            raise DRFValidationError(
                'Chỉ được sửa/xoá khi đợt ở trạng thái DRAFT (chưa công bố).'
            )

    def _check_in_student_registration_window(self, period):
        now = timezone.now()
        if now < period.student_registration_start:
            return 'Chưa đến thời gian đăng ký sinh viên.'
        if now > period.student_registration_end:
            return 'Đã hết thời gian đăng ký sinh viên.'
        return None