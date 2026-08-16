from rest_framework import serializers
from theses.models import (
    User, Faculty, Major, Specialization,
    StudentProfile, LecturerProfile, StaffProfile, AcademicDegree, RegistrationLecturer, RegistrationPeriod, Specialization
)
from theses.validators import validate_range


class FacultySerializer(serializers.ModelSerializer):
    class Meta:
        model = Faculty
        fields = ['id', 'name']


class MajorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Major
        fields = ['id', 'major_name']


class SpecializationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Specialization
        fields = ['id', 'name', 'faculty']


class StudentProfileSerializer(serializers.ModelSerializer):
    major = MajorSerializer(read_only=True)

    class Meta:
        model = StudentProfile
        fields = [
            'student_id', 'class_name', 'training_type', 'program_type',
            'academic_year', 'gpa', 'conduct_score', 'major',
        ]

    def validate_gpa(self, value):
        return validate_range(value, 'GPA', min_value=0, max_value=4)

    def validate_conduct_score(self, value):
        return validate_range(value, 'Điểm hạnh kiểm', min_value=0, max_value=100)

class AcademicDegreeSerializer(serializers.ModelSerializer):
    class Meta:
        model = AcademicDegree
        fields = ['name', 'max_students_quota']


class Specializations(serializers.ModelSerializer):
    class Meta:
        model = Specialization
        fields = ['id', 'name']

class LecturerProfileSerializer(serializers.ModelSerializer):
    academic_degree = serializers.CharField(
        source='academic_degree.get_name_display',
        read_only=True,
    )
    remaining_slots = serializers.SerializerMethodField()
    specializations = Specializations(many= True)
    class Meta:
        model = LecturerProfile
        fields = ['academic_degree', 'position', 'specializations', 'remaining_slots']

    def get_remaining_slots(self, obj):
        current_count = RegistrationLecturer.objects.filter(
            lecturer=obj.user,
            role=RegistrationLecturer.Role.MAIN,
            approval_status=RegistrationLecturer.ApprovalStatus.APPROVED,
            registration__registration_period__status__in=RegistrationPeriod.OPEN_STATUSES,
        ).count()
        return max(obj.academic_degree.max_students_quota - current_count, 0)


class StaffProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = StaffProfile
        fields = ['position']


class UserSerializer(serializers.ModelSerializer):
    faculty = FacultySerializer(read_only=True)

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'role', 'phone_number', 'avatar', 'dob', 'faculty',
        ]


class UserProfileSerializer(UserSerializer):
    profile = serializers.DictField(required=False)

    class Meta:
        model = UserSerializer.Meta.model
        fields = UserSerializer.Meta.fields + ['profile']

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if instance.role == User.Role.STUDENT and not instance.is_superuser:
            data["profile"] = StudentProfileSerializer(instance.student_profile).data
        if instance.role == User.Role.LECTURER and not instance.is_superuser:
            data["profile"] = LecturerProfileSerializer(instance.lecturer_profile).data
        if instance.role == User.Role.STAFF and not instance.is_superuser:
            data["profile"] = StaffProfileSerializer(instance.staff_profile).data
        if instance.is_superuser:
            data["is_superuser"] = True
        return data


class LecturerBasicSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()
    faculty = FacultySerializer(read_only=True)

    class Meta:
        model = User
        fields = ['id', 'full_name', 'faculty', 'avatar']

    def get_full_name(self, obj):
        return f"{obj.last_name} {obj.first_name}".strip()


class LecturerDetailSerializer(LecturerBasicSerializer):
    lecturer_profile = LecturerProfileSerializer(read_only=True)

    class Meta:
        model = LecturerBasicSerializer.Meta.model
        fields = LecturerBasicSerializer.Meta.fields + [
            'id', 'username', 'email',
            'phone_number', 'dob', 'lecturer_profile',
        ]

    def get_full_name(self, obj):
        return f"{obj.last_name} {obj.first_name}".strip()
