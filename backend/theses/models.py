from django.contrib.auth.models import AbstractUser
from django.db import models


class BaseModel(models.Model):
    active = models.BooleanField(default=True)
    created_date = models.DateTimeField(auto_now_add=True)
    updated_date = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True

class User(AbstractUser):
    class Role(models.TextChoices):
        STUDENT = 'student', 'Sinh viên'
        LECTURER = 'lecturer', 'Giảng viên'
        STAFF = 'staff', 'Nhân viên'
        ADMIN = 'admin', 'Quản trị viên'

    avatar = models.ImageField(upload_to='avatars/', blank=True, null=True)
    dob = models.DateField(null=True, blank=True)
    phone_number = models.CharField(max_length=15, blank=True)
    role = models.CharField(max_length=20, choices=Role.choices)
    faculty = models.ForeignKey(
        'Faculty',
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='users',
    )

class Faculty(BaseModel):
    name = models.CharField(max_length=150)
    description = models.TextField(blank=True)
    head_of_faculty = models.OneToOneField(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='headed_faculty',
        limit_choices_to={'role': User.Role.LECTURER}
    )

class Major(BaseModel):
    major_name = models.CharField(max_length=150)
    description = models.TextField(blank=True)
    training_duration = models.PositiveIntegerField(help_text='Số năm đào tạo, vd: 4')
    faculty = models.ForeignKey(
        Faculty,
        on_delete=models.CASCADE,
        related_name='majors',
    )

class StudentProfile(BaseModel):
    class TrainingType(models.TextChoices):
        REGULAR = 'regular', 'Đại học chính quy'
        DISTANCE = 'distance', 'Đào tạo từ xa'

    class ProgramType(models.TextChoices):
        STANDARD = 'standard', 'Đại trà'
        HIGH_QUALITY = 'high_quality', 'Chất lượng cao'
    user = models.OneToOneField(
        User, on_delete=models.CASCADE, primary_key=True, related_name='student_profile'
    )
    student_id = models.CharField(max_length=20, unique=True)
    class_name = models.CharField(max_length=50)
    training_type = models.CharField(max_length=50, choices=TrainingType.choices, default=TrainingType.REGULAR)
    program_type = models.CharField(max_length=20, choices=ProgramType.choices, default=ProgramType.STANDARD)
    academic_year = models.CharField(max_length=20)
    gpa = models.DecimalField(max_digits=3, decimal_places=2, default=0)
    conduct_score = models.PositiveIntegerField(default=100)
    major = models.ForeignKey(
        Major,
        on_delete=models.PROTECT,
        related_name='students',
    )

class LecturerProfile(BaseModel):
    user = models.OneToOneField(
        User, on_delete=models.CASCADE, primary_key=True, related_name='lecturer_profile'
    )
    academic_degree = models.CharField(max_length=100)
    position = models.CharField(max_length=100, blank=True)
    specializations = models.ManyToManyField(
        'Specialization',
        blank=True,
        related_name='lecturers',
    )

class StaffProfile(BaseModel):
    user = models.OneToOneField(
        User, on_delete=models.CASCADE, related_name='staff_profile'
    )
    position = models.CharField(max_length=100)

class Specialization(BaseModel):
    name = models.CharField(max_length=150)
    faculty = models.ForeignKey(
        Faculty,
        on_delete=models.CASCADE,
        related_name='specializations',
    )

class ListOfTopics(BaseModel):
    lecturer = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='list_of_topics',
        limit_choices_to={'role': User.Role.LECTURER}
    )
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    technology = models.TextField(blank=True)
    class DIFFICULT_TYPE(models.TextChoices):
        EASY = 'easy', 'dễ'
        MEDIUM = 'medium', 'Trung bình'
        DIFFICULT = 'difficult', 'Khó'
    difficulty_level = models.CharField(max_length=50, choices=DIFFICULT_TYPE.choices)

class RegistrationPeriod(BaseModel):
    class STATUS(models.TextChoices):
        DRAFT = 'draft', 'Nháp'
        STUDENT_REGISTRATION = 'student_registration', 'Đang mở đăng ký'
        IN_PROGRESS = 'in_progress', 'Đang thực hiện đồ án'
        REPORT_SUBMISSION = 'report_submission', 'Đang nhận báo cáo'
        CLOSED = 'closed', 'Đã đóng'
        ARCHIVED = 'archived', 'Đã lưu trữ'

    name = models.CharField(max_length=255)
    academic_year = models.CharField(max_length=20)
    
    student_registration_start = models.DateTimeField(help_text='SV bắt đầu đăng ký')
    student_registration_end = models.DateTimeField(help_text='SV hết hạn đăng ký')

    report_submission_start = models.DateTimeField(help_text='SV bắt đầu được nộp báo cáo')
    report_submission_end = models.DateTimeField(help_text='SV hết hạn nộp báo cáo')

    execution_duration_weeks = models.PositiveSmallIntegerField(
        default=10,
        help_text='Số tuần thực hiện đồ án, tính từ khi đăng ký được duyệt',
    )

    status = models.CharField(max_length=20, choices=STATUS.choices, default=STATUS.DRAFT)

    faculty = models.ForeignKey(
        Faculty, on_delete=models.CASCADE, null=False, blank=False,
        related_name='registration_periods',
    )

    created_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True,
        related_name='created_registration_periods',
        limit_choices_to={'role': User.Role.STAFF},
    )

class ProjectRegistration(BaseModel):
    student = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        related_name='project_registrations',
        limit_choices_to={'role': User.Role.STUDENT}
    )
    registration_period = models.ForeignKey(
        RegistrationPeriod,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='project_registrations',
    )
    project_title = models.CharField(max_length=255)
    project_description = models.TextField()
    class STATUS(models.TextChoices):
        WAITING_LECTURER_AND_PENDING = 'waiting_lecturer', 'Chờ phân giảng viên hướng dẫn'
        ASSIGNED_LECTURER_AND_PENDING = 'assigned_lecturer', 'Đã phân giảng viên hướng dẫn'
    status = models.CharField(max_length=50, default=STATUS.WAITING_LECTURER_AND_PENDING, choices=STATUS.choices)
    is_Thesis = models.BooleanField(default=False)
    class Meta:
        unique_together = ('student', 'registration_period')

class RegistrationLecturer(BaseModel):
    class Role(models.TextChoices):
        MAIN = 'main', 'Chính thức'
        BACKUP = 'backup', 'Dự phòng'
        REVIEWER = 'reviewer', 'Phản biện'

    class ApprovalStatus(models.TextChoices):
        PENDING = 'pending', 'Chờ duyệt'
        APPROVED = 'approved', 'Đồng ý'
        REJECTED = 'rejected', 'Từ chối'
        SKIPPED = 'skipped', 'Không cần duyệt'

    registration = models.ForeignKey(
        ProjectRegistration, 
        on_delete=models.CASCADE, 
        related_name='lecturer_assignments'
    )
    lecturer = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        related_name='registration_assignments', 
        limit_choices_to={'role': User.Role.LECTURER}
    )
    role = models.CharField(max_length=20, choices=Role, default=Role.MAIN)
    approval_status = models.CharField(
        max_length=20, choices=ApprovalStatus.choices, default=ApprovalStatus.PENDING
    )
    responded_at = models.DateTimeField(null=True, blank=True)
    note = models.TextField(blank=True, null=True)  # lý do từ chối
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            # Mỗi registration chỉ có đúng 1 người cho mỗi role (main/backup/reviewer)
            models.UniqueConstraint(
                fields=['registration', 'role'],
                name='unique_role_per_registration',
            ),
            # 1 giảng viên không được gán 2 vai trò khác nhau trong cùng registration
            models.UniqueConstraint(
                fields=['registration', 'lecturer'],
                name='unique_lecturer_per_registration',
            ),
        ]