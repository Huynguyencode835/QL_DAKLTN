# reports/views.py
from django.utils import timezone
from django.conf import settings
from django.core.exceptions import ValidationError as DjangoValidationError

from rest_framework import viewsets, generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.exceptions import (
    PermissionDenied, ValidationError as DRFValidationError
)
from rest_framework.decorators import action

from core.r2_client import get_r2_client, get_r2_bucket_name
from theses.models import Report, RegistrationLecturer
from theses.permissions import CanAccessReport, CanCreateReport
from theses.serializeres.reportsSerializer import (
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
    generics.ListAPIView,
    generics.RetrieveAPIView,
):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]
    queryset = Report.objects.select_related('registration').all()

    def get_permissions(self):
        if self.action == 'upload_final':
            return [CanCreateReport()]
        return [CanAccessReport()]

    def get_serializer_class(self):
        return ReportSerializer

    def get_queryset(self):
        qs = Report.objects.select_related('registration')

        if self.action == 'list':
            registration_id = self.request.query_params.get('registration_id')
            if not registration_id:
                raise DRFValidationError('Thiếu tham số registration_id')
            qs = qs.filter(registration_id=registration_id)

        return qs

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

        return Response(ReportSerializer(report).data, status=status.HTTP_201_CREATED)

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

    # --- custom action: giảng viên review báo cáo periodic ---
    @action(detail=True, methods=['post'])
    def review(self, request, pk=None):
        report = self.get_object()

        if report.report_type != Report.ReportType.PERIODIC:
            raise DRFValidationError('Chỉ review được báo cáo định kỳ tại đây')

        is_main_lecturer = report.registration.lecturer_assignments.filter(
            lecturer_id=request.user.id,
            role=RegistrationLecturer.Role.MAIN,
        ).exists()
        if not is_main_lecturer and not request.user.is_staff:
            raise PermissionDenied('Bạn không có quyền review báo cáo này')

        new_status = request.data.get('status')
        feedback = request.data.get('feedback', '')

        valid_statuses = [Report.Status.REVIEWED, Report.Status.APPROVED, Report.Status.REJECTED]
        if new_status not in valid_statuses:
            raise DRFValidationError(f'status phải là một trong: {valid_statuses}')

        if new_status == Report.Status.REJECTED and not feedback.strip():
            raise DRFValidationError('Cần ghi rõ lý do khi yêu cầu nộp lại')

        report.status = new_status
        report.feedback = feedback
        report.reviewed_at = timezone.now()
        report.save()

        return Response(ReportSerializer(report).data)