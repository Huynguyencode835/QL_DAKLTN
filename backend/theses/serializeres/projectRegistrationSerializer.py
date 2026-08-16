from rest_framework import serializers
from theses.models import ProjectRegistration, RegistrationLecturer, Specialization, User
from theses.serializeres.userSerializer import SpecializationSerializer
from theses.validators import validate_non_blank


class SpecializationNestedField(serializers.PrimaryKeyRelatedField):
    """Nhận pk khi ghi (vd: 2), trả nested object khi đọc."""

    def to_representation(self, value):
        return SpecializationSerializer(value).data


class ProjectRegistrationSerializer(serializers.ModelSerializer):
    avatar = serializers.SerializerMethodField(read_only=True)
    student_id = serializers.SerializerMethodField(read_only=True)
    student_name = serializers.SerializerMethodField(read_only=True)
    lecturer_name = serializers.SerializerMethodField(read_only=True)
    lecturer_assignments = serializers.SerializerMethodField(read_only=True)
    specialization = SpecializationNestedField(
        queryset=Specialization.objects.all(),
        required=False, allow_null=True,
    )

    advisor1 = serializers.IntegerField(write_only=True, required=False, allow_null=True)
    advisor2 = serializers.IntegerField(write_only=True, required=False, allow_null=True)
    note1 = serializers.CharField(write_only=True, required=False, allow_blank=True, default='')
    note2 = serializers.CharField(write_only=True, required=False, allow_blank=True, default='')

    class Meta:
        model = ProjectRegistration
        fields = [
            'id', 'student', 'avatar', 'student_id', 'specialization', 'student_name',
            'lecturer_name', 'lecturer_assignments',
            'project_title', 'project_description', 'wants_thesis_upgrade', 'status',
            'is_thesis', 'registration_period',
            'advisor1', 'advisor2', 'note1', 'note2',
        ]
        read_only_fields = [
            'id', 'student', 'registration_period', 'created_date', 'updated_date', 'active',
        ]
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

    def validate_advisor1(self, value):
        if value is None:
            return value
        if not User.objects.filter(pk=value, role=User.Role.LECTURER).exists():
            raise serializers.ValidationError('Giảng viên không tồn tại.')
        return value

    def validate_advisor2(self, value):
        if value is None:
            return value
        if not User.objects.filter(pk=value, role=User.Role.LECTURER).exists():
            raise serializers.ValidationError('Giảng viên không tồn tại.')
        return value

    def validate(self, attrs):
        request = self.context.get('request')
        if not request:
            return attrs

        if request.method == 'POST' and request.user.role == User.Role.STUDENT:
            period = self.context.get('registration_period')
            if period:
                duplicate = ProjectRegistration.objects.filter(
                    student=request.user,
                    registration_period=period,
                    active=True,
                ).exists()
                if duplicate:
                    raise serializers.ValidationError(
                        'Bạn đã đăng ký trong đợt này rồi, không thể tạo thêm.'
                    )
            attrs.pop('status', None)

            a1 = attrs.get('advisor1')
            a2 = attrs.get('advisor2')
            if a1 is not None and a2 is not None and a1 == a2:
                raise serializers.ValidationError('Giảng viên nguyện vọng 1 và 2 không được trùng nhau.')
            if a2 is not None and a1 is None:
                raise serializers.ValidationError('Vui lòng chọn nguyện vọng 1 trước khi chọn nguyện vọng 2.')

            specialization = attrs.get('specialization')
            if specialization and specialization.faculty_id != request.user.faculty_id:
                raise serializers.ValidationError(
                    'Chuyên ngành phải thuộc cùng khoa với sinh viên.'
                )

        if request.method in ('PUT', 'PATCH') and request.user.role in (
            User.Role.LECTURER, User.Role.STUDENT
        ):
            raise serializers.ValidationError('You are not allowed to update registrations.')

        return attrs

    def create(self, validated_data):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            validated_data['student'] = request.user

        advisor1 = validated_data.pop('advisor1', None)
        advisor2 = validated_data.pop('advisor2', None)
        note1 = validated_data.pop('note1', '')
        note2 = validated_data.pop('note2', '')

        registration = super().create(validated_data)

        if advisor1:
            RegistrationLecturer.objects.create(
                registration=registration,
                lecturer_id=advisor1,
                role=RegistrationLecturer.Role.OPTION1,
                approval_status=RegistrationLecturer.ApprovalStatus.PENDING,
                note=note1,
            )
        if advisor2:
            RegistrationLecturer.objects.create(
                registration=registration,
                lecturer_id=advisor2,
                role=RegistrationLecturer.Role.OPTION2,
                approval_status=RegistrationLecturer.ApprovalStatus.PENDING,
                note=note2,
            )

        return registration


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
                'academic_degree': (
                    profile.academic_degree.get_name_display() if profile else None
                ),
                'specializations': [s.name for s in profile.specializations.all()] if profile else [],
            })
        return result


class BaseRegistrationApprovalSerializer(serializers.Serializer):
    note = serializers.CharField(required=False, allow_blank=True, default='')

    def validate(self, attrs):
        registration = self.context.get('registration')
        request = self.context.get('request')
        if request is None or not request.user.is_authenticated:
            raise serializers.ValidationError('Không xác định được người duyệt.')
        assignment = registration.lecturer_assignments.filter(
            lecturer=request.user,
            role__in=[RegistrationLecturer.Role.OPTION1, RegistrationLecturer.Role.OPTION2],
            approval_status=RegistrationLecturer.ApprovalStatus.PENDING,
        ).first()
        if not assignment:
            raise serializers.ValidationError('Bạn không có nguyện vọng nào đang chờ duyệt.')
        attrs['assignment'] = assignment
        return attrs


class ApproveRegistrationSerializer(BaseRegistrationApprovalSerializer):
    pass


class RejectRegistrationSerializer(BaseRegistrationApprovalSerializer):
    pass


class AddLecturerSerializer(serializers.Serializer):
    lecturer_id = serializers.IntegerField()

    def validate_lecturer_id(self, value):
        registration = self.context.get('registration')
        try:
            lecturer = User.objects.get(pk=value, role=User.Role.LECTURER)
        except User.DoesNotExist:
            raise serializers.ValidationError('Giảng viên không tồn tại.')
        if lecturer.faculty != registration.student.faculty:
            raise serializers.ValidationError('Giảng viên phải cùng khoa với sinh viên.')
        return lecturer
