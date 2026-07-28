import { useEffect, useState, type ChangeEvent } from 'react';
import { useModal } from '../hooks';
import { fetchWithAuth, createWithAuth, deleteWithAuth } from '../utils/ApiHelper';
import { endpoints } from '../config/Apis';
import Card from '../components/Ui/Card';
import Button from '../components/Ui/Button';
import Badge from '../components/Ui/Badge';
import Input from '../components/Ui/Input';
import Select from '../components/Ui/Select';
import type { RegistrationPeriod } from '../types';

const STATUS_CONFIG: Record<string, { label: string; variant: 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'info' }> = {
  draft: { label: 'Nháp', variant: 'neutral' },
  student_registration: { label: 'Đang mở đăng ký', variant: 'primary' },
  in_progress: { label: 'Đang thực hiện đồ án', variant: 'info' },
  report_submission: { label: 'Đang nhận báo cáo', variant: 'warning' },
  closed: { label: 'Đã đóng', variant: 'danger' },
  archived: { label: 'Đã lưu trữ', variant: 'neutral' },
};

const FORMAT_STATUS_OPTIONS = Object.entries(STATUS_CONFIG).map(([value, config]) => ({
  value,
  label: config.label,
}));

const emptyForm = {
  name: '',
  academic_year: '',
  student_registration_start: '',
  student_registration_end: '',
  report_submission_start: '',
  report_submission_end: '',
  execution_duration_weeks: '10',
  status: 'draft',
};

function formatDate(iso: string | undefined | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString('vi-VN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function toDatetimeLocal(iso: string | undefined | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function RegistrationPeriodManagement() {
  const { openModal, closeModal } = useModal();
  const [periods, setPeriods] = useState<RegistrationPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ ...emptyForm });
  const [submitting, setSubmitting] = useState(false);
  const [formModalOpen, setFormModalOpen] = useState(false);

  useEffect(() => { loadPeriods(); }, []);

  const loadPeriods = async () => {
    await fetchWithAuth(endpoints.registrationPeriods, setPeriods, () => {}, {}, setLoading);
  };

  const update = (field: string) => (e: any) => {
    setForm(prev => ({ ...prev, [field]: e.target?.value ?? e }));
  };

  const resetForm = () => setForm({ ...emptyForm });

  const openCreateModal = () => {
    resetForm();
    setFormModalOpen(true);
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setSubmitting(true);

    const body: Record<string, any> = {
      name: form.name,
      academic_year: form.academic_year,
      student_registration_start: form.student_registration_start
        ? new Date(form.student_registration_start).toISOString()
        : null,
      student_registration_end: form.student_registration_end
        ? new Date(form.student_registration_end).toISOString()
        : null,
      report_submission_start: form.report_submission_start
        ? new Date(form.report_submission_start).toISOString()
        : null,
      report_submission_end: form.report_submission_end
        ? new Date(form.report_submission_end).toISOString()
        : null,
      execution_duration_weeks: parseInt(form.execution_duration_weeks, 10),
      status: form.status,
    };

    await createWithAuth(
      endpoints.registrationPeriods,
      body,
      () => {
        loadPeriods();
        setFormModalOpen(false);
        resetForm();
      },
      () => {},
      setSubmitting,
    );
  };

  const handleDelete = (id: number) => {
    openModal({
      title: 'Xác nhận xóa',
      description: 'Bạn có chắc chắn muốn xóa đợt đăng ký này?',
      icon: 'fa-solid fa-triangle-exclamation',
      size: 'sm',
      footer: (
        <div className="flex items-center gap-2">
          <Button variant="danger" size="sm" icon="fa-solid fa-trash-can" onClick={() => {
            deleteWithAuth(
              `${endpoints.registrationPeriods}${id}/`,
              () => { loadPeriods(); closeModal(); },
              () => {},
            );
          }}>
            Xóa
          </Button>
          <Button variant="outline" size="sm" onClick={closeModal}>Hủy</Button>
        </div>
      ),
    });
  };

  return (
    <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-background">
      <div className="max-w-7xl mx-auto w-full space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Quản lý đợt đăng ký</h2>
            <p className="text-gray-600">Tạo và quản lý các đợt đăng ký đồ án / khóa luận tốt nghiệp.</p>
          </div>
          <Button variant="primary" icon="fa-solid fa-plus" onClick={openCreateModal}>
            Tạo đợt mới
          </Button>
        </div>

        <Card variant="elevated" bodyClassName="space-y-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <i className="fa-solid fa-circle-notch animate-spin text-primary text-2xl"></i>
            </div>
          ) : periods.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <i className="fa-solid fa-calendar-circle-plus text-4xl mb-3"></i>
              <p className="text-sm font-medium">Chưa có đợt đăng ký nào</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left">
                    <th className="pb-3 font-semibold text-gray-600 text-xs uppercase tracking-wider">Tên đợt</th>
                    <th className="pb-3 font-semibold text-gray-600 text-xs uppercase tracking-wider">Năm học</th>
                    <th className="pb-3 font-semibold text-gray-600 text-xs uppercase tracking-wider">Đăng ký</th>
                    <th className="pb-3 font-semibold text-gray-600 text-xs uppercase tracking-wider">Nộp báo cáo</th>
                    <th className="pb-3 font-semibold text-gray-600 text-xs uppercase tracking-wider">Số tuần</th>
                    <th className="pb-3 font-semibold text-gray-600 text-xs uppercase tracking-wider">Trạng thái</th>
                    <th className="pb-3 font-semibold text-gray-600 text-xs uppercase tracking-wider text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {periods.map((p: any) => {
                    const status = STATUS_CONFIG[p.status] || STATUS_CONFIG.draft;
                    return (
                      <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="py-3.5 pr-4 font-medium text-gray-800">{p.name}</td>
                        <td className="py-3.5 pr-4 text-gray-600">{p.academic_year}</td>
                        <td className="py-3.5 pr-4">
                          <div className="text-xs text-gray-600">
                            <div>Từ: {formatDate(p.student_registration_start)}</div>
                            <div>Đến: {formatDate(p.student_registration_end)}</div>
                          </div>
                        </td>
                        <td className="py-3.5 pr-4">
                          <div className="text-xs text-gray-600">
                            <div>Từ: {formatDate(p.report_submission_start)}</div>
                            <div>Đến: {formatDate(p.report_submission_end)}</div>
                          </div>
                        </td>
                        <td className="py-3.5 pr-4 text-gray-600">{p.execution_duration_weeks} tuần</td>
                        <td className="py-3.5 pr-4">
                          <Badge variant={status.variant} dot>{status.label}</Badge>
                        </td>
                        <td className="py-3.5 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            icon="fa-solid fa-trash-can"
                            className="text-gray-400 hover:text-red-500"
                            onClick={() => handleDelete(p.id)}
                          >
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      {formModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-[2px]" onClick={() => setFormModalOpen(false)} />
          <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-xl shadow-gray-900/10 flex flex-col max-h-[90vh] outline-none">
            <div className="flex items-start justify-between gap-3 px-6 py-5 border-b border-gray-100 shrink-0">
              <div className="flex items-start gap-3 min-w-0">
                <span className="w-10 h-10 shrink-0 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <i className="fa-solid fa-calendar-plus text-base"></i>
                </span>
                <div className="min-w-0">
                  <h3 className="font-semibold text-gray-900 text-base leading-tight">Tạo đợt đăng ký mới</h3>
                  <p className="text-sm text-gray-500 mt-1">Điền thông tin đợt đăng ký đồ án / khóa luận</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setFormModalOpen(false)}
                className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              >
                <i className="fa-solid fa-xmark text-sm"></i>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="px-6 py-5 overflow-y-auto space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                  label="Tên đợt"
                  required
                  placeholder="VD: Đợt 1 - Học kỳ 2"
                  value={form.name}
                  onChange={update('name')}
                />
                <Input
                  label="Năm học"
                  required
                  placeholder="VD: 2024-2025"
                  value={form.academic_year}
                  onChange={update('academic_year')}
                />
              </div>

              <div className="border-t border-gray-100 pt-6">
                <h4 className="font-semibold text-gray-800 text-sm mb-4 flex items-center gap-2">
                  <i className="fa-solid fa-user-check text-primary"></i>
                  Thời gian đăng ký
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Input
                    label="Bắt đầu đăng ký"
                    required
                    type="datetime-local"
                    value={form.student_registration_start}
                    onChange={update('student_registration_start')}
                  />
                  <Input
                    label="Kết thúc đăng ký"
                    required
                    type="datetime-local"
                    value={form.student_registration_end}
                    onChange={update('student_registration_end')}
                  />
                </div>
              </div>

              <div className="border-t border-gray-100 pt-6">
                <h4 className="font-semibold text-gray-800 text-sm mb-4 flex items-center gap-2">
                  <i className="fa-solid fa-file-arrow-up text-primary"></i>
                  Thời gian nộp báo cáo
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Input
                    label="Bắt đầu nộp báo cáo"
                    required
                    type="datetime-local"
                    value={form.report_submission_start}
                    onChange={update('report_submission_start')}
                  />
                  <Input
                    label="Kết thúc nộp báo cáo"
                    required
                    type="datetime-local"
                    value={form.report_submission_end}
                    onChange={update('report_submission_end')}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                  label="Số tuần thực hiện"
                  type="number"
                  min={1}
                  max={52}
                  value={form.execution_duration_weeks}
                  onChange={update('execution_duration_weeks')}
                  helperText="Tính từ khi đăng ký được duyệt"
                />
                <Select
                  label="Trạng thái"
                  value={form.status}
                  onChange={update('status')}
                  options={FORMAT_STATUS_OPTIONS}
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                <Button variant="outline" size="sm" onClick={() => setFormModalOpen(false)}>
                  Hủy
                </Button>
                <Button type="submit" size="sm" icon="fa-solid fa-check" loading={submitting} disabled={submitting}>
                  Tạo đợt
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}