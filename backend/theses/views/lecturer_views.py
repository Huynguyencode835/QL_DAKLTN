from django.shortcuts import get_object_or_404
from rest_framework import generics, viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response

from theses.models import User, ListOfTopics
from theses.permissions import IsStudentOrStaff
from theses.serializeres import userSerializer, listOfTopicsSerializer


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
            lecturer=lecturer, active=True,
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
