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
  approved: { label: 'Đã duyệt', variant: 'success' },
  rejected: { label: 'Từ chối', variant: 'danger' },
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
