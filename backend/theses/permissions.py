from rest_framework.permissions import BasePermission, IsAuthenticated
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError

from theses.models import User, ProjectRegistration, RegistrationLecturer


class IsStudentRole(IsAuthenticated):
    def has_permission(self, request, view):
        return (
            super().has_permission(request, view) and
            request.user.role == User.Role.STUDENT
        )


class IsLecturerRole(IsAuthenticated):
    def has_permission(self, request, view):
        return (
            super().has_permission(request, view) and
            request.user.role == User.Role.LECTURER
        )


class IsStaffRoleFaculty(IsAuthenticated):
    def has_object_permission(self, request, view, obj):
            if not super().has_permission(request, view):
                return False
            if request.user.role != User.Role.STAFF:
                return False
            if request.user.role == User.Role.STAFF and obj.faculty == request.user.faculty:
                return (
                    True
                )
            return False

class IsStaffRole(IsAuthenticated):
    def has_permission(self, request, view):
        return (
            super().has_permission(request, view) and
            request.user.role == User.Role.STAFF
        )

class IsAdminRole(IsAuthenticated):
    def has_permission(self, request, view):
        return (
            super().has_permission(request, view) and
            request.user.is_superuser
        )

class IsStudentOrStaff(IsAuthenticated):
    def has_permission(self, request, view):
            return (
                super().has_permission(request, view) and
                request.user.role in [User.Role.STUDENT, User.Role.STAFF]
            )

class IsLecturerOrStaff(IsAuthenticated):
    def has_permission(self, request, view):
        return (
            super().has_permission(request, view) and
            request.user.role in [User.Role.LECTURER, User.Role.STAFF]
        )


class IsLecturerOrStaffOrAdmin(IsAuthenticated):
    def has_permission(self, request, view):
        return (
            super().has_permission(request, view) and
            (request.user.role in [User.Role.LECTURER, User.Role.STAFF] or
             request.user.is_superuser)
        )


class IsStaffSameFaculty(IsAuthenticated):
    def has_permission(self, request, view):
        return (
            super().has_permission(request, view) and
            request.user.role == User.Role.STAFF
        )

    def has_object_permission(self, request, view, obj):
        if not super().has_permission(request, view):
            return False
        return (
            request.user.faculty is not None and
            obj.student.faculty == request.user.faculty
        )


class IsRegistrationOwnerOrStaff(IsAuthenticated):
    def has_object_permission(self, request, view, obj):
        if not super().has_permission(request, view):
            return False
        if request.user.role == User.Role.STUDENT and obj.student == request.user:
            return True
        if request.user.role == User.Role.LECTURER and obj.lecturer_assignments.filter(
            lecturer=request.user,
        ).exists():
            return True
        if request.user.role == User.Role.STAFF:
            return (
                request.user.faculty is not None and
                obj.student.faculty == request.user.faculty
            )
        if request.user.is_superuser:
            return True
        return False
    
    


class CanCreateRegistration(IsAuthenticated):
    def has_permission(self, request, view):
        return (
            super().has_permission(request, view) and
            request.user.role == User.Role.STUDENT
        )


class CanAccessRegistration(IsAuthenticated):
    def has_permission(self, request, view):
        if not super().has_permission(request, view):
            return False
        is_delete = request.method == 'DELETE'
        registration_pk = view.kwargs.get('registration_pk')
        if not registration_pk:
            return False
        try:
            registration = ProjectRegistration.objects.select_related(
                'student__faculty',
            ).get(pk=registration_pk, active=True)
        except ProjectRegistration.DoesNotExist:
            return False
        view._registration = registration
        if request.user.role == User.Role.STAFF:
            return (
                request.user.faculty is not None and
                registration.student.faculty == request.user.faculty
            )
        if is_delete:
            return False
        if request.user.role == User.Role.STUDENT and registration.student == request.user:
            return True
        if request.user.role == User.Role.LECTURER and ProjectRegistration.objects.filter(
            pk=registration_pk, lecturer_assignments__lecturer=request.user,
        ).exists():
            return True
        if request.user.is_superuser:
            return True
        return False

    def has_object_permission(self, request, view, obj):
        return True


class IsSupervisingLecturerForRegistration(IsAuthenticated):
    def has_permission(self, request, view):
        if not super().has_permission(request, view):
            return False
        if request.user.role != User.Role.LECTURER:
            return False
        registration_pk = view.kwargs.get('registration_pk')
        if not registration_pk:
            return False
        try:
            registration = ProjectRegistration.objects.get(
                pk=registration_pk, active=True,
            )
        except ProjectRegistration.DoesNotExist:
            return False
        if not registration.lecturer_assignments.filter(
            lecturer=request.user,
            role__in=[RegistrationLecturer.Role.OPTION1, RegistrationLecturer.Role.OPTION2],
        ).exists():
            return False
        view._registration = registration
        return True

    def has_object_permission(self, request, view, obj):
        return True


class IsStaffSameFacultyForRegistration(IsAuthenticated):
    def has_permission(self, request, view):
        if not super().has_permission(request, view):
            return False
        if request.user.role != User.Role.STAFF:
            return False
        registration_pk = view.kwargs.get('registration_pk')
        if not registration_pk:
            return False
        try:
            registration = ProjectRegistration.objects.select_related(
                'student__faculty',
            ).get(pk=registration_pk, active=True)
        except ProjectRegistration.DoesNotExist:
            return False
        if not request.user.faculty or registration.student.faculty != request.user.faculty:
            return False
        view._registration = registration
        return True

    def has_object_permission(self, request, view, obj):
        return True


class CanAccessReport(IsAuthenticated):
    """Xem/tải báo cáo: SV chủ đăng ký, GV MAIN, staff cùng khoa, superuser."""

    def _can_view_registration(self, request, registration):
        user = request.user
        if user.is_superuser:
            return True
        if user.role == User.Role.STUDENT:
            return registration.student_id == user.id
        if user.role == User.Role.LECTURER:
            return registration.lecturer_assignments.filter(
                lecturer_id=user.id,
                role=RegistrationLecturer.Role.MAIN,
            ).exists()
        if user.role == User.Role.STAFF:
            return (user.faculty is not None and
                    registration.student.faculty == user.faculty)
        return False

    def has_permission(self, request, view):
        if not super().has_permission(request, view):
            return False
        if view.action == 'list':
            registration_id = request.query_params.get('registration_id')
            if not registration_id:
                raise ValidationError('Thiếu tham số registration_id')
            try:
                registration = ProjectRegistration.objects.select_related(
                    'student__faculty').get(id=registration_id)
            except ProjectRegistration.DoesNotExist:
                raise NotFound('Không tìm thấy đăng ký đề tài')
            return self._can_view_registration(request, registration)
        return True

    def has_object_permission(self, request, view, obj):
        if not super().has_permission(request, view):
            return False
        return self._can_view_registration(request, obj.registration)


class CanCreateReport(IsAuthenticated):
    """Chỉ SV chủ sở hữu đăng ký mới được nộp báo cáo."""

    def has_permission(self, request, view):
        if not super().has_permission(request, view):
            return False
        if request.user.role != User.Role.STUDENT:
            raise PermissionDenied('Chỉ sinh viên mới được nộp báo cáo')

        registration_id = request.data.get('registration_id')
        if not registration_id:
            raise ValidationError('Thiếu tham số registration_id')

        try:
            registration = ProjectRegistration.objects.select_related(
                'registration_period').get(id=registration_id)
        except (ProjectRegistration.DoesNotExist, ValueError, TypeError):
            raise NotFound('Không tìm thấy đăng ký đề tài')

        if registration.student_id != request.user.id:
            raise PermissionDenied('Bạn không có quyền nộp báo cáo cho đăng ký này')

        view._registration = registration
        return True
