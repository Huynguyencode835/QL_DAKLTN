import { useEffect, useState } from 'react';
import { usePageHeader, useToast, useSearch } from '../../hooks';
import { fetchWithAuth, createWithAuth, updatePatchWithAuth, deleteWithAuth } from '../../utils/ApiHelper';
import { endpoints } from '../../config/Apis';
import Card from '../../components/Ui/Card';
import Button from '../../components/Ui/Button';
import Badge from '../../components/Ui/Badge';
import FilterBar from '../../components/FilterBar';
import ConfirmModal from '../../components/Ui/ConfirmModal';
import PeriodDetail from './PeriodDetail';
import PeriodForm from './PeriodForm';
import ThesisPeriodForm from './ThesisPeriodForm';
import type { RegistrationPeriod } from '../../types';

const STATUS_CONFIG: Record<string, { label: string; variant: 'neutral' | 'primary' | 'info' | 'warning' | 'danger' }> = {
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
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
    + ' ' + d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

export default function RegistrationPeriodManagement() {
  const toast = useToast();
  const { search, setSearch, searchParams } = useSearch();

  const [periods, setPeriods] = useState<RegistrationPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [detailPeriod, setDetailPeriod] = useState<RegistrationPeriod | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [periodTypeFilter, setPeriodTypeFilter] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [isCreatingThesis, setIsCreatingThesis] = useState(false);
  const [thesisParentId, setThesisParentId] = useState<number | null>(null);

  const [confirmState, setConfirmState] = useState<{
    type: 'publish' | 'delete' | null;
    id: number | null;
  }>({ type: null, id: null });
  const [confirmLoading, setConfirmLoading] = useState(false);

  usePageHeader({
    title: 'Quản lý đợt đăng ký',
    description: 'Tạo và quản lý các đợt đăng ký đồ án / khóa luận tốt nghiệp.',
  });

  useEffect(() => { loadPeriods(); }, [periodTypeFilter]);

  useEffect(() => {
    if (selectedId !== null) loadDetailPeriod(selectedId);
  }, [selectedId]);

  const loadPeriods = async () => {
    const params: Record<string, string> = {};
    if (periodTypeFilter) params.period_type = periodTypeFilter;
    await fetchWithAuth(endpoints.registrationPeriods, setPeriods, () => {}, params, setLoading);
  };

  const loadDetailPeriod = async (id: number) => {
    await fetchWithAuth(
      endpoints.registrationPeriodDetail(id),
      (data: RegistrationPeriod) => setDetailPeriod(data),
      () => {},
      {},
    );
  };

  const filtered = periods.filter((p) => {
    if (statusFilter && p.status !== statusFilter) return false;
    if (periodTypeFilter && p.period_type !== periodTypeFilter) return false;
    if (searchParams.search) {
      const q = searchParams.search.toLowerCase();
      if (!p.name.toLowerCase().includes(q) && !p.academic_year.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const selectedPeriod = periods.find((p) => p.id === selectedId) || null;

  const handleCreate = async (body: Record<string, any>) => {
    setSubmitting(true);
    await createWithAuth(
      endpoints.registrationPeriods,
      body,
      (data: RegistrationPeriod) => {
        setPeriods((prev) => [data, ...prev]);
        setSelectedId(data.id);
        setIsCreating(false);
        toast.success('Tạo đợt thành công', `Đợt "${data.name}" đã được tạo.`);
      },
      (_type: string, msg: string) => {
        toast.error('Lỗi', msg || 'Không thể tạo đợt.');
      },
      () => setSubmitting(false),
    );
  };

  const handleEdit = async (body: Record<string, any>) => {
    if (!editingId) return;
    setSubmitting(true);
    await updatePatchWithAuth(
      endpoints.registrationPeriodDetail(editingId),
      body,
      (data: RegistrationPeriod) => {
        setPeriods((prev) => prev.map((p) => (p.id === editingId ? data : p)));
        setDetailPeriod(data);
        setSelectedId(editingId);
        setIsCreating(false);
        setEditingId(null);
        toast.success('Cập nhật thành công', `Đợt "${data.name}" đã được cập nhật.`);
      },
      (_type: string, msg: string) => {
        toast.error('Lỗi', msg || 'Không thể cập nhật đợt.');
      },
      () => setSubmitting(false),
    );
  };

  const handlePublish = async (id: number) => {
    setConfirmLoading(true);
    await createWithAuth(
      endpoints.publishPeriod(id),
      {},
      (data: RegistrationPeriod) => {
        setPeriods((prev) => prev.map((p) => (p.id === id ? data : p)));
        setDetailPeriod(data);
        toast.success('Công bố thành công', 'Đợt đăng ký đã chuyển sang trạng thái "Chờ mở đăng ký".');
      },
      (_type: string, msg: string) => {
        toast.error('Lỗi', msg || 'Không thể công bố đợt.');
      },
      () => setConfirmLoading(false),
    );
  };

  const handleDelete = async (id: number) => {
    const p = periods.find((x) => x.id === id);
    setConfirmLoading(true);
    await deleteWithAuth(
      endpoints.registrationPeriodDetail(id),
      () => {
        setPeriods((prev) => prev.filter((x) => x.id !== id));
        if (selectedId === id) {
          setSelectedId(null);
          setDetailPeriod(null);
        }
        toast.success('Đã xoá', `Đợt "${p?.name}" đã bị xoá.`);
      },
      (_type: string, msg: string) => {
        toast.error('Lỗi', msg || 'Không thể xoá đợt.');
      },
      () => setConfirmLoading(false),
    );
  };

  const handleCreateThesis = async (body: Record<string, any>) => {
    if (!thesisParentId) return;
    setSubmitting(true);
    await createWithAuth(
      endpoints.createThesis(thesisParentId),
      body,
      (data: RegistrationPeriod) => {
        setPeriods((prev) => [data, ...prev]);
        setSelectedId(data.id);
        setIsCreatingThesis(false);
        setThesisParentId(null);
        toast.success('Tạo đợt khóa luận thành công', `Đợt "${data.name}" đã được tạo.`);
      },
      (_type: string, msg: string) => {
        toast.error('Lỗi', msg || 'Không thể tạo đợt khóa luận.');
      },
      () => setSubmitting(false),
    );
  };

  const handleConfirm = () => {
    if (confirmState.type === 'publish' && confirmState.id) handlePublish(confirmState.id);
    if (confirmState.type === 'delete' && confirmState.id) handleDelete(confirmState.id);
    setConfirmState({ type: null, id: null });
  };

  return (
    <div className="space-y-6">
      <FilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Tìm kiếm tên đợt, năm học..."
        dropdowns={[
          {
            key: 'periodType',
            value: periodTypeFilter,
            onChange: (v) => setPeriodTypeFilter(v === 'all' ? '' : v),
            placeholder: 'Tất cả loại đợt',
            widthClassName: 'w-full sm:w-48',
            options: [
              { value: 'all', label: 'Tất cả' },
              { value: 'project', label: 'Đợt đồ án' },
              { value: 'thesis', label: 'Đợt khóa luận' },
            ],
          },
          {
            key: 'status',
            value: statusFilter,
            onChange: (v) => setStatusFilter(v === 'all' ? '' : v),
            placeholder: 'Tất cả trạng thái',
            widthClassName: 'w-full sm:w-56',
            options: [
              { value: 'all', label: 'Tất cả' },
              { value: 'draft', label: 'Nháp' },
              { value: 'scheduled', label: 'Chờ mở đăng ký' },
              { value: 'student_registration', label: 'Đang mở đăng ký' },
              { value: 'in_progress', label: 'Đang thực hiện' },
              { value: 'report_submission', label: 'Đang nhận báo cáo' },
              { value: 'closed', label: 'Đã đóng' },
            ],
          },
        ]}
        onRefresh={loadPeriods}
        refreshLoading={loading}
        actions={
          <Button variant="primary" icon="fa-solid fa-plus" onClick={() => { setIsCreating(true); setSelectedId(null); setEditingId(null); }}>
            Tạo đợt mới
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
        {/* LEFT PANEL */}
        <div className="lg:col-span-3">
          <Card variant="elevated" icon="fa-solid fa-calendar-days" title={`Đợt đăng ký (${filtered.length})`}>
            <div className="space-y-2 max-h-[calc(100vh-320px)] overflow-y-auto pr-1">
              {filtered.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">Không có đợt đăng ký nào</p>
              ) : (
                filtered.map((p) => {
                  const isSelected = selectedId === p.id && !isCreating;
                  const cfg = STATUS_CONFIG[p.status || 'draft'] || STATUS_CONFIG.draft;
                  return (
                    <div
                      key={p.id}
                      onClick={() => { setSelectedId(p.id); setIsCreating(false); setEditingId(null); }}
                      className={`p-3 rounded-xl cursor-pointer border transition-all duration-150 ${
                        isSelected
                          ? 'border-primary bg-primary/5 ring-1 ring-primary/20 shadow-sm'
                          : 'border-gray-100 hover:bg-gray-50 hover:border-gray-200'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium text-gray-800 line-clamp-2 leading-snug">{p.name}</div>
                          <div className="text-xs text-gray-400 mt-1.5 flex items-center gap-1">
                            <i className="fa-solid fa-calendar-days"></i>
                            {p.academic_year}
                          </div>
                          {p.student_registration_start && (
                            <div className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                              <i className="fa-regular fa-calendar"></i>
                              {formatDate(p.student_registration_start)}
                            </div>
                          )}
                        </div>
                        <Badge variant={cfg.variant} className="shrink-0 text-[10px]">{cfg.label}</Badge>
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
          {isCreatingThesis && thesisParentId ? (
            <ThesisPeriodForm
              parentPeriod={detailPeriod}
              onSubmit={handleCreateThesis}
              onCancel={() => { setIsCreatingThesis(false); setThesisParentId(null); }}
              loading={submitting}
            />
          ) : isCreating ? (
            <PeriodForm
              mode={editingId ? 'edit' : 'create'}
              initialValues={editingId ? detailPeriod || undefined : undefined}
              onSubmit={editingId ? handleEdit : handleCreate}
              onCancel={() => { setIsCreating(false); setEditingId(null); }}
              loading={submitting}
            />
          ) : !selectedPeriod ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400 bg-white rounded-2xl border border-gray-100 shadow-sm">
              <i className="fa-regular fa-hand-pointer text-5xl mb-4"></i>
              <p className="text-sm font-medium">Chọn một đợt đăng ký từ danh sách bên trái</p>
              <p className="text-xs text-gray-300 mt-1">hoặc bấm "Tạo đợt mới" để tạo mới</p>
            </div>
          ) : (
            <PeriodDetail
              period={detailPeriod ?? selectedPeriod}
              onPublish={(id) => setConfirmState({ type: 'publish', id })}
              onDelete={(id) => setConfirmState({ type: 'delete', id })}
              onEdit={(id) => {
                setEditingId(id);
                setIsCreating(true);
              }}
              onCreateThesis={(id) => {
                setThesisParentId(id);
                setIsCreatingThesis(true);
              }}
            />
          )}
        </div>
      </div>

      <ConfirmModal
        open={confirmState.type !== null}
        title={confirmState.type === 'publish' ? 'Công bố đợt đăng ký' : 'Xoá đợt đăng ký'}
        description={
          confirmState.type === 'publish'
            ? 'Đợt đăng ký sẽ chuyển sang trạng thái "Chờ mở đăng ký". Bạn có chắc muốn công bố?'
            : 'Bạn có chắc muốn xoá đợt đăng ký này? Hành động này không thể hoàn tác.'
        }
        icon={confirmState.type === 'publish' ? 'fa-solid fa-bullhorn' : 'fa-solid fa-trash'}
        confirmLabel={confirmState.type === 'publish' ? 'Công bố' : 'Xoá'}
        confirmVariant={confirmState.type === 'publish' ? 'primary' : 'danger'}
        onConfirm={handleConfirm}
        onCancel={() => setConfirmState({ type: null, id: null })}
        loading={confirmLoading}
      />
    </div>
  );
}
