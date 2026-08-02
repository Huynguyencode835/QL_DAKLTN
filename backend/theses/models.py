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

    class Meta:
        constraints = [
            # ADMIN không bắt buộc thuộc khoa nào, các role khác bắt buộc phải có faculty
            # Cho phép role rỗng ('') để không block createsuperuser (role chưa được set)
            models.CheckConstraint(
                condition=(
                    models.Q(role='admin') |
                    models.Q(role='') |
                    models.Q(faculty__isnull=False)
                ),
                name='faculty_required_unless_admin',
            ),
        ]

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

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['name'], name='unique_faculty_name'),
        ]

class Major(BaseModel):
    major_name = models.CharField(max_length=150)
    description = models.TextField(blank=True)
    training_duration = models.PositiveIntegerField(help_text='Số năm đào tạo, vd: 4')
    faculty = models.ForeignKey(
        Faculty,
        on_delete=models.CASCADE,
        related_name='majors',
    )

    class Meta:
        constraints = [
            # Không cho 2 ngành trùng tên trong cùng 1 khoa (khoa khác thì được trùng)
            models.UniqueConstraint(
                fields=['faculty', 'major_name'],
                name='unique_major_name_per_faculty',
            ),
        ]

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

    class Meta:
        constraints = [
            models.CheckConstraint(
                condition=models.Q(gpa__gte=0) & models.Q(gpa__lte=4),
                name='gpa_between_0_and_4',
            ),
            models.CheckConstraint(
                condition=models.Q(conduct_score__gte=0) & models.Q(conduct_score__lte=100),
                name='conduct_score_between_0_and_100',
            ),
        ]

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

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['faculty', 'name'],
                name='unique_specialization_name_per_faculty',
            ),
        ]

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

    class Meta:
        constraints = [
            # 1 giảng viên không đăng 2 đề tài trùng tên
            # (bỏ nếu nghiệp vụ cho phép trùng tên đề tài qua các năm khác nhau)
            models.UniqueConstraint(
                fields=['lecturer', 'title'],
                name='unique_topic_title_per_lecturer',
            ),
        ]

class RegistrationPeriod(BaseModel):
    class STATUS(models.TextChoices):
        DRAFT = 'draft', 'Nháp'
        STUDENT_REGISTRATION = 'student_registration', 'Đang mở đăng ký'
        IN_PROGRESS = 'in_progress', 'Đang thực hiện đồ án'
        REPORT_SUBMISSION = 'report_submission', 'Đang nhận báo cáo'
        CLOSED = 'closed', 'Đã đóng'
        ARCHIVED = 'archived', 'Đã lưu trữ'

    OPEN_STATUSES = [
        STATUS.DRAFT,
        STATUS.STUDENT_REGISTRATION,
        STATUS.IN_PROGRESS,
        STATUS.REPORT_SUBMISSION,
    ]

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

    class Meta:
        constraints = [
            # 1 khoa chỉ được có tối đa 1 đợt đang ở trạng thái "mở" tại 1 thời điểm
            # (chỉ hoạt động trên PostgreSQL - partial unique index)
            models.UniqueConstraint(
                fields=['faculty'],
                condition=models.Q(status__in=[
                    'draft', 'student_registration', 'in_progress', 'report_submission',
                ]),
                name='unique_open_registration_period_per_faculty',
            ),
            # Ngày kết thúc đăng ký phải sau ngày bắt đầu
            models.CheckConstraint(
                condition=models.Q(student_registration_end__gt=models.F('student_registration_start')),
                name='student_registration_end_after_start',
            ),
            # Ngày kết thúc nộp báo cáo phải sau ngày bắt đầu
            models.CheckConstraint(
                condition=models.Q(report_submission_end__gt=models.F('report_submission_start')),
                name='report_submission_end_after_start',
            ),
        ]

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
        constraints = [
            # 1 sinh viên chỉ được đăng ký 1 lần trong cùng 1 đợt đăng ký
            models.UniqueConstraint(
                fields=['student', 'registration_period'],
                name='unique_student_per_registration_period',
            ),
        ]

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
        PENDING_TRANSFER = 'pending_transfer', 'Chờ chuyển'

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
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.MAIN)
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
            # Đã approved/rejected thì bắt buộc phải có responded_at
            models.CheckConstraint(
                condition=(
                    models.Q(approval_status__in=['pending', 'skipped', 'pending_transfer']) |
                    models.Q(responded_at__isnull=False)
                ),
                name='responded_at_required_when_approved_or_rejected',
            ),
        ]

class Report(BaseModel):
    class ReportType(models.TextChoices):
        PERIODIC = 'periodic', 'Báo cáo định kỳ'   # nộp cho GVHD
        FINAL = 'final', 'Báo cáo cuối kỳ'          # nộp cho khoa

    class Status(models.TextChoices):
        SUBMITTED = 'submitted', 'Đã nộp'
        REVIEWED = 'reviewed', 'Đã xem/góp ý'       # dùng cho periodic
        APPROVED = 'approved', 'Đã duyệt'
        REJECTED = 'rejected', 'Yêu cầu nộp lại'
        LATE = 'late', 'Nộp trễ'

    registration = models.ForeignKey(
        ProjectRegistration,
        on_delete=models.CASCADE,
        related_name='reports',
    )
    report_type = models.CharField(max_length=20, choices=ReportType.choices)

    # Với periodic: đánh số lần nộp (báo cáo tuần 1, tuần 2...)
    # Với final: luôn null hoặc = 0, vì chỉ nộp 1 lần
    sequence_number = models.PositiveSmallIntegerField(null=True, blank=True)

    title = models.CharField(max_length=255, blank=True)
    file = models.FileField(upload_to='reports/%Y/%m/')
    note = models.TextField(blank=True)  # ghi chú của sinh viên khi nộp

    submitted_at = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.SUBMITTED)

    # Người review: GVHD (periodic) hoặc staff khoa (final)
    reviewed_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='reviewed_reports',
        limit_choices_to={'role': User.Role.LECTURER}
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    feedback = models.TextField(blank=True)  # phản hồi/nhận xét của người review

    class Meta:
        constraints = [
            # Final report chỉ được nộp 1 lần / registration
            models.UniqueConstraint(
                fields=['registration'],
                condition=models.Q(report_type='final'),
                name='unique_final_report_per_registration',
            ),
            # Periodic report: không trùng sequence_number trong cùng registration
            models.UniqueConstraint(
                fields=['registration', 'sequence_number'],
                condition=models.Q(report_type='periodic'),
                name='unique_periodic_sequence_per_registration',
            ),
            # Reviewed/approved/rejected thì bắt buộc có reviewed_at
            models.CheckConstraint(
                condition=(
                    models.Q(status='submitted') |
                    models.Q(reviewed_at__isnull=False)
                ),
                name='reviewed_at_required_when_processed',
            ),
        ]

        ordering = ['registration', 'report_type', 'sequence_number']

class Grade(BaseModel):
    class GradeType(models.TextChoices):
        SUPERVISOR = 'supervisor', 'Điểm GVHD'
        REVIEWER = 'reviewer', 'Điểm phản biện'
        COMMITTEE = 'committee', 'Điểm hội đồng'

    registration = models.ForeignKey(
        ProjectRegistration,
        on_delete=models.CASCADE,
        related_name='grades',
    )
    grade_type = models.CharField(max_length=20, choices=GradeType.choices)
    grader = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='given_grades',
        limit_choices_to={'role': User.Role.LECTURER},
    )
    score = models.DecimalField(max_digits=4, decimal_places=2)
    weight = models.DecimalField(
        max_digits=3, decimal_places=2, default=1,
        help_text='Trọng số điểm này trong tổng kết, vd 0.5 = 50%',
    )
    comment = models.TextField(blank=True)
    graded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['registration', 'grade_type'],
                name='unique_grade_type_per_registration',
            ),
            models.CheckConstraint(
                condition=models.Q(score__gte=0) & models.Q(score__lte=10),
                name='grade_score_between_0_and_10',
            ),
            models.CheckConstraint(
                condition=models.Q(weight__gte=0) & models.Q(weight__lte=1),
                name='grade_weight_between_0_and_1',
            ),
        ]