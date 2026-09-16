import { useEffect, useState } from 'react';
import { usePageHeader, useToast, useSearch } from '../../hooks';
import { fetchWithAuth, createWithAuth, updatePatchWithAuth, deleteWithAuth } from '../../utils/ApiHelper';
import { endpoints } from '../../config/Apis';
import Card from '../../components/Ui/Card';
import Button from '../../components/Ui/Button';
import Badge from '../../components/Ui/Badge';
import FilterBar from '../../components/FilterBar';
import ConfirmModal from '../../components/Ui/ConfirmModal';
import ScheduleDetail from './ScheduleDetail';
import ScheduleForm from './ScheduleForm';
import type { RegistrationPeriod, Schedules } from '../../types';

function formatDate(iso: string | undefined | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
    + ' ' + d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

export default function ReportSchedule() {
  const toast = useToast();
  const { search, setSearch, searchParams } = useSearch();

  const [periods, setPeriods] = useState<RegistrationPeriod[]>([]);
  const [periodsLoading, setPeriodsLoading] = useState(true);
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>('current-project');
  const [schedules, setSchedules] = useState<Schedules[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedules | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [confirmDelete, setConfirmDelete] = useState<{ open: boolean; id: number | null }>({ open: false, id: null });

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

  const filtered = schedules.filter((s) => {
    const q = searchParams.search?.toLowerCase() || '';
    if (!q) return true;
    return (s.title || '').toLowerCase().includes(q) || String(s.sequence_number).includes(q);
  });

  const selectedSchedule = schedules.find((s) => s.id === selectedId) || null;

  const handleCreate = async (body: Record<string, any>) => {
    setSubmitting(true);
    await createWithAuth(
      endpoints.schedules(selectedPeriodId),
      body,
      () => {
        loadSchedules();
        setIsCreating(false);
        toast.success('Tạo lịch thành công', 'Lịch báo cáo định kỳ đã được tạo.');
      },
      (type: string, msg: string) => {
        toast.error(type === 'network' ? 'Lỗi mạng' : type === 'server' ? 'Lỗi máy chủ' : 'Lỗi', msg);
      },
      () => setSubmitting(false)
    );
  };

  const handleEdit = async (body: Record<string, any>) => {
    if (!editingSchedule) return;
    setSubmitting(true);
    await updatePatchWithAuth(
      endpoints.scheduleItem(editingSchedule.id),
      body,
      () => {
        loadSchedules();
        setEditingSchedule(null);
        toast.success('Đã lưu lịch', `Lịch báo cáo lần ${editingSchedule.sequence_number} đã được cập nhật.`);
      },
      (type: string, msg: string) => {
        toast.error(type === 'network' ? 'Lỗi mạng' : type === 'server' ? 'Lỗi máy chủ' : 'Lỗi', msg);
      },
      () => setSubmitting(false)
    );
  };

  const handleDelete = async (id: number) => {
    const s = schedules.find((x) => x.id === id);
    await deleteWithAuth(
      endpoints.scheduleItem(id),
      () => {
        loadSchedules();
        if (selectedId === id) setSelectedId(null);
        toast.success('Đã xoá lịch', `Lịch báo cáo lần ${s?.sequence_number} đã được xoá.`);
      },
      (type: string, msg: string) => {
        toast.error(type === 'network' ? 'Lỗi mạng' : type === 'server' ? 'Lỗi máy chủ' : 'Lỗi', msg);
      }
    );
  };

  return (
    <div className="space-y-6">
      <FilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Tìm kiếm theo tiêu đề, lần báo cáo..."
        dropdowns={[
          {
            key: 'period',
            value: selectedPeriodId,
            onChange: setSelectedPeriodId,
            placeholder: periodsLoading ? 'Đang tải...' : 'Chọn đợt đăng ký',
            loading: periodsLoading,
            widthClassName: 'w-full sm:w-64',
            options: [
              { value: 'current-project', label: 'Đợt đồ án hiện tại' },
              { value: 'current-thesis', label: 'Đợt khóa luận hiện tại' },
              ...periods.map((p) => ({ value: String(p.id), label: `${p.name} (${p.academic_year})` })),
            ],
          },
        ]}
        onRefresh={loadSchedules}
        refreshLoading={loading}
        actions={
          <Button variant="primary" icon="fa-solid fa-plus" onClick={() => { setIsCreating(true); setSelectedId(null); setEditingSchedule(null); }}>
            Tạo lịch báo cáo
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
        {/* LEFT PANEL */}
        <div className="lg:col-span-3">
          <Card variant="elevated" icon="fa-solid fa-calendar-days" title={`Lịch báo cáo (${filtered.length})`}>
            <div className="space-y-2 max-h-[calc(100vh-320px)] overflow-y-auto pr-1">
              {filtered.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">Chưa có lịch báo cáo nào</p>
              ) : (
                filtered.map((s) => {
                  const isSelected = selectedId === s.id && !isCreating && !editingSchedule;
                  return (
                    <div
                      key={s.id}
                      onClick={() => { setSelectedId(s.id); setIsCreating(false); setEditingSchedule(null); }}
                      className={`p-3 rounded-xl cursor-pointer border transition-all duration-150 ${
                        isSelected
                          ? 'border-primary bg-primary/5 ring-1 ring-primary/20 shadow-sm'
                          : 'border-gray-100 hover:bg-gray-50 hover:border-gray-200'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium text-gray-800 line-clamp-2 leading-snug">
                            {s.title || `Lịch báo cáo lần ${s.sequence_number}`}
                          </div>
                          <div className="text-xs text-gray-400 mt-1.5 flex items-center gap-1">
                            <i className="fa-regular fa-clock"></i>
                            Hạn: {formatDate(s.deadline)}
                          </div>
                        </div>
                        <Badge variant="primary" className="shrink-0 text-[10px]">Lần {s.sequence_number}</Badge>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </Card>
        </div>

        {/* RIGHT PANEL */}
        <div className="lg:col-span-7">
          {isCreating ? (
            <ScheduleForm
              mode="create"
              onSubmit={handleCreate}
              onCancel={() => setIsCreating(false)}
              loading={submitting}
            />
          ) : editingSchedule ? (
            <ScheduleForm
              mode="edit"
              initialValues={editingSchedule}
              onSubmit={handleEdit}
              onCancel={() => setEditingSchedule(null)}
              loading={submitting}
            />
          ) : !selectedSchedule ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400 bg-white rounded-2xl border border-gray-100 shadow-sm">
              <i className="fa-regular fa-hand-pointer text-5xl mb-4"></i>
              <p className="text-sm font-medium">Chọn một lịch báo cáo từ danh sách bên trái</p>
              <p className="text-xs text-gray-300 mt-1">hoặc bấm "Tạo lịch báo cáo" để tạo mới</p>
            </div>
          ) : (
            <ScheduleDetail
              schedule={selectedSchedule}
              onEdit={(id) => {
                const s = schedules.find((x) => x.id === id);
                if (s) setEditingSchedule(s);
              }}
              onDelete={(id) => setConfirmDelete({ open: true, id })}
            />
          )}
        </div>
      </div>

      <ConfirmModal
        open={confirmDelete.open}
        title="Xoá lịch báo cáo"
        description={`Bạn có chắc muốn xoá lịch báo cáo này? Hành động này không thể hoàn tác.`}
        icon="fa-solid fa-trash"
        confirmLabel="Xoá"
        confirmVariant="danger"
        onConfirm={() => {
          if (confirmDelete.id) handleDelete(confirmDelete.id);
          setConfirmDelete({ open: false, id: null });
        }}
        onCancel={() => setConfirmDelete({ open: false, id: null })}
      />
    </div>
  );
}
