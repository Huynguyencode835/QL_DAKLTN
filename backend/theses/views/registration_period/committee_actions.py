from django.db import transaction
from django.conf import settings
from django.utils import timezone
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q

from theses.models import Committee, User
from theses.serializeres.committeeSerializer import (
    CommitteeLecturerListSerializer, CommitteeSerializer, CommitteeListSerializer,CommitteeStudentSerializer
)
from theses.email_utils import send_notification_email


class CommitteeActionsMixin:
    @action(methods=['GET', 'POST'], detail=True, url_path='committees')
    def committees(self, request, pk=None):
        period = self.get_object()

        if request.method == 'POST':
            serializer = CommitteeSerializer(
                data=request.data,
                context={'request': request, 'registration_period': period},
            )
            serializer.is_valid(raise_exception=True)
            with transaction.atomic():
                serializer.save()
            committee = serializer.instance

            member_emails = [m.lecturer.email for m in committee.members.all() if m.lecturer.email]
            student_emails = [r.student.email for r in committee.registrations.all() if r.student.email]
            all_recipients = list(set(member_emails + student_emails))

            send_notification_email(
                'info_notification',
                f'Phân công hội đồng "{committee.name}"',
                all_recipients,
                {
                    'title': f'Phân công hội đồng "{committee.name}"',
                    'message': f'Bạn được phân công vào hội đồng "{committee.name}". Ngày bảo vệ: {timezone.localtime(committee.defense_date).strftime("%d/%m/%Y %H:%M")}.',
                    'details': [
                        ('Hội đồng', committee.name),
                        ('Ngày bảo vệ', timezone.localtime(committee.defense_date).strftime('%d/%m/%Y %H:%M')),
                        ('Địa điểm', committee.location),
                    ],
                    'action_url': f'{settings.FRONTEND_URL}/my-topics',
                    'action_label': 'Xem chi tiết',
                },
            )

            return Response(serializer.data, status=status.HTTP_201_CREATED)

        qs = Committee.objects.filter(
            registration_period=period, active=True,
        ).prefetch_related('members', 'registrations')

        status_param = request.query_params.get('status')

        if status_param == 'not_started':
            qs = qs.filter(status = Committee.CommitteeStatus.NOT_STARTED)
        elif status_param == 'in_progress':
            qs = qs.filter(status = Committee.CommitteeStatus.IN_PROGRESS)
        elif status_param == 'completed':
            qs = qs.filter(status = Committee.CommitteeStatus.COMPLETED)

        search = request.query_params.get('search')
        if search:
            qs = qs.filter(
                Q(name__icontains=search) |
                Q(location__icontains=search) |
                Q(defense_date__icontains=search)
            )

        if request.user.role == User.Role.LECTURER:
            qs = qs.filter(members__lecturer=request.user).distinct()
            s = CommitteeLecturerListSerializer(qs, many=True, context={'request': request})
            return Response(s.data)

        if request.user.role == User.Role.STUDENT:
            committee = qs.filter(registrations__student=request.user).first()
            if not committee:
                return Response({'detail': 'Không tìm thấy hội đồng.'}, status=status.HTTP_404_NOT_FOUND)
            s = CommitteeStudentSerializer(committee, context={'request': request})
            return Response(s.data)

        s = CommitteeListSerializer(qs, many=True)
        return Response(s.data)

    @action(methods=['GET', 'PATCH', 'DELETE'], detail=True,
            url_path='committees/(?P<committee_pk>[^/.]+)')
    def committee_detail(self, request, pk=None, committee_pk=None):
        period = self.get_object()
        committee = get_object_or_404(
            Committee, pk=committee_pk, registration_period=period, active=True,
        )

        if request.method == 'DELETE':
            if committee.status != Committee.CommitteeStatus.NOT_STARTED:
                return Response(
                    {'detail': 'Chỉ có thể xóa hội đồng ở trạng thái "Chưa diễn ra".'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            committee.registrations.update(committee=None)
            committee.active = False
            committee.save()
            return Response(status=status.HTTP_204_NO_CONTENT)

        if request.method == 'PATCH':
            serializer = CommitteeSerializer(
                committee, data=request.data, partial=True,
                context={'request': request, 'registration_period': period},
            )
            serializer.is_valid(raise_exception=True)
            with transaction.atomic():
                serializer.save()
            return Response(serializer.data)

        s = CommitteeSerializer(
            committee, context={'request': request, 'registration_period': period},
        )
        return Response(s.data)
