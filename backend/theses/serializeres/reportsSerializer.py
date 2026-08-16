# reports/serializers.py
from rest_framework import serializers
from theses.models import Report

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

class ReportUploadSerializer(serializers.Serializer):
    registration_id = serializers.IntegerField()
    report_type = serializers.ChoiceField(choices=Report.ReportType.choices)
    sequence_number = serializers.IntegerField(required=False, allow_null=True)
    title = serializers.CharField(max_length=255, required=False, allow_blank=True)
    file = serializers.FileField()

    def validate_file(self, file):
        if file.content_type not in ALLOWED_TYPES:
            raise serializers.ValidationError('Chỉ chấp nhận file PDF hoặc DOCX')
        if file.size > MAX_SIZE:
            raise serializers.ValidationError('File vượt quá 10MB')
        return file

    def validate(self, data):
        # periodic bắt buộc có sequence_number, final thì không
        report_type = data.get('report_type')
        seq = data.get('sequence_number')

        if report_type == Report.ReportType.PERIODIC and seq is None:
            raise serializers.ValidationError(
                {'sequence_number': 'Báo cáo định kỳ cần có số thứ tự'}
            )
        if report_type == Report.ReportType.FINAL and seq is not None:
            raise serializers.ValidationError(
                {'sequence_number': 'Báo cáo cuối kỳ không cần số thứ tự'}
            )
        return data