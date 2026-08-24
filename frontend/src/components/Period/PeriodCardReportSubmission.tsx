import { FileUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { usePeriod } from '../../hooks';
import { PeriodCardRow, PeriodCardCountdown, PeriodCardAction } from './PeriodCardShared';
import { daysLeft, formatPeriodDate, reportSubmissionEnd, reportSubmissionStart } from '../../utils/periodUtils';

export default function PeriodCardReportSubmission() {
  const navigate = useNavigate();
  const { period } = usePeriod();
  if (!period) return null;
  const isActive = period.status === 'report_submission';
  const start = reportSubmissionStart(period);
  const end = reportSubmissionEnd(period);

  return (
    <div
      className={`bg-white rounded-2xl border p-6 transition-all ${
        isActive ? 'bg-green-50 border-green-200 shadow-md' : 'bg-gray-50 border-gray-100'
      }`}
    >
      <div className="flex items-center gap-2 mb-4">
        <FileUp className={`w-4 h-4 ${isActive ? 'text-green-600' : 'text-gray-400'}`} />
        <span className={`font-bold text-sm uppercase tracking-wide ${isActive ? 'text-gray-800' : 'text-gray-500'}`}>
          Đang nhận báo cáo
        </span>
      </div>

      <div className="space-y-3.5 text-sm">
        <PeriodCardRow icon="fa-regular fa-clock" label="Ngày bắt đầu nộp" value={formatPeriodDate(start)} />
        <PeriodCardRow icon="fa-regular fa-calendar-xmark" label="Hạn nộp cuối" value={formatPeriodDate(end)} danger />
        <PeriodCardRow icon="fa-solid fa-hourglass-half" label="Số ngày nộp" value={`${period.report_submission_days} ngày`} />
      </div>

      <PeriodCardCountdown
        days={daysLeft(end)}
        sub="cho đến hạn nộp"
        bg={isActive ? 'bg-red-50' : 'bg-gray-100'}
        labelColor={isActive ? 'text-red-400' : 'text-gray-400'}
        valueColor={isActive ? 'text-red-600' : 'text-gray-500'}
        subColor={isActive ? 'text-red-400' : 'text-gray-400'}
      />

      {isActive && (
        <PeriodCardAction
          label="Nộp báo cáo"
          icon="fa-solid fa-file-arrow-up"
          badgeBg="bg-green-100"
          badgeText="text-green-600"
          onClick={() => navigate('/reports')}
        />
      )}
    </div>
  );
}