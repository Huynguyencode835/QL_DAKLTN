from django.contrib.auth.models import AbstractUser
from django.core.exceptions import ValidationError
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
        DRAFT = 'draft', 'chưa công bố'
        SCHEDULED = 'scheduled', 'Chờ mở đăng ký'
        STUDENT_REGISTRATION = 'student_registration', 'Đang mở đăng ký'
        IN_PROGRESS = 'in_progress', 'Đang thực hiện đồ án'
        REPORT_SUBMISSION = 'report_submission', 'Đang nhận báo cáo'
        CLOSED = 'closed', 'Đã đóng'

    class PeriodType(models.TextChoices):
        PROJECT = 'project', 'Đợt đồ án'
        THESIS = 'thesis', 'Đợt khóa luận'

    OPEN_STATUSES = [
        STATUS.SCHEDULED,
        STATUS.STUDENT_REGISTRATION,
        STATUS.IN_PROGRESS,
        STATUS.REPORT_SUBMISSION,
    ]

    period_type = models.CharField(
        max_length=20, choices=PeriodType.choices, default=PeriodType.PROJECT,
    )

    parent_period = models.ForeignKey(
        'self',
        on_delete=models.PROTECT,
        null=True, blank=True,
        related_name='thesis_periods',
        limit_choices_to={'period_type': 'project'},
        help_text='Bắt buộc khi period_type=thesis: đợt đồ án gốc mà đợt khóa luận này kế thừa.',
    )

    closed_at = models.DateTimeField(null=True, blank=True)

    name = models.CharField(max_length=255)
    academic_year = models.CharField(max_length=20)

    student_registration_start = models.DateTimeField(
        help_text='Đồ án: SV bắt đầu đăng ký. Khóa luận: thời điểm bắt đầu thực hiện.'
    )
    student_registration_days = models.PositiveSmallIntegerField(default=14)
    execution_duration_weeks = models.PositiveSmallIntegerField(default=10)
    report_submission_days = models.PositiveSmallIntegerField(default=7)

    status = models.CharField(max_length=20, choices=STATUS.choices, default=STATUS.DRAFT)
    faculty = models.ForeignKey(Faculty, on_delete=models.CASCADE, related_name='registration_periods')
    created_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True,
        related_name='created_registration_periods',
        limit_choices_to={'role': User.Role.STAFF},
    )

    @classmethod
    def create_thesis_period(cls, project_period, *, name, start_offset_days=7, created_by=None, **extra_fields):
        if project_period.period_type != cls.PeriodType.PROJECT:
            raise ValueError('project_period phải có period_type=project.')
        if project_period.status != cls.STATUS.CLOSED or not project_period.closed_at:
            raise ValueError('Đợt đồ án gốc phải đã CLOSED (có closed_at) trước khi tạo đợt khóa luận.')

        thesis_start = project_period.closed_at + timezone.timedelta(days=start_offset_days)

        return cls.objects.create(
            period_type=cls.PeriodType.THESIS,
            parent_period=project_period,
            faculty=project_period.faculty,
            academic_year=project_period.academic_year,
            name=name,
            student_registration_start=thesis_start,
            created_by=created_by or project_period.created_by,
            **extra_fields,
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

    def clean(self):
        if self.period_type == self.PeriodType.THESIS:
            if not self.parent_period_id:
                raise ValidationError('Đợt khóa luận bắt buộc phải có parent_period.')
            if self.parent_period.period_type != self.PeriodType.PROJECT:
                raise ValidationError('parent_period phải có period_type=project.')
            if self.parent_period.status != self.STATUS.CLOSED or not self.parent_period.closed_at:
                raise ValidationError(
                    'Đợt đồ án gốc (parent_period) phải đã CLOSED trước khi tạo đợt khóa luận.'
                )

    def save(self, *args, **kwargs):
        if self.status == self.STATUS.CLOSED and self.closed_at is None:
            self.closed_at = timezone.now()
        self.full_clean()
        super().save(*args, **kwargs)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['faculty', 'period_type'],
                condition=models.Q(
                    active=True,
                    status__in=['scheduled', 'student_registration', 'in_progress', 'report_submission'],
                ),
                name='unique_open_registration_period_per_faculty_type',
            ),
            models.CheckConstraint(
                condition=models.Q(student_registration_days__gt=0),
                name='student_registration_days_positive',
            ),
            models.CheckConstraint(
                condition=models.Q(report_submission_days__gt=0),
                name='report_submission_days_positive',
            ),
            models.CheckConstraint(
                condition=(
                    (models.Q(period_type='thesis') & models.Q(parent_period__isnull=False)) |
                    (models.Q(period_type='project') & models.Q(parent_period__isnull=True))
                ),
                name='parent_period_required_only_for_thesis',
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
        WAITING_STAFF_ASSIGNMENT = 'waiting_staff_assignment', 'chờ giáo vụ phân công'
        ASSIGNED_LECTURER_AND_PENDING = 'assigned_lecturer', 'Đã phân giảng viên hướng dẫn'

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

    committee = models.ForeignKey(
        'Committee',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='registrations',
        help_text='Hội đồng phụ trách chấm/bảo vệ cho đồ án này (gán sau khi nộp báo cáo cuối kỳ).',
    )

    def clean(self):
        if self.is_thesis and self.upgraded_from_id:
            old_period = self.upgraded_from.registration_period
            new_period = self.registration_period
            if new_period is None or old_period is None:
                raise ValidationError('Cả registration cũ và mới đều phải có registration_period.')
            if new_period.parent_period_id != old_period.id:
                raise ValidationError(
                    'registration_period của bản ghi khóa luận phải là đợt khóa luận '
                    'kế thừa đúng từ đợt đồ án của registration gốc.'
                )

        if self.registration_period_id and self.registration_period.status in RegistrationPeriod.OPEN_STATUSES:
            conflicting = ProjectRegistration.objects.filter(
                student=self.student,
                active=True,
                registration_period__status__in=RegistrationPeriod.OPEN_STATUSES,
            ).exclude(
                pk=self.pk,
            ).exclude(
                registration_period_id=self.registration_period_id,
            )
            if self.upgraded_from_id:
                conflicting = conflicting.exclude(pk=self.upgraded_from_id)
            conflicting = conflicting.exclude(upgraded_from_id=self.pk)

            if conflicting.exists():
                raise ValidationError(
                    'Sinh viên đã có một đăng ký khác đang hoạt động ở một đợt đăng ký '
                    'khác cũng đang mở. Không thể đăng ký song song 2 đợt khác nhau.'
                )

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

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
    reviewer_session = models.ForeignKey(
        'ReviewerAssignmentSession',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='reviewer_assignments',
        help_text='Chỉ set khi role=reviewer, dùng để nhóm các đợt phản biện chung ngày/phòng.',
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
            models.CheckConstraint(
                condition=(
                    models.Q(approval_status__in=['pending', 'skipped']) |
                    models.Q(responded_at__isnull=False)
                ),
                name='responded_at_required_when_approved_or_rejected',
            ),
            models.CheckConstraint(
                condition=(
                    (~models.Q(role='reviewer') | models.Q(reviewer_session__isnull=False))
                    &
                    (models.Q(role='reviewer') | models.Q(reviewer_session__isnull=True))
                ),
                name='reviewer_session_required_only_for_reviewer_role',
            ),
        ]

class PeriodicReportSchedule(BaseModel):
    registrations = models.ManyToManyField(
        ProjectRegistration,
        related_name='report_schedules',
        help_text='Các SV áp dụng lịch này',
    )
    sequence_number = models.PositiveSmallIntegerField()
    title = models.CharField(max_length=255, blank=True)
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
    class CommitteeStatus(models.TextChoices):
        NOT_STARTED = 'not_started', 'Chưa diễn ra'
        IN_PROGRESS = 'in_progress', 'Đang diễn ra'
        COMPLETED = 'completed', 'Kết thúc'

    name = models.CharField(max_length=255)
    defense_date = models.DateTimeField()
    location = models.CharField(max_length=255, blank=True)
    status = models.CharField(
        max_length=20,
        choices=CommitteeStatus.choices,
        default=CommitteeStatus.NOT_STARTED,
    )

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

class ReviewerAssignmentSession(BaseModel):
    """
    Một 'đợt phản biện': gán 1 giảng viên phản biện cho nhiều
    ProjectRegistration cùng lúc, dùng chung ngày + phòng.
    """
    registration_period = models.ForeignKey(
        RegistrationPeriod,
        on_delete=models.CASCADE,
        related_name='reviewer_sessions',
    )
    reviewer = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='reviewer_sessions',
        limit_choices_to={'role': User.Role.LECTURER},
    )
    defense_date = models.DateTimeField()
    location = models.CharField(max_length=255, blank=True)
    created_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True,
        related_name='created_reviewer_sessions',
        limit_choices_to={'role': User.Role.STAFF},
    )

    class Meta:
        constraints = [
            models.CheckConstraint(
                condition=models.Q(defense_date__isnull=False),
                name='reviewer_session_defense_date_required',
            ),
        ]

class Grade(BaseModel):
    class GradeType(models.TextChoices):
        SUPERVISOR = 'supervisor', 'Điểm GVHD'
        REVIEWER = 'reviewer', 'Điểm phản biện'
        COMMITTEE = 'committee', 'Điểm hội đồng'

    class Component(models.TextChoices):
        PROCESS = 'process', 'Điểm quá trình'
        FINAL = 'final', 'Điểm cuối kỳ'
        OVERALL = 'overall', 'Điểm tổng'
        
    component = models.CharField(
        max_length=20, choices=Component.choices, default=Component.OVERALL,
        help_text='supervisor: process/final. reviewer/committee: overall.',
    )
    registration = models.ForeignKey(
        ProjectRegistration,
        on_delete=models.CASCADE,
        related_name='grades',
    )
    grade_type = models.CharField(max_length=20, choices=GradeType.choices)
    graded_by_lecturer = models.ForeignKey(
        RegistrationLecturer,
        on_delete=models.CASCADE,
        null=True, blank=True,
        related_name='grades_given',
        help_text='Dùng cho grade_type=supervisor/reviewer. Phải thuộc đúng registration của Grade này.',
    )
    graded_by_committee_member = models.ForeignKey(
        CommitteeMember,
        on_delete=models.CASCADE,
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
    comment = models.TextField(blank=True)
    graded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['registration', 'grade_type', 'component', 'graded_by_lecturer'],
                name='unique_grade_per_lecturer_component',
            ),
            models.UniqueConstraint(
                fields=['registration', 'grade_type', 'component', 'graded_by_committee_member'],
                name='unique_grade_per_committee_member',
            ),
            models.CheckConstraint(
                condition=models.Q(score__gte=0) & models.Q(score__lte=10),
                name='grade_score_between_0_and_10',
            ),
            models.CheckConstraint(
                condition=~(
                    models.Q(graded_by_lecturer__isnull=False) &
                    models.Q(graded_by_committee_member__isnull=False)
                ),
                name='grade_graded_by_lecturer_xor_committee_member',
            ),
            models.CheckConstraint(
                condition=(
                    (models.Q(grade_type='supervisor') & models.Q(component__in=['process', 'final'])) |
                    (~models.Q(grade_type='supervisor') & models.Q(component='overall'))
                ),
                name='component_matches_grade_type',
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
            if self.graded_by_committee_member.committee_id != self.registration.committee_id:
                raise ValidationError(
                    'graded_by_committee_member phải thuộc hội đồng đang phụ trách registration này.'
                )

class GradeWeightConfig(BaseModel):
    class Scope(models.TextChoices):
        COMMON = 'common', 'Chung'
        THESIS = 'thesis', 'Khóa luận'
        PROJECT_WITH_COMMITTEE = 'project_with_committee', 'Đồ án - có hội đồng'
        PROJECT_NO_COMMITTEE = 'project_no_committee', 'Đồ án - không hội đồng'

    class Component(models.TextChoices):
        PROCESS = 'process', 'Điểm quá trình (trong GVHD)'
        FINAL = 'final', 'Điểm cuối kỳ (trong GVHD)'
        SUPERVISOR = 'supervisor', 'GVHD (đã gộp process+final)'
        REVIEWER = 'reviewer', 'Phản biện'
        COMMITTEE = 'committee', 'Hội đồng'

    registration_period = models.ForeignKey(
        RegistrationPeriod, null=False, blank=False,
        on_delete=models.CASCADE, related_name='grade_weight_configs',
    )
    scope = models.CharField(max_length=30, choices=Scope.choices)
    component = models.CharField(max_length=20, choices=Component.choices)
    weight = models.DecimalField(max_digits=3, decimal_places=2)

    updated_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='updated_weight_configs',
        limit_choices_to={'role': User.Role.STAFF},
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['registration_period', 'scope', 'component'],
                name='unique_weight_per_period_scope_component',
            ),
            models.CheckConstraint(
                condition=models.Q(weight__gte=0) & models.Q(weight__lte=1),
                name='weight_config_between_0_and_1',
            ),
            models.CheckConstraint(
                condition=(
                    (models.Q(scope='thesis') & models.Q(component__in=['supervisor', 'reviewer', 'committee'])) |
                    (models.Q(scope='project_with_committee') & models.Q(component__in=['supervisor', 'committee'])) |
                    (models.Q(scope='project_no_committee') & models.Q(component='supervisor')) |
                    (models.Q(scope='common') & models.Q(component__in=['process', 'final']))
                ),
                name='component_matches_scope',
            ),
        ]