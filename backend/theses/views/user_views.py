from django.shortcuts import get_object_or_404
from rest_framework import viewsets, parsers, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from theses.models import User, ListOfTopics
from theses.permissions import IsLecturerRole
from theses.serializeres import userSerializer, listOfTopicsSerializer
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
            topics = ListOfTopics.objects.filter(
                lecturer=request.user,
                active=True,
            )
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
