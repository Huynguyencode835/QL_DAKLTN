from django.urls import path, include
from rest_framework.routers import DefaultRouter
from theses import views

router = DefaultRouter()
router.register('users', views.UserViewSet, basename='user')
router.register('lecturers', views.LecturerViewSet, basename='lecturer')
router.register('registration-periods', views.RegistrationPeriodViewSet, basename='registration-period')
router.register('specialization', views.SpecializationViewSet, basename='specialization')
router.register('reports', views.ReportViewSet, basename='report')
router.register('schedules', views.ScheduleViewSet, basename='schedule')
router.register('grades', views.GradeViewSet, basename='grade')


urlpatterns = [
    path('', include(router.urls)),
    path('login/', views.CookieLoginView.as_view(), name='cookie-login'),
    path('token/refresh/', views.CookieRefreshView.as_view(), name='cookie-refresh'),
    path('logout/', views.LogoutView.as_view(), name='logout'),
    path('csrf/', views.get_csrf_token, name='csrf'),
]
