import { Lock } from 'lucide-react';
import { usePeriod } from '../../hooks';
import { PeriodCardRow, PeriodCardGuide } from './PeriodCardShared';
import { formatPeriodDate, reportSubmissionEnd } from '../../utils/periodUtils';

export default function PeriodCardClosed() {
  const { period } = usePeriod();
  if (!period) return null;
  const isActive = period.status === 'closed';
  const end = reportSubmissionEnd(period);

  return (
    <div
      className={`bg-white rounded-2xl border p-6 transition-all ${
        isActive ? 'bg-gray-50 border-gray-200 shadow-md' : 'bg-gray-50 border-gray-100'
      }`}
    >
      <div className="flex items-center gap-2 mb-4">
        <Lock className={`w-4 h-4 ${isActive ? 'text-gray-600' : 'text-gray-400'}`} />
        <span className={`font-bold text-sm uppercase tracking-wide ${isActive ? 'text-gray-800' : 'text-gray-500'}`}>
          Đã đóng
        </span>
      </div>

      <div className="space-y-3.5 text-sm">
        <PeriodCardRow icon="fa-regular fa-calendar-check" label="Kết thúc nộp" value={formatPeriodDate(end)} />
        <PeriodCardRow icon="fa-solid fa-lock" label="Trạng thái" value="Không thể chỉnh sửa" />
      </div>

      <PeriodCardGuide message="Đợt đã kết thúc, liên hệ khoa nếu cần hỗ trợ." />
    </div>
  );
}