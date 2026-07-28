from django.utils import timezone
from django.shortcuts import get_object_or_404
from rest_framework import generics, viewsets, parsers, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from theses.models import User, ListOfTopics, ProjectRegistration, RegistrationPeriod, RegistrationLecturer
from theses.permissions import (
    IsLecturerRole, IsStudentOrStaff, IsStaffRole,
    CanCreateRegistration, CanAccessRegistration,
    IsSupervisingLecturerForRegistration,
    IsStaffSameFacultyForRegistration, IsLecturerOrStaff,IsRegistrationOwnerOrStaff
)
from theses.serializeres import userSerializer, listOfTopicsSerializer, projectRegistrationSerializer, registrationPeriodSerializer


class UserViewSet(viewsets.ViewSet):
    queryset = User.objects.filter(is_active=True)
    serializer_class = userSerializer.UserSerializer
    parser_classes = [parsers.JSONParser, parsers.MultiPartParser]

    @action(methods=["GET"],
            url_path="profile",
            url_name="profile",
            detail=False,
            permission_classes=[IsAuthenticated])
    def profile_user(self, request):
        role_config = {
            User.Role.STUDENT: {
                'select': ['student_profile', 'student_profile__major', 'faculty'],
                'prefetch': [],
            },
            User.Role.LECTURER: {
                'select': ['lecturer_profile', 'faculty'],
                'prefetch': ['lecturer_profile__specializations'],
            },
            User.Role.STAFF: {
                'select': ['staff_profile', 'faculty'],
                'prefetch': [],
            },
        }

        config = role_config.get(request.user.role)
        if config is None:
            return Response(
                {"detail": "Unsupported user role."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            qs = User.objects.select_related(*config['select'])
            if config['prefetch']:
                qs = qs.prefetch_related(*config['prefetch'])
            user = qs.get(id=request.user.id)
        except User.DoesNotExist:
            return Response({"detail": "User not found."}, status=status.HTTP_404_NOT_FOUND)

        s = userSerializer.UserProfileSerializer(user, context={"request": request})
        return Response(s.data, status=status.HTTP_200_OK)

    @action(methods=["GET", "POST"],
            url_path="topics",
            url_name="topics",
            detail=False,
            permission_classes=[IsLecturerRole])
    def topics(self, request):
        if request.method == "GET":
            topics = ListOfTopics.objects.filter(
                lecturer=request.user,
                active=True,
            )
            s = listOfTopicsSerializer.ListOfTopicsSerializer(
                topics, many=True, context={"request": request},
            )
            return Response(s.data, status=status.HTTP_200_OK)

        serializer = listOfTopicsSerializer.ListOfTopicsDetailSerializer(
            data=request.data, context={"request": request},
        )
        serializer.is_valid(raise_exception=True)
        serializer.save(lecturer=request.user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(methods=["GET","PATCH","DELETE"],
            url_path="topics/(?P<topic_pk>[^/.]+)",
            url_name="topic-detail",
            detail=False,
            permission_classes=[IsLecturerRole])
    def topic_detail(self, request, topic_pk=None):
        topic = get_object_or_404(
            ListOfTopics,
            pk=topic_pk,
            lecturer=request.user,
            active=True,
        )
        if request.method == "GET":
            s = listOfTopicsSerializer.ListOfTopicsDetailSerializer(
                topic, context={"request": request},
            )
            return Response(s.data, status=status.HTTP_200_OK)
        if request.method == "PATCH":
            s = listOfTopicsSerializer.ListOfTopicsDetailSerializer(
                topic, data=request.data, partial=True, context={"request": request},
            )
            s.is_valid(raise_exception=True)
            s.save()
            return Response(s.data, status=status.HTTP_200_OK)
        topic.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class LecturerViewSet(viewsets.ViewSet,
                      generics.ListAPIView,
                      generics.RetrieveAPIView):
    serializer_class = userSerializer.LecturerBasicSerializer
    permission_classes = [IsStudentOrStaff]

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return userSerializer.LecturerDetailSerializer
        return userSerializer.LecturerBasicSerializer

    def get_queryset(self):
        qs = User.objects.filter(
            role=User.Role.LECTURER, is_active=True,
            faculty=self.request.user.faculty,
        )
        if self.action == 'retrieve':
            qs = qs.select_related(
                'faculty', 'lecturer_profile',
            ).prefetch_related('lecturer_profile__specializations')
        else:
            qs = qs.select_related('faculty')
        return qs

    @action(methods=['GET'], detail=True, url_path='topics')
    def list_topics(self, request, pk=None):
        lecturer = self.get_object()
        topics = ListOfTopics.objects.filter(
            lecturer=lecturer, is_available=True, active=True,
        )
        s = listOfTopicsSerializer.ListOfTopicsSerializer(
            topics, many=True, context={'request': request},
        )
        return Response(s.data)

    @action(methods=['GET'], detail=True, url_path='topics/(?P<topic_pk>[^/.]+)')
    def topic_detail(self, request, pk=None, topic_pk=None):
        lecturer = self.get_object()
        topic = get_object_or_404(
            ListOfTopics, pk=topic_pk, lecturer=lecturer, active=True,
        )
        s = listOfTopicsSerializer.ListOfTopicsDetailSerializer(
            topic, context={'request': request},
        )
        return Response(s.data)

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

    @action(methods=['GET', 'POST'], detail=True, url_path='registrations')
    def registrations(self, request, pk=None):
        period = self.get_object()

        if request.method == 'POST':
            serializer = projectRegistrationSerializer.ProjectRegistrationSerializer(
                data=request.data, context={'request': request},
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
            ProjectRegistration.objects.prefetch_related('lecturer_assignments'),
            pk=registration_pk,
        )
        self.check_object_permissions(request, registration)

        assignment = registration.lecturer_assignments.filter(
            role=RegistrationLecturer.Role.MAIN,
        ).first()
        if not assignment:
            return Response(
                {'detail': 'Đăng ký này chưa có giảng viên hướng dẫn.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if assignment.approval_status != RegistrationLecturer.ApprovalStatus.PENDING:
            return Response(
                {'detail': 'Chỉ duyệt được đăng ký ở trạng thái chờ duyệt.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        assignment.approval_status = RegistrationLecturer.ApprovalStatus.APPROVED
        assignment.responded_at = timezone.now()
        assignment.save()

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
            ProjectRegistration.objects.prefetch_related('lecturer_assignments'),
            pk=registration_pk,
        )
        self.check_object_permissions(request, registration)

        assignment = registration.lecturer_assignments.filter(
            role=RegistrationLecturer.Role.MAIN,
        ).first()
        if not assignment:
            return Response(
                {'detail': 'Đăng ký này chưa có giảng viên hướng dẫn.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if assignment.approval_status != RegistrationLecturer.ApprovalStatus.PENDING:
            return Response(
                {'detail': 'Chỉ từ chối được đăng ký ở trạng thái chờ duyệt.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        assignment.approval_status = RegistrationLecturer.ApprovalStatus.REJECTED
        assignment.responded_at = timezone.now()
        assignment.note = request.data.get('note', '')
        assignment.save()

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
            ProjectRegistration.objects.select_related('student', 'student__faculty'),
            pk=registration_pk,
        )
        self.check_object_permissions(request, registration)

        if registration.lecturer_assignments.filter(
            role=RegistrationLecturer.Role.MAIN,
        ).exists():
            return Response(
                {'detail': 'Đăng ký này đã có giảng viên hướng dẫn.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if registration.status != ProjectRegistration.STATUS.WAITING_LECTURER_AND_PENDING:
            return Response(
                {'detail': 'Chỉ phân giảng viên được đăng ký ở trạng thái chờ giảng viên.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        lecturer_id = request.data.get('lecturer_id')
        if not lecturer_id:
            return Response(
                {'detail': 'lecturer_id là bắt buộc.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        lecturer = get_object_or_404(User, pk=lecturer_id, role=User.Role.LECTURER)

        if lecturer.faculty != registration.student.faculty:
            return Response(
                {'detail': 'Giảng viên phải cùng khoa với sinh viên.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        RegistrationLecturer.objects.create(
            registration=registration,
            lecturer=lecturer,
            role=RegistrationLecturer.Role.MAIN,
            approval_status=RegistrationLecturer.ApprovalStatus.PENDING,
        )

        registration.status = ProjectRegistration.STATUS.ASSIGNED_LECTURER_AND_PENDING
        registration.save()

        s = projectRegistrationSerializer.ProjectRegistrationDetailSerializer(
            registration, context={'request': request},
        )
        return Response(s.data, status=status.HTTP_200_OK)