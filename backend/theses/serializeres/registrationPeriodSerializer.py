from decimal import Decimal

from django.db import transaction
from theses.serializeres.gradeWeightItemSerializers import GradeWeightItemSerializer
from rest_framework import serializers
from django.utils import timezone
from theses.models import Faculty, GradeWeightConfig, RegistrationPeriod
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
        fields = ['id', 'name', 'academic_year', 'status', 'period_type', 'parent_period']
        read_only_fields = ['id', 'status']


class RegistrationPeriodSerializer(serializers.ModelSerializer):
    student_registration_end = serializers.DateTimeField(read_only=True)
    report_submission_start = serializers.DateTimeField(read_only=True)
    report_submission_end = serializers.DateTimeField(read_only=True)
    grade_weight_configs = GradeWeightItemSerializer(many=True, required=True)

    class Meta:
        model = RegistrationPeriod
        fields = [
            'id',
            'name',
            'academic_year',
            'period_type',
            'parent_period',
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
            'grade_weight_configs',
        ]
        read_only_fields = ['id', 'created_by', 'created_date', 'active', 'status', 'period_type', 'faculty']

    def validate_name(self, value):
        value = validate_non_blank(value, 'Tên đợt')
        value = validate_length(value, 'Tên đợt', max_length=255)
        return value

    def validate_grade_weight_configs(self, items):
        by_scope = {}
        for item in items:
            by_scope.setdefault(item['scope'], []).append(item)

        for scope, group in by_scope.items():
            total = sum(g['weight'] for g in group)
            if abs(total - 1) > Decimal('0.001'):
                raise serializers.ValidationError(
                    f'Tổng trọng số của scope={scope} phải bằng 1, hiện tại = {total}.'
                )
        return items

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

        if not self.instance and start and start < timezone.now():
            raise serializers.ValidationError({
                'student_registration_start': 'Ngày bắt đầu đăng ký không được ở quá khứ.'
            })

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

        return attrs

    def create(self, validated_data):
        request = self.context.get('request')
        grade_weight_configs = validated_data.pop('grade_weight_configs', [])

        if request and request.user.is_authenticated:
            validated_data['created_by'] = request.user
            validated_data['faculty'] = request.user.faculty
        validated_data['status'] = RegistrationPeriod.STATUS.DRAFT

        with transaction.atomic():
            period = super().create(validated_data)

            for item in grade_weight_configs:
                GradeWeightConfig.objects.create(
                    registration_period=period,
                    scope=item['scope'],
                    component=item['component'],
                    weight=item['weight'],
                    updated_by=request.user if request else None,
                )

        return period

    def update(self, instance, validated_data):
        request = self.context.get('request')
        grade_weight_configs = validated_data.pop('grade_weight_configs', None)

        with transaction.atomic():
            for attr, value in validated_data.items():
                setattr(instance, attr, value)
            instance.save()

            if grade_weight_configs is not None:
                instance.grade_weight_configs.all().delete()
                for item in grade_weight_configs:
                    GradeWeightConfig.objects.create(
                        registration_period=instance,
                        scope=item['scope'],
                        component=item['component'],
                        weight=item['weight'],
                        updated_by=request.user if request else None,
                    )

        return instance

class ThesisPeriodCreateSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=255)
    start_offset_days = serializers.IntegerField(default=7, min_value=0)
    execution_duration_weeks = serializers.IntegerField(required=False)
    report_submission_days = serializers.IntegerField(required=False)
    grade_weight_configs = GradeWeightItemSerializer(many=True, required=True)

    def validate_name(self, value):
        value = validate_non_blank(value, 'Tên đợt')
        value = validate_length(value, 'Tên đợt', max_length=255)
        return value

    def validate_execution_duration_weeks(self, value):
        return validate_range(value, 'Thời gian thực hiện khóa luận', min_value=1, max_value=52)

    def validate_grade_weight_configs(self, items):
        by_scope = {}
        for item in items:
            by_scope.setdefault(item['scope'], []).append(item)

        for scope, group in by_scope.items():
            total = sum(g['weight'] for g in group)
            if abs(total - 1) > Decimal('0.001'):
                raise serializers.ValidationError(
                    f'Tổng trọng số của scope={scope} phải bằng 1, hiện tại = {total}.'
                )
        return items

    def create(self, validated_data):
        parent_period = self.context['parent_period']
        request = self.context['request']
        weight_configs = validated_data.pop('grade_weight_configs')

        with transaction.atomic():
            thesis_period = RegistrationPeriod.create_thesis_period(
                parent_period,
                name=validated_data['name'],
                start_offset_days=validated_data.get('start_offset_days', 7),
                created_by=request.user,
                execution_duration_weeks=validated_data.get(
                    'execution_duration_weeks', parent_period.execution_duration_weeks,
                ),
                report_submission_days=validated_data.get(
                    'report_submission_days', parent_period.report_submission_days,
                ),
            )

            for item in weight_configs:
                GradeWeightConfig.objects.create(
                    registration_period=thesis_period,
                    scope=item['scope'],
                    component=item['component'],
                    weight=item['weight'],
                    updated_by=request.user,
                )

        return thesis_period