import { usePageHeader, usePeriod } from '../hooks';
import { formatPeriodDateTime } from '../utils/periodUtils';
import { SCHEDULED_CONFIG, STATUS_CONFIG_PERIOD } from '../types';
import { PeriodInfoItem } from '../components/Period/PeriodItems';
import PeriodCardRegistration from '../components/Period/PeriodCardRegistration';
import PeriodCardInProgress from '../components/Period/PeriodCardInProgress';
import PeriodCardReportSubmission from '../components/Period/PeriodCardReportSubmission';
import PeriodCardClosed from '../components/Period/PeriodCardClosed';

export default function PeriodStatusPage() {
  const { period, loading } = usePeriod();

  usePageHeader({
    title: 'Đợt đồ án / khóa luận',
    description: 'Thông tin đợt thực hiện hiện tại của bạn.',
  });

  if (loading) {
    return (
      <main className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="max-w-7xl mx-auto flex items-center justify-center py-24">
          <i className="fa-solid fa-circle-notch animate-spin text-primary text-3xl"></i>
        </div>
      </main>
    );
  }

  if (!period) {
    return (
      <main className="flex-1 overflow-y-auto p-4 md:p-6">
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

  const activeConfig = period.status !== 'scheduled' ? STATUS_CONFIG_PERIOD[period.status] : SCHEDULED_CONFIG;

  return (
    <main className="flex-1 overflow-y-auto p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {/* Header với thanh viền trái nhấn màu */}
          <div className="px-5 py-3.5 border-l-4 border-blue-600 bg-blue-50/40 flex items-center gap-2">
            <i className="fa-solid fa-file-invoice text-blue-600 text-xs" />
            <span className="text-[11px] font-semibold tracking-wide text-blue-700 uppercase">
              Đợt nộp hiện tại
            </span>
          </div>

          <div className="p-6 sm:p-8">
            {/* Phần tiêu đề + trạng thái */}
            <div className="text-center mb-8">
              <h3 className="font-bold text-gray-800 text-xl mb-3">{period.name}</h3>
              <span
                className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium ${activeConfig.badgeBg} ${activeConfig.badgeText}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${activeConfig.dotColor}`} />
                {activeConfig.label}
              </span>
            </div>

            {/* Grid thông tin */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <PeriodInfoItem
                icon="fa-solid fa-calendar-days"
                label="Năm học"
                value={period.academic_year}
              />
              <PeriodInfoItem
                icon="fa-regular fa-calendar"
                label="Bắt đầu đăng ký"
                value={formatPeriodDateTime(period.student_registration_start)}
              />
              <PeriodInfoItem
                icon="fa-regular fa-clock"
                label="Ngày tạo"
                value={formatPeriodDateTime(period.created_date)}
              />

              <PeriodInfoItem
                accent
                icon="fa-solid fa-users"
                label="Số ngày đăng ký"
                value={`${period.student_registration_days} ngày`}
                rangeStart={period.student_registration_start}
                rangeEnd={period.student_registration_end}
              />
              <PeriodInfoItem
                accent
                icon="fa-solid fa-stopwatch"
                label="Thời gian thực hiện"
                value={`${period.execution_duration_weeks} tuần`}
                rangeStart={period.student_registration_end}
                rangeEnd={period.report_submission_start}
              />
              <PeriodInfoItem
                accent
                icon="fa-solid fa-file-arrow-up"
                label="Số ngày nộp báo cáo"
                value={`${period.report_submission_days} ngày`}
                rangeStart={period.report_submission_start}
                rangeEnd={period.report_submission_end}
              />
            </div>
          </div>
        </div>

        {/* 4 card trạng thái — gọi thẳng, không qua wrapper */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <PeriodCardRegistration />
          <PeriodCardInProgress />
          <PeriodCardReportSubmission />
          <PeriodCardClosed />
        </div>
      </div>
    </main>
  );
}