from rest_framework import serializers
from theses.models import (
    PeriodicReportSchedule, ProjectRegistration, RegistrationLecturer, RegistrationPeriod,
)


class PeriodicReportScheduleSerializer(serializers.ModelSerializer):
    registrations = serializers.PrimaryKeyRelatedField(read_only=True, many=True)
    sequence_number = serializers.IntegerField(read_only=True)
    lecturer = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = PeriodicReportSchedule
        fields = [
            'id', 'registrations', 'sequence_number', 'title', 'deadline',
            'lecturer', 'registration_period', 'created_date',
        ]
        read_only_fields = ['id', 'created_date']

    def validate(self, attrs):
        instance = self.instance
        request = self.context.get('request')

        lecturer = instance.lecturer if instance else (request.user if request else None)
        period = attrs.get('registration_period') or (
            instance.registration_period if instance else None
        )
        deadline = attrs.get('deadline') or (instance.deadline if instance else None)

        if not (lecturer and period and deadline):
            return attrs

        if not period.active or period.status not in RegistrationPeriod.OPEN_STATUSES:
            raise serializers.ValidationError(
                {'registration_period': 'Chỉ được chọn đợt đang hoạt động (chưa đóng).'}
            )

        # window_start = period.student_registration_end
        # window_end = period.report_submission_start
        # if deadline < window_start or deadline > window_end:
        #     raise serializers.ValidationError(
        #         {
        #             'deadline': (
        #                 f'Deadline phải nằm trong thời gian thực hiện đồ án '
        #                 f'({window_start:%Y-%m-%d %H:%M} → {window_end:%Y-%m-%d %H:%M}).'
        #             )
        #         }
        #     )

        if instance:
            seq = instance.sequence_number
        else:
            last = PeriodicReportSchedule.objects.filter(
                lecturer=lecturer, registration_period=period,
            ).order_by('-sequence_number').first()
            seq = (last.sequence_number + 1) if last else 1

        siblings = PeriodicReportSchedule.objects.filter(
            lecturer=lecturer, registration_period=period,
        )
        if instance:
            siblings = siblings.exclude(pk=instance.pk)

        prev = siblings.filter(sequence_number__lt=seq).order_by('-sequence_number').first()
        next_schedule = siblings.filter(sequence_number__gt=seq).order_by('sequence_number').first()

        if prev and deadline <= prev.deadline:
            raise serializers.ValidationError(
                {'deadline': 'Deadline của đợt này phải sau deadline của đợt trước.'}
            )
        if next_schedule and deadline >= next_schedule.deadline:
            raise serializers.ValidationError(
                {'deadline': 'Deadline của đợt này phải trước deadline của đợt sau.'}
            )
        return attrs

    def create(self, validated_data):
        lecturer = validated_data['lecturer']
        period = validated_data['registration_period']

        last = PeriodicReportSchedule.objects.filter(
            lecturer=lecturer, registration_period=period,
        ).order_by('-sequence_number').first()
        validated_data['sequence_number'] = (last.sequence_number + 1) if last else 1

        schedule = super().create(validated_data)

        registrations = ProjectRegistration.objects.filter(
            registration_period=period,
            lecturer_assignments__lecturer=lecturer,
            lecturer_assignments__role=RegistrationLecturer.Role.MAIN,
            active=True,
        ).distinct()
        schedule.registrations.set(registrations)
        return schedule
