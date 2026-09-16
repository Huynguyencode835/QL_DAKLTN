from django.db import transaction
from django.conf import settings
from django.utils import timezone
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.response import Response

from theses.models import RegistrationLecturer, ReviewerAssignmentSession, User
from theses.serializeres.reviewerSessionSerializer import (
    ReviewerAssignmentSessionReadSerializer,
    ReviewerAssignmentSessionWriteSerializer,
    ReviewerAssignmentDetailSerializer,
    ReviewerAssignmentSessionPatchSerializer,
)
from theses.email_utils import send_notification_email


class ReviewerActionsMixin:

    @action(methods=['GET', 'POST'], detail=True, url_path='reviewer-sessions')
    def reviewer_sessions(self, request, pk=None):
        period = self.get_object()

        if request.method == 'POST':
            with transaction.atomic():
                serializer = ReviewerAssignmentSessionWriteSerializer(
                    data=request.data,
                    context={'request': request, 'registration_period': period},
                )
                serializer.is_valid(raise_exception=True)
                session = serializer.save()

            reviewer_email = session.reviewer.email
            student_emails = [
                rl.registration.student.email
                for rl in session.reviewer_assignments.all()
                if rl.registration.student.email
            ]
            all_recipients = list(set([reviewer_email] + student_emails))

            send_notification_email(
                'info_notification',
                f'Phân công phản biện "{session.reviewer.get_full_name()}"',
                all_recipients,
                {
                    'title': f'Phân công phản biện',
                    'message': f'Giáo vụ đã phân công giảng viên {session.reviewer.get_full_name()} phản biện cho các đề tài sau. Ngày bảo vệ: {timezone.localtime(session.defense_date).strftime("%d/%m/%Y %H:%M")}.',
                    'details': [
                        ('Phản biện', session.reviewer.get_full_name()),
                        ('Ngày bảo vệ', timezone.localtime(session.defense_date).strftime('%d/%m/%Y %H:%M')),
                        ('Địa điểm', session.location),
                        ('Số đề tài', str(session.reviewer_assignments.count())),
                    ],
                    'action_url': f'{settings.FRONTEND_URL}/my-topics',
                    'action_label': 'Xem chi tiết',
                },
            )

            return Response(
                ReviewerAssignmentSessionReadSerializer(session).data,
                status=status.HTTP_201_CREATED,
            )

        qs = ReviewerAssignmentSession.objects.filter(
            registration_period=period, active=True,
        ).select_related('reviewer', 'created_by')

        if request.user.role == User.Role.LECTURER:
            qs = qs.filter(reviewer=request.user)
        elif request.user.role == User.Role.STUDENT:
            qs = qs.filter(
                reviewer_assignments__registration__student=request.user,
            ).distinct()

        data = ReviewerAssignmentSessionReadSerializer(qs, many=True).data
        return Response(data)

    @action(methods=['GET', 'PATCH', 'DELETE'], detail=True,
            url_path='reviewer-sessions/(?P<session_pk>[^/.]+)')
    def reviewer_session_detail(self, request, pk=None, session_pk=None):
        period = self.get_object()
        session = get_object_or_404(
            ReviewerAssignmentSession,
            pk=session_pk,
            registration_period=period,
            active=True,
        )

        if request.method == 'DELETE':
            with transaction.atomic():
                RegistrationLecturer.objects.filter(
                    reviewer_session=session,
                ).delete()
                session.active = False
                session.save()
            return Response(status=status.HTTP_204_NO_CONTENT)

        if request.method == 'PATCH':
            serializer = ReviewerAssignmentSessionPatchSerializer(
                session, data=request.data, partial=True,
            )
            serializer.is_valid(raise_exception=True)
            session = serializer.save()
            return Response(
                ReviewerAssignmentSessionReadSerializer(session).data,
            )

        data = ReviewerAssignmentDetailSerializer(session).data
        return Response(data)
