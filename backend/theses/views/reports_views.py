# reports/views.py
from django.utils import timezone
from django.conf import settings
from django.core.exceptions import ValidationError as DjangoValidationError

from rest_framework import viewsets, generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.exceptions import (
    PermissionDenied, ValidationError as DRFValidationError, NotFound
)
from rest_framework.decorators import action

from core.r2_client import get_r2_client, get_r2_bucket_name
from theses.models import ProjectRegistration, Report, RegistrationLecturer
from theses.email_utils import send_notification_email
from theses.permissions import CanAccessReport, CanCreateReport
from theses.serializeres.reportsSerializer import (
    FinalReportDetailSerializer,
    ReportSerializer,
    FinalReportUploadSerializer,
)


def upload_report_file(registration, data, now, type_label, seq_label):
    file = data['file']
    timestamp = int(now.timestamp())
    file_key = (
        f"reports/{registration.id}/{type_label}_"
        f"{seq_label}_{timestamp}_{file.name}"
    )

    r2 = get_r2_client()
    try:
        r2.upload_fileobj(
            file, get_r2_bucket_name(), file_key,
            ExtraArgs={'ContentType': file.content_type},
        )
    except Exception as e:
        return None, {'message': 'Upload thất bại', 'error': str(e)}

    return file_key, None


def create_report_or_cleanup(**report_kwargs):
    file_key = report_kwargs['file_key']
    try:
        return Report.objects.create(**report_kwargs)
    except DjangoValidationError as e:
        get_r2_client().delete_object(Bucket=get_r2_bucket_name(), Key=file_key)
        raise DRFValidationError(e.message_dict if hasattr(e, 'message_dict') else str(e))


class ReportViewSet(
    viewsets.ViewSet,
    generics.GenericAPIView,
):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def get_permissions(self):
        if self.action == 'upload_final':
            return [CanCreateReport()]
        return [CanAccessReport()]

    def get_queryset(self):
        return Report.objects.select_related('registration')

    @action(detail=False, methods=['get'], url_path='final')
    def final_detail(self, request, *args, **kwargs):
        serializer = FinalReportDetailSerializer(
            data=request.query_params, context={'request': request},
        )
        serializer.is_valid(raise_exception=True)
        registration = serializer.validated_data['registration']

        reports = Report.objects.filter(
            registration=registration,
            report_type=Report.ReportType.FINAL,
        ).order_by('-sequence_number')

        if not reports.exists():
            return Response(
                {'detail': 'Chưa có báo cáo cuối kỳ nào được nộp.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        return Response({
            'latest': ReportSerializer(reports.first()).data,
            'history': ReportSerializer(reports, many=True).data,
        })

    @action(detail=False, methods=['post'], url_path='upload-final')
    def upload_final(self, request, *args, **kwargs):
        serializer = FinalReportUploadSerializer(
            data=request.data, context={'request': request},
        )
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        registration = data['registration']

        period = registration.registration_period
        now = timezone.now()
        is_late = bool(period) and now > period.report_submission_end

        if now < period.report_submission_start:
            raise DRFValidationError('Chưa đến thời gian nộp báo cáo')

        file_key, err_resp = upload_report_file(
            registration, data, now, 'final', 'final',
        )
        if err_resp:
            return Response(err_resp, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        last = Report.objects.filter(
            registration=registration, report_type=Report.ReportType.FINAL,
        ).order_by('-sequence_number').first()
        sequence_number = (last.sequence_number + 1) if last else 1

        report = create_report_or_cleanup(
            registration=registration,
            report_type=Report.ReportType.FINAL,
            sequence_number=sequence_number,
            title=data.get('title', ''),
            file_key=file_key,
            file_name=data['file'].name,
            file_size=data['file'].size,
            status=Report.Status.LATE if is_late else Report.Status.SUBMITTED,
        )

        supervisor = registration.lecturer_assignments.filter(role='main').first()
        recipients = [registration.student.email]
        if supervisor:
            recipients.append(supervisor.lecturer.email)

        status_text = 'nộp trễ' if is_late else 'đã được nộp'
        send_notification_email(
            'info_notification',
            'Báo cáo cuối kỳ đã được nộp',
            recipients,
            {
                'title': f'Báo cáo cuối kỳ {status_text}',
                'student_name': registration.student.get_full_name() or registration.student.username,
                'message': f'Sinh viên {registration.student.get_full_name() or registration.student.username} vừa {status_text} báo cáo cuối kỳ cho đề tài "{registration.project_title}".',
                'details': [
                    ('Đề tài', registration.project_title),
                    ('Trạng thái', report.get_status_display()),
                    ('Thời gian', timezone.localtime(report.created_date).strftime('%d/%m/%Y %H:%M')),
                ],
                'action_url': f'{settings.FRONTEND_URL}/reports',
                'action_label': 'Xem báo cáo',
            },
        )

        return Response(ReportSerializer(report).data, status=status.HTTP_201_CREATED)


    # --- custom action: xem chi tiết report ---
    @action(detail=True, methods=['get'], url_path='detail')
    def report_detail(self, request, pk=None):
        report = self.get_object()
        return Response(ReportSerializer(report).data)

    # --- custom action: tải file ---
    @action(detail=True, methods=['get'])
    def download(self, request, pk=None):
        report = self.get_object()

        r2 = get_r2_client()
        url = r2.generate_presigned_url(
            'get_object',
            Params={'Bucket': get_r2_bucket_name(), 'Key': report.file_key},
            ExpiresIn=3600,
        )
        return Response({'url': url})