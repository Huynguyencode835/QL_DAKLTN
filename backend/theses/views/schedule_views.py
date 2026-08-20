from django.utils import timezone

from rest_framework import generics, viewsets, status
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, NotFound
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from theses.models import PeriodicReportSchedule, Report, User
from theses.permissions import CanCreateReport, IsLecturerRole
from theses.serializeres.scheduleSerializer import PeriodicReportScheduleSerializer
from theses.serializeres.reportsSerializer import (
    ReportSerializer, PeriodicReportUploadSerializer,
)
from theses.views.reports_views import (
    upload_report_file, create_report_or_cleanup,
)


class ScheduleViewSet(viewsets.ViewSet,
                      generics.ListAPIView,
                      generics.CreateAPIView,
                      generics.RetrieveAPIView,
                      generics.UpdateAPIView,
                      generics.DestroyAPIView):
    serializer_class = PeriodicReportScheduleSerializer
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        if self.action == 'report':
            return [CanCreateReport()]
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return [IsLecturerRole()]
        return super().get_permissions()

    def get_queryset(self):
        user = self.request.user
        qs = PeriodicReportSchedule.objects.filter(active=True).select_related(
            'registration_period', 'lecturer',
        ).prefetch_related('registrations')

        if user.role == User.Role.LECTURER:
            qs = qs.filter(lecturer=user)
        elif user.role == User.Role.STUDENT:
            qs = qs.filter(registrations__student=user)
        elif user.role == User.Role.STAFF:
            qs = qs.filter(registration_period__faculty=user.faculty)

        return qs.distinct()

    def get_object(self):
        qs = self.get_queryset()
        pk = self.kwargs.get('pk')
        try:
            obj = qs.get(pk=pk)
        except PeriodicReportSchedule.DoesNotExist:
            raise NotFound('Không tìm thấy lịch báo cáo định kỳ.')

        if self.action in ('update', 'partial_update', 'destroy'):
            if obj.lecturer_id != self.request.user.id:
                raise PermissionDenied('Chỉ giảng viên tạo lịch mới được sửa/xoá lịch này.')

        return obj

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(lecturer=request.user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path='report')
    def report(self, request, pk=None):
        schedule = self.get_object()

        serializer = PeriodicReportUploadSerializer(
            data=request.data, context={'request': request, 'schedule': schedule},
        )
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        registration = data['registration']

        now = timezone.now()
        file_key, err_resp = upload_report_file(
            registration, data, now, 'periodic', schedule.sequence_number,
        )
        if err_resp:
            return Response(err_resp, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        report = create_report_or_cleanup(
            registration=registration,
            report_type=Report.ReportType.PERIODIC,
            sequence_number=schedule.sequence_number,
            schedule=schedule,
            title=data.get('title', ''),
            file_key=file_key,
            file_name=data['file'].name,
            file_size=data['file'].size,
            status=Report.Status.SUBMITTED,
        )

        return Response(ReportSerializer(report).data, status=status.HTTP_201_CREATED)