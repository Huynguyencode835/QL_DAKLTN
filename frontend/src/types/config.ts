import { CalendarClock, FileUp, Hourglass, Lock } from 'lucide-react';
import { PeriodStatus } from './models';
import type { BadgeVariant } from './ui';

export const DIFFICULTY_CONFIG: Record<string, { label: string; variant: BadgeVariant }> = {
  easy: { label: 'Dễ', variant: 'success' },
  medium: { label: 'Trung bình', variant: 'warning' },
  difficult: { label: 'Khó', variant: 'danger' },
};

export const DIFFICULTY_OPTIONS = [
  { value: 'easy', label: 'Dễ' },
  { value: 'medium', label: 'Trung bình' },
  { value: 'difficult', label: 'Khó' },
];

export const STATUS_CONFIG: Record<string, { label: string; variant: BadgeVariant }> = {
  waiting_lecturer: { label: 'Chờ phân GV', variant: 'warning' },
  assigned_lecturer: { label: 'Chờ duyệt', variant: 'info' },
  waiting_staff_assignment: { label: 'Chờ giáo vụ phân công', variant: 'danger' },
  approved: { label: 'Đã duyệt', variant: 'success' },
  rejected: { label: 'Từ chối', variant: 'danger' },
  pending: { label: 'Chờ duyệt', variant: 'warning' },
  skipped: { label: 'Không cần', variant: 'neutral' },
};

export const TRAINING_TYPE_MAP: Record<string, string> = {
  regular: 'Chính quy',
  part_time: 'Tại chức',
};

export const PROGRAM_TYPE_MAP: Record<string, string> = {
  standard: 'Tiêu chuẩn',
  advanced: 'Tiên tiến',
  high_quality: 'Chất lượng cao',
};

export interface StatusConfig {
  label: string;
  icon: React.ElementType;
  bg: string;
  border: string;
  badgeBg: string;
  badgeText: string;
  dotColor: string;
  footerBg: string;
  footerLabel: string;
  footerValue: string;
  footerSub: string;
}

export const STATUS_CONFIG_PERIOD: Record<Exclude<PeriodStatus, 'scheduled'>, StatusConfig> = {
  student_registration: {
    label: 'Đang mở đăng ký',
    icon: CalendarClock,
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    badgeBg: 'bg-blue-100',
    badgeText: 'text-blue-600',
    dotColor: 'bg-blue-500',
    footerBg: 'bg-blue-50',
    footerLabel: 'text-blue-400',
    footerValue: 'text-blue-600',
    footerSub: 'text-blue-400',
  },
  in_progress: {
    label: 'Đang thực hiện',
    icon: Hourglass,
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    badgeBg: 'bg-amber-100',
    badgeText: 'text-amber-600',
    dotColor: 'bg-amber-500',
    footerBg: 'bg-amber-50',
    footerLabel: 'text-amber-400',
    footerValue: 'text-amber-600',
    footerSub: 'text-amber-400',
  },
  report_submission: {
    label: 'Đang nhận báo cáo',
    icon: FileUp,
    bg: 'bg-green-50',
    border: 'border-green-200',
    badgeBg: 'bg-green-100',
    badgeText: 'text-green-600',
    dotColor: 'bg-green-500',
    footerBg: 'bg-red-50',
    footerLabel: 'text-red-400',
    footerValue: 'text-red-600',
    footerSub: 'text-red-400',
  },
  closed: {
    label: 'Đã đóng',
    icon: Lock,
    bg: 'bg-gray-50',
    border: 'border-gray-200',
    badgeBg: 'bg-gray-100',
    badgeText: 'text-gray-500',
    dotColor: 'bg-gray-400',
    footerBg: 'bg-gray-50',
    footerLabel: 'text-gray-400',
    footerValue: 'text-gray-600',
    footerSub: 'text-gray-400',
  },
};

export const SCHEDULED_CONFIG = {
  label: 'Chờ mở đăng ký',
  badgeBg: 'bg-gray-100',
  badgeText: 'text-gray-500',
  dotColor: 'bg-gray-400',
};

export const STATUS_ORDER: Exclude<PeriodStatus, 'scheduled'>[] = [
  'student_registration',
  'in_progress',
  'report_submission',
  'closed',
];

export const ACTION_CONFIG: Partial<Record<PeriodStatus, { label: string; icon: string; to: string }>> = {
  student_registration: { label: 'Đăng ký ngay', icon: 'fa-solid fa-user-plus', to: '/topic-registration' },
  in_progress: { label: 'Nộp báo cáo định kỳ', icon: 'fa-regular fa-file-lines', to: '/reports' },
  report_submission: { label: 'Nộp báo cáo', icon: 'fa-solid fa-file-arrow-up', to: '/reports' },
};

export interface PeriodRow {
  icon: string;
  label: string;
  value: string;
  danger?: boolean;
}