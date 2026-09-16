from django.shortcuts import get_object_or_404
from rest_framework import viewsets, parsers, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Q

from theses.models import User, ListOfTopics, Committee, ReviewerAssignmentSession, ProjectRegistration
from theses.permissions import IsLecturerRole, IsStudentRole
from theses.serializeres import userSerializer, listOfTopicsSerializer
from theses.serializeres.committeeSerializer import CommitteeStudentSerializer, CommitteeStudentListSerializer
from theses.serializeres.reviewerSessionSerializer import (
    ReviewerAssignmentSessionReadSerializer, ReviewerAssignmentDetailSerializer,
)
from theses.serializeres.registrationPeriodSerializer import RegistrationPeriodBasicSerializer
from theses.paginators import ItemPaginator

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
            from django.db.models import Q

            topics = ListOfTopics.objects.filter(
                lecturer=request.user,
                active=True,
            )

            search = request.query_params.get('search')
            if search:
                topics = topics.filter(
                    Q(title__icontains=search) |
                    Q(description__icontains=search)
                )

            difficulty = request.query_params.get('difficulty_level')
            if difficulty:
                topics = topics.filter(difficulty_level=difficulty)

            paginator = ItemPaginator()
            page = paginator.paginate_queryset(topics, request, view=self)
            if page is not None:
                s = listOfTopicsSerializer.ListOfTopicsSerializer(page, many=True, context={"request": request})
                return paginator.get_paginated_response(s.data)
            s = listOfTopicsSerializer.ListOfTopicsSerializer(topics, many=True, context={"request": request})
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

    @action(methods=["GET"], url_path="my-committees", detail=False,
            permission_classes=[IsStudentRole])
    def my_committees(self, request):
        qs = Committee.objects.filter(
            registrations__student=request.user,
            active=True,
        ).prefetch_related('members', 'registrations').distinct()

        status_param = request.query_params.get('status')
        if status_param:
            qs = qs.filter(status=status_param)

        search = request.query_params.get('search')
        if search:
            qs = qs.filter(
                Q(name__icontains=search) | Q(location__icontains=search)
            )

        serializer = CommitteeStudentListSerializer(qs, many=True)
        return Response(serializer.data)

    @action(methods=["GET"], url_path="my-committees/(?P<committee_pk>[^/.]+)",
            detail=False, permission_classes=[IsStudentRole])
    def my_committee_detail(self, request, committee_pk=None):
        committee = get_object_or_404(
            Committee,
            pk=committee_pk,
            registrations__student=request.user,
            active=True,
        )
        serializer = CommitteeStudentSerializer(
            committee, context={'request': request},
        )
        return Response(serializer.data)

    @action(methods=["GET"], url_path="my-reviewer-sessions", detail=False,
            permission_classes=[IsStudentRole])
    def my_reviewer_sessions(self, request):
        qs = ReviewerAssignmentSession.objects.filter(
            reviewer_assignments__registration__student=request.user,
            active=True,
        ).select_related('reviewer', 'created_by').distinct()

        serializer = ReviewerAssignmentSessionReadSerializer(qs, many=True)
        return Response(serializer.data)

    @action(methods=["GET"], url_path="my-reviewer-sessions/(?P<session_pk>[^/.]+)",
            detail=False, permission_classes=[IsStudentRole])
    def my_reviewer_session_detail(self, request, session_pk=None):
        session = get_object_or_404(
            ReviewerAssignmentSession,
            pk=session_pk,
            reviewer_assignments__registration__student=request.user,
            active=True,
        )

        from theses.models import RegistrationLecturer
        student_assignments = session.reviewer_assignments.filter(
            registration__student=request.user,
            registration__active=True,
        ).select_related(
            'registration', 'registration__student__student_profile',
        )

        assignments_data = [
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
            for a in student_assignments
        ]

        return Response({
            'id': session.id,
            'registration_period': session.registration_period_id,
            'reviewer': session.reviewer_id,
            'reviewer_name': f"{session.reviewer.last_name} {session.reviewer.first_name}".strip(),
            'defense_date': session.defense_date,
            'location': session.location,
            'assignments': assignments_data,
            'created_by': session.created_by_id,
            'created_date': session.created_date,
        })

    @action(methods=["GET"], url_path="my-registration-periods", detail=False,
            permission_classes=[IsStudentRole])
    def my_registration_periods(self, request):
        period_ids = ProjectRegistration.objects.filter(
            student=request.user,
            active=True,
        ).values_list('registration_period_id', flat=True).distinct()

        from theses.models import RegistrationPeriod
        periods = RegistrationPeriod.objects.filter(
            id__in=period_ids,
            active=True,
        ).order_by('-created_date')

        serializer = RegistrationPeriodBasicSerializer(periods, many=True)
        return Response(serializer.data)
