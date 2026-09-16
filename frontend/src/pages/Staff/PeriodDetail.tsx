import { SectionCard } from '../../components/Ui/Card';
import Button from '../../components/Ui/Button';
import Badge from '../../components/Ui/Badge';
import type { RegistrationPeriod, BadgeVariant } from '../../types';

const STATUS_CONFIG: Record<string, { label: string; variant: BadgeVariant }> = {
  draft: { label: 'Nháp', variant: 'neutral' },
  scheduled: { label: 'Chờ mở đăng ký', variant: 'neutral' },
  student_registration: { label: 'Đang mở đăng ký', variant: 'primary' },
  in_progress: { label: 'Đang thực hiện đồ án', variant: 'info' },
  report_submission: { label: 'Đang nhận báo cáo', variant: 'warning' },
  closed: { label: 'Đã đóng', variant: 'danger' },
  archived: { label: 'Đã lưu trữ', variant: 'neutral' },
};

function formatDate(iso: string | undefined | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString('vi-VN', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

function Info({ icon, label, value }: { icon: string; label: string; value: any }) {
  return (
    <div className="flex items-start gap-3 py-2">
      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
        <i className={`${icon} text-primary text-sm`}></i>
      </div>
      <div>
        <div className="text-[11px] text-gray-400 font-medium uppercase">{label}</div>
        <div className="text-sm font-semibold text-gray-800">{value || '—'}</div>
      </div>
    </div>
  );
}

interface PeriodDetailProps {
  period: RegistrationPeriod;
  onPublish: (id: number) => void;
  onDelete: (id: number) => void;
  onEdit: (id: number) => void;
  onCreateThesis?: (id: number) => void;
}

export default function PeriodDetail({ period, onPublish, onDelete, onEdit, onCreateThesis }: PeriodDetailProps) {
  const status = STATUS_CONFIG[period.status || 'draft'] || STATUS_CONFIG.draft;
  const isDraft = period.status === 'draft';
  const isClosed = period.status === 'closed';
  const isProjectType = !period.period_type || period.period_type === 'project';
  const canCreateThesis = isClosed && isProjectType && onCreateThesis;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-textMain">{period.name}</h2>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <Badge variant={status.variant} dot>{status.label}</Badge>
            <Badge variant="neutral">{period.academic_year}</Badge>
          </div>
        </div>
        {isDraft && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" icon="fa-solid fa-pen" onClick={() => onEdit(period.id)}>
              Chỉnh sửa
            </Button>
            <Button variant="primary" size="sm" icon="fa-solid fa-bullhorn" onClick={() => onPublish(period.id)}>
              Công bố
            </Button>
            <Button variant="danger" size="sm" icon="fa-solid fa-trash" onClick={() => onDelete(period.id)}>
              Xoá
            </Button>
          </div>
        )}
        {canCreateThesis && (
          <div className="flex gap-2">
            <Button variant="primary" size="sm" icon="fa-solid fa-graduation-cap" onClick={() => onCreateThesis(period.id)}>
              Tạo đợt khóa luận
            </Button>
          </div>
        )}
      </div>

      {/* Thông tin chung */}
      <SectionCard title="Thông tin chung" icon="fa-solid fa-circle-info">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Info icon="fa-solid fa-calendar-days" label="Năm học" value={period.academic_year} />
          <Info icon="fa-solid fa-user" label="Người tạo" value={period.created_by} />
          <Info icon="fa-regular fa-clock" label="Ngày tạo" value={formatDate(period.created_date)} />
          <Info icon="fa-solid fa-toggle-on" label="Đang hoạt động" value={period.active ? 'Có' : 'Không'} />
        </div>
      </SectionCard>

      {/* Thời gian & Tiến độ */}
      <SectionCard title="Thời gian & Tiến độ" icon="fa-solid fa-chart-line">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Info icon="fa-regular fa-calendar" label="Bắt đầu đăng ký" value={formatDate(period.student_registration_start)} />
          <Info icon="fa-solid fa-calendar-check" label="Kết thúc đăng ký" value={formatDate(period.student_registration_end)} />
          <Info icon="fa-solid fa-hourglass-half" label="Số ngày đăng ký" value={period.student_registration_days} />
          <Info icon="fa-solid fa-stopwatch" label="Số tuần thực hiện" value={period.execution_duration_weeks} />
          <Info icon="fa-solid fa-file-arrow-up" label="Bắt đầu nộp báo cáo" value={formatDate(period.report_submission_start)} />
          <Info icon="fa-solid fa-file-circle-check" label="Kết thúc nộp báo cáo" value={formatDate(period.report_submission_end)} />
          <Info icon="fa-solid fa-calendar-days" label="Số ngày nộp báo cáo" value={period.report_submission_days} />
        </div>
      </SectionCard>
    </div>
  );
}
