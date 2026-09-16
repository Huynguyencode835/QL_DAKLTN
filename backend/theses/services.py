from theses.models import ProjectRegistration, RegistrationLecturer, RegistrationPeriod
from django.utils import timezone


def get_lecturer_remaining_slots(lecturer):
    """Số chỉ tiêu hướng dẫn còn lại của 1 giảng viên trong các đợt đang mở.

    Trả về số nguyên có thể âm (đã vượt chỉ tiêu). Caller tự quyết định cách
    xử lý: clamp >= 0 khi hiển thị, hoặc block khi <= 0 (đã hết slot).
    """
    current_count = RegistrationLecturer.objects.filter(
        lecturer=lecturer,
        role=RegistrationLecturer.Role.MAIN,
        approval_status=RegistrationLecturer.ApprovalStatus.APPROVED,
        registration__registration_period__status__in=RegistrationPeriod.OPEN_STATUSES,
    ).count()
    profile = getattr(lecturer, 'lecturer_profile', None)
    if profile is None or profile.academic_degree_id is None:
        return 0
    return profile.academic_degree.max_students_quota - current_count


def _reevaluate_main_candidate(registration, expire_pending=False):
    """Xác định lại GVHD chính thức (MAIN) cho 1 registration dựa trên priority.

    Gọi sau mỗi lần 1 nguyện vọng được approve/reject (expire_pending=False —
    mặc định, gặp PENDING thì dừng lại chờ người đó phản hồi).

    expire_pending=True: dùng khi HẾT HẠN ĐĂNG KÝ (Celery gọi lúc chuyển
    STUDENT_REGISTRATION -> IN_PROGRESS). Nguyện vọng PENDING lúc này không
    còn được chờ nữa — coi như hết hạn phản hồi, tự động REJECTED, xét tiếp
    xuống nguyện vọng ưu tiên thấp hơn.
    """
    candidate = (
        registration.lecturer_assignments
        .filter(role=RegistrationLecturer.Role.PREFERENCE)
        .exclude(approval_status__in=[
            RegistrationLecturer.ApprovalStatus.REJECTED,
            RegistrationLecturer.ApprovalStatus.SKIPPED,
        ])
        .select_for_update()
        .order_by('priority', 'id')
        .first()
    )

    if candidate is None:
        if registration.status != ProjectRegistration.STATUS.WAITING_STAFF_ASSIGNMENT:
            registration.status = ProjectRegistration.STATUS.WAITING_STAFF_ASSIGNMENT
            registration.save(update_fields=['status', 'updated_date'])
        return

    if candidate.approval_status == RegistrationLecturer.ApprovalStatus.PENDING:
        if not expire_pending:
            return   # còn trong hạn -> chờ giảng viên này phản hồi

        # THÊM: hết hạn -> coi nguyện vọng này là hết hạn phản hồi, tự REJECTED
        candidate.approval_status = RegistrationLecturer.ApprovalStatus.REJECTED
        candidate.responded_at = timezone.now()
        candidate.note = (
            (candidate.note + ' ' if candidate.note else '')
            + '[Hệ thống tự động từ chối: giảng viên không phản hồi trước khi hết hạn đăng ký.]'
        )
        candidate.save(update_fields=['approval_status', 'responded_at', 'note', 'updated_date'])

        _reevaluate_main_candidate(registration, expire_pending=True)
        return

    if candidate.approval_status == RegistrationLecturer.ApprovalStatus.APPROVED:
        remaining = get_lecturer_remaining_slots(candidate.lecturer)

        if remaining < 0:
            candidate.approval_status = RegistrationLecturer.ApprovalStatus.REJECTED
            candidate.responded_at = timezone.now()
            candidate.note = (
                (candidate.note + ' ' if candidate.note else '')
                + '[Hệ thống tự động từ chối: giảng viên đã hết chỉ tiêu hướng dẫn '
                'tại thời điểm xét duyệt.]'
            )
            candidate.save(update_fields=['approval_status', 'responded_at', 'note', 'updated_date'])

            # THAY: phải truyền lại expire_pending, nếu không sẽ luôn reset về
            # False khi đệ quy -> mất chế độ "hết hạn" giữa chừng, quay lại
            # hành vi "chờ" sai cho các PENDING phía sau trong cùng 1 lượt gọi.
            _reevaluate_main_candidate(registration, expire_pending=expire_pending)
            return

        if candidate.role != RegistrationLecturer.Role.MAIN:
            candidate.role = RegistrationLecturer.Role.MAIN
            candidate.save(update_fields=['role', 'updated_date'])

        other_preferences = (
            registration.lecturer_assignments
            .filter(
                role=RegistrationLecturer.Role.PREFERENCE,
                approval_status__in=[
                    RegistrationLecturer.ApprovalStatus.PENDING,
                    RegistrationLecturer.ApprovalStatus.APPROVED,
                ],
            )
            .exclude(pk=candidate.pk)
        )
        for assignment in other_preferences:
            assignment.approval_status = RegistrationLecturer.ApprovalStatus.SKIPPED
            assignment.save(update_fields=['approval_status', 'updated_date'])

        if registration.status != ProjectRegistration.STATUS.ASSIGNED_LECTURER_AND_PENDING:
            registration.status = ProjectRegistration.STATUS.ASSIGNED_LECTURER_AND_PENDING
            registration.save(update_fields=['status', 'updated_date'])
