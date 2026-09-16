from rest_framework import generics, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from theses.serializeres.gradeSerializers import (
    GradeListSerializer,
    GradeSerializer,
    RegistrationGradesSerializer,
)
from theses.models import Grade, RegistrationLecturer, ProjectRegistration, RegistrationPeriod, User
from theses.permissions import IsLecturerForGrade
from theses.paginators import ItemRegistration


class GradeViewSet(
    generics.ListAPIView,
    generics.RetrieveAPIView,
    generics.CreateAPIView,
    generics.UpdateAPIView,
    viewsets.ViewSet,
):

    queryset = Grade.objects.select_related(
        'registration',
        'graded_by_lecturer__lecturer',
        'graded_by_committee_member__lecturer',
    ).all()
    serializer_class = GradeSerializer
    permission_classes = [IsLecturerForGrade]
    pagination_class = ItemRegistration

    def get_serializer_class(self):
        if self.action == 'list':
            return GradeListSerializer
        return GradeSerializer

    def get_queryset(self):
        if self.action == 'list':
            user = self.request.user
            if user.role == User.Role.STAFF:
                registration_ids = RegistrationLecturer.objects.filter(
                    role=RegistrationLecturer.Role.MAIN,
                    approval_status=RegistrationLecturer.ApprovalStatus.APPROVED,
                    lecturer__faculty=user.faculty,
                ).values_list('registration_id', flat=True)
            elif user.role == User.Role.STUDENT:
                registration_ids = ProjectRegistration.objects.filter(
                    student=user, active=True,
                ).values_list('id', flat=True)
            else:
                # Lecturer xem registration mình hướng dẫn chính thức
                registration_ids = RegistrationLecturer.objects.filter(
                    lecturer=user,
                    role=RegistrationLecturer.Role.MAIN,
                    approval_status=RegistrationLecturer.ApprovalStatus.APPROVED,
                ).values_list('registration_id', flat=True)

            qs = ProjectRegistration.objects.filter(id__in=registration_ids)

            period_id = self.request.query_params.get('period')
            if period_id:
                qs = qs.filter(registration_period_id=period_id)
            else:
                qs = qs.filter(registration_period__status__in=RegistrationPeriod.OPEN_STATUSES)

            return (
                qs.select_related('student', 'student__student_profile')
                .prefetch_related('grades')
                .order_by('student__student_profile__student_id')
            )
        return super().get_queryset()

    def filter_queryset(self, queryset):
        # Duoc ListModelMixin.list() goi tu dong, chi can them filter theo query param.
        queryset = super().filter_queryset(queryset)

        if self.action == 'list':
            # Ở action 'list', queryset là ProjectRegistration (xem get_queryset ở trên),
            # nên filter theo chính field id của nó, KHÔNG phải registration_id (field đó
            # chỉ tồn tại trên model Grade).
            registration_id = self.request.query_params.get('registration')
            if registration_id:
                queryset = queryset.filter(id=registration_id)
            return queryset

        # Các action khác thao tác trực tiếp trên Grade -> filter đúng field của Grade.
        registration_id = self.request.query_params.get('registration')
        if registration_id:
            queryset = queryset.filter(registration_id=registration_id)

        grade_type = self.request.query_params.get('grade_type')
        if grade_type:
            queryset = queryset.filter(grade_type=grade_type)

        return queryset

    def _get_authorized_registration(self, request, registration_id):
        registration = ProjectRegistration.objects.filter(id=registration_id).first()
        if registration is None:
            return None, 'not_found'

        if request.user.is_staff:
            return registration, None

        # Staff role (khác Django is_staff) được xem registration trong khoa
        if request.user.role == User.Role.STAFF:
            return registration, None

        # Student xem được registration của chính mình
        if request.user.role == User.Role.STUDENT and registration.student_id == request.user.id:
            return registration, None

        is_assigned_lecturer = RegistrationLecturer.objects.filter(
            registration_id=registration_id,
            lecturer=request.user,
            approval_status=RegistrationLecturer.ApprovalStatus.APPROVED,
        ).exists()
        if is_assigned_lecturer:
            return registration, None

        is_committee_member = False
        if registration.committee_id:
            is_committee_member = registration.committee.members.filter(
                lecturer=request.user,
            ).exists()
        if is_committee_member:
            return registration, None

        return None, 'forbidden'

    @action(detail=False, methods=['get'], url_path='by-registration', permission_classes=[permissions.IsAuthenticated])
    def by_registration(self, request):
        registration_id = request.query_params.get('registration')
        if not registration_id:
            return Response(
                {'detail': 'Thiếu tham số registration.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        registration, error = self._get_authorized_registration(request, registration_id)
        if error == 'not_found':
            return Response({'detail': 'Không tìm thấy registration.'}, status=status.HTTP_404_NOT_FOUND)
        if error == 'forbidden':
            return Response(
                {'detail': 'Bạn không có quyền xem điểm của registration này.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        grades = list(
            Grade.objects.filter(registration_id=registration_id)
            .select_related(
                'registration',
                'graded_by_lecturer__lecturer',
                'graded_by_committee_member__lecturer',
            )
            .order_by('grade_type', 'component', 'graded_by_committee_member_id')
        )

        serializer = RegistrationGradesSerializer(
            {'registration': int(registration_id), 'grades': grades, 'final_score': registration.final_score},
            context={'request': request, 'view': self},
        )
        return Response(serializer.data)