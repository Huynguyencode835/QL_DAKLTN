import { useState, type ChangeEvent } from 'react';
import { SectionCard } from '../../components/Ui/Card';
import Button from '../../components/Ui/Button';
import Input from '../../components/Ui/Input';
import Badge from '../../components/Ui/Badge';
import type { Schedules } from '../../types';

function toDatetimeLocal(iso: string | undefined | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

interface ScheduleFormProps {
  mode: 'create' | 'edit';
  initialValues?: Schedules;
  onSubmit: (data: Record<string, any>) => void;
  onCancel: () => void;
  loading?: boolean;
}

export default function ScheduleForm({ mode, initialValues, onSubmit, onCancel, loading = false }: ScheduleFormProps) {
  const [title, setTitle] = useState(initialValues?.title || '');
  const [deadline, setDeadline] = useState(() => toDatetimeLocal(initialValues?.deadline));

  const handleSubmit = () => {
    onSubmit({
      title,
      deadline: deadline ? new Date(deadline).toISOString() : null,
    });
  };

  return (
    <SectionCard
      title={mode === 'create' ? 'Tạo lịch báo cáo mới' : `Sửa lịch báo cáo lần ${initialValues?.sequence_number}`}
      icon={mode === 'create' ? 'fa-solid fa-plus-circle' : 'fa-solid fa-pen'}
    >
      <div className="max-h-[calc(100vh-280px)] overflow-y-auto pr-1 space-y-5">
        {mode === 'edit' && initialValues && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Lần thứ:</span>
            <Badge variant="primary">{initialValues.sequence_number}</Badge>
          </div>
        )}

        <Input
          label="Tiêu đề"
          placeholder="VD: Báo cáo tiến độ tuần 5"
          value={title}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
        />

        <Input
          label="Hạn nộp"
          required
          type="datetime-local"
          value={deadline}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setDeadline(e.target.value)}
        />

        <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
          <Button variant="outline" size="sm" onClick={onCancel}>
            Hủy
          </Button>
          <Button variant="primary" size="sm" icon="fa-solid fa-check" loading={loading} disabled={loading} onClick={handleSubmit}>
            {mode === 'create' ? 'Tạo lịch' : 'Lưu thay đổi'}
          </Button>
        </div>
      </div>
    </SectionCard>
  );
}
