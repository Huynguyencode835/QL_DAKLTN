import { useState, useEffect, type ChangeEvent } from 'react';
import { usePageHeader, useToast, useSearch, usePagination } from '../../hooks';
import Button from '../../components/Ui/Button';
import Badge from '../../components/Ui/Badge';
import Input from '../../components/Ui/Input';
import Select from '../../components/Ui/Select';
import FilterBar from '../../components/FilterBar';
import GenericTable, { TableColumn } from '../../components/GenericTable';
import Pagination from '../../components/Ui/Pagination';
import { SectionCard } from '../../components/Ui/Card';
import ConfirmModal from '../../components/Ui/ConfirmModal';
import {
  TwoPanelLayout,
  SidebarCardList,
  EmptyDetailState,
  DetailHeader,
  InfoTileGrid,
} from '../../components/ManagementLayout';
import { REVIEWER_APPROVAL_STATUS_CONFIG } from '../../types';
import type {
  ReviewerAssignmentSession,
  ReviewerAssignmentDetail,
  ReviewerAssignmentRegistration,
  RegistrationPeriod,
} from '../../types';
import { fetchWithAuth, createWithAuth, deleteWithAuth } from '../../utils/ApiHelper';
import { endpoints } from '../../config/Apis';

interface SessionForm {
  reviewer: string;
  defense_date: string;
  location: string;
}

const EMPTY_FORM: SessionForm = {
  reviewer: '',
  defense_date: '',
  location: '',
};

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
    + ' ' + d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

export default function ManageReviewerSessions() {
  const toast = useToast();
  const { search, setSearch, searchParams } = useSearch();
  const [sessions, setSessions] = useState<ReviewerAssignmentSession[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [form, setForm] = useState<SessionForm>(EMPTY_FORM);
  const [periods, setPeriods] = useState<RegistrationPeriod[]>([]);
  const [periodsLoading, setPeriodsLoading] = useState(true);
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>('current-thesis');
  const [lecturers, setLecturers] = useState<{ id: number; full_name: string }[]>([]);
  const [lecturersLoading, setLecturersLoading] = useState(false);
  const [availableRegistrations, setAvailableRegistrations] = useState<any[]>([]);
  const [registrationsLoading, setRegistrationsLoading] = useState(false);
  const [selectedRegistrationIds, setSelectedRegistrationIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [patching, setPatching] = useState(false);
  const [deletingLoading, setDeletingLoading] = useState(false);
  const [detailSession, setDetailSession] = useState<ReviewerAssignmentDetail | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ open: boolean; id: number | null }>({ open: false, id: null });
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<{ defense_date: string; location: string }>({ defense_date: '', location: '' });
  const regPagination = usePagination({ pageSize: 8 });

  usePageHeader({
    title: 'Quản lý Phản biện',
    description: 'Tạo và quản lý các đợt phản biện, phân công giảng viên phản biện.',
  });

  useEffect(() => {
    loadPeriods();
    loadLecturers();
  }, []);

  useEffect(() => {
    loadSessions();
  }, [selectedPeriodId, searchParams]);

  useEffect(() => {
    if (selectedId !== null) loadDetailSession(selectedId);
  }, [selectedId, selectedPeriodId]);

  useEffect(() => {
    if (isCreating) {
      loadAvailableRegistrations(selectedPeriodId, regPagination.currentPage);
    }
  }, [isCreating, selectedPeriodId, regPagination.currentPage]);

  const loadPeriods = async () => {
    await fetchWithAuth(
      endpoints.registrationPeriods,
      (data: RegistrationPeriod[]) => setPeriods(data),
      () => {},
      { period_type: 'thesis' },
      () => setPeriodsLoading(false)
    );
  };

  const loadSessions = async () => {
    if (!selectedPeriodId) return;
    setLoading(true);
    await fetchWithAuth(
      endpoints.reviewerSessions(selectedPeriodId),
      (data: any) => {
        const raw = Array.isArray(data) ? data : data?.results ?? [];
        setSessions(raw);
      },
      () => {},
      { search: searchParams.search || undefined },
      setLoading
    );
  };

  const loadDetailSession = async (id: number) => {
    await fetchWithAuth(
      endpoints.reviewerSessionDetail(selectedPeriodId, id),
      (data: ReviewerAssignmentDetail) => setDetailSession(data),
      () => {},
      {},
    );
  };

  const loadLecturers = async () => {
    setLecturersLoading(true);
    await fetchWithAuth(
      endpoints.lecturers,
      (data: any) => {
        const raw = Array.isArray(data) ? data : data?.results ?? [];
        setLecturers(raw);
      },
      () => {},
      {},
      () => setLecturersLoading(false)
    );
  };

  const loadAvailableRegistrations = async (periodId: string, page: number) => {
    setRegistrationsLoading(true);
    await fetchWithAuth(
      endpoints.reviewerEligibleRegistrations(periodId),
      (data: any, paginatedData?: { count: number }) => {
        const raw = Array.isArray(data) ? data : data?.results ?? [];
        regPagination.handlePaginatedResponse(raw, paginatedData);
        setAvailableRegistrations(raw);
      },
      () => {},
      { page },
      () => setRegistrationsLoading(false)
    );
  };

  const selectedSession = sessions.find((s) => s.id === selectedId) || null;

  const updateForm = (field: keyof SessionForm) => (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setSelectedRegistrationIds([]);
    setIsCreating(false);
    regPagination.resetPage();
  };

  const toggleRegistration = (id: number) => {
    setSelectedRegistrationIds((prev) =>
      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]
    );
  };

  const handleCreate = async () => {
    if (!form.reviewer || !form.defense_date) {
      toast.error('Lỗi', 'Vui lòng chọn giảng viên và ngày bảo vệ.');
      return;
    }
    if (selectedRegistrationIds.length === 0) {
      toast.error('Lỗi', 'Phải chọn ít nhất 1 đăng ký.');
      return;
    }
    const toLocalISOString = (dtLocal: string) => {
      const d = new Date(dtLocal);
      const offset = -d.getTimezoneOffset();
      const sign = offset >= 0 ? '+' : '-';
      const h = String(Math.floor(Math.abs(offset) / 60)).padStart(2, '0');
      const m = String(Math.abs(offset) % 60).padStart(2, '0');
      return dtLocal + ':00' + sign + h + ':' + m;
    };
    const body = {
      reviewer: Number(form.reviewer),
      registration_ids: selectedRegistrationIds,
      defense_date: toLocalISOString(form.defense_date),
      location: form.location,
    };
    setSubmitting(true);
    await createWithAuth(
      endpoints.reviewerSessions(selectedPeriodId),
      body,
      (data: ReviewerAssignmentSession) => {
        setSessions((prev) => [data, ...prev]);
        setSelectedId(data.id);
        setIsCreating(false);
        resetForm();
        toast.success('Tạo thành công', `Đợt phản biện đã được tạo.`);
      },
      (_type: string, msg: string) => {
        toast.error('Lỗi', msg || 'Không thể tạo đợt phản biện.');
      },
      () => setSubmitting(false),
    );
  };

  const handleDelete = async () => {
    if (!confirmDelete.id) return;
    setDeletingLoading(true);
    await deleteWithAuth(
      endpoints.reviewerSessionDetail(selectedPeriodId, confirmDelete.id),
      () => {
        setSessions((prev) => prev.filter((s) => s.id !== confirmDelete.id));
        if (selectedId === confirmDelete.id) {
          setSelectedId(null);
          setDetailSession(null);
        }
        toast.success('Đã xoá', 'Đợt phản biện đã bị xoá.');
        setConfirmDelete({ open: false, id: null });
      },
      (_type: string, msg: string) => {
        toast.error('Lỗi', msg || 'Không thể xoá đợt phản biện.');
        setConfirmDelete({ open: false, id: null });
      },
      () => setDeletingLoading(false),
    );
  };

  const handlePatch = async (id: number, data: { defense_date?: string; location?: string }) => {
    const { updatePatchWithAuth } = await import('../../utils/ApiHelper');
    setPatching(true);
    await updatePatchWithAuth(
      endpoints.reviewerSessionDetail(selectedPeriodId, id),
      data,
      (updated: ReviewerAssignmentSession) => {
        setSessions((prev) => prev.map((s) => s.id === id ? { ...s, ...updated } : s));
        if (selectedId === id) loadDetailSession(id);
        toast.success('Cập nhật thành công');
        setIsEditing(false);
      },
      (_type: string, msg: string) => {
        toast.error('Lỗi', msg || 'Không thể cập nhật.');
      },
      () => setPatching(false),
    );
  };

  const assignmentColumns: TableColumn<ReviewerAssignmentRegistration>[] = [
    {
      key: 'stt', label: 'STT', align: 'center',
      render: (row) => {
        const idx = detailSession?.assignments.findIndex((a) => a.registration_id === row.registration_id) ?? -1;
        return <span className="text-gray-500">{idx + 1}</span>;
      },
    },
    {
      key: 'project_title', label: 'Đề tài',
      render: (row) => <span className="font-medium text-gray-800 line-clamp-1">{row.project_title}</span>,
    },
    {
      key: 'student_name', label: 'Sinh viên',
      render: (row) => (
        <div>
          <div className="text-sm text-gray-800">{row.student_name}</div>
          <div className="text-xs text-gray-400">{row.student_id}</div>
        </div>
      ),
    },
    {
      key: 'approval_status', label: 'Trạng thái',
      render: (row) => {
        const cfg = REVIEWER_APPROVAL_STATUS_CONFIG[row.approval_status];
        return <Badge variant={cfg?.variant || 'neutral'}>{cfg?.label || row.approval_status}</Badge>;
      },
    },
  ];

  return (
    <div className="space-y-6">
      <FilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Tìm kiếm tên giảng viên, phòng..."
        dropdowns={[
          {
            key: 'period',
            value: selectedPeriodId,
            onChange: setSelectedPeriodId,
            placeholder: periodsLoading ? 'Đang tải...' : 'Chọn đợt đăng ký',
            loading: periodsLoading,
            widthClassName: 'w-full sm:w-64',
            options: [
              { value: 'current-thesis', label: 'Đợt khóa luận hiện tại' },
              ...periods.map((p) => ({ value: String(p.id), label: `${p.name} (${p.academic_year})` })),
            ],
          },
        ]}
        onRefresh={loadSessions}
        refreshLoading={loading}
        actions={
          <Button variant="primary" icon="fa-solid fa-plus" onClick={() => { setIsCreating(true); setSelectedId(null); regPagination.resetPage(); }}>
            Tạo đợt phản biện
          </Button>
        }
      />

      <TwoPanelLayout
        leftContent={
          <SidebarCardList
            title="Đợt phản biện"
            count={sessions.length}
            items={sessions}
            selectedId={isCreating ? null : selectedId}
            onSelect={(id) => { setSelectedId(id); setIsCreating(false); }}
            emptyText="Không có đợt phản biện nào"
            icon="fa-solid fa-users-rectangle"
            renderItem={(item, isSelected) => (
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-gray-800 line-clamp-2 leading-snug">{item.reviewer_name}</div>
                  <div className="text-xs text-gray-400 mt-1.5 flex items-center gap-1">
                    <i className="fa-regular fa-calendar"></i>
                    {formatDate(item.defense_date)}
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                    <i className="fa-solid fa-location-dot"></i>
                    {item.location || 'Chưa có phòng'}
                  </div>
                </div>
                <Badge variant="neutral" className="shrink-0 text-[10px]">{item.assignment_count} đề tài</Badge>
              </div>
            )}
          />
        }
        rightContent={
          isCreating ? (
            <SectionCard title="Tạo đợt phản biện mới" icon="fa-solid fa-plus-circle">
              <div className="max-h-[calc(100vh-280px)] overflow-y-auto pr-1 space-y-5">
                <Select
                  label="Giảng viên phản biện"
                  required
                  placeholder={lecturersLoading ? 'Đang tải...' : 'Chọn giảng viên'}
                  value={form.reviewer}
                  onChange={updateForm('reviewer')}
                  options={lecturers.map((l) => ({ value: String(l.id), label: l.full_name }))}
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input label="Ngày giờ bảo vệ" required type="datetime-local" value={form.defense_date} onChange={updateForm('defense_date')} />
                  <Input label="Phòng" placeholder="VD: Phòng 301 - Nhà A" value={form.location} onChange={updateForm('location')} />
                </div>
                <div className="flex items-center gap-2 py-2">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <i className="fa-regular fa-calendar text-primary text-sm"></i>
                  </div>
                  <div>
                    <div className="text-[11px] text-gray-400 font-medium uppercase">Đợt đăng ký</div>
                    <div className="text-sm font-semibold text-gray-800">
                      {periods.find((p) => String(p.id) === selectedPeriodId)?.name || 'Đợt hiện tại'}
                    </div>
                  </div>
                </div>

                <div className="border-t border-gray-100 pt-5">
                  <h4 className="font-semibold text-gray-800 text-sm flex items-center gap-2 mb-3">
                    <i className="fa-solid fa-file-lines text-primary"></i>
                    Danh sách đăng ký
                  </h4>
                  {registrationsLoading ? (
                    <p className="text-sm text-gray-400 text-center py-4">Đang tải danh sách đăng ký...</p>
                  ) : availableRegistrations.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-4">Không có đăng ký nào trong đợt này</p>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div className="border border-gray-200 rounded-xl overflow-hidden">
                          <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-200">
                            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                              Chọn đăng ký ({selectedRegistrationIds.length} đã chọn)
                            </span>
                          </div>
                          <div className="max-h-[280px] overflow-y-auto divide-y divide-gray-100">
                            {availableRegistrations.map((r: any) => (
                              <label
                                key={r.id}
                                className={`flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors ${
                                  selectedRegistrationIds.includes(r.id) ? 'bg-primary/5' : 'hover:bg-gray-50'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={selectedRegistrationIds.includes(r.id)}
                                  onChange={() => toggleRegistration(r.id)}
                                  className="mt-0.5 w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary/30"
                                />
                                <div className="min-w-0 flex-1">
                                  <div className="text-sm font-medium text-gray-800 line-clamp-2 leading-snug">{r.project_title}</div>
                                  <div className="text-xs text-gray-400 mt-1">{r.student_name} - {r.student_id}</div>
                                </div>
                              </label>
                            ))}
                          </div>
                        </div>

                        <div className="border border-gray-200 rounded-xl overflow-hidden">
                          <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-200">
                            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Chi tiết đăng ký</span>
                          </div>
                          <div className="p-4">
                            {selectedRegistrationIds.length > 0 ? (
                              <div className="space-y-3">
                                {selectedRegistrationIds.map((regId) => {
                                  const reg = availableRegistrations.find((r: any) => r.id === regId);
                                  if (!reg) return null;
                                  return (
                                    <div key={regId} className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                                      <div className="text-sm font-bold text-gray-800 leading-snug">{reg.project_title}</div>
                                      <div className="text-xs text-gray-500 mt-1">
                                        {reg.student_name} ({reg.student_id})
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <div className="flex flex-col items-center justify-center py-10 text-gray-300">
                                <i className="fa-regular fa-hand-pointer text-3xl mb-3"></i>
                                <p className="text-xs font-medium">Chọn đăng ký bên trái để xem chi tiết</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <Pagination {...regPagination.paginationProps} />
                    </>
                  )}
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                  <Button variant="outline" size="sm" onClick={resetForm}>Hủy</Button>
                  <Button variant="primary" size="sm" icon="fa-solid fa-check" onClick={handleCreate} loading={submitting} disabled={submitting}>Tạo đợt phản biện</Button>
                </div>
              </div>
            </SectionCard>
          ) : !selectedSession ? (
            <EmptyDetailState
              icon="fa-regular fa-hand-pointer"
              mainText="Chọn một đợt phản biện từ danh sách bên trái"
              subText='hoặc bấm "Tạo đợt phản biện" để tạo mới'
            />
          ) : (
            <div className="space-y-6">
              <DetailHeader
                title={`Phản biện - ${detailSession?.reviewer_name || ''}`}
                badges={[
                  { label: `${detailSession?.assignments?.length || 0} đề tài`, variant: 'neutral' },
                ]}
                actions={
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      icon="fa-solid fa-pen"
                      onClick={() => {
                        setEditForm({
                          defense_date: detailSession?.defense_date ? detailSession.defense_date.slice(0, 16) : '',
                          location: detailSession?.location || '',
                        });
                        setIsEditing(true);
                      }}
                    >
                      Sửa
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      icon="fa-solid fa-trash"
                      onClick={() => setConfirmDelete({ open: true, id: detailSession?.id ?? null })}
                    >
                      Xoá đợt phản biện
                    </Button>
                  </div>
                }
              />

              <SectionCard title="Thông tin đợt phản biện" icon="fa-solid fa-circle-info">
                {isEditing ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Input
                        label="Ngày giờ bảo vệ"
                        required
                        type="datetime-local"
                        value={editForm.defense_date}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => setEditForm((f) => ({ ...f, defense_date: e.target.value }))}
                      />
                      <Input
                        label="Phòng"
                        placeholder="VD: Phòng 301 - Nhà A"
                        value={editForm.location}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => setEditForm((f) => ({ ...f, location: e.target.value }))}
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => setIsEditing(false)}>Hủy</Button>
                      <Button
                        variant="primary"
                        size="sm"
                        icon="fa-solid fa-check"
                        loading={patching}
                        disabled={patching}
                        onClick={() => {
                          if (detailSession?.id) {
                            const toLocalISOString = (dtLocal: string) => {
                              const d = new Date(dtLocal);
                              const offset = -d.getTimezoneOffset();
                              const sign = offset >= 0 ? '+' : '-';
                              const h = String(Math.floor(Math.abs(offset) / 60)).padStart(2, '0');
                              const m = String(Math.abs(offset) % 60).padStart(2, '0');
                              return dtLocal + ':00' + sign + h + ':' + m;
                            };
                            handlePatch(detailSession.id, { ...editForm, defense_date: toLocalISOString(editForm.defense_date) });
                          }
                        }}
                      >
                        Lưu
                      </Button>
                    </div>
                  </div>
                ) : (
                  <InfoTileGrid items={[
                    { icon: 'fa-solid fa-chalkboard-user', label: 'Giảng viên phản biện', value: detailSession?.reviewer_name },
                    { icon: 'fa-regular fa-calendar', label: 'Ngày giờ bảo vệ', value: detailSession?.defense_date ? formatDate(detailSession.defense_date) : '' },
                    { icon: 'fa-solid fa-location-dot', label: 'Phòng', value: detailSession?.location || 'Chưa có' },
                  ]} />
                )}
              </SectionCard>

              <SectionCard title="Danh sách đề tài được giao" icon="fa-solid fa-file-lines">
                <GenericTable
                  rows={detailSession?.assignments || []}
                  columns={assignmentColumns}
                  rowKey={(row) => String(row.registration_id)}
                  emptyText="Chưa có đề tài nào được giao"
                />
              </SectionCard>
            </div>
          )
        }
      />

      <ConfirmModal
        open={confirmDelete.open}
        onCancel={() => setConfirmDelete({ open: false, id: null })}
        onConfirm={handleDelete}
        title="Xoá đợt phản biện"
        description="Bạn có chắc chắn muốn xoá đợt phản biện này? Tất cả phân công liên quan sẽ bị xoá."
        confirmLabel="Xoá"
        confirmVariant="danger"
        loading={deletingLoading}
      />
    </div>
  );
}
