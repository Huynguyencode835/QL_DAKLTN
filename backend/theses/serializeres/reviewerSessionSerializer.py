from rest_framework import serializers
from django.db import transaction
from django.utils import timezone

from theses.models import (
    Grade, ProjectRegistration, RegistrationLecturer, RegistrationPeriod,
    ReviewerAssignmentSession, User,
)


class ReviewerAssignmentSessionWriteSerializer(serializers.Serializer):
    reviewer = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.filter(role=User.Role.LECTURER, is_active=True),
    )
    registration_ids = serializers.ListField(
        child=serializers.IntegerField(), min_length=1,
    )
    defense_date = serializers.DateTimeField()
    location = serializers.CharField(max_length=255, required=False, default='')

    def validate_registration_ids(self, value):
        if len(value) != len(set(value)):
            raise serializers.ValidationError('Danh sách registration không được trùng.')
        return value

    def validate(self, attrs):
        period = self.context['registration_period']

        defense_date = attrs.get('defense_date')
        if defense_date and defense_date < timezone.now():
            raise serializers.ValidationError({
                'defense_date': 'Ngày bảo vệ không được ở quá khứ.'
            })

        if period.period_type != RegistrationPeriod.PeriodType.THESIS:
            raise serializers.ValidationError(
                'Chỉ tạo session phản biện cho đợt khóa luận.'
            )

        registrations = ProjectRegistration.objects.filter(
            id__in=attrs['registration_ids'],
            active=True,
            registration_period=period,
        )
        if registrations.count() != len(attrs['registration_ids']):
            raise serializers.ValidationError(
                'Một hoặc nhiều registration không tồn tại hoặc không thuộc đợt này.'
            )

        for reg in registrations:
            if not reg.is_thesis:
                raise serializers.ValidationError(
                    f'Registration {reg.id} không phải khóa luận (is_thesis=False).'
                )

            has_process = Grade.objects.filter(
                registration=reg,
                grade_type=Grade.GradeType.SUPERVISOR,
                component=Grade.Component.PROCESS,
            ).exists()
            has_final = Grade.objects.filter(
                registration=reg,
                grade_type=Grade.GradeType.SUPERVISOR,
                component=Grade.Component.FINAL,
            ).exists()

            if not (has_process and has_final):
                raise serializers.ValidationError(
                    f'Registration {reg.id} chưa đủ điểm GVHD (process + final).'
                )

        reviewer = attrs['reviewer']
        for reg in registrations:
            if reg.lecturer_assignments.filter(
                lecturer=reviewer,
                role=RegistrationLecturer.Role.MAIN,
            ).exists():
                raise serializers.ValidationError(
                    f'Giảng viên {reviewer.get_full_name() or reviewer.username} '
                    f'là GVHD của registration {reg.id}, không thể phản biện.'
                )

        attrs['_registrations'] = registrations
        return attrs

    def create(self, validated_data):
        period = self.context['registration_period']
        staff_user = self.context['request'].user

        session = ReviewerAssignmentSession.objects.create(
            registration_period=period,
            reviewer=validated_data['reviewer'],
            defense_date=validated_data['defense_date'],
            location=validated_data.get('location', ''),
            created_by=staff_user,
        )

        RegistrationLecturer.objects.bulk_create([
            RegistrationLecturer(
                registration=reg,
                lecturer=validated_data['reviewer'],
                role=RegistrationLecturer.Role.REVIEWER,
                reviewer_session=session,
                approval_status=RegistrationLecturer.ApprovalStatus.APPROVED,
                responded_at=timezone.now(),
            )
            for reg in validated_data['_registrations']
        ])

        return session


class ReviewerAssignmentSessionReadSerializer(serializers.ModelSerializer):
    reviewer_name = serializers.SerializerMethodField()
    assignment_count = serializers.SerializerMethodField()

    class Meta:
        model = ReviewerAssignmentSession
        fields = [
            'id', 'registration_period', 'reviewer', 'reviewer_name',
            'defense_date', 'location', 'assignment_count',
            'created_by', 'created_date',
        ]

    def get_reviewer_name(self, obj):
        return f"{obj.reviewer.last_name} {obj.reviewer.first_name}".strip()

    def get_assignment_count(self, obj):
        return obj.reviewer_assignments.count()


class ReviewerAssignmentDetailSerializer(serializers.ModelSerializer):
    reviewer_name = serializers.SerializerMethodField()
    assignments = serializers.SerializerMethodField()

    class Meta:
        model = ReviewerAssignmentSession
        fields = [
            'id', 'registration_period', 'reviewer', 'reviewer_name',
            'defense_date', 'location', 'assignments',
            'created_by', 'created_date',
        ]

    def get_reviewer_name(self, obj):
        return f"{obj.reviewer.last_name} {obj.reviewer.first_name}".strip()

    def get_assignments(self, obj):
        assignments = obj.reviewer_assignments.select_related(
            'registration', 'registration__student__student_profile',
        ).filter(registration__active=True)
        return [
            {
                'registration_id': a.registration_id,
                'student_name': f"{a.registration.student.last_name} {a.registration.student.first_name}".strip(),
                'student_id': getattr(
                    getattr(a.registration.student, 'student_profile', None),
                    'student_id', None,
                ),
                'project_title': a.registration.project_title,
                'approval_status': a.approval_status,
            }
            for a in assignments
        ]


class ReviewerAssignmentSessionPatchSerializer(serializers.Serializer):
    defense_date = serializers.DateTimeField(required=False)
    location = serializers.CharField(max_length=255, required=False)

    def validate(self, attrs):
        if not attrs:
            raise serializers.ValidationError(
                'Cần ít nhất một trường để cập nhật (defense_date hoặc location).'
            )
        defense_date = attrs.get('defense_date')
        if defense_date and defense_date < timezone.now():
            raise serializers.ValidationError({
                'defense_date': 'Ngày bảo vệ không được ở quá khứ.'
            })
        return attrs

    def update(self, instance, validated_data):
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        return instance
