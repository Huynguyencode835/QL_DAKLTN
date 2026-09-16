from django.db import transaction
from django.conf import settings
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.response import Response

from theses.models import RegistrationPeriod, User
from theses.serializeres import registrationPeriodSerializer
from theses.serializeres import projectRegistrationSerializer
from theses.email_utils import send_notification_email


class PeriodActionsMixin:

    def partial_update(self, request, *args, **kwargs):
        period = self.get_object()
        self._check_draft(period)
        return super().partial_update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        period = self.get_object()
        self._check_draft(period)
        return super().destroy(request, *args, **kwargs)

    @action(detail=True, methods=['post'], url_path='publish')
    def publish(self, request, pk=None):
        period = self.get_object()
        if period.status != RegistrationPeriod.STATUS.DRAFT:
            return Response(
                {'detail': 'Chỉ chuyển đợt DRAFT (chưa công bố) sang SCHEDULED.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        conflicting = RegistrationPeriod.objects.filter(
            active=True, faculty=period.faculty,
            status__in=RegistrationPeriod.OPEN_STATUSES,
            period_type=period.period_type
        ).exclude(pk=period.pk).exists()
        if conflicting:
            return Response(
                {'detail': 'Khoa đã có đợt đang mở, không thể công bố thêm.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        period.status = RegistrationPeriod.STATUS.SCHEDULED
        period.save()

        faculty_users = User.objects.filter(
            faculty=period.faculty, is_active=True,
            role__in=[User.Role.STUDENT, User.Role.LECTURER],
        ).values_list('email', flat=True)
        send_notification_email(
            'info_notification',
            f'Đợt đăng ký "{period.name}" đã mở',
            list(faculty_users),
            {
                'title': f'Đợt đăng ký "{period.name}" đã mở',
                'message': f'Đợt đăng ký "{period.name}" ({period.academic_year}) đã được công bố. Thời gian đăng ký: {timezone.localtime(period.student_registration_start).strftime("%d/%m/%Y %H:%M")}.',
                'details': [
                    ('Đợt đăng ký', period.name),
                    ('Năm học', period.academic_year),
                    ('Bắt đầu đăng ký', timezone.localtime(period.student_registration_start).strftime('%d/%m/%Y %H:%M')),
                ],
                'action_url': f'{settings.FRONTEND_URL}/topic-registration',
                'action_label': 'Đăng ký ngay',
            },
        )

        s = registrationPeriodSerializer.RegistrationPeriodSerializer(
            period, context={'request': request},
        )
        return Response(s.data)

    @action(detail=True, methods=['post'], url_path='create-thesis')
    def create_thesis(self, request, pk=None):
        parent_period = self.get_object()

        if parent_period.period_type != RegistrationPeriod.PeriodType.PROJECT:
            return Response(
                {'detail': 'Chỉ có thể tạo đợt khóa luận từ đợt đồ án (period_type=project).'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if parent_period.status != RegistrationPeriod.STATUS.CLOSED or not parent_period.closed_at:
            return Response(
                {'detail': 'Đợt đồ án phải ở trạng thái CLOSED (đã có closed_at) trước khi tạo đợt khóa luận.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if parent_period.thesis_periods.exists():
            return Response(
                {'detail': 'Đợt đồ án này đã có đợt khóa luận được tạo trước đó.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = registrationPeriodSerializer.ThesisPeriodCreateSerializer(
            data=request.data,
            context={'request': request, 'parent_period': parent_period},
        )
        serializer.is_valid(raise_exception=True)
        with transaction.atomic():
            thesis_period = serializer.save()

        send_notification_email(
            'info_notification',
            f'Đợt khóa luận "{thesis_period.name}" đã mở',
            list(
                User.objects.filter(
                    faculty=thesis_period.faculty, is_active=True,
                    role__in=[User.Role.STUDENT, User.Role.LECTURER],
                ).values_list('email', flat=True)
            ),
            {
                'title': f'Đợt khóa luận "{thesis_period.name}" đã mở',
                'message': f'Đợt khóa luận "{thesis_period.name}" đã được tạo từ đợt đồ án "{parent_period.name}".',
                'details': [
                    ('Đợt khóa luận', thesis_period.name),
                    ('Đợt gốc', parent_period.name),
                ],
                'action_url': f'{settings.FRONTEND_URL}/topic-registration',
                'action_label': 'Xem đợt đăng ký',
            },
        )

        output = registrationPeriodSerializer.RegistrationPeriodSerializer(
            thesis_period, context={'request': request},
        )
        return Response(output.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path='convert-to-thesis')
    def convert_to_thesis(self, request, pk=None):
        thesis_period = self.get_object()

        if thesis_period.period_type != RegistrationPeriod.PeriodType.THESIS:
            return Response(
                {'detail': 'Chỉ thực hiện trên đợt khóa luận.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not thesis_period.parent_period:
            return Response(
                {'detail': 'Đợt khóa luận phải có parent period.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = projectRegistrationSerializer.ConvertToThesisSerializer(
            data=request.data,
            context={'request': request, 'thesis_period': thesis_period},
        )
        serializer.is_valid(raise_exception=True)
        with transaction.atomic():
            created = serializer.save()

        for reg in created:
            send_notification_email(
                'approval_notification',
                'Đề tài được nâng cấp lên khóa luận',
                [reg.student.email],
                {
                    'title': 'Đề tài được nâng cấp lên khóa luận',
                    'student_name': reg.student.get_full_name() or reg.student.username,
                    'message': f'Đề tài "{reg.project_title}" của bạn đã được nâng cấp lên khóa luận.',
                    'details': [
                        ('Đề tài', reg.project_title),
                        ('Đợt khóa luận', thesis_period.name),
                    ],
                    'action_url': f'{settings.FRONTEND_URL}/my-topics',
                    'action_label': 'Xem đề tài',
                },
            )

        output = projectRegistrationSerializer.ProjectRegistrationSerializer(
            created, many=True, context={'request': request},
        )
        return Response(output.data, status=status.HTTP_201_CREATED)