import { useEffect, useState } from 'react';
import { useModal, usePageHeader, useToast } from '../hooks';
import { fetchWithAuth, createWithAuth, deleteWithAuth } from '../utils/ApiHelper';
import { endpoints } from '../config/Apis';
import Card, { SectionCard } from '../components/Ui/Card';
import Button from '../components/Ui/Button';
import Badge from '../components/Ui/Badge';
import Input from '../components/Ui/Input';
import Select from '../components/Ui/Select';
import type { RegistrationPeriod } from '../types';

const STATUS_CONFIG: Record<string, { label: string; variant: 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'info' }> = {
  scheduled: { label: 'Chờ mở đăng ký', variant: 'neutral' },
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

const CARD_STYLE: Record<string, string> = {
  scheduled: 'border-gray-200 hover:border-gray-300',
  student_registration: 'border-blue-400/70 hover:border-blue-500',
  in_progress: 'border-violet-400/70 hover:border-violet-500',
  report_submission: 'border-amber-400/70 hover:border-amber-500',
  closed: 'border-green-500/70 hover:border-green-600',
  archived: 'border-gray-200 hover:border-gray-300',
};

const emptyForm = {
  name: '',
  academic_year: '',
  student_registration_start: '',
  student_registration_end: '',
  report_submission_start: '',
  report_submission_end: '',
  execution_duration_weeks: '10',
  status: 'scheduled',
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

function PeriodInfo({ icon, label, value }: { icon: string; label: string; value: any }) {
  return (
    <Card variant="soft" className="!p-3" bodyClassName="!p-0 flex items-center gap-3">
      <span className="w-10 h-10 shrink-0 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
        <i className={`${icon} text-sm`}></i>
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">{label}</p>
        <div className="text-sm font-semibold text-gray-800 truncate">{value || '—'}</div>
      </div>
    </Card>
  );
}

export default function RegistrationPeriodManagement() {
  const { openModal, closeModal } = useModal();
  const toast = useToast();
  const [periods, setPeriods] = useState<RegistrationPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ ...emptyForm });
  const [submitting, setSubmitting] = useState(false);
  const [formModalOpen, setFormModalOpen] = useState(false);

  const CARD_STYLE: Record<string, string> = {
    scheduled: 'bg-gray-50 hover:bg-gray-100',
    student_registration: 'bg-blue-50 hover:bg-blue-100',
    in_progress: 'bg-violet-50 hover:bg-violet-100',
    report_submission: 'bg-amber-50 hover:bg-amber-100',
    closed: 'bg-green-50 hover:bg-green-100',
    archived: 'bg-gray-50 hover:bg-gray-100',
  };

  const CARD_ICON_STYLE: Record<string, string> = {
    scheduled: 'bg-gray-200 text-gray-500',
    student_registration: 'bg-blue-500 text-white',
    in_progress: 'bg-violet-500 text-white',
    report_submission: 'bg-amber-500 text-white',
    closed: 'bg-green-500 text-white',
    archived: 'bg-gray-200 text-gray-500',
  };

  const STATUS_ICON: Record<string, string> = {
    scheduled: 'fa-solid fa-hourglass-half',
    student_registration: 'fa-solid fa-user-check',
    in_progress: 'fa-solid fa-spinner',
    report_submission: 'fa-solid fa-file-arrow-up',
    closed: 'fa-solid fa-lock',
    archived: 'fa-solid fa-box-archive',
  };

  usePageHeader({
    title: 'Quản lý đợt đăng ký',
    description: 'Tạo và quản lý các đợt đăng ký đồ án / khóa luận tốt nghiệp.',
  });


  useEffect(() => { loadPeriods(); }, []);

  const loadPeriods = async () => {
    await fetchWithAuth(endpoints.registrationPeriods, setPeriods, () => { }, {}, setLoading);
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

    const msPerDay = 24 * 60 * 60 * 1000;
    const daysBetween = (from: string, to: string) => {
      if (!from || !to) return undefined;
      const diff = Math.ceil((new Date(to).getTime() - new Date(from).getTime()) / msPerDay);
      return diff > 0 ? diff : undefined;
    };

    const body: Record<string, any> = {
      name: form.name,
      academic_year: form.academic_year,
      student_registration_start: form.student_registration_start
        ? new Date(form.student_registration_start).toISOString()
        : null,
      student_registration_days: daysBetween(form.student_registration_start, form.student_registration_end),
      report_submission_days: daysBetween(form.report_submission_start, form.report_submission_end),
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
        toast.success('Tạo đợt thành công', 'Đợt đăng ký đã được tạo');
      },
      (type: string, msg: string) => {
        toast.error(type === 'network' ? 'Lỗi mạng' : type === 'server' ? 'Lỗi máy chủ' : 'Lỗi', msg);
      },
      setSubmitting,
    );
  };

  const loadDetailPeriod = async (id: number) => {
    await fetchWithAuth(
      endpoints.registrationPeriodDetail(id),
      (data) => {
        const status = STATUS_CONFIG[data.status] || STATUS_CONFIG.scheduled;
        openModal({
          title: data.name || 'Xem chi tiết',
          description: `Trạng thái: ${status.label}`,
          icon: 'fa-regular fa-file-lines',
          size: 'lg',
          content: (
            <div className="space-y-5">
              <Card
                variant="soft"
                className="!bg-primary/5 !border-primary/10 !p-4"
                bodyClassName="!p-0 flex items-center justify-between gap-4"
              >
                <div className="min-w-0">
                  <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">Tên đợt</p>
                  <p className="text-sm font-semibold text-gray-800 truncate">{data.name || '—'}</p>
                </div>
                <Badge variant={status.variant} dot>{status.label}</Badge>
              </Card>

              <SectionCard title="Thông tin chung" icon="fa-solid fa-circle-info">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <PeriodInfo icon="fa-solid fa-hashtag" label="ID" value={data.id} />
                  <PeriodInfo icon="fa-solid fa-calendar-days" label="Năm học" value={data.academic_year} />
                  <PeriodInfo icon="fa-solid fa-user" label="Người tạo" value={data.created_by} />
                  <PeriodInfo icon="fa-solid fa-toggle-on" label="Đang hoạt động" value={data.active ? 'Có' : 'Không'} />
                  <PeriodInfo icon="fa-regular fa-clock" label="Ngày tạo" value={formatDate(data.created_date)} />
                  <PeriodInfo icon="fa-regular fa-clock" label="Cập nhật gần nhất" value={formatDate(data.updated_date)} />
                </div>
              </SectionCard>

              <SectionCard title="Thời gian & tiến độ" icon="fa-solid fa-chart-line">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <PeriodInfo icon="fa-regular fa-calendar" label="Bắt đầu đăng ký" value={formatDate(data.student_registration_start)} />
                  <PeriodInfo icon="fa-solid fa-calendar-check" label="Số ngày đăng ký" value={data.student_registration_days} />
                  <PeriodInfo icon="fa-solid fa-file-arrow-up" label="Số ngày nộp báo cáo" value={data.report_submission_days} />
                  <PeriodInfo icon="fa-solid fa-stopwatch" label="Số tuần thực hiện" value={data.execution_duration_weeks} />
                </div>
              </SectionCard>
            </div>
          ),
          footer: (
            <Button variant="outline" size="sm" onClick={closeModal}>Đóng</Button>
          ),
        });
      }
    );
  }

  return (
    <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-background">
      <div className="max-w-7xl mx-auto w-full space-y-6">
        <div className="flex items-center justify-end">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {periods.map((p: any) => {
                const status = STATUS_CONFIG[p.status] || STATUS_CONFIG.scheduled;
                return (
                  <div
                    key={p.id}
                    className={`group relative rounded-2xl p-4 cursor-pointer transition-all duration-200 ${CARD_STYLE[p.status] || CARD_STYLE.scheduled}`}
                    onClick={() => loadDetailPeriod(p.id)}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <span className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center ${CARD_ICON_STYLE[p.status] || CARD_ICON_STYLE.scheduled}`}>
                        <i className={`${STATUS_ICON[p.status] || 'fa-solid fa-calendar'} text-sm`}></i>
                      </span>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-gray-800 text-sm truncate">{p.name}</h3>
                        <p className="text-xs text-gray-500">{p.academic_year}</p>
                      </div>
                    </div>

                    <Badge variant={status.variant} dot>
                      {status.label}
                    </Badge>
                  </div>
                );
              })}
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