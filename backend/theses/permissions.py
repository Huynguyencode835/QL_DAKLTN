from rest_framework.permissions import BasePermission, IsAuthenticated

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


class IsTopicOwner(IsAuthenticated):
    def has_object_permission(self, request, view, obj):
        return (
            super().has_permission(request, view) and
            request.user.role == User.Role.LECTURER and
            hasattr(request.user, 'lecturer_profile') and
            obj.lecturer == request.user.lecturer_profile
        )


class IsSupervisingLecturer(IsAuthenticated):
    def has_object_permission(self, request, view, obj):
        return (
            super().has_permission(request, view) and
            request.user.role == User.Role.LECTURER and
            obj.lecturer is not None and
            obj.lecturer == request.user
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
            lecturer=request.user, role=RegistrationLecturer.Role.MAIN,
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
            lecturer=request.user, role=RegistrationLecturer.Role.MAIN,
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
