import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useModal, usePageHeader, useToast } from '../../hooks';
import { fetchWithAuth, createWithAuth, updatePatchWithAuth, deleteWithAuth } from '../../utils/ApiHelper';
import { endpoints } from '../../config/Apis';
import Card, { SectionCard } from '../../components/Ui/Card';
import Button from '../../components/Ui/Button';
import Badge from '../../components/Ui/Badge';
import Input from '../../components/Ui/Input';
import Modal from '../../components/Ui/Modal';
import FilterBar from '../../components/FilterBar';
import ItemCardGrid, { type ItemCard } from '../../components/Cards/ItemCardGrid';
import type { RegistrationPeriod, Schedules } from '../../types';

const emptyForm = {
  title: '',
  deadline: '',
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

function ScheduleInfo({ icon, label, value }: { icon: string; label: string; value: ReactNode }) {
  return (
    <Card variant="soft" className="!p-3" bodyClassName="!p-0 flex items-center gap-3">
      <span className="w-10 h-10 shrink-0 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
        <i className={`${icon} text-sm`}></i>
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">{label}</p>
        <div className="text-sm font-semibold text-gray-800 truncate">{value ?? '—'}</div>
      </div>
    </Card>
  );
}

export default function ReportSchedule() {
  const toast = useToast();
  const { openModal, closeModal } = useModal();
  const [periods, setPeriods] = useState<RegistrationPeriod[]>([]);
  const [periodsLoading, setPeriodsLoading] = useState(true);
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>('current');
  const [schedules, setSchedules] = useState<Schedules[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedules | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [submitting, setSubmitting] = useState(false);

  usePageHeader({
    title: 'Lịch báo cáo định kỳ',
    description: 'Tạo và quản lý các mốc nộp báo cáo định kỳ cho sinh viên đang hướng dẫn.',
  });

  useEffect(() => { loadPeriods(); }, []);

  useEffect(() => {
    if (selectedPeriodId) loadSchedules();
  }, [selectedPeriodId]);

  const loadPeriods = async () => {
    await fetchWithAuth(
      endpoints.registrationPeriods,
      (data: RegistrationPeriod[]) => setPeriods(data),
      () => {},
      {},
      () => setPeriodsLoading(false)
    );
  };

  const loadSchedules = async () => {
    setLoading(true);
    await fetchWithAuth(
      endpoints.schedules(selectedPeriodId),
      (data: Schedules[]) => setSchedules(data),
      (type: string, msg: string) => {
        toast.error(type === 'network' ? 'Lỗi mạng' : type === 'server' ? 'Lỗi máy chủ' : 'Lỗi', msg);
      },
      {},
      () => setLoading(false)
    );
  };

  const update = (field: string) => (e: any) => {
    setForm(prev => ({ ...prev, [field]: e.target?.value ?? e }));
  };

  const openCreateModal = () => {
    setEditingSchedule(null);
    setForm({ ...emptyForm });
    setFormModalOpen(true);
  };

  const openEditModal = (s: Schedules) => {
    setEditingSchedule(s);
    setForm({ title: s.title || '', deadline: toDatetimeLocal(s.deadline) });
    setFormModalOpen(true);
  };

  const openDetailModal = (s: Schedules) => {
    openModal({
      title: s.title || `Lịch báo cáo lần ${s.sequence_number}`,
      description: 'Thông tin chi tiết lịch báo cáo định kỳ',
      icon: 'fa-regular fa-calendar-days',
      size: 'md',
      content: (
        <div className="space-y-5">
          <Card
            variant="soft"
            className="!bg-primary/5 !border-primary/10 !p-4"
            bodyClassName="!p-0 flex items-center justify-between gap-4"
          >
            <div className="min-w-0">
              <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">Tiêu đề</p>
              <p className="text-sm font-semibold text-gray-800 truncate">{s.title || '—'}</p>
            </div>
            <Badge variant="primary" dot>Lần {s.sequence_number}</Badge>
          </Card>

          <SectionCard title="Thông tin lịch" icon="fa-solid fa-circle-info">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <ScheduleInfo icon="fa-solid fa-hashtag" label="Lần thứ" value={s.sequence_number} />
              <ScheduleInfo icon="fa-regular fa-clock" label="Hạn nộp" value={formatDate(s.deadline)} />
            </div>
          </SectionCard>
        </div>
      ),
      footer: (
        <>
          <Button variant="outline" size="sm" onClick={closeModal}>
            Đóng
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon="fa-solid fa-pen"
            onClick={() => {
              closeModal();
              openEditModal(s);
            }}
          >
            Sửa
          </Button>
        </>
      ),
    });
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    if (!form.deadline) {
      toast.error('Thiếu thông tin', 'Vui lòng chọn hạn nộp cho lịch báo cáo.');
      return;
    }
    setSubmitting(true);

    const body = {
      title: form.title,
      deadline: new Date(form.deadline).toISOString(),
    };
    const onError = (type: string, msg: string) => {
      toast.error(type === 'network' ? 'Lỗi mạng' : type === 'server' ? 'Lỗi máy chủ' : 'Lỗi', msg);
    };

    if (editingSchedule) {
      await updatePatchWithAuth(
        endpoints.scheduleItem(editingSchedule.id),
        body,
        () => {
          loadSchedules();
          setFormModalOpen(false);
          toast.success('Đã lưu lịch', `Lịch báo cáo lần ${editingSchedule.sequence_number} đã được cập nhật.`);
        },
        onError,
        setSubmitting
      );
    } else {
      await createWithAuth(
        endpoints.schedules(selectedPeriodId),
        body,
        () => {
          loadSchedules();
          setFormModalOpen(false);
          toast.success('Tạo lịch thành công', 'Lịch báo cáo định kỳ đã được tạo.');
        },
        onError,
        setSubmitting
      );
    }
  };

  const handleDelete = async (s: Schedules) => {
    if (!window.confirm(`Xoá lịch báo cáo lần ${s.sequence_number}?`)) return;
    await deleteWithAuth(
      endpoints.scheduleItem(s.id),
      () => {
        loadSchedules();
        toast.success('Đã xoá lịch', `Lịch báo cáo lần ${s.sequence_number} đã được xoá.`);
      },
      (type: string, msg: string) => {
        toast.error(type === 'network' ? 'Lỗi mạng' : type === 'server' ? 'Lỗi máy chủ' : 'Lỗi', msg);
      }
    );
  };

  const filtered = schedules.filter((s) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (s.title || '').toLowerCase().includes(q) || String(s.sequence_number).includes(q);
  });

  return (
    <main className="flex-1 overflow-y-auto p-4 md:p-6">
      <div className="max-w-7xl mx-auto w-full space-y-6">
        <FilterBar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Tìm kiếm lịch theo tiêu đề hoặc lần báo cáo..."
          dropdowns={[
            {
              key: 'period',
              value: selectedPeriodId,
              onChange: setSelectedPeriodId,
              placeholder: periodsLoading ? 'Đang tải...' : 'Chọn đợt đăng ký',
              loading: periodsLoading,
              widthClassName: 'w-full sm:w-64',
              options: [
                { value: 'current', label: 'Đợt hiện tại (đang mở)' },
                ...periods.map((p) => ({ value: String(p.id), label: `${p.name} (${p.academic_year})` })),
              ],
            },
          ]}
          onRefresh={loadSchedules}
          refreshLoading={loading}
        />

        <div className="flex items-center justify-end">
          <Button variant="primary" icon="fa-solid fa-plus" onClick={openCreateModal}>
            Tạo lịch báo cáo
          </Button>
        </div>

        {!selectedPeriodId ? (
          <Card variant="elevated" bodyClassName="!space-y-0">
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <i className="fa-solid fa-calendar-week text-4xl mb-3"></i>
              <p className="text-sm font-medium">Vui lòng chọn đợt đăng ký</p>
            </div>
          </Card>
        ) : (
          <ItemCardGrid
            items={filtered.map((s): ItemCard => ({
              id: s.id,
              title: s.title || `Lịch báo cáo lần ${s.sequence_number}`,
              subtitle: (
                <>
                  <i className="fa-regular fa-clock mr-1"></i>
                  Hạn nộp: {formatDate(s.deadline)}
                </>
              ),
              icon: 'fa-file-lines',
              iconClassName: 'bg-primary/10 text-primary',
              cardClassName: 'bg-gray-50 hover:bg-blue-50',
              badge: { label: `Lần ${s.sequence_number}`, variant: 'primary' },
              onClick: () => openDetailModal(s),
              actions: (
                <>
                  <Button variant="outline" size="sm" icon="fa-solid fa-pen" onClick={() => openEditModal(s)}>
                    Sửa
                  </Button>
                  <Button variant="danger" size="sm" icon="fa-solid fa-trash" onClick={() => handleDelete(s)}>
                    Xoá
                  </Button>
                </>
              ),
            }))}
            loading={loading}
            emptyText="Chưa có lịch báo cáo nào trong đợt này"
            emptyIcon="fa-calendar-days"
          />
        )}
      </div>

      <Modal
        open={formModalOpen}
        onClose={() => setFormModalOpen(false)}
        title={editingSchedule ? `Sửa lịch báo cáo lần ${editingSchedule.sequence_number}` : 'Tạo lịch báo cáo định kỳ'}
        description="Sinh viên thuộc danh sách hướng dẫn của bạn sẽ thấy mốc nộp này."
        icon="fa-solid fa-calendar-days"
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          <Input
            label="Tiêu đề"
            placeholder="VD: Báo cáo tiến độ tuần 5"
            value={form.title}
            onChange={update('title')}
          />
          <Input
            label="Hạn nộp"
            required
            type="datetime-local"
            value={form.deadline}
            onChange={update('deadline')}
          />
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
            <Button variant="outline" size="sm" onClick={() => setFormModalOpen(false)}>
              Hủy
            </Button>
            <Button type="submit" size="sm" icon="fa-solid fa-check" loading={submitting} disabled={submitting}>
              {editingSchedule ? 'Lưu thay đổi' : 'Tạo lịch'}
            </Button>
          </div>
        </form>
      </Modal>
    </main>
  );
}
