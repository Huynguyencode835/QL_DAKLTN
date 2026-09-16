import { useNavigate } from 'react-router-dom';
import { useUser, usePageHeader, usePeriod } from '../hooks';
import { STATUS_CONFIG_PERIOD, SCHEDULED_CONFIG, ROLE_ACTION_CONFIG } from '../types';
import PeriodCardRegistration from '../components/Period/PeriodCardRegistration';
import PeriodCardInProgress from '../components/Period/PeriodCardInProgress';
import PeriodCardReportSubmission from '../components/Period/PeriodCardReportSubmission';
import PeriodCardClosed from '../components/Period/PeriodCardClosed';
import { formatPeriodDateTime, studentRegistrationEnd, reportSubmissionEnd } from '../utils/periodUtils';

interface FeatureCard {
  id: string;
  title: string;
  description: string;
  icon: string;
  iconBg: string;
  iconColor: string;
  path: string;
}

const featureCards: Record<string, FeatureCard[]> = {
  student: [
    {
      id: 'topic-registration',
      title: 'Đăng ký đồ án',
      description: 'Đăng ký đề tài tốt nghiệp và chọn giảng viên hướng dẫn.',
      icon: 'fa-solid fa-file-contract',
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      path: '/topic-registration',
    },
    {
      id: 'reports',
      title: 'Nộp báo cáo',
      description: 'Nộp báo cáo định kỳ và báo cáo cuối kỳ theo lịch.',
      icon: 'fa-solid fa-cloud-arrow-up',
      iconBg: 'bg-amber-100',
      iconColor: 'text-amber-600',
      path: '/reports',
    },
    {
      id: 'grades',
      title: 'Điểm & Kết quả',
      description: 'Xem điểm đánh giá và kết quả đồ án/khóa luận.',
      icon: 'fa-solid fa-award',
      iconBg: 'bg-emerald-100',
      iconColor: 'text-emerald-600',
      path: '/grades-and-results',
    },
    {
      id: 'period',
      title: 'Đợt thực hiện',
      description: 'Theo dõi thông tin đợt đồ án/khóa luận hiện tại.',
      icon: 'fa-solid fa-calendar-days',
      iconBg: 'bg-violet-100',
      iconColor: 'text-violet-600',
      path: '/period',
    },
  ],
  lecturer: [
    {
      id: 'students',
      title: 'Quản lý sinh viên',
      description: 'Xem danh sách và quản lý đăng ký sinh viên.',
      icon: 'fa-solid fa-users',
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      path: '/students',
    },
    {
      id: 'topics',
      title: 'Quản lý đề tài',
      description: 'Thêm, sửa, xóa đề tài gợi ý cho sinh viên.',
      icon: 'fa-solid fa-list-check',
      iconBg: 'bg-violet-100',
      iconColor: 'text-violet-600',
      path: '/topic-management',
    },
    {
      id: 'reports-management',
      title: 'Báo cáo định kỳ',
      description: 'Tổng quan báo cáo và đánh giá sinh viên.',
      icon: 'fa-solid fa-calendar-days',
      iconBg: 'bg-amber-100',
      iconColor: 'text-amber-600',
      path: '/reports-management',
    },
    {
      id: 'report-schedule',
      title: 'Lịch báo cáo',
      description: 'Quản lý lịch trình báo cáo định kỳ.',
      icon: 'fa-solid fa-clock',
      iconBg: 'bg-emerald-100',
      iconColor: 'text-emerald-600',
      path: '/report-schedule',
    },
    {
      id: 'grades',
      title: 'Điểm & Kết quả',
      description: 'Xem và đánh giá kết quả đồ án/khóa luận.',
      icon: 'fa-solid fa-award',
      iconBg: 'bg-rose-100',
      iconColor: 'text-rose-600',
      path: '/grades-and-results',
    },
    {
      id: 'my-committees',
      title: 'Hội đồng tham gia',
      description: 'Xem danh sách hội đồng phản biện bạn tham gia.',
      icon: 'fa-solid fa-people-group',
      iconBg: 'bg-cyan-100',
      iconColor: 'text-cyan-600',
      path: '/my-committees',
    },
  ],
  staff: [
    {
      id: 'students',
      title: 'Danh sách & Đăng ký',
      description: 'Quản lý danh sách sinh viên và phân công giảng viên.',
      icon: 'fa-solid fa-users',
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      path: '/students',
    },
    {
      id: 'periods',
      title: 'Quản lý đợt đăng ký',
      description: 'Tạo và quản lý các đợt đăng ký đồ án/khóa luận.',
      icon: 'fa-solid fa-folder-tree',
      iconBg: 'bg-violet-100',
      iconColor: 'text-violet-600',
      path: '/registration-periods',
    },
    {
      id: 'period',
      title: 'Đợt thực hiện',
      description: 'Theo dõi thông tin đợt đồ án/khóa luận hiện tại.',
      icon: 'fa-solid fa-calendar-days',
      iconBg: 'bg-amber-100',
      iconColor: 'text-amber-600',
      path: '/period',
    },
    {
      id: 'manage-committees',
      title: 'Quản lý hội đồng',
      description: 'Tạo và quản lý các hội đồng phản biện, bảo vệ đồ án.',
      icon: 'fa-solid fa-people-group',
      iconBg: 'bg-cyan-100',
      iconColor: 'text-cyan-600',
      path: '/manage-committees',
    },
    {
      id: 'reports-management',
      title: 'Tổng quan báo cáo',
      description: 'Xem tổng quan báo cáo định kỳ của sinh viên.',
      icon: 'fa-solid fa-calendar-days',
      iconBg: 'bg-amber-100',
      iconColor: 'text-amber-600',
      path: '/reports-management',
    },
    {
      id: 'manage-grades',
      title: 'Điều chỉnh điểm',
      description: 'Quản lý và điều chỉnh điểm đánh giá đồ án/khóa luận.',
      icon: 'fa-solid fa-sliders',
      iconBg: 'bg-rose-100',
      iconColor: 'text-rose-600',
      path: '/manage-grades',
    },
  ],
};

const roleBadge: Record<string, { label: string; className: string }> = {
  student: { label: 'Sinh viên', className: 'bg-blue-100 text-blue-700' },
  lecturer: { label: 'Giảng viên', className: 'bg-violet-100 text-violet-700' },
  staff: { label: 'Giáo vụ', className: 'bg-amber-100 text-amber-700' },
};

function PeriodNullCard() {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 flex flex-col items-center justify-center text-center">
      <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mb-4">
        <i className="fa-regular fa-calendar-xmark text-xl text-gray-400" />
      </div>
      <h3 className="font-bold text-gray-800 text-sm mb-1">Chưa có đợt thực hiện</h3>
      <p className="text-xs text-gray-400 max-w-xs">
        Hiện tại chưa có đợt đồ án/khóa luận nào đang hoạt động. Vui lòng quay lại sau.
      </p>
    </div>
  );
}

function PeriodActiveBanner({ period }: { period: NonNullable<ReturnType<typeof usePeriod>['period']> }) {
  const navigate = useNavigate();
  const config = period.status !== 'scheduled' ? STATUS_CONFIG_PERIOD[period.status] : null;
  const schedConfig = SCHEDULED_CONFIG;

  const badgeConfig = config || schedConfig;
  const label = config?.label || schedConfig.label;

  let actionLabel = '';
  let actionPath = '';
  if (period.status === 'student_registration') {
    actionLabel = 'Đăng ký ngay';
    actionPath = '/topic-registration';
  } else if (period.status === 'in_progress') {
    actionLabel = 'Nộp báo cáo định kỳ';
    actionPath = '/reports';
  } else if (period.status === 'report_submission') {
    actionLabel = 'Nộp báo cáo';
    actionPath = '/reports';
  }

  return (
    <div className="lg:col-span-6 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-5 py-3 border-l-4 border-blue-600 bg-blue-50/40 flex items-center gap-2">
        <i className="fa-solid fa-file-invoice text-blue-600 text-xs" />
        <span className="text-[11px] font-semibold tracking-wide text-blue-700 uppercase">
          Đợt hiện tại
        </span>
      </div>

      <div className="p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div>
            <h3 className="font-bold text-gray-800 text-base">{period.name}</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Năm học: {period.academic_year}
            </p>
          </div>
          <span
            className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium self-start ${
              badgeConfig.badgeBg || 'bg-gray-100'
            } ${badgeConfig.badgeText || 'text-gray-500'}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${badgeConfig.dotColor || 'bg-gray-400'}`} />
            {label}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          <div className="bg-gray-50 rounded-xl p-3">
            <div className="text-gray-400 mb-1">
              <i className="fa-regular fa-clock mr-1" />Bắt đầu đăng ký
            </div>
            <div className="font-semibold text-gray-800">{formatPeriodDateTime(period.student_registration_start)}</div>
          </div>
          <div className="bg-gray-50 rounded-xl p-3">
            <div className="text-gray-400 mb-1">
              <i className="fa-regular fa-calendar-xmark mr-1" />Hết hạn đăng ký
            </div>
            <div className="font-semibold text-gray-800">{formatPeriodDateTime(studentRegistrationEnd(period))}</div>
          </div>
          <div className="bg-gray-50 rounded-xl p-3">
            <div className="text-gray-400 mb-1">
              <i className="fa-solid fa-hourglass-half mr-1" />Thời gian thực hiện
            </div>
            <div className="font-semibold text-gray-800">{period.execution_duration_weeks} tuần</div>
          </div>
          <div className="bg-gray-50 rounded-xl p-3">
            <div className="text-gray-400 mb-1">
              <i className="fa-solid fa-file-arrow-up mr-1" />Hạn nộp báo cáo
            </div>
            <div className="font-semibold text-gray-800">{formatPeriodDateTime(reportSubmissionEnd(period))}</div>
          </div>
        </div>

        {actionLabel && (
          <button
            onClick={() => navigate(actionPath)}
            className="mt-4 w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors"
          >
            <i className="fa-solid fa-arrow-right text-xs" />
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  );
}

export default function Home() {
  const navigate = useNavigate();
  const { user } = useUser();
  const { projectPeriod, thesisPeriod, loading: periodLoading } = usePeriod();
  const period = projectPeriod || thesisPeriod;

  usePageHeader({
    title: 'Trang chủ',
    description: 'Tổng quan hệ thống quản lý đồ án/khóa luận',
  });

  const role = user?.role || user?.user_type || 'student';
  const cards = featureCards[role] || featureCards.student;
  const badge = roleBadge[role] || roleBadge.student;

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center shrink-0 overflow-hidden ring-2 ring-blue-100">
          {user?.avatar ? (
            <img src={user.avatar} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="text-sm font-bold text-white">
              {(user?.full_name || user?.username || '?')
                .split(/\s+/)
                .map((w: string) => w[0])
                .join('')
                .toUpperCase()
                .slice(0, 2)}
            </span>
          )}
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-800">
            Chào mừng trở lại, {user?.full_name || user?.username || 'bạn'}
          </h2>
          <span className={`inline-flex items-center mt-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${badge.className}`}>
            {badge.label}
          </span>
        </div>
      </div>

      {/* Period Status */}
      {periodLoading ? (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-12 flex items-center justify-center">
          <i className="fa-solid fa-circle-notch animate-spin text-blue-600 text-2xl" />
        </div>
      ) : period ? (
        <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
          <PeriodActiveBanner period={period} />
          <div className="lg:col-span-4 grid grid-cols-1 gap-4">
            {period.status === 'student_registration' && (
              <PeriodCardRegistration action={(() => {
                const a = ROLE_ACTION_CONFIG[role]?.student_registration;
                return a ? { label: a.label, icon: a.icon, onClick: () => navigate(a.to) } : undefined;
              })()} />
            )}
            {period.status === 'in_progress' && (
              <PeriodCardInProgress action={(() => {
                const a = ROLE_ACTION_CONFIG[role]?.in_progress;
                return a ? { label: a.label, icon: a.icon, onClick: () => navigate(a.to) } : undefined;
              })()} />
            )}
            {period.status === 'report_submission' && (
              <PeriodCardReportSubmission action={(() => {
                const a = ROLE_ACTION_CONFIG[role]?.report_submission;
                return a ? { label: a.label, icon: a.icon, onClick: () => navigate(a.to) } : undefined;
              })()} />
            )}
            {period.status === 'closed' && (
              <PeriodCardClosed action={(() => {
                const a = ROLE_ACTION_CONFIG[role]?.closed;
                return a ? { label: a.label, icon: a.icon, onClick: () => navigate(a.to) } : undefined;
              })()} />
            )}
            {period.status === 'scheduled' && (
              <PeriodCardRegistration action={null} />
            )}
          </div>
        </div>
      ) : (
        <PeriodNullCard />
      )}

      {/* Feature Grid */}
      <div>
        <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide mb-3">
          Chức năng
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {cards.map((card) => (
            <button
              key={card.id}
              onClick={() => navigate(card.path)}
              className="group bg-white rounded-2xl border border-gray-200 shadow-sm p-5 text-left hover:shadow-md hover:border-blue-200 transition-all duration-200"
            >
              <div className="flex items-start gap-3 mb-3">
                <span className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center ${card.iconBg}`}>
                  <i className={`${card.icon} ${card.iconColor} text-sm`} />
                </span>
                <div className="min-w-0">
                  <h4 className="font-bold text-gray-800 text-sm group-hover:text-blue-600 transition-colors">
                    {card.title}
                  </h4>
                </div>
              </div>
              <p className="text-xs text-gray-500 leading-relaxed">{card.description}</p>
              <div className="mt-3 pt-3 border-t border-gray-100 flex items-center text-xs font-medium text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
                Truy cập
                <i className="fa-solid fa-arrow-right text-[10px] ml-1.5" />
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
