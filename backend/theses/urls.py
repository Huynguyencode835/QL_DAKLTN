from django.urls import path, include
from rest_framework.routers import DefaultRouter
from theses import views

router = DefaultRouter()
router.register('users', views.UserViewSet, basename='user')
router.register('lecturers', views.LecturerViewSet, basename='lecturer')
router.register('registration-periods', views.RegistrationPeriodViewSet, basename='registration-period')

urlpatterns = [
    path('', include(router.urls)),
]
