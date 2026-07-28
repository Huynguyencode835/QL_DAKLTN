from rest_framework import serializers
from theses.models import ProjectRegistration, RegistrationLecturer, User
from theses.validators import validate_non_blank


class ProjectRegistrationSerializer(serializers.ModelSerializer):
    avatar = serializers.SerializerMethodField(read_only=True)
    student_id = serializers.SerializerMethodField(read_only=True)
    student_name = serializers.SerializerMethodField(read_only=True)
    lecturer_name = serializers.SerializerMethodField(read_only=True)
    lecturer_assignments = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = ProjectRegistration
        fields = [
            'id', 'student', 'avatar', 'student_id', 'student_name',
            'lecturer_name', 'lecturer_assignments',
            'project_title', 'project_description', 'status',
            'created_date', 'updated_date', 'active',
        ]
        read_only_fields = ['id', 'student', 'created_date', 'updated_date', 'active']
        extra_kwargs = {
            'project_title': {'max_length': 255},
        }

    def get_avatar(self, obj):
        if obj.student.avatar:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.student.avatar.url)
            return obj.student.avatar.url
        return None

    def get_student_id(self, obj):
        profile = getattr(obj.student, 'student_profile', None)
        return profile.student_id if profile else None

    def get_student_name(self, obj):
        return f"{obj.student.last_name} {obj.student.first_name}".strip()

    def get_lecturer_name(self, obj):
        main = obj.lecturer_assignments.filter(
            role=RegistrationLecturer.Role.MAIN,
        ).first()
        if not main:
            return None
        return f"{main.lecturer.last_name} {main.lecturer.first_name}".strip()

    def get_lecturer_assignments(self, obj):
        assignments = obj.lecturer_assignments.all()
        return [
            {
                'id': a.id,
                'lecturer': a.lecturer_id,
                'lecturer_name': f"{a.lecturer.last_name} {a.lecturer.first_name}".strip(),
                'role': a.role,
                'approval_status': a.approval_status,
                'note': a.note,
            }
            for a in assignments
        ]

    def validate_project_title(self, value):
        return validate_non_blank(value, 'Project title')

    def validate_project_description(self, value):
        return validate_non_blank(value, 'Project description')

    def validate(self, attrs):
        request = self.context.get('request')
        if not request:
            return attrs

        if request.method == 'POST' and request.user.role == User.Role.STUDENT:
            if hasattr(request.user, 'project_registration'):
                raise serializers.ValidationError(
                    'Bạn đã có một phiếu đăng ký, không thể tạo thêm.'
                )
            attrs.pop('status', None)

        if request.method in ('PUT', 'PATCH') and request.user.role in (
            User.Role.LECTURER, User.Role.STUDENT
        ):
            raise serializers.ValidationError('You are not allowed to update registrations.')

        return attrs

    def create(self, validated_data):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            validated_data['student'] = request.user
        return super().create(validated_data)


class ProjectRegistrationDetailSerializer(ProjectRegistrationSerializer):
    student_info = serializers.SerializerMethodField(read_only=True)
    lecturer_info = serializers.SerializerMethodField(read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = ProjectRegistrationSerializer.Meta.model
        fields = ProjectRegistrationSerializer.Meta.fields + [
            'student_info', 'lecturer_info', 'status_display',
        ]
        read_only_fields = ProjectRegistrationSerializer.Meta.fields

    def get_student_info(self, obj):
        user = obj.student
        profile = getattr(user, 'student_profile', None)
        avatar_url = None
        if user.avatar:
            request = self.context.get('request')
            avatar_url = request.build_absolute_uri(user.avatar.url) if request else user.avatar.url
        return {
            'id': user.id,
            'student_id': profile.student_id if profile else None,
            'full_name': f"{user.last_name} {user.first_name}".strip(),
            'email': user.email,
            'avatar': avatar_url,
            'gpa': profile.gpa,
            'conduct_score': profile.conduct_score,
            'class_name': profile.class_name if profile else None,
            'major': profile.major.major_name if profile and profile.major else None,
            'faculty': user.faculty.name if user.faculty else None,
        }

    def get_lecturer_info(self, obj):
        assignments = obj.lecturer_assignments.all()
        if not assignments:
            return None
        result = []
        for a in assignments:
            user = a.lecturer
            profile = getattr(user, 'lecturer_profile', None)
            result.append({
                'id': a.id,
                'lecturer_id': user.id,
                'full_name': f"{user.last_name} {user.first_name}".strip(),
                'email': user.email,
                'role': a.role,
                'approval_status': a.approval_status,
                'note': a.note,
                'academic_degree': profile.academic_degree if profile else None,
                'specializations': [s.name for s in profile.specializations.all()] if profile else [],
            })
        return result
