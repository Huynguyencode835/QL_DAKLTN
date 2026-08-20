from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone


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

class AcademicDegree(BaseModel):
    class DegreeName(models.TextChoices):
        MASTER = 'master', 'Thạc sĩ'
        DOCTOR = 'doctor', 'Tiến sĩ'
        ASSOC_PROF = 'assoc_prof', 'Phó Giáo sư'
        PROF = 'prof', 'Giáo sư'

    name = models.CharField(
        max_length=20,
        choices=DegreeName.choices,
        unique=True,
    )

    max_students_quota = models.PositiveIntegerField(
        help_text='Số đồ án/luận văn tối đa được hướng dẫn cùng lúc'
    )

    def __str__(self):
        return self.get_name_display()

class LecturerProfile(BaseModel):
    user = models.OneToOneField(
        User, on_delete=models.CASCADE, primary_key=True, related_name='lecturer_profile'
    )
    academic_degree = models.ForeignKey(
        AcademicDegree,
        on_delete=models.PROTECT,
        related_name='lecturers',
    )
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
            models.UniqueConstraint(
                fields=['lecturer', 'title'],
                name='unique_topic_title_per_lecturer',
            ),
        ]

class RegistrationPeriod(BaseModel):
    class STATUS(models.TextChoices):
        SCHEDULED = 'scheduled', 'Chờ mở đăng ký'
        STUDENT_REGISTRATION = 'student_registration', 'Đang mở đăng ký'
        IN_PROGRESS = 'in_progress', 'Đang thực hiện đồ án'
        REPORT_SUBMISSION = 'report_submission', 'Đang nhận báo cáo'
        CLOSED = 'closed', 'Đã đóng'

    OPEN_STATUSES = [
        STATUS.SCHEDULED,
        STATUS.STUDENT_REGISTRATION,
        STATUS.IN_PROGRESS,
        STATUS.REPORT_SUBMISSION,
    ]

    name = models.CharField(max_length=255)
    academic_year = models.CharField(max_length=20)
    student_registration_start = models.DateTimeField(help_text='SV bắt đầu đăng ký')
    student_registration_days = models.PositiveSmallIntegerField(
        default=14,
        help_text='Số ngày mở cho SV đăng ký, tính từ student_registration_start',
    )

    execution_duration_weeks = models.PositiveSmallIntegerField(
        default=10,
        help_text=(
            'Số tuần thực hiện đồ án, tính từ khi hết hạn đăng ký (student_registration_end). '
            'Dùng để tự động tính report_submission_start.'
        ),
    )

    report_submission_days = models.PositiveSmallIntegerField(
        default=7,
        help_text='Số ngày cho phép nộp báo cáo, tính từ report_submission_start',
    )

    status = models.CharField(max_length=20, choices=STATUS.choices, default=STATUS.SCHEDULED)

    faculty = models.ForeignKey(
        Faculty, on_delete=models.CASCADE, null=False, blank=False,
        related_name='registration_periods',
    )

    created_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True,
        related_name='created_registration_periods',
        limit_choices_to={'role': User.Role.STAFF},
    )

    @property
    def student_registration_end(self):
        return self.student_registration_start + timezone.timedelta(days=self.student_registration_days)

    @property
    def report_submission_start(self):
        return self.student_registration_end + timezone.timedelta(weeks=self.execution_duration_weeks)

    @property
    def report_submission_end(self):
        return self.report_submission_start + timezone.timedelta(days=self.report_submission_days)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['faculty'],
                condition=models.Q(
                    active=True,status__in=[
                    'scheduled', 'student_registration', 'in_progress', 'report_submission',
                ]),
                name='unique_open_registration_period_per_faculty',
            ),
            models.CheckConstraint(
                condition=models.Q(student_registration_days__gt=0),
                name='student_registration_days_positive',
            ),
            models.CheckConstraint(
                condition=models.Q(report_submission_days__gt=0),
                name='report_submission_days_positive',
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

    specialization = models.ForeignKey(
            'Specialization',
            blank=True,
            on_delete=models.SET_NULL,
            null=True,
            related_name='project_registrations',
        )

    class STATUS(models.TextChoices):
        WAITING_LECTURER_AND_PENDING = 'waiting_lecturer', 'Chờ phân giảng viên hướng dẫn'
        ASSIGNED_LECTURER_AND_PENDING = 'assigned_lecturer', 'Đã phân giảng viên hướng dẫn'
        WAITING_STAFF_ASSIGNMENT = 'waiting_staff_assignment', 'Các nguyện vọng bị từ chối, chờ giáo vụ phân công'

    status = models.CharField(max_length=50, default=STATUS.WAITING_LECTURER_AND_PENDING, choices=STATUS.choices)
    wants_thesis_upgrade = models.BooleanField(default=False)

    is_thesis = models.BooleanField(default=False)

    upgraded_from = models.OneToOneField(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='upgraded_to',
        limit_choices_to={'is_thesis': False},
    )

    final_score = models.DecimalField(max_digits=4, decimal_places=2, null=True, blank=True)

    # FIX: diagram thể hiện Committee (1) -- (1..*) ProjectRegistration, tức MỘT
    # ProjectRegistration chỉ thuộc ĐÚNG 1 hội đồng, và 1 hội đồng chấm nhiều đồ án.
    # Đây là quan hệ 1-nhiều, KHÔNG phải M2M. Field này thay cho
    # Committee.registrations (ManyToManyField) ở bản trước — đã sửa sai đó tại đây.
    committee = models.ForeignKey(
        'Committee',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='registrations',
        help_text='Hội đồng phụ trách chấm/bảo vệ cho đồ án này (gán sau khi nộp báo cáo cuối kỳ).',
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['student', 'registration_period'],
                name='unique_student_per_registration_period',
            ),
            models.CheckConstraint(
                condition=(
                    models.Q(is_thesis=False) |
                    models.Q(upgraded_from__isnull=False)
                ),
                name='thesis_requires_upgraded_from',
            ),
            models.CheckConstraint(
                condition=(
                    models.Q(final_score__isnull=True) |
                    (models.Q(final_score__gte=0) & models.Q(final_score__lte=10))
                ),
                name='final_score_between_0_and_10',
            ),
        ]

class RegistrationLecturer(BaseModel):
    class Role(models.TextChoices):
        MAIN = 'main', 'Chính thức'
        PREFERENCE = 'preference', 'Nguyện vọng'
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
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.MAIN)
    priority = models.PositiveSmallIntegerField(
        default=0,
        help_text='Thứ tự ưu tiên trong các nguyện vọng của cùng 1 registration. Số nhỏ hơn = ưu tiên cao hơn.',
    )
    approval_status = models.CharField(
        max_length=20, choices=ApprovalStatus.choices, default=ApprovalStatus.PENDING
    )
    note = models.TextField(blank=True, null=True)
    responded_at = models.DateTimeField(
        null=True, blank=True,
        help_text='Thời điểm giảng viên phản hồi (đồng ý/từ chối) nguyện vọng',
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['registration', 'priority'],
                condition=models.Q(role='preference'),
                name='unique_priority_per_registration_preference',
            ),
            models.UniqueConstraint(
                fields=['registration', 'lecturer'],
                name='unique_lecturer_per_registration',
            ),
            # FIX: bỏ 'pending_transfer' - giá trị này không tồn tại trong
            # ApprovalStatus.choices (chỉ có pending/approved/rejected/skipped),
            # để trong __in làm constraint vô nghĩa (không match được row nào).
            models.CheckConstraint(
                condition=(
                    models.Q(approval_status__in=['pending', 'skipped']) |
                    models.Q(responded_at__isnull=False)
                ),
                name='responded_at_required_when_approved_or_rejected',
            ),
        ]

class PeriodicReportSchedule(BaseModel):
    registrations = models.ManyToManyField(
        ProjectRegistration,
        related_name='report_schedules',
        help_text='Các SV áp dụng lịch này',
    )
    sequence_number = models.PositiveSmallIntegerField()
    title = models.CharField(max_length=255, blank=True)  # vd: "Báo cáo tiến độ tuần 6"
    deadline = models.DateTimeField()
    lecturer = models.ForeignKey(
        User, on_delete=models.CASCADE,
        related_name='created_schedules',
        limit_choices_to={'role': User.Role.LECTURER},
        help_text='GVHD tạo lịch chung cho các SV mình hướng dẫn',
    )
    registration_period = models.ForeignKey(
        RegistrationPeriod,
        on_delete=models.CASCADE,
        related_name='report_schedules',
    )
    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['lecturer', 'registration_period', 'sequence_number'],
                name='unique_schedule_sequence_per_registration',
            ),
        ]

    def clean(self):
        if self.sequence_number is None:
            last = PeriodicReportSchedule.objects.filter(
                lecturer=self.lecturer, registration_period=self.registration_period,
            ).exclude(pk=self.pk).order_by('-sequence_number').first()
            self.sequence_number = (last.sequence_number + 1) if last else 1

class Report(BaseModel):
    class ReportType(models.TextChoices):
        PERIODIC = 'periodic', 'Báo cáo định kỳ'
        FINAL = 'final', 'Báo cáo cuối kỳ'

    class Status(models.TextChoices):
        SUBMITTED = 'submitted', 'Đã nộp'
        REVIEWED = 'reviewed', 'Đã xem/góp ý'
        APPROVED = 'approved', 'Đã duyệt'
        REJECTED = 'rejected', 'Yêu cầu nộp lại'
        LATE = 'late', 'Nộp trễ'

    registration = models.ForeignKey(
        ProjectRegistration, on_delete=models.CASCADE, related_name='reports',
    )
    schedule = models.ForeignKey(
        PeriodicReportSchedule,
        on_delete=models.PROTECT,
        null=True, blank=True,
        related_name='reports',
        help_text='Bắt buộc khi report_type=periodic, null khi report_type=final',
    )
    report_type = models.CharField(max_length=20, choices=ReportType.choices)
    sequence_number = models.PositiveSmallIntegerField(
        help_text='periodic: lấy từ schedule.sequence_number. final: tự tăng theo số lần nộp lại.'
    )

    title = models.CharField(max_length=255, blank=True)
    file_key = models.CharField(max_length=500)
    file_name = models.CharField(max_length=255)
    file_size = models.PositiveIntegerField()
    note = models.TextField(blank=True)

    status = models.CharField(max_length=20, choices=Status.choices, default=Status.SUBMITTED)

    feedback = models.TextField(blank=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        constraints = [
            # thay cho unique_final_report_per_registration + unique_periodic_sequence_per_registration
            models.UniqueConstraint(
                fields=['registration', 'report_type', 'sequence_number'],
                name='unique_sequence_per_report_type_per_registration',
            ),
            models.CheckConstraint(
                condition=~models.Q(report_type='periodic') | models.Q(schedule__isnull=False),
                name='periodic_requires_schedule',
            ),
            models.CheckConstraint(
                condition=~models.Q(report_type='final') | models.Q(schedule__isnull=True),
                name='final_forbids_schedule',
            ),
            models.CheckConstraint(
                condition=(
                    models.Q(status__in=['submitted', 'late']) |
                    models.Q(reviewed_at__isnull=False)
                ),
                name='reviewed_at_required_when_processed',
            ),
        ]
        ordering = ['registration', 'report_type', 'sequence_number']

    def clean(self):

        # final: tự tăng sequence_number nếu chưa set
        if self.report_type == self.ReportType.FINAL and self.sequence_number is None:
            last = Report.objects.filter(
                registration=self.registration, report_type=self.ReportType.FINAL,
            ).exclude(pk=self.pk).order_by('-sequence_number').first()
            self.sequence_number = (last.sequence_number + 1) if last else 1

        if self.status == self.Status.REJECTED and not self.feedback.strip():
            raise ValidationError('Cần ghi rõ lý do khi yêu cầu nộp lại.')

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

class Committee(BaseModel):
    name = models.CharField(max_length=255)
    defense_date = models.DateTimeField()
    location = models.CharField(max_length=255, blank=True)

    # FIX: bỏ ManyToManyField 'registrations' ở đây — quan hệ Committee(1)--(1..*)
    # ProjectRegistration đã chuyển thành ForeignKey khai báo bên ProjectRegistration
    # (field `committee`, related_name='registrations'), đúng kiểu 1-nhiều theo diagram.

    registration_period = models.ForeignKey(
        RegistrationPeriod,
        on_delete=models.CASCADE,
        related_name='committees',
    )

    created_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True,
        related_name='created_committees',
        limit_choices_to={'role': User.Role.STAFF},
        help_text='Giáo vụ tạo hội đồng (create by the staff)',
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['registration_period', 'name'],
                name='unique_committee_name_per_faculty',
            ),
        ]

class CommitteeMember(BaseModel):
    class MemberRole(models.TextChoices):
        CHAIR = 'chair', 'Chủ tịch hội đồng'
        SECRETARY = 'secretary', 'Thư ký'
        MEMBER = 'member', 'Ủy viên'
        REVIEWER = 'reviewer', 'Ủy viên phản biện'

    committee = models.ForeignKey(
        Committee,
        on_delete=models.CASCADE,
        related_name='members',
    )
    lecturer = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='committee_memberships',
        limit_choices_to={'role': User.Role.LECTURER},
    )
    role = models.CharField(max_length=20, choices=MemberRole.choices, default=MemberRole.MEMBER)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['committee', 'lecturer'],
                name='unique_lecturer_per_committee',
            ),
        ]

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
    graded_by_lecturer = models.ForeignKey(
        RegistrationLecturer,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='grades_given',
        help_text='Dùng cho grade_type=supervisor/reviewer. Phải thuộc đúng registration của Grade này.',
    )
    graded_by_committee_member = models.ForeignKey(
        CommitteeMember,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='grades_given',
        help_text='Dùng cho grade_type=committee. Hội đồng của thành viên này phải đang phụ trách registration.',
    )
    is_final = models.BooleanField(
        default=True,
        help_text=(
            'True: điểm chính thức/tổng kết dùng để tính final_score. '
            'False: điểm thành phần do 1 thành viên hội đồng chấm, chờ tổng hợp.'
        ),
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
            # FIX: bị revert về (registration, grade_type) ở bản gửi lần này —
            # quay lại đây, đổi sang (registration, grade_type, graded_by_lecturer)
            # + (registration, grade_type, graded_by_committee_member) để cho phép
            # NHIỀU ủy viên hội đồng cùng chấm 1 registration (mỗi người 1 lần).
            models.UniqueConstraint(
                fields=['registration', 'grade_type', 'graded_by_lecturer'],
                name='unique_grade_per_lecturer',
            ),
            models.UniqueConstraint(
                fields=['registration', 'grade_type', 'graded_by_committee_member'],
                name='unique_grade_per_committee_member',
            ),
            models.CheckConstraint(
                condition=models.Q(score__gte=0) & models.Q(score__lte=10),
                name='grade_score_between_0_and_10',
            ),
            models.CheckConstraint(
                condition=models.Q(weight__gte=0) & models.Q(weight__lte=1),
                name='grade_weight_between_0_and_1',
            ),
            # FIX: CheckConstraint XOR này bị mất ở bản gửi lần này, thêm lại.
            models.CheckConstraint(
                condition=(
                    (models.Q(graded_by_lecturer__isnull=False) & models.Q(graded_by_committee_member__isnull=True)) |
                    (models.Q(graded_by_lecturer__isnull=True) & models.Q(graded_by_committee_member__isnull=False))
                ),
                name='grade_graded_by_lecturer_xor_committee_member',
            ),
        ]

    def clean(self):
        from django.core.exceptions import ValidationError

        # FIX: toàn bộ method clean() này bị mất ở bản gửi lần này, thêm lại.
        # Validate cross-table không thể biểu diễn bằng CheckConstraint thuần DB.
        if self.grade_type in (self.GradeType.SUPERVISOR, self.GradeType.REVIEWER):
            if not self.graded_by_lecturer_id:
                raise ValidationError('grade_type=supervisor/reviewer bắt buộc phải có graded_by_lecturer.')
            if self.graded_by_lecturer.registration_id != self.registration_id:
                raise ValidationError('graded_by_lecturer phải thuộc đúng registration của Grade này.')
            expected_role = (
                RegistrationLecturer.Role.MAIN
                if self.grade_type == self.GradeType.SUPERVISOR
                else RegistrationLecturer.Role.REVIEWER
            )
            if self.graded_by_lecturer.role != expected_role:
                raise ValidationError(
                    f'grade_type={self.grade_type} yêu cầu graded_by_lecturer có role={expected_role}.'
                )

        if self.grade_type == self.GradeType.COMMITTEE:
            if not self.graded_by_committee_member_id:
                raise ValidationError('grade_type=committee bắt buộc phải có graded_by_committee_member.')
            # FIX: điều kiện kiểm tra cũng đổi theo vì Committee.registrations
            # giờ là related_name của FK (ProjectRegistration.committee), không
            # còn là M2M, nên so sánh trực tiếp FK thay vì .filter(pk=...).exists()
            if self.graded_by_committee_member.committee_id != self.registration.committee_id:
                raise ValidationError(
                    'graded_by_committee_member phải thuộc hội đồng đang phụ trách registration này.'
                )