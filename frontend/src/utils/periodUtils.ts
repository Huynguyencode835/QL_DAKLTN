import type { Period } from '../types';

const DAY_MS = 1000 * 60 * 60 * 24;

export function addDays(dateStr: string, days: number): string {
  return new Date(new Date(dateStr).getTime() + days * DAY_MS).toISOString();
}

export function addWeeks(dateStr: string, weeks: number): string {
  return new Date(new Date(dateStr).getTime() + weeks * 7 * DAY_MS).toISOString();
}

export function studentRegistrationEnd(period: Period): string {
  return addDays(period.student_registration_start, period.student_registration_days);
}

export function reportSubmissionStart(period: Period): string {
  return addWeeks(studentRegistrationEnd(period), period.execution_duration_weeks);
}

export function reportSubmissionEnd(period: Period): string {
  return addDays(reportSubmissionStart(period), period.report_submission_days);
}

export function daysLeft(targetDate: string): number {
  const diff = new Date(targetDate).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / DAY_MS));
}

export function formatPeriodDate(iso: string | undefined | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('vi-VN');
}

export function formatPeriodDateTime(iso: string | undefined | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('vi-VN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}
