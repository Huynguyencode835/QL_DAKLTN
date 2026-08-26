from django.utils import timezone
from django.shortcuts import get_object_or_404
from rest_framework import generics, viewsets, status
from rest_framework.exceptions import NotFound, ValidationError as DRFValidationError
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db import IntegrityError, transaction
from rest_framework import serializers


from theses.models import User, ProjectRegistration, RegistrationPeriod, RegistrationLecturer,PeriodicReportSchedule, Report
from theses.paginators import ItemRegistration, ReportMatrixPaginator
from theses.permissions import (
    CanCreateRegistration, IsStaffRole,
    IsRegistrationOwnerOrStaff, IsLecturerOrStaff,
    IsSupervisingLecturerForRegistration, IsStaffSameFacultyForRegistration,
    CanAccessRegistration, IsLecturerRole, IsStaffSameFacultyForPeriod,
)
from theses.serializeres import projectRegistrationSerializer, registrationPeriodSerializer
from theses.serializeres.scheduleSerializer import PeriodicReportScheduleSerializer
from theses.serializeres.reportsSerializer import ReportMatrixSerializer
from theses.services import _reevaluate_main_candidate, get_lecturer_remaining_slots


class RegistrationPeriodViewSet(viewsets.ViewSet,
                                generics.ListAPIView,
                                generics.CreateAPIView ,
                                generics.RetrieveAPIView,
                                generics.UpdateAPIView,
                                generics.DestroyAPIView):
    queryset = RegistrationPeriod.objects.filter(active=True)
    http_method_names = ['get', 'post', 'patch', 'delete', 'head', 'options']

    def get_serializer_class(self):
        if self.action == 'list':
            return registrationPeriodSerializer.RegistrationPeriodBasicSerializer
        return registrationPeriodSerializer.RegistrationPeriodSerializer

    def get_queryset(self):
        qs = RegistrationPeriod.objects.filter(
            active=True, faculty=self.request.user.faculty,
        )
        if self.request.user.role != User.Role.STAFF:
            qs = qs.exclude(status=RegistrationPeriod.STATUS.DRAFT)
        return qs

    def get_permissions(self):
        if self.action == 'registrations':
            if self.request.method == 'POST':
                return [CanCreateRegistration()]
        if self.action == 'create':
            return [IsStaffRole()]
        if self.action == 'schedules' and self.request.method == 'POST':
            return [IsLecturerRole()]
        if self.action in ('update', 'partial_update', 'destroy', 'publish'):
            return [IsStaffSameFacultyForPeriod()]
        if self.action in ('registration_detail', 'approve_registration',
                        'reject_registration', 'add_lecturer_to_registration'):
            return [IsRegistrationOwnerOrStaff()]
        if self.action == 'list':
            return [IsLecturerOrStaff()]
        return [IsAuthenticated()]

    def get_object(self):
        pk = self.kwargs.get('pk')
        if pk == 'current':
            user = self.request.user
            period = RegistrationPeriod.objects.filter(
                active=True,
                faculty=user.faculty,
                status__in=RegistrationPeriod.OPEN_STATUSES,
            ).first()
            if not period:
                raise NotFound('Hiện tại khoa của bạn chưa có đợt đăng ký nào đang mở.')
            # check_object_permissions vẫn cần được gọi như get_object gốc của DRF
            self.check_object_permissions(self.request, period)
            return period

        return super().get_object()

    def _check_draft(self, period):
        if period.status != RegistrationPeriod.STATUS.DRAFT:
            raise DRFValidationError(
                'Chỉ được sửa/xoá khi đợt ở trạng thái DRAFT (chưa công bố).'
            )

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
            active=True,
            faculty=period.faculty,
            status__in=RegistrationPeriod.OPEN_STATUSES,
        ).exclude(pk=period.pk).exists()
        if conflicting:
            return Response(
                {'detail': 'Khoa đã có đợt đang mở, không thể công bố thêm.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        period.status = RegistrationPeriod.STATUS.SCHEDULED
        period.save()

        s = registrationPeriodSerializer.RegistrationPeriodSerializer(
            period, context={'request': request},
        )
        return Response(s.data)

    def _get_registration_queryset(self, period):
        from django.db.models import Q

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

        return qs

    def _get_schedule_queryset(self, period):
        user = self.request.user
        qs = period.report_schedules.filter(active=True)

        if user.role == User.Role.LECTURER:
            qs = qs.filter(lecturer=user)
        elif user.role == User.Role.STUDENT:
            qs = qs.filter(registrations__student=user)

        return qs.distinct()

    def _check_in_student_registration_window(self, period):
        now = timezone.now()
        if now < period.student_registration_start:
            return 'Chưa đến thời gian đăng ký sinh viên.'
        if now > period.student_registration_end:
            return 'Đã hết thời gian đăng ký sinh viên.'
        return None

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
            return Response(serializer.data, status=status.HTTP_201_CREATED)

        qs = self._get_registration_queryset(period)
        qs = qs.select_related(
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

    def _build_report_columns(self, period, lecturer=None, key=None):
        schedules = []
        if lecturer is not None:
            qs = PeriodicReportSchedule.objects.filter(
                lecturer=lecturer, registration_period=period,
            )
            if key:
                qs = qs.filter(id=key)
            schedules = list(qs.order_by('sequence_number'))

        periodic_columns = [
            {
                'key': f'periodic_{s.sequence_number}',
                'label': f'Báo cáo lần {s.sequence_number}',
                'schedule_id': s.id,
                'deadline': s.deadline,
            }
            for s in schedules
        ]
        final_column = {
            'key': 'final',
            'label': 'Báo cáo cuối kỳ',
            'schedule_id': None,
            'deadline': period.report_submission_end,
        }
        columns = periodic_columns
        if not key:
            columns = columns + [final_column]
        return columns

    def _build_report_map(self, registrations, is_staff_view):
        reports = Report.objects.filter(registration_id__in=[r.id for r in registrations])
        if is_staff_view:
            reports = reports.filter(report_type=Report.ReportType.FINAL)

        report_map = {}
        for r in reports:
            key = f'periodic_{r.sequence_number}' if r.report_type == Report.ReportType.PERIODIC else 'final'
            report_map[(r.registration_id, key)] = r
        return report_map
    
    def _approved_main_registrations_queryset(self, period, lecturer=None):
        from django.db.models import Q

        filter_kwargs = {
            'registration_period': period,
            'lecturer_assignments__role': RegistrationLecturer.Role.MAIN,
            'lecturer_assignments__approval_status': RegistrationLecturer.ApprovalStatus.APPROVED,
            'active': True,
        }
        if lecturer is not None:
            filter_kwargs['lecturer_assignments__lecturer'] = lecturer

        qs = ProjectRegistration.objects.filter(**filter_kwargs)

        search = self.request.query_params.get('search')
        if search:
            qs = qs.filter(
                Q(student__first_name__icontains=search) |
                Q(student__last_name__icontains=search) |
                Q(student__student_profile__student_id__icontains=search) |
                Q(project_title__icontains=search)
            )

        return qs.select_related('student__student_profile').distinct()

    @action(methods=['GET'], detail=True, url_path='report-matrix', permission_classes=[IsLecturerOrStaff()])
    def reportMatrix(self, request, pk=None):
        if pk == 'current':
            period = RegistrationPeriod.objects.filter(
                faculty=request.user.faculty,
                status__in=RegistrationPeriod.OPEN_STATUSES,
            ).first()
            if not period:
                raise ('Không có đợt đăng ký nào đang mở.')
        else:
            period = get_object_or_404(RegistrationPeriod, pk=pk)

        user = request.user
        is_staff_view = user.role == User.Role.STAFF
        is_student_view = user.role == User.Role.STUDENT

        if is_staff_view:
            columns = self._build_report_columns(period, lecturer=None)
            registrations = list(self._approved_main_registrations_queryset(period))

        elif is_student_view:
            registration = ProjectRegistration.objects.filter(
                registration_period=period,
                student=user,
                active=True,
            ).select_related('student__student_profile').first()

            if not registration:
                return Response({'columns': [], 'rows': []})

            main_assignment = registration.lecturer_assignments.filter(
                role=RegistrationLecturer.Role.MAIN,
                approval_status=RegistrationLecturer.ApprovalStatus.APPROVED,
            ).first()
            lecturer = main_assignment.lecturer if main_assignment else None

            columns = self._build_report_columns(period, lecturer=lecturer)
            registrations = [registration]

        else:
            keySchedule = request.query_params.get('schedule')
            lecturer = user
            columns = self._build_report_columns(period, lecturer=lecturer, key=keySchedule)
            registrations = list(self._approved_main_registrations_queryset(period, lecturer=lecturer))

        report_map = self._build_report_map(registrations, is_staff_view)

        serializer = ReportMatrixSerializer(
            registrations, many=True,
            context={'columns': columns, 'report_map': report_map},
        )

        paginator = ReportMatrixPaginator()
        request.columns = columns
        page = paginator.paginate_queryset(serializer.data, request, view=self)
        if page is not None:
            return paginator.get_paginated_response(page)
        return Response({'columns': columns, 'rows': serializer.data, 'count': len(serializer.data)})

    @action(methods=['GET', 'POST'], detail=True, url_path='schedules')
    def schedules(self, request, pk=None):
        period = self.get_object()

        if request.method == 'POST':
            serializer = PeriodicReportScheduleSerializer(
                data=request.data,
                context={'request': request, 'registration_period': period},
            )
            serializer.is_valid(raise_exception=True)
            serializer.save(lecturer=request.user, registration_period=period)
            return Response(serializer.data, status=status.HTTP_201_CREATED)

        qs = self._get_schedule_queryset(period).select_related(
            'registration_period', 'lecturer',
        ).prefetch_related('registrations')
        s = PeriodicReportScheduleSerializer(
            qs, many=True, context={'request': request},
        )
        return Response(s.data)

    @action(
        methods=['GET'], detail=True,
        url_path='schedules/(?P<schedule_pk>[^/.]+)',
    )
    def schedule_detail(self, request, pk=None, schedule_pk=None):
        period = self.get_object()
        schedule = get_object_or_404(self._get_schedule_queryset(period), pk=schedule_pk)
        s = PeriodicReportScheduleSerializer(
            schedule, context={'request': request},
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

            err = self._check_in_student_registration_window(registration.registration_period)
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
                print(get_lecturer_remaining_slots(request.user))
                return Response(
                    {'detail': 'Giảng viên đã hết chỉ tiêu hướng dẫn trong đợt đăng ký hiện tại.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            assignment.approval_status = RegistrationLecturer.ApprovalStatus.APPROVED
            assignment.responded_at = timezone.now()
            assignment.save()

            _reevaluate_main_candidate(registration)

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

            err = self._check_in_student_registration_window(registration.registration_period)
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
                registration=registration,
                lecturer=lecturer,
                role=RegistrationLecturer.Role.MAIN,
                approval_status=RegistrationLecturer.ApprovalStatus.APPROVED,
                responded_at=timezone.now(),
            )

            # Các nguyện vọng (PREFERENCE) còn đang chờ duyệt -> không cần duyệt nữa
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
