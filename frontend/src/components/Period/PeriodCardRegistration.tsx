import { CalendarClock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PeriodCardRow, PeriodCardCountdown, PeriodCardAction } from './PeriodCardShared';
import { daysLeft, formatPeriodDate, studentRegistrationEnd } from '../../utils/periodUtils';
import type { Period } from '../../types';

export default function PeriodCardRegistration({ period, hideAction = false, action }: { period: Period; hideAction?: boolean; action?: { label: string; icon: string; onClick: () => void } | null }) {
  const navigate = useNavigate();
  if (!period) return null;
  const isActive = period.status === 'student_registration';
  const end = studentRegistrationEnd(period);

  return (
    <div
      className={`bg-white rounded-2xl border p-6 transition-all ${
        isActive ? 'bg-blue-50 border-blue-200 shadow-md' : 'bg-gray-50 border-gray-100'
      }`}
    >
      <div className="flex items-center gap-2 mb-4">
        <CalendarClock className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
        <span className={`font-bold text-sm uppercase tracking-wide ${isActive ? 'text-gray-800' : 'text-gray-500'}`}>
          Đang mở đăng ký
        </span>
      </div>

      <div className="space-y-3.5 text-sm">
        <PeriodCardRow icon="fa-regular fa-clock" label="Ngày bắt đầu" value={formatPeriodDate(period.student_registration_start)} />
        <PeriodCardRow icon="fa-regular fa-calendar-xmark" label="Hạn đăng ký" value={formatPeriodDate(end)} danger />
        <PeriodCardRow icon="fa-solid fa-users" label="Số ngày đăng ký" value={`${period.student_registration_days} ngày`} />
      </div>

      <PeriodCardCountdown
        isAction = {isActive}
        days={daysLeft(end)}
        sub="cho đến hạn đăng ký"
        bg={isActive ? 'bg-blue-50' : 'bg-gray-100'}
        labelColor={isActive ? 'text-blue-400' : 'text-gray-400'}
        valueColor={isActive ? 'text-blue-600' : 'text-gray-500'}
        subColor={isActive ? 'text-blue-400' : 'text-gray-400'}
      />

      {isActive && !hideAction && action !== null && (
        <PeriodCardAction
          label={action?.label || 'Đăng ký ngay'}
          icon={action?.icon || 'fa-solid fa-user-plus'}
          badgeBg="bg-blue-100"
          badgeText="text-blue-600"
          onClick={action?.onClick || (() => navigate('/topic-registration'))}
        />
      )}
    </div>
  );
}
