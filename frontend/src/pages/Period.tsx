import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarClock, Hourglass, FileUp, Lock } from 'lucide-react';
import { usePageHeader } from '../hooks';
import { fetchWithAuth } from '../utils/ApiHelper';
import { endpoints } from '../config/Apis';
import {
  formatPeriodDate,
  formatPeriodDateTime,
  daysLeft,
  studentRegistrationEnd,
  reportSubmissionStart,
  reportSubmissionEnd,
} from '../utils/periodUtils';
import type { Period, PeriodStatus } from '../types';

interface StatusConfig {
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

const STATUS_CONFIG: Record<Exclude<PeriodStatus, 'scheduled'>, StatusConfig> = {
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

const SCHEDULED_CONFIG = {
  label: 'Chờ mở đăng ký',
  badgeBg: 'bg-gray-100',
  badgeText: 'text-gray-500',
  dotColor: 'bg-gray-400',
};

const STATUS_ORDER: Exclude<PeriodStatus, 'scheduled'>[] = [
  'student_registration',
  'in_progress',
  'report_submission',
  'closed',
];

const ACTION_CONFIG: Partial<Record<PeriodStatus, { label: string; icon: string; to: string }>> = {
  student_registration: { label: 'Đăng ký ngay', icon: 'fa-solid fa-user-plus', to: '/topic-registration' },
  in_progress: { label: 'Nộp báo cáo định kỳ', icon: 'fa-regular fa-file-lines', to: '/reports' },
  report_submission: { label: 'Nộp báo cáo', icon: 'fa-solid fa-file-arrow-up', to: '/reports' },
};

interface PeriodRow {
  icon: string;
  label: string;
  value: string;
  danger?: boolean;
}

function getRows(period: Period, statusKey: Exclude<PeriodStatus, 'scheduled'>): PeriodRow[] {
  switch (statusKey) {
    case 'student_registration':
      return [
        { icon: 'fa-regular fa-clock', label: 'Ngày bắt đầu', value: formatPeriodDate(period.student_registration_start) },
        { icon: 'fa-regular fa-calendar-xmark', label: 'Hạn đăng ký', value: formatPeriodDate(studentRegistrationEnd(period)), danger: true },
        { icon: 'fa-solid fa-users', label: 'Số ngày đăng ký', value: `${period.student_registration_days} ngày` },
      ];
    case 'in_progress':
      return [
        { icon: 'fa-regular fa-clock', label: 'Ngày bắt đầu', value: formatPeriodDate(studentRegistrationEnd(period)) },
        { icon: 'fa-regular fa-hourglass-half', label: 'Thời lượng', value: `${period.execution_duration_weeks} tuần` },
        { icon: 'fa-regular fa-calendar-check', label: 'Mở nộp báo cáo', value: formatPeriodDate(reportSubmissionStart(period)) },
      ];
    case 'report_submission':
      return [
        { icon: 'fa-regular fa-clock', label: 'Ngày bắt đầu nộp', value: formatPeriodDate(reportSubmissionStart(period)) },
        { icon: 'fa-regular fa-calendar-xmark', label: 'Hạn nộp cuối', value: formatPeriodDate(reportSubmissionEnd(period)), danger: true },
        { icon: 'fa-solid fa-hourglass-half', label: 'Số ngày nộp', value: `${period.report_submission_days} ngày` },
      ];
    case 'closed':
      return [
        { icon: 'fa-regular fa-calendar-check', label: 'Kết thúc nộp', value: formatPeriodDate(reportSubmissionEnd(period)) },
        { icon: 'fa-solid fa-lock', label: 'Trạng thái', value: 'Không thể chỉnh sửa' },
      ];
  }
}

function getFooter(period: Period, statusKey: Exclude<PeriodStatus, 'scheduled'>) {
  switch (statusKey) {
    case 'student_registration':
      return { type: 'countdown' as const, value: daysLeft(studentRegistrationEnd(period)), sub: 'cho đến hạn đăng ký' };
    case 'in_progress':
      return { type: 'countdown' as const, value: daysLeft(reportSubmissionStart(period)), sub: 'đến khi mở nộp báo cáo' };
    case 'report_submission':
      return { type: 'countdown' as const, value: daysLeft(reportSubmissionEnd(period)), sub: 'cho đến hạn nộp' };
    case 'closed':
      return { type: 'guide' as const, message: 'Đợt đã kết thúc, liên hệ khoa nếu cần hỗ trợ.' };
  }
}

function PeriodInfoItem({ icon, label, value, valueClass }: { icon: string; label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex items-center gap-3 bg-gray-50/70 rounded-xl px-3.5 py-2.5 border border-gray-100">
      <span className="w-8 h-8 shrink-0 rounded-lg bg-white border border-gray-200 text-primary flex items-center justify-center">
        <i className={`${icon} text-xs`}></i>
      </span>
      <div className="min-w-0">
        <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">{label}</p>
        <p className={`text-xs font-semibold text-gray-800 truncate ${valueClass || ''}`}>{value}</p>
      </div>
    </div>
  );
}

export default function PeriodStatusPage() {
  const navigate = useNavigate();
  const [period, setPeriod] = useState<Period | null>(null);
  const [loading, setLoading] = useState(true);

  usePageHeader({
    title: 'Đợt đồ án / khóa luận',
    description: 'Thông tin đợt thực hiện hiện tại của bạn.',
  });

  useEffect(() => {
    fetchWithAuth(
      endpoints.registrationPeriodDetail('current'),
      (data: Period) => setPeriod(data),
      () => setPeriod(null),
      {},
      setLoading,
    );
  }, []);

  if (loading) {
    return (
      <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-background">
        <div className="max-w-7xl mx-auto flex items-center justify-center py-24">
          <i className="fa-solid fa-circle-notch animate-spin text-primary text-3xl"></i>
        </div>
      </main>
    );
  }

  if (!period) {
    return (
      <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-background">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-12 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <i className="fa-regular fa-calendar-xmark text-2xl text-gray-400"></i>
            </div>
            <h3 className="font-bold text-gray-800 text-base mb-1">Hiện tại chưa có đợt thực hiện đồ án/khóa luận</h3>
            <p className="text-sm text-gray-400">Khoa của bạn chưa mở đợt đăng ký mới. Vui lòng quay lại sau.</p>
          </div>
        </div>
      </main>
    );
  }

  const activeConfig = period.status !== 'scheduled' ? STATUS_CONFIG[period.status] : SCHEDULED_CONFIG;

  return (
    <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-background">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Card tổng quan */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-bold text-gray-800 uppercase tracking-wide text-xs">Đợt nộp hiện tại</h2>
          </div>
          <div className="p-6">
            <div className="text-center mb-6">
              <h3 className="font-bold text-blue-700 text-xl mb-3">
                {period.name} {period.academic_year}
              </h3>
              <span
                className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium ${activeConfig.badgeBg} ${activeConfig.badgeText}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${activeConfig.dotColor}`} />
                {activeConfig.label}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              <PeriodInfoItem icon="fa-solid fa-calendar-days" label="Năm học" value={period.academic_year} />
              <PeriodInfoItem
                icon="fa-regular fa-calendar"
                label="Bắt đầu đăng ký"
                value={formatPeriodDateTime(period.student_registration_start)}
              />
              <PeriodInfoItem icon="fa-solid fa-users" label="Số ngày đăng ký" value={`${period.student_registration_days} ngày`} />
              <PeriodInfoItem
                icon="fa-solid fa-stopwatch"
                label="Thời gian thực hiện"
                value={`${period.execution_duration_weeks} tuần`}
              />
              <PeriodInfoItem
                icon="fa-solid fa-file-arrow-up"
                label="Số ngày nộp báo cáo"
                value={`${period.report_submission_days} ngày`}
              />
              <PeriodInfoItem
                icon="fa-regular fa-clock"
                label="Ngày tạo"
                value={formatPeriodDateTime(period.created_date)}
              />
              <PeriodInfoItem
                icon="fa-regular fa-clock"
                label="Cập nhật gần nhất"
                value={formatPeriodDateTime(period.updated_date)}
              />
            </div>
          </div>
        </div>

        {/* 4 card trạng thái */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {STATUS_ORDER.map((statusKey) => {
            const config = STATUS_CONFIG[statusKey];
            const isActive = period.status === statusKey;
            const rows = getRows(period, statusKey);
            const footer = getFooter(period, statusKey);
            const action = isActive ? ACTION_CONFIG[statusKey] : undefined;
            const Icon = config.icon;

            return (
              <div
                key={statusKey}
                className={`bg-white rounded-2xl border p-6 transition-all ${config.bg} ${config.border} ${
                  isActive ? 'shadow-md' : 'opacity-70'
                }`}
              >
                <div className="flex items-center gap-2 mb-4">
                  <Icon className={`w-4 h-4 ${config.badgeText}`} />
                  <span className="font-bold text-gray-800 text-sm uppercase tracking-wide">{config.label}</span>
                </div>

                <div className="space-y-3.5 text-sm">
                  {rows.map((row) => (
                    <div key={row.label} className="flex justify-between items-center">
                      <span className="text-gray-400 flex items-center gap-2 text-xs">
                        <i className={`${row.icon} w-3.5`} /> {row.label}
                      </span>
                      <span className={row.danger ? 'font-bold text-red-600 text-xs' : 'font-medium text-gray-900 text-xs'}>
                        {row.value}
                      </span>
                    </div>
                  ))}
                </div>

                {footer.type === 'countdown' ? (
                  <div className={`mt-5 ${config.footerBg} rounded-xl p-4 text-center`}>
                    <div className={`${config.footerLabel} text-[10px] font-bold uppercase tracking-wider mb-1`}>
                      Còn lại
                    </div>
                    <div className={`text-2xl font-black ${config.footerValue}`}>{footer.value} ngày</div>
                    <div className={`${config.footerSub} text-[10px] mt-1`}>{footer.sub}</div>
                  </div>
                ) : (
                  <div className="mt-5 bg-gray-50 rounded-xl p-4 text-center">
                    <i className="fa-regular fa-circle-info text-gray-400 mb-1.5 block" />
                    <p className="text-gray-500 text-[11px] leading-relaxed">{footer.message}</p>
                  </div>
                )}

                {action && (
                  <button
                    onClick={() => navigate(action.to)}
                    className={`mt-4 w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all hover:shadow-sm ${config.badgeBg} ${config.badgeText}`}
                  >
                    <i className={`${action.icon} text-xs`} /> {action.label}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
