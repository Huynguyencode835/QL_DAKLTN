from rest_framework import generics, viewsets
from theses.models import Specialization
from rest_framework.permissions import IsAuthenticated
from theses.serializeres import userSerializer

class SpecializationViewSet(viewsets.ViewSet, generics.ListAPIView):
    serializer_class = userSerializer.SpecializationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Specialization.objects.filter(
            active=True, faculty=self.request.user.faculty,
        )