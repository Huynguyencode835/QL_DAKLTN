from django.db import transaction
from django.db.models import Q, Exists, OuterRef
from django.utils import timezone
from django.shortcuts import get_object_or_404
from django.conf import settings
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.response import Response

from theses.models import (
    User, ProjectRegistration, RegistrationPeriod, RegistrationLecturer, Report, Grade,
)
from theses.paginators import ItemRegistration
from theses.permissions import (
    IsSupervisingLecturerForRegistration,
    IsStaffSameFacultyForRegistration,
    CanAccessRegistration, IsStaffRoleFaculty,
    IsStaffSameFacultyForPeriod,
)
from theses.serializeres import projectRegistrationSerializer
from theses.services import _reevaluate_main_candidate, get_lecturer_remaining_slots
from theses.email_utils import send_notification_email


class RegistrationActionsMixin:
    """registrations (list/create), registration_detail, approve, reject, add_lecturer."""

    def _get_registration_queryset(self, period):
        user = self.request.user
        qs = ProjectRegistration.objects.filter(
            registration_period=period, active=True
        )
        if user.role == User.Role.STUDENT:
            qs = qs.filter(student=user)
        elif user.role == User.Role.LECTURER:
            qs = qs.filter(lecturer_assignments__lecturer=user)
        elif user.role == User.Role.STAFF:
            qs = qs.filter(student__faculty=user.faculty)

        search = self.request.query_params.get('search')
        if search:
            qs = qs.filter(
                Q(student__first_name__icontains=search) |
                Q(student__last_name__icontains=search) |
                Q(student__student_profile__student_id__icontains=search) |
                Q(project_title__icontains=search)
            )
        specialization_id = self.request.query_params.get('specialization')
        if specialization_id:
            qs = qs.filter(specialization_id=specialization_id)
        status_filter = self.request.query_params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter)

        has_final_report = self.request.query_params.get('has_final_report')
        if has_final_report == 'true':
            qs = qs.filter(
                Exists(Report.objects.filter(
                    registration=OuterRef('pk'),
                    report_type=Report.ReportType.FINAL,
                ))
            )

        no_committee = self.request.query_params.get('no_committee')
        if no_committee == 'true':
            qs = qs.filter(committee__isnull=True)

        return qs


    def _get_registraion_thesis(self, period):
        user = self.request.user
        qs = ProjectRegistration.objects.filter(
            student__faculty=user.faculty,
            registration_period=period, active=True,
            is_thesis=False,
            wants_thesis_upgrade=True,
            final_score__gte=8,
            student__student_profile__gpa__gt=2.5,
            upgraded_to__isnull=True,
        ).select_related(
            'student', 'student__student_profile', 'registration_period',
        )
        search = self.request.query_params.get('search')
        if search:
            qs = qs.filter(
                Q(student__first_name__icontains=search) |
                Q(student__last_name__icontains=search) |
                Q(student__student_profile__student_id__icontains=search) |
                Q(project_title__icontains=search)
            )
        specialization_id = self.request.query_params.get('specialization')
        if specialization_id:
            qs = qs.filter(specialization_id=specialization_id)
        status_filter = self.request.query_params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter)

        has_final_report = self.request.query_params.get('has_final_report')
        if has_final_report == 'true':
            qs = qs.filter(
                Exists(Report.objects.filter(
                    registration=OuterRef('pk'),
                    report_type=Report.ReportType.FINAL,
                ))
            )

        no_committee = self.request.query_params.get('no_committee')
        if no_committee == 'true':
            qs = qs.filter(committee__isnull=True)

        return qs

    
    @action(methods=['GET', 'POST'], detail=True, url_path='registrations')
    def registrations(self, request, pk=None):
        period = self.get_object()
        if request.method == 'POST':
            err = self._check_in_student_registration_window(period)
            if err:
                return Response({'detail': err}, status=status.HTTP_400_BAD_REQUEST)
            serializer = projectRegistrationSerializer.ProjectRegistrationSerializer(
                data=request.data,
                context={'request': request, 'registration_period': period},
            )
            serializer.is_valid(raise_exception=True)
            serializer.save(registration_period=period)
            registration = serializer.instance
            send_notification_email(
                'info_notification',
                'Xác nhận đăng ký đề tài',
                [request.user.email],
                {
                    'title': 'Xác nhận đăng ký đề tài',
                    'student_name': request.user.get_full_name() or request.user.username,
                    'message': f'Đăng ký đề tài "{registration.project_title}" đã được gửi thành công. Vui lòng chờ giảng viên xác nhận.',
                    'details': [
                        ('Đợt đăng ký', period.name),
                        ('Đề tài', registration.project_title),
                    ],
                    'action_url': f'{settings.FRONTEND_URL}/topic-registration',
                    'action_label': 'Xem đăng ký',
                },
            )
            return Response(serializer.data, status=status.HTTP_201_CREATED)

        qs = self._get_registration_queryset(period).select_related(
            'student', 'student__student_profile',
        ).prefetch_related('lecturer_assignments__lecturer')
        paginator = ItemRegistration()
        page = paginator.paginate_queryset(qs, request, view=self)
        if page is not None:
            s = projectRegistrationSerializer.ProjectRegistrationSerializer(
                page, many=True, context={'request': request},
            )
            return paginator.get_paginated_response(s.data)
        s = projectRegistrationSerializer.ProjectRegistrationSerializer(
            qs, many=True, context={'request': request},
        )
        return Response(s.data)

    @action(
        methods=['GET'], detail=True,
        url_path='registrations/(?P<registration_pk>[^/.]+)',
        permission_classes=[CanAccessRegistration()],
    )
    def registration_detail(self, request, pk=None, registration_pk=None):
        qs = ProjectRegistration.objects.select_related(
            'student', 'student__student_profile', 'student__student_profile__major',
            'student__faculty',
        ).prefetch_related(
            'lecturer_assignments__lecturer__lecturer_profile',
            'lecturer_assignments__lecturer__lecturer_profile__specializations',
        )
        registration = get_object_or_404(qs, pk=registration_pk)
        self.check_object_permissions(request, registration)
        s = projectRegistrationSerializer.ProjectRegistrationDetailSerializer(
            registration, context={'request': request},
        )
        return Response(s.data)

    @action(
            methods=['GET'], detail=True,
            url_path='registrations-thesis',
            permission_classes=[IsStaffRoleFaculty()],
        )
    def registration_Thesis(self, request, pk=None, registration_pk=None):
        period = self.get_object()
        qs = self._get_registraion_thesis(period)
        paginator = ItemRegistration()
        page = paginator.paginate_queryset(qs, request, view=self)
        if page is not None:
            s = projectRegistrationSerializer.ProjectRegistrationSerializer(
                page, many=True, context={'request': request},
            )
            return paginator.get_paginated_response(s.data)
        s = projectRegistrationSerializer.ProjectRegistrationSerializer(
            qs, many=True, context={'request': request},
        )
        return Response(s.data)

    @action(
        methods=['PATCH'], detail=True,
        url_path='registrations/(?P<registration_pk>[^/.]+)/approve',
        permission_classes=[IsSupervisingLecturerForRegistration],
    )
    def approve_registration(self, request, pk=None, registration_pk=None):
        with transaction.atomic():
            registration = get_object_or_404(
                ProjectRegistration.objects.select_for_update(of=('self',)).select_related('registration_period'),
                pk=registration_pk,
            )
            self.check_object_permissions(request, registration)
            period = registration.registration_period
            if period.status != RegistrationPeriod.STATUS.STUDENT_REGISTRATION:
                return Response(
                    {'detail': 'Chỉ có thể duyệt trong thời gian đăng ký sinh viên.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            err = self._check_in_student_registration_window(period)
            if err:
                return Response({'detail': err}, status=status.HTTP_400_BAD_REQUEST)
            serializer = projectRegistrationSerializer.ApproveRegistrationSerializer(
                data=request.data,
                context={'registration': registration, 'request': request}
            )
            serializer.is_valid(raise_exception=True)
            assignment = serializer.validated_data['assignment']
            if assignment.approval_status != RegistrationLecturer.ApprovalStatus.PENDING:
                return Response(
                    {'detail': 'Nguyện vọng này không còn ở trạng thái chờ duyệt.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if get_lecturer_remaining_slots(request.user) <= 0:
                return Response(
                    {'detail': 'Giảng viên đã hết chỉ tiêu hướng dẫn trong đợt đăng ký hiện tại.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            assignment.approval_status = RegistrationLecturer.ApprovalStatus.APPROVED
            assignment.responded_at = timezone.now()
            assignment.save()
            _reevaluate_main_candidate(registration)

            send_notification_email(
                'approval_notification',
                'Đăng ký đề tài đã được duyệt',
                [registration.student.email],
                {
                    'title': 'Đăng ký đề tài đã được duyệt',
                    'student_name': registration.student.get_full_name() or registration.student.username,
                    'message': f'Giảng viên {request.user.get_full_name() or request.user.username} đã duyệt đăng ký của bạn.',
                    'details': [
                        ('Đề tài', registration.project_title),
                        ('Giảng viên hướng dẫn', request.user.get_full_name() or request.user.username),
                    ],
                    'action_url': f'{settings.FRONTEND_URL}/my-topics',
                    'action_label': 'Xem đề tài',
                },
            )
        s = projectRegistrationSerializer.ProjectRegistrationDetailSerializer(
            registration, context={'request': request},
        )
        return Response(s.data, status=status.HTTP_200_OK)

    @action(
        methods=['PATCH'], detail=True,
        url_path='registrations/(?P<registration_pk>[^/.]+)/reject',
        permission_classes=[IsSupervisingLecturerForRegistration],
    )
    def reject_registration(self, request, pk=None, registration_pk=None):
        with transaction.atomic():
            registration = get_object_or_404(
                ProjectRegistration.objects.select_for_update(of=('self',)).select_related('registration_period'),
                pk=registration_pk,
            )
            self.check_object_permissions(request, registration)
            period = registration.registration_period
            if period.status != RegistrationPeriod.STATUS.STUDENT_REGISTRATION:
                return Response(
                    {'detail': 'Chỉ có thể từ chối trong thời gian đăng ký sinh viên.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            err = self._check_in_student_registration_window(period)
            if err:
                return Response({'detail': err}, status=status.HTTP_400_BAD_REQUEST)
            serializer = projectRegistrationSerializer.RejectRegistrationSerializer(
                data=request.data,
                context={'registration': registration, 'request': request}
            )
            serializer.is_valid(raise_exception=True)
            assignment = serializer.validated_data['assignment']
            if assignment.approval_status != RegistrationLecturer.ApprovalStatus.PENDING:
                return Response(
                    {'detail': 'Nguyện vọng này không còn ở trạng thái chờ duyệt.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            assignment.approval_status = RegistrationLecturer.ApprovalStatus.REJECTED
            assignment.responded_at = timezone.now()
            assignment.note = serializer.validated_data.get('note', '')
            assignment.save()
            _reevaluate_main_candidate(registration)

            note = assignment.note or 'Không rõ'
            send_notification_email(
                'action_required',
                'Đăng ký đề tài bị từ chối',
                [registration.student.email],
                {
                    'title': 'Đăng ký đề tài bị từ chối',
                    'student_name': registration.student.get_full_name() or registration.student.username,
                    'message': f'Giảng viên {request.user.get_full_name() or request.user.username} từ chối đăng ký của bạn.',
                    'details': [
                        ('Đề tài', registration.project_title),
                        ('Lý do', note),
                    ],
                    'action_url': f'{settings.FRONTEND_URL}/topic-registration',
                    'action_label': 'Đăng ký lại',
                },
            )
        s = projectRegistrationSerializer.ProjectRegistrationDetailSerializer(
            registration, context={'request': request},
        )
        return Response(s.data, status=status.HTTP_200_OK)

    @action(
        methods=['PATCH'], detail=True,
        url_path='registrations/(?P<registration_pk>[^/.]+)/add_lecturer',
        permission_classes=[IsStaffSameFacultyForRegistration],
    )
    def add_lecturer_to_registration(self, request, pk=None, registration_pk=None):
        with transaction.atomic():
            registration = get_object_or_404(
                ProjectRegistration.objects.select_for_update(of=('self',)).select_related(
                    'student', 'student__faculty', 'registration_period',
                ),
                pk=registration_pk,
            )
            self.check_object_permissions(request, registration)
            err = self._check_in_student_registration_window(registration.registration_period)
            if err:
                return Response({'detail': err}, status=status.HTTP_400_BAD_REQUEST)
            if registration.status not in (
                ProjectRegistration.STATUS.WAITING_LECTURER_AND_PENDING,
                ProjectRegistration.STATUS.WAITING_STAFF_ASSIGNMENT,
            ):
                return Response(
                    {'detail': 'Đăng ký này không ở trạng thái chờ phân giảng viên.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            serializer = projectRegistrationSerializer.AddLecturerSerializer(
                data=request.data,
                context={'registration': registration}
            )
            serializer.is_valid(raise_exception=True)
            lecturer = serializer.validated_data['lecturer_id']
            if get_lecturer_remaining_slots(lecturer) <= 0:
                return Response(
                    {'detail': 'Giảng viên đã hết chỉ tiêu hướng dẫn trong đợt đăng ký hiện tại.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            RegistrationLecturer.objects.create(
                registration=registration, lecturer=lecturer,
                role=RegistrationLecturer.Role.MAIN,
                approval_status=RegistrationLecturer.ApprovalStatus.APPROVED,
                responded_at=timezone.now(),
            )
            pending_preferences = registration.lecturer_assignments.filter(
                role=RegistrationLecturer.Role.PREFERENCE,
                approval_status=RegistrationLecturer.ApprovalStatus.PENDING,
            ).select_for_update()
            for assignment in pending_preferences:
                assignment.approval_status = RegistrationLecturer.ApprovalStatus.SKIPPED
                assignment.save(update_fields=['approval_status', 'updated_date'])
            registration.status = ProjectRegistration.STATUS.ASSIGNED_LECTURER_AND_PENDING
            registration.save()
        s = projectRegistrationSerializer.ProjectRegistrationDetailSerializer(
            registration, context={'request': request},
        )
        return Response(s.data, status=status.HTTP_200_OK)

    @action(methods=['GET'], detail=True, url_path='reviewer-eligible-registrations',
            permission_classes=[IsStaffSameFacultyForPeriod])
    def reviewer_eligible_registrations(self, request, pk=None):
        period = self.get_object()

        qs = ProjectRegistration.objects.filter(
            registration_period=period,
            active=True,
            is_thesis=True,
        ).filter(
            Exists(Grade.objects.filter(
                registration=OuterRef('pk'),
                grade_type=Grade.GradeType.SUPERVISOR,
                component=Grade.Component.PROCESS,
            ))
        ).filter(
            Exists(Grade.objects.filter(
                registration=OuterRef('pk'),
                grade_type=Grade.GradeType.SUPERVISOR,
                component=Grade.Component.FINAL,
            ))
        ).annotate(
            has_valid_reviewer=Exists(
                RegistrationLecturer.objects.filter(
                    registration=OuterRef('pk'),
                    role=RegistrationLecturer.Role.REVIEWER,
                    reviewer_session__isnull=False,   # ← chỉ tính là "có" nếu session còn tồn tại
                    reviewer_session__active=True,    # ← nếu session cũng có soft-delete, check thêm
                )
            )
        ).filter(
            has_valid_reviewer=False,
        ).select_related(
            'student', 'student__student_profile',
        ).prefetch_related(
            'lecturer_assignments__lecturer',
            'lecturer_assignments'
        )

        search = request.query_params.get('search')
        if search:
            qs = qs.filter(
                Q(student__first_name__icontains=search) |
                Q(student__last_name__icontains=search) |
                Q(student__student_profile__student_id__icontains=search) |
                Q(project_title__icontains=search)
            )

        paginator = ItemRegistration()
        page = paginator.paginate_queryset(qs, request, view=self)
        if page is not None:
            s = projectRegistrationSerializer.ProjectRegistrationSerializer(
                page, many=True, context={'request': request},
            )
            return paginator.get_paginated_response(s.data)
        s = projectRegistrationSerializer.ProjectRegistrationSerializer(
            qs, many=True, context={'request': request},
        )
        return Response(s.data)