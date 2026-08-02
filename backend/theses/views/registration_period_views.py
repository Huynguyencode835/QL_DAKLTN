from django.utils import timezone
from django.shortcuts import get_object_or_404
from rest_framework import generics, viewsets, status
from rest_framework.exceptions import NotFound
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from theses.models import User, ProjectRegistration, RegistrationPeriod, RegistrationLecturer
from theses.permissions import (
    CanCreateRegistration, IsStaffRole,
    IsRegistrationOwnerOrStaff, IsLecturerOrStaff,
    IsSupervisingLecturerForRegistration, IsStaffSameFacultyForRegistration,
    CanAccessRegistration,
)
from theses.serializeres import projectRegistrationSerializer, registrationPeriodSerializer


class RegistrationPeriodViewSet(viewsets.ViewSet,
                                generics.ListAPIView,
                                generics.CreateAPIView ,
                                generics.RetrieveAPIView):
    queryset = RegistrationPeriod.objects.filter(active=True)

    def get_serializer_class(self):
        if self.action == 'list':
            return registrationPeriodSerializer.RegistrationPeriodBasicSerializer
        return registrationPeriodSerializer.RegistrationPeriodSerializer

    def get_queryset(self):
        return RegistrationPeriod.objects.filter(
            active=True, faculty=self.request.user.faculty,
        )

    def get_permissions(self):
        if self.action == 'registrations':
            if self.request.method == 'POST':
                return [CanCreateRegistration()]
            return [IsAuthenticated()]
        if self.action == 'create':
            return [IsStaffRole()]
        if self.action in ('registration_detail', 'approve_registration',
                        'reject_registration', 'add_lecturer_to_registration'):
            return [IsRegistrationOwnerOrStaff()]
        return [IsLecturerOrStaff()]

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
        return qs

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
        methods=['PATCH'], detail=True,
        url_path='registrations/(?P<registration_pk>[^/.]+)/approve',
        permission_classes=[IsSupervisingLecturerForRegistration],
    )
    def approve_registration(self, request, pk=None, registration_pk=None):
        registration = get_object_or_404(
            ProjectRegistration.objects.select_related('registration_period').prefetch_related('lecturer_assignments'),
            pk=registration_pk,
        )
        self.check_object_permissions(request, registration)

        err = self._check_in_student_registration_window(registration.registration_period)
        if err:
            return Response({'detail': err}, status=status.HTTP_400_BAD_REQUEST)

        serializer = projectRegistrationSerializer.ApproveRegistrationSerializer(
            data=request.data,
            context={'registration': registration}
        )
        serializer.is_valid(raise_exception=True)
        assignment = serializer.validated_data['assignment']

        assignment.approval_status = RegistrationLecturer.ApprovalStatus.APPROVED
        registration.status = ProjectRegistration.STATUS.ASSIGNED_LECTURER_AND_PENDING
        assignment.responded_at = timezone.now()
        assignment.save()

        registration.lecturer_assignments.filter(
            role=RegistrationLecturer.Role.BACKUP,
            approval_status=RegistrationLecturer.ApprovalStatus.PENDING_TRANSFER,
        ).update(approval_status=RegistrationLecturer.ApprovalStatus.SKIPPED)

        registration.save()

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
        registration = get_object_or_404(
            ProjectRegistration.objects.select_related('registration_period').prefetch_related('lecturer_assignments'),
            pk=registration_pk,
        )
        self.check_object_permissions(request, registration)

        err = self._check_in_student_registration_window(registration.registration_period)
        if err:
            return Response({'detail': err}, status=status.HTTP_400_BAD_REQUEST)

        serializer = projectRegistrationSerializer.RejectRegistrationSerializer(
            data=request.data,
            context={'registration': registration}
        )
        serializer.is_valid(raise_exception=True)
        assignment = serializer.validated_data['assignment']

        assignment.approval_status = RegistrationLecturer.ApprovalStatus.REJECTED
        assignment.responded_at = timezone.now()
        assignment.note = serializer.validated_data.get('note', '')
        assignment.save()

        registration.lecturer_assignments.filter(
            role=RegistrationLecturer.Role.BACKUP,
            approval_status=RegistrationLecturer.ApprovalStatus.PENDING_TRANSFER,
        ).update(approval_status=RegistrationLecturer.ApprovalStatus.PENDING)

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
        registration = get_object_or_404(
            ProjectRegistration.objects.select_related('student', 'student__faculty', 'registration_period'),
            pk=registration_pk,
        )
        self.check_object_permissions(request, registration)

        err = self._check_in_student_registration_window(registration.registration_period)
        if err:
            return Response({'detail': err}, status=status.HTTP_400_BAD_REQUEST)


        serializer = projectRegistrationSerializer.AddLecturerSerializer(
            data=request.data,
            context={'registration': registration}
        )
        serializer.is_valid(raise_exception=True)
        lecturer = serializer.validated_data['lecturer_id']

        RegistrationLecturer.objects.create(
            registration=registration,
            lecturer=lecturer,
            role=RegistrationLecturer.Role.MAIN,
            approval_status=RegistrationLecturer.ApprovalStatus.APPROVED,
            responded_at=timezone.now(),
        )

        registration.status = ProjectRegistration.STATUS.ASSIGNED_LECTURER_AND_PENDING
        registration.save()

        s = projectRegistrationSerializer.ProjectRegistrationDetailSerializer(
            registration, context={'request': request},
        )
        return Response(s.data, status=status.HTTP_200_OK)
