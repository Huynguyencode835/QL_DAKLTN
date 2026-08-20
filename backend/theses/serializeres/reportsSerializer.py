# reports/serializers.py
from django.utils import timezone
from rest_framework import serializers
from theses.models import (
    Report, ProjectRegistration, RegistrationPeriod,
)

ALLOWED_TYPES = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]
MAX_SIZE = 10 * 1024 * 1024  # 10MB

class ReportSerializer(serializers.ModelSerializer):
    class Meta:
        model = Report
        fields = [
            'id', 'registration', 'report_type', 'sequence_number',
            'title', 'file_name', 'file_size', 'status',
            'feedback', 'reviewed_at', 'created_date',
        ]

class BaseReportUploadSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=255, required=False, allow_blank=True)
    file = serializers.FileField()

    def validate_file(self, file):
        if file.content_type not in ALLOWED_TYPES:
            raise serializers.ValidationError('Chỉ chấp nhận file PDF hoặc DOCX')
        if file.size > MAX_SIZE:
            raise serializers.ValidationError('File vượt quá 10MB')
        return file

class PeriodicReportUploadSerializer(BaseReportUploadSerializer):
    def validate(self, data):
        user = self.context['request'].user
        schedule = self.context['schedule']

        registration = schedule.registrations.filter(
            student=user, active=True,
        ).first()
        if not registration:
            raise serializers.ValidationError(
                {'schedule': 'Bạn không có đăng ký đề tài trong đợt của lịch báo cáo này.'}
            )

        # if timezone.now() > schedule.deadline:
        #     raise serializers.ValidationError(
        #         {'deadline': 'Đã quá hạn nộp cho lịch báo cáo này.'}
        #     )

        data['schedule'] = schedule
        data['registration'] = registration
        return data

class FinalReportUploadSerializer(BaseReportUploadSerializer):
    def validate(self, data):
        user = self.context['request'].user

        registration = ProjectRegistration.objects.filter(
            student=user, active=True,
            registration_period__status__in=RegistrationPeriod.OPEN_STATUSES,
        ).select_related('registration_period').order_by(
            '-registration_period__student_registration_start',
        ).first()
        if not registration:
            raise serializers.ValidationError(
                {'registration': 'Bạn chưa có đăng ký đề tài trong đợt đang mở.'}
            )

        data['registration'] = registration
        return data