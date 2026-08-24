import { Hourglass } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { usePeriod } from '../../hooks';
import { PeriodCardRow, PeriodCardCountdown, PeriodCardAction } from './PeriodCardShared';
import { daysLeft, formatPeriodDate, reportSubmissionStart, studentRegistrationEnd } from '../../utils/periodUtils';

export default function PeriodCardInProgress() {
  const navigate = useNavigate();
  const { period } = usePeriod();
  if (!period) return null;
  const isActive = period.status === 'in_progress';
  const start = studentRegistrationEnd(period);
  const submissionStart = reportSubmissionStart(period);

  return (
    <div
      className={`bg-white rounded-2xl border p-6 transition-all ${
        isActive ? 'bg-amber-50 border-amber-200 shadow-md' : 'bg-gray-50 border-gray-100'
      }`}
    >
      <div className="flex items-center gap-2 mb-4">
        <Hourglass className={`w-4 h-4 ${isActive ? 'text-amber-600' : 'text-gray-400'}`} />
        <span className={`font-bold text-sm uppercase tracking-wide ${isActive ? 'text-gray-800' : 'text-gray-500'}`}>
          Đang thực hiện
        </span>
      </div>

      <div className="space-y-3.5 text-sm">
        <PeriodCardRow icon="fa-regular fa-clock" label="Ngày bắt đầu" value={formatPeriodDate(start)} />
        <PeriodCardRow icon="fa-regular fa-hourglass-half" label="Thời lượng" value={`${period.execution_duration_weeks} tuần`} />
        <PeriodCardRow icon="fa-regular fa-calendar-check" label="Mở nộp báo cáo" value={formatPeriodDate(submissionStart)} />
      </div>

      <PeriodCardCountdown
        days={daysLeft(submissionStart)}
        sub="đến khi mở nộp báo cáo"
        bg={isActive ? 'bg-amber-50' : 'bg-gray-100'}
        labelColor={isActive ? 'text-amber-400' : 'text-gray-400'}
        valueColor={isActive ? 'text-amber-600' : 'text-gray-500'}
        subColor={isActive ? 'text-amber-400' : 'text-gray-400'}
      />

      {isActive && (
        <PeriodCardAction
          label="Nộp báo cáo định kỳ"
          icon="fa-regular fa-file-lines"
          badgeBg="bg-amber-100"
          badgeText="text-amber-600"
          onClick={() => navigate('/reports')}
        />
      )}
    </div>
  );
}