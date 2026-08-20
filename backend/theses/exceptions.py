import logging

from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.exceptions import PermissionDenied as DjangoPermissionDenied
from django.db import DataError, IntegrityError, OperationalError
from django.http import Http404

from rest_framework import status
from rest_framework.exceptions import APIException
from rest_framework.response import Response
from rest_framework.views import exception_handler as drf_exception_handler

logger = logging.getLogger(__name__)


# --------------------------------------------------------------------------
# 1. Map tên UniqueConstraint / CheckConstraint (PostgreSQL) -> message tiếng Việt
#    Tên constraint lấy đúng theo `name=` bạn khai báo trong Meta.constraints
#    của từng model.
# --------------------------------------------------------------------------
CONSTRAINT_MESSAGES = {
    # --- RegistrationPeriod ---
    "unique_open_registration_period_per_faculty":
        "Khoa đã có đợt đăng ký đang mở, không thể tạo thêm.",
    "student_registration_days_positive":
        "Số ngày mở đăng ký cho sinh viên phải lớn hơn 0.",
    "report_submission_days_positive":
        "Số ngày nhận báo cáo phải lớn hơn 0.",

    # --- Thêm constraint của model khác tại đây khi phát sinh ---
    # "unique_together_xxx": "Message tiếng Việt tương ứng.",
}

# --------------------------------------------------------------------------
# 2. Map tên field (theo tên cột DB) -> message khi lỗi NOT NULL / FK vi phạm
#    Dùng khi error message của DB có nhắc tới tên cột nhưng không có
#    constraint name rõ ràng (ví dụ lỗi "null value in column ... violates
#    not-null constraint").
# --------------------------------------------------------------------------
FIELD_MESSAGES = {
    "faculty_id": "Thiếu thông tin khoa.",
    "created_by_id": "Thiếu thông tin người tạo.",
    "lecturer_id": "Thiếu thông tin giảng viên.",
    "student_id": "Thiếu thông tin sinh viên.",
}

DEFAULT_INTEGRITY_MESSAGE = "Dữ liệu vi phạm ràng buộc, vui lòng kiểm tra lại."
DEFAULT_DATA_ERROR_MESSAGE = "Dữ liệu không hợp lệ (sai định dạng hoặc vượt giới hạn cho phép)."
DEFAULT_OPERATIONAL_ERROR_MESSAGE = "Hệ thống đang gặp sự cố kết nối cơ sở dữ liệu, vui lòng thử lại sau."
DEFAULT_UNKNOWN_ERROR_MESSAGE = "Đã có lỗi xảy ra, vui lòng thử lại sau."


def _parse_integrity_error(exc: IntegrityError) -> str:
    """
    Phân tích nội dung IntegrityError để trả về message thân thiện.
    PostgreSQL thường trả message dạng:
        duplicate key value violates unique constraint "unique_open_registration_period_per_faculty"
        DETAIL:  Key (faculty_id)=(1) already exists.
    hoặc:
        null value in column "faculty_id" violates not-null constraint
    hoặc:
        insert or update on table "..." violates foreign key constraint "..."
    """
    error_str = str(exc)

    # 1) Ưu tiên match theo tên constraint (chính xác nhất)
    for constraint_name, message in CONSTRAINT_MESSAGES.items():
        if constraint_name in error_str:
            return message

    # 2) Match theo tên field nếu có nhắc trong message (not-null, FK...)
    for field_name, message in FIELD_MESSAGES.items():
        if field_name in error_str:
            return message

    # 3) Match theo loại lỗi phổ biến qua từ khóa
    lowered = error_str.lower()
    if "unique constraint" in lowered or "duplicate key" in lowered:
        return "Dữ liệu đã tồn tại, không thể tạo trùng."
    if "foreign key constraint" in lowered:
        return "Dữ liệu tham chiếu không tồn tại hoặc đã bị xóa."
    if "not-null constraint" in lowered or "null value in column" in lowered:
        return "Thiếu thông tin bắt buộc."
    if "check constraint" in lowered:
        return "Dữ liệu không thỏa điều kiện hợp lệ."

    # 4) Không nhận diện được -> message mặc định (đã log chi tiết ở caller)
    return DEFAULT_INTEGRITY_MESSAGE


def custom_exception_handler(exc, context):
    """
    Exception handler custom, đăng ký qua settings.REST_FRAMEWORK['EXCEPTION_HANDLER'].

    Thứ tự xử lý:
    1. Để DRF tự xử lý trước các exception nó đã biết
       (ValidationError, NotFound, PermissionDenied, AuthenticationFailed,
       Throttled, MethodNotAllowed, ParseError, NotAuthenticated...).
    2. Nếu DRF không xử lý được (response is None) -> exception này thuộc
       loại "lỗi hệ thống" (thường sẽ thành 500) -> ta tự bắt và convert
       sang response phù hợp (400/503...) tùy loại.
    3. Loại thực sự không xác định -> log đầy đủ, để lộ 500 (không che dấu
       lỗi thật trong lúc dev, nhưng vẫn trả message an toàn cho client).
    """
    request = context.get("request")
    view = context.get("view")

    # ---- Bước 1: để DRF xử lý các lỗi chuẩn của nó trước ----
    response = drf_exception_handler(exc, context)
    if response is not None:
        # Có thể chuẩn hóa lại format response ở đây nếu muốn đồng nhất
        # toàn bộ API, ví dụ luôn bọc trong {"detail": ...}. DRF mặc định
        # đã làm việc này cho hầu hết case nên thường không cần sửa gì thêm.
        return response

    # ---- Bước 2: các lỗi DB / lỗi hệ thống DRF không tự xử lý ----

    if isinstance(exc, IntegrityError):
        message = _parse_integrity_error(exc)
        logger.warning(
            "IntegrityError tại %s: %s",
            getattr(view, "__class__", view),
            exc,
            exc_info=True,
        )
        return Response({"detail": message}, status=status.HTTP_400_BAD_REQUEST)

    if isinstance(exc, DataError):
        # Ví dụ: gửi string quá dài cho CharField(max_length=...) ở tầng DB,
        # hoặc sai kiểu dữ liệu numeric/date mà validate() ở serializer
        # chưa bắt kịp.
        logger.warning("DataError tại %s: %s", view, exc, exc_info=True)
        return Response(
            {"detail": DEFAULT_DATA_ERROR_MESSAGE},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if isinstance(exc, OperationalError):
        # Mất kết nối DB, timeout, deadlock...
        logger.error("OperationalError tại %s: %s", view, exc, exc_info=True)
        return Response(
            {"detail": DEFAULT_OPERATIONAL_ERROR_MESSAGE},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    if isinstance(exc, DjangoValidationError):
        # ValidationError của Django core (model.full_clean(), model.clean()...)
        # khác với rest_framework.exceptions.ValidationError (đã được xử lý
        # ở Bước 1 rồi).
        if hasattr(exc, "message_dict"):
            detail = exc.message_dict
        elif hasattr(exc, "messages"):
            detail = exc.messages
        else:
            detail = str(exc)
        logger.info("Django ValidationError tại %s: %s", view, detail)
        return Response({"detail": detail}, status=status.HTTP_400_BAD_REQUEST)

    if isinstance(exc, DjangoPermissionDenied):
        logger.info("PermissionDenied (Django) tại %s: %s", view, exc)
        return Response(
            {"detail": "Bạn không có quyền thực hiện hành động này."},
            status=status.HTTP_403_FORBIDDEN,
        )

    if isinstance(exc, Http404):
        logger.info("Http404 (Django) tại %s: %s", view, exc)
        return Response(
            {"detail": "Không tìm thấy dữ liệu."},
            status=status.HTTP_404_NOT_FOUND,
        )

    if isinstance(exc, APIException):
        # Trường hợp hiếm: custom APIException tự định nghĩa nhưng DRF
        # handler ở Bước 1 vì lý do nào đó trả None (ví dụ context thiếu).
        logger.warning("APIException chưa được xử lý tại %s: %s", view, exc)
        return Response(
            {"detail": getattr(exc, "detail", str(exc))},
            status=getattr(exc, "status_code", status.HTTP_400_BAD_REQUEST),
        )

    # ---- Bước 3: lỗi thực sự không xác định ----
    # Log đầy đủ traceback để debug, đồng thời KHÔNG để lộ chi tiết lỗi
    # (message nội bộ, tên bảng, tên cột...) ra response cho client.
    logger.error(
        "Unhandled exception tại %s | path=%s | user=%s: %s",
        view,
        getattr(request, "path", "?"),
        getattr(getattr(request, "user", None), "id", "anonymous"),
        exc,
        exc_info=True,
    )

    # Trả None để Django xử lý theo cơ chế mặc định (DEBUG=True sẽ hiện
    # traceback đầy đủ khi dev; DEBUG=False sẽ trả trang 500 chuẩn).
    # Nếu muốn LUÔN trả JSON gọn gàng kể cả lỗi lạ, uncomment đoạn dưới:
    #
    # return Response(
    #     {"detail": DEFAULT_UNKNOWN_ERROR_MESSAGE},
    #     status=status.HTTP_500_INTERNAL_SERVER_ERROR,
    # )
    return None