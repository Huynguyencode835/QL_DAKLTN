from django.db.models import Q
from django.shortcuts import get_object_or_404
from rest_framework.decorators import action
from rest_framework.exceptions import NotFound
from rest_framework.response import Response

from theses.models import (
    User, ProjectRegistration, RegistrationPeriod,
    RegistrationLecturer, PeriodicReportSchedule, Report,
)
from theses.paginators import ReportMatrixPaginator
from theses.permissions import IsLecturerOrStaff
from theses.serializeres.reportsSerializer import ReportMatrixSerializer


class ReportMatrixActionsMixin:
    """reportMatrix — ma trận trạng thái báo cáo."""

    def _build_report_columns(self, period, lecturer=None, key=None):
        schedules = []
        if lecturer is not None:
            qs = PeriodicReportSchedule.objects.filter(
                lecturer=lecturer, registration_period=period,
            )
            if key:
                qs = qs.filter(id=key)
            schedules = list(qs.order_by('sequence_number'))
        periodic_columns = [
            {
                'key': f'periodic_{s.sequence_number}',
                'label': f'Báo cáo lần {s.sequence_number}',
                'schedule_id': s.id,
                'deadline': s.deadline,
            }
            for s in schedules
        ]
        final_column = {
            'key': 'final',
            'label': 'Báo cáo cuối kỳ',
            'schedule_id': None,
            'deadline': period.report_submission_end,
        }
        columns = periodic_columns
        if not key:
            columns = columns + [final_column]
        return columns

    def _build_report_map(self, registrations, is_staff_view):
        reports = Report.objects.filter(registration_id__in=[r.id for r in registrations])
        if is_staff_view:
            reports = reports.filter(report_type=Report.ReportType.FINAL)
        report_map = {}
        for r in reports:
            key = f'periodic_{r.sequence_number}' if r.report_type == Report.ReportType.PERIODIC else 'final'
            report_map[(r.registration_id, key)] = r
        return report_map

    def _approved_main_registrations_queryset(self, period, lecturer=None):
        filter_kwargs = {
            'registration_period': period,
            'lecturer_assignments__role': RegistrationLecturer.Role.MAIN,
            'lecturer_assignments__approval_status': RegistrationLecturer.ApprovalStatus.APPROVED,
            'active': True,
        }
        if lecturer is not None:
            filter_kwargs['lecturer_assignments__lecturer'] = lecturer
        qs = ProjectRegistration.objects.filter(**filter_kwargs)
        search = self.request.query_params.get('search')
        if search:
            qs = qs.filter(
                Q(student__first_name__icontains=search) |
                Q(student__last_name__icontains=search) |
                Q(student__student_profile__student_id__icontains=search) |
                Q(project_title__icontains=search)
            )
        return qs.select_related('student__student_profile').distinct()

    @action(methods=['GET'], detail=True, url_path='report-matrix', permission_classes=[IsLecturerOrStaff()])
    def reportMatrix(self, request, pk=None):
        if pk in ('current', 'current-project', 'current-thesis'):
            filters = dict(
                faculty=request.user.faculty,
                status__in=RegistrationPeriod.OPEN_STATUSES,
            )
            if pk == 'current-project':
                filters['period_type'] = 'project'
            elif pk == 'current-thesis':
                filters['period_type'] = 'thesis'
            period = RegistrationPeriod.objects.filter(**filters).first()
            if not period:
                raise NotFound('Không có đợt đăng ký nào đang mở.')
        else:
            period = get_object_or_404(RegistrationPeriod, pk=pk)

        user = request.user
        is_staff_view = user.role == User.Role.STAFF
        is_student_view = user.role == User.Role.STUDENT

        if is_staff_view:
            columns = self._build_report_columns(period, lecturer=None)
            registrations = list(self._approved_main_registrations_queryset(period))
        elif is_student_view:
            registration = ProjectRegistration.objects.filter(
                registration_period=period, student=user, active=True,
            ).select_related('student__student_profile').first()
            if not registration:
                return Response({'columns': [], 'rows': []})
            main_assignment = registration.lecturer_assignments.filter(
                role=RegistrationLecturer.Role.MAIN,
                approval_status=RegistrationLecturer.ApprovalStatus.APPROVED,
            ).first()
            lecturer = main_assignment.lecturer if main_assignment else None
            columns = self._build_report_columns(period, lecturer=lecturer)
            registrations = [registration]
        else:
            keySchedule = request.query_params.get('schedule')
            lecturer = user
            columns = self._build_report_columns(period, lecturer=lecturer, key=keySchedule)
            registrations = list(self._approved_main_registrations_queryset(period, lecturer=lecturer))

        report_map = self._build_report_map(registrations, is_staff_view)
        serializer = ReportMatrixSerializer(
            registrations, many=True,
            context={'columns': columns, 'report_map': report_map},
        )
        paginator = ReportMatrixPaginator()
        request.columns = columns
        page = paginator.paginate_queryset(serializer.data, request, view=self)
        if page is not None:
            return paginator.get_paginated_response(page)
        return Response({'columns': columns, 'rows': serializer.data, 'count': len(serializer.data)})