import { SectionCard } from '../../components/Ui/Card';
import Button from '../../components/Ui/Button';
import Badge from '../../components/Ui/Badge';
import type { Schedules } from '../../types';

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

interface ScheduleDetailProps {
  schedule: Schedules;
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
}

export default function ScheduleDetail({ schedule, onEdit, onDelete }: ScheduleDetailProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-textMain">
            {schedule.title || `Lịch báo cáo lần ${schedule.sequence_number}`}
          </h2>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <Badge variant="primary" dot>Lần {schedule.sequence_number}</Badge>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" icon="fa-solid fa-pen" onClick={() => onEdit(schedule.id)}>
            Chỉnh sửa
          </Button>
          <Button variant="danger" size="sm" icon="fa-solid fa-trash" onClick={() => onDelete(schedule.id)}>
            Xoá
          </Button>
        </div>
      </div>

      {/* Thông tin lịch */}
      <SectionCard title="Thông tin lịch báo cáo" icon="fa-solid fa-circle-info">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Info icon="fa-solid fa-hashtag" label="Lần thứ" value={schedule.sequence_number} />
          <Info icon="fa-regular fa-clock" label="Hạn nộp" value={formatDate(schedule.deadline)} />
          <Info icon="fa-solid fa-heading" label="Tiêu đề" value={schedule.title} />
        </div>
      </SectionCard>
    </div>
  );
}
