from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.response import Response

from theses.models import User, PeriodicReportSchedule
from theses.serializeres.scheduleSerializer import PeriodicReportScheduleSerializer


class ScheduleActionsMixin:
    """schedules (list/create), schedule_detail."""

    def _get_schedule_queryset(self, period):
        user = self.request.user
        qs = period.report_schedules.filter(active=True)
        if user.role == User.Role.LECTURER:
            qs = qs.filter(lecturer=user)
        elif user.role == User.Role.STUDENT:
            qs = qs.filter(registrations__student=user)
        return qs.distinct()

    @action(methods=['GET', 'POST'], detail=True, url_path='schedules')
    def schedules(self, request, pk=None):
        period = self.get_object()
        if request.method == 'POST':
            serializer = PeriodicReportScheduleSerializer(
                data=request.data,
                context={'request': request, 'registration_period': period},
            )
            serializer.is_valid(raise_exception=True)
            serializer.save(lecturer=request.user, registration_period=period)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        qs = self._get_schedule_queryset(period).select_related(
            'registration_period', 'lecturer',
        ).prefetch_related('registrations')
        s = PeriodicReportScheduleSerializer(qs, many=True, context={'request': request})
        return Response(s.data)

    @action(
        methods=['GET'], detail=True,
        url_path='schedules/(?P<schedule_pk>[^/.]+)',
    )
    def schedule_detail(self, request, pk=None, schedule_pk=None):
        period = self.get_object()
        schedule = get_object_or_404(self._get_schedule_queryset(period), pk=schedule_pk)
        s = PeriodicReportScheduleSerializer(schedule, context={'request': request})
        return Response(s.data)