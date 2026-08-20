from rest_framework import serializers
from django.utils import timezone
from theses.models import Faculty, RegistrationPeriod
from theses.validators import (
    validate_non_blank,
    validate_length,
    validate_academic_year_format,
    validate_range,
    validate_datetime_before,
)


class RegistrationPeriodBasicSerializer(serializers.ModelSerializer):
    class Meta:
        model = RegistrationPeriod
        fields = ['id', 'name', 'academic_year', 'status']
        read_only_fields = ['id', 'status']


class RegistrationPeriodSerializer(serializers.ModelSerializer):
    faculty = serializers.PrimaryKeyRelatedField(
        queryset=Faculty.objects.all(), write_only=True, required=False,
    )
    student_registration_end = serializers.DateTimeField(read_only=True)
    report_submission_start = serializers.DateTimeField(read_only=True)
    report_submission_end = serializers.DateTimeField(read_only=True)

    class Meta:
        model = RegistrationPeriod
        fields = [
            'id',
            'name',
            'academic_year',
            'student_registration_start',
            'student_registration_days',
            'student_registration_end',
            'execution_duration_weeks',
            'report_submission_start',
            'report_submission_days',
            'report_submission_end',
            'status',
            'faculty',
            'created_by',
            'created_date',
            'active',
        ]
        read_only_fields = ['id', 'created_by', 'created_date', 'active']

    def validate_name(self, value):
        value = validate_non_blank(value, 'Tên đợt')
        value = validate_length(value, 'Tên đợt', max_length=255)
        return value

    def validate_academic_year(self, value):
        return validate_academic_year_format(value)

    def validate_execution_duration_weeks(self, value):
        return validate_range(value, 'Thời gian thực hiện đồ án', min_value=1, max_value=52)

    def validate(self, attrs):
        def get_value(field):
            if field in attrs:
                return attrs[field]
            if self.instance:
                return getattr(self.instance, field)
            return None

        start = get_value('student_registration_start')
        reg_days = get_value('student_registration_days')
        exec_weeks = get_value('execution_duration_weeks')
        report_days = get_value('report_submission_days')

        if start and reg_days is not None:
            registration_end = start + timezone.timedelta(days=reg_days)
        else:
            registration_end = None

        if registration_end and exec_weeks is not None:
            report_start = registration_end + timezone.timedelta(weeks=exec_weeks)
        else:
            report_start = None

        if report_start and report_days is not None:
            report_end = report_start + timezone.timedelta(days=report_days)
        else:
            report_end = None

        validate_datetime_before(
            start, registration_end,
            'Thời gian bắt đầu đăng ký', 'thời gian kết thúc đăng ký',
        )
        validate_datetime_before(
            report_start, report_end,
            'Thời gian bắt đầu nộp báo cáo', 'thời gian kết thúc nộp báo cáo',
        )
        validate_datetime_before(
            registration_end, report_start,
            'Thời gian kết thúc đăng ký', 'thời gian bắt đầu nộp báo cáo',
        )

        status = attrs.get('status')
        if status in RegistrationPeriod.OPEN_STATUSES:
            request = self.context.get('request')

            if self.instance:
                faculty = self.instance.faculty
            else:
                faculty = request.user.faculty if request and request.user.is_authenticated else None

            if faculty:
                conflicting = RegistrationPeriod.objects.filter(
                    active=True,
                    faculty=faculty,
                    status__in=RegistrationPeriod.OPEN_STATUSES,
                )
                if self.instance:
                    conflicting = conflicting.exclude(pk=self.instance.pk)
                if conflicting.exists():
                    raise serializers.ValidationError(
                        f'Khoa "{faculty.name}" đã có đợt đang mở, không thể tạo thêm.'
                    )

        return attrs

    def create(self, validated_data):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            validated_data['created_by'] = request.user
            validated_data['faculty'] = request.user.faculty
        return super().create(validated_data)
