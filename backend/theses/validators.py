import re
from rest_framework import serializers


DEFAULT_ALLOWED_PATTERN = re.compile(
    r'^[a-zA-ZÀ-ỹà-ỹ0-9\s\.,\-\+\(\)/&:%"\'!?]+$'
)

DANGEROUS_CHARS_PATTERN = re.compile(r'[<>{}\[\];=`]')

def validate_non_blank(value, field_name):
    """Không cho phép rỗng hoặc chỉ toàn khoảng trắng. Trả về value đã strip."""
    if not value or not value.strip():
        raise serializers.ValidationError(f'{field_name} is required.')
    return value.strip()


def validate_length(value, field_name, min_length=None, max_length=None):
    """Check độ dài chuỗi. Truyền None cho chiều nào không cần check."""
    length = len(value)
    if min_length is not None and length < min_length:
        raise serializers.ValidationError(
            f'{field_name} phải có ít nhất {min_length} ký tự (hiện tại: {length}).'
        )
    if max_length is not None and length > max_length:
        raise serializers.ValidationError(
            f'{field_name} không được vượt quá {max_length} ký tự (hiện tại: {length}).'
        )
    return value


def validate_no_dangerous_chars(value, field_name):
    if DANGEROUS_CHARS_PATTERN.search(value):
        raise serializers.ValidationError(
            f'{field_name} chứa ký tự không hợp lệ (không cho phép < > {{ }} [ ] ; = `).'
        )
    return value


def validate_allowed_pattern(value, field_name, pattern=None):
    regex = pattern or DEFAULT_ALLOWED_PATTERN
    if not regex.match(value):
        raise serializers.ValidationError(
            f'{field_name} chứa ký tự không hợp lệ. Chỉ cho phép chữ, số, '
            f'khoảng trắng và các dấu câu thông dụng.'
        )
    return value


def validate_not_equal(value_a, value_b, field_name, other_field_name):
    if value_a and value_b and value_a.strip().lower() == value_b.strip().lower():
        raise serializers.ValidationError(
            f'{field_name} không được trùng hoàn toàn với {other_field_name}.'
        )


ACADEMIC_YEAR_PATTERN = re.compile(r'^\d{4}-\d{4}$')

def validate_academic_year_format(value, field_name='Năm học'):
    value = validate_non_blank(value, field_name)
    if not ACADEMIC_YEAR_PATTERN.match(value):
        raise serializers.ValidationError(
            f'{field_name} phải có định dạng "YYYY-YYYY" (ví dụ: 2024-2025).'
        )
    years = value.split('-')
    if int(years[1]) - int(years[0]) != 1:
        raise serializers.ValidationError(
            f'{field_name} phải gồm 2 năm liên tiếp (ví dụ: 2024-2025).'
        )
    return value


def validate_range(value, field_name, min_value=None, max_value=None):
    if min_value is not None and value < min_value:
        raise serializers.ValidationError(
            f'{field_name} phải ít nhất là {min_value}.'
        )
    if max_value is not None and value > max_value:
        raise serializers.ValidationError(
            f'{field_name} không được vượt quá {max_value}.'
        )
    return value


def validate_datetime_before(start, end, start_label, end_label):
    if start and end and start >= end:
        raise serializers.ValidationError(
            f'{start_label} phải trước {end_label}.'
        )