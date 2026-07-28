from rest_framework import serializers

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
        fields = ['id', 'name', 'academic_year']
        read_only_fields = ['id']


class RegistrationPeriodSerializer(serializers.ModelSerializer):
    faculty = serializers.PrimaryKeyRelatedField(
        queryset=Faculty.objects.all(), write_only=True, required=False,
    )

    class Meta:
        model = RegistrationPeriod
        fields = '__all__'
        read_only_fields = ['id', 'created_by', 'created_date', 'updated_date', 'active']

    def validate_name(self, value):
        value = validate_non_blank(value, 'Tên đợt')
        value = validate_length(value, 'Tên đợt', max_length=255)
        return value

    def validate_academic_year(self, value):
        return validate_academic_year_format(value)

    def validate_execution_duration_weeks(self, value):
        return validate_range(value, 'Thời gian thực hiện đồ án', min_value=1, max_value=52)

    def validate(self, attrs):
        validate_datetime_before(
            attrs.get('student_registration_start'),
            attrs.get('student_registration_end'),
            'Thời gian bắt đầu đăng ký', 'thời gian kết thúc đăng ký',
        )
        validate_datetime_before(
            attrs.get('report_submission_start'),
            attrs.get('report_submission_end'),
            'Thời gian bắt đầu nộp báo cáo', 'thời gian kết thúc nộp báo cáo',
        )
        validate_datetime_before(
            attrs.get('student_registration_end'),
            attrs.get('report_submission_start'),
            'Thời gian kết thúc đăng ký', 'thời gian bắt đầu nộp báo cáo',
        )
        return attrs

    def create(self, validated_data):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            validated_data['created_by'] = request.user
            validated_data['faculty'] = request.user.faculty
        return super().create(validated_data)
