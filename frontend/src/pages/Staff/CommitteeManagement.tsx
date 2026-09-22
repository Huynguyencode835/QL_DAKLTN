import { useState, useEffect, type ChangeEvent } from 'react';
import { usePageHeader, useToast, useSearch, usePagination } from '../../hooks';
import { SectionCard } from '../../components/Ui/Card';
import Button from '../../components/Ui/Button';
import Badge from '../../components/Ui/Badge';
import Input from '../../components/Ui/Input';
import Select from '../../components/Ui/Select';
import FilterBar from '../../components/FilterBar';
import GenericTable, { TableColumn } from '../../components/GenericTable';
import Pagination from '../../components/Ui/Pagination';
import {
  TwoPanelLayout,
  SidebarCardList,
  EmptyDetailState,
  DetailHeader,
  InfoTileGrid,
} from '../../components/ManagementLayout';
import { COMMITTEE_STATUS_CONFIG, COMMITTEE_ROLE_CONFIG } from '../../types';
import type { MyCommittee, CommitteeMemberInfo, CommitteeMemberRole, CommitteeStatus, RegistrationPeriod, CommitteeDetail } from '../../types';
import { fetchWithAuth, createWithAuth, deleteWithAuth } from '../../utils/ApiHelper';
import { endpoints } from '../../config/Apis';

interface CommitteeFormData {
  name: string;
  location: string;
  defense_date: string;
  status: CommitteeStatus;
}

interface MemberFormRow {
  lecturer: string;
  role: CommitteeMemberRole;
}

const EMPTY_FORM: CommitteeFormData = {
  name: '',
  location: '',
  defense_date: '',
  status: 'not_started',
};

const STATUS_OPTIONS = [
  { value: 'not_started', label: 'Chưa diễn ra' },
  { value: 'in_progress', label: 'Đang diễn ra' },
  { value: 'completed', label: 'Kết thúc' },
];

const MEMBER_ROLE_OPTIONS = [
  { value: 'chair', label: 'Chủ tịch hội đồng' },
  { value: 'secretary', label: 'Thư ký' },
  { value: 'member', label: 'Ủy viên' },
  { value: 'reviewer', label: 'Ủy viên phản biện' },
];

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
    + ' ' + d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

export default function CommitteeManagement() {
  const toast = useToast();
  const { search, setSearch, searchParams } = useSearch();
  const [committees, setCommittees] = useState<MyCommittee[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [form, setForm] = useState<CommitteeFormData>(EMPTY_FORM);
  const [members, setMembers] = useState<MemberFormRow[]>([{ lecturer: '', role: 'member' }]);
  const [selectedRegistrationIds, setSelectedRegistrationIds] = useState<number[]>([]);
  const [periods, setPeriods] = useState<RegistrationPeriod[]>([]);
  const [periodsLoading, setPeriodsLoading] = useState(true);
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>('current-project');
  const [lecturers, setLecturers] = useState<{ id: number; full_name: string }[]>([]);
  const [lecturersLoading, setLecturersLoading] = useState(false);
  const [availableRegistrations, setAvailableRegistrations] = useState<any[]>([]);
  const [registrationsLoading, setRegistrationsLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [detailCommittee, setDetailCommittee] = useState<CommitteeDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const regPagination = usePagination({ pageSize: 8 });

  usePageHeader({
    title: 'Quản lý Hội đồng',
    description: 'Tạo và quản lý các hội đồng phản biện, bảo vệ đồ án.',
  });

  useEffect(() => {
    loadPeriods();
    loadLecturers();
  }, []);

  useEffect(() => {
    loadCommittees();
  }, [selectedPeriodId, searchParams, statusFilter]);

  useEffect(() => {
    if (selectedId !== null) loadDetailCommittee(selectedId);
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
      {},
      setPeriodsLoading,
    );
  };

  const loadCommittees = async () => {
    if (!selectedPeriodId) return;
    setLoading(true);
    await fetchWithAuth(
      endpoints.committees(selectedPeriodId),
      (data: any) => {
        const raw = Array.isArray(data) ? data : data?.results ?? [];
        setCommittees(raw);
      },
      () => {},
      { search: searchParams.search || undefined, status: statusFilter || undefined },
      setLoading
    );
  };

  const loadDetailCommittee = async (id: number) => {
    await fetchWithAuth(
      endpoints.committeeDetail(selectedPeriodId, id),
      (data: CommitteeDetail) => setDetailCommittee(data),
      () => {},
      {},
      setDetailLoading,
    );
  };

  const loadLecturers = async () => {
    await fetchWithAuth(
      endpoints.lecturers,
      (data: any) => {
        const raw = Array.isArray(data) ? data : data?.results ?? [];
        setLecturers(raw);
      },
      () => {},
      {},
      setLecturersLoading,
    );
  };

  const loadAvailableRegistrations = async (periodId: string, page: number) => {
    await fetchWithAuth(
      endpoints.registrations(periodId),
      (data: any, paginatedData?: { count: number }) => {
        const raw = Array.isArray(data) ? data : data?.results ?? [];
        regPagination.handlePaginatedResponse(raw, paginatedData);
        setAvailableRegistrations(raw);
      },
      () => {},
      { page, has_final_report: 'true', no_committee: 'true' },
      setRegistrationsLoading,
    );
  };

  const selectedCommittee = committees.find((c) => c.id === selectedId) || null;

  const updateForm = (field: keyof CommitteeFormData) => (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const addMemberRow = () => setMembers((prev) => [...prev, { lecturer: '', role: 'member' }]);
  const removeMemberRow = (index: number) => setMembers((prev) => prev.filter((_, i) => i !== index));
  const updateMember = (index: number, field: keyof MemberFormRow, value: string) =>
    setMembers((prev) => prev.map((m, i) => i === index ? { ...m, [field]: value as CommitteeMemberRole } : m));

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setMembers([{ lecturer: '', role: 'member' }]);
    setSelectedRegistrationIds([]);
    setIsCreating(false);
    regPagination.resetPage();
  };

  const toggleRegistration = (id: number) => {
    setSelectedRegistrationIds((prev) => prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]);
  };

  const handleCreate = async () => {
    if (!form.name || !form.location || !form.defense_date) {
      toast.error('Lỗi', 'Vui lòng điền đầy đủ thông tin bắt buộc.');
      return;
    }
    const validMembers = members.filter((m) => m.lecturer);
    if (validMembers.length === 0) {
      toast.error('Lỗi', 'Phải có ít nhất 1 thành viên hội đồng.');
      return;
    }
    if (!validMembers.some((m) => m.role === 'chair')) {
      toast.error('Lỗi', 'Hội đồng phải có đúng 1 chủ tịch.');
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
      name: form.name, location: form.location, defense_date: toLocalISOString(form.defense_date), status: form.status,
      members: validMembers.map((m) => ({ lecturer: Number(m.lecturer), role: m.role })),
      registrations: selectedRegistrationIds,
    };
    await createWithAuth(
      endpoints.committees(selectedPeriodId),
      body,
      (data: MyCommittee) => {
        setCommittees((prev) => [data, ...prev]);
        setSelectedId(data.id);
        setIsCreating(false);
        resetForm();
        toast.success('Tạo hội đồng thành công', `Hội đồng "${data.name}" đã được tạo.`);
      },
      (_type: string, msg: string) => toast.error('Lỗi', msg || 'Không thể tạo hội đồng.'),
      setSubmitting,
    );
  };

  const handleDelete = async (id: number) => {
    const c = committees.find((x) => x.id === id);
    await deleteWithAuth(
      endpoints.committeeDetail(selectedPeriodId, id),
      () => {
        setCommittees((prev) => prev.filter((x) => x.id !== id));
        if (selectedId === id) { setSelectedId(null); setDetailCommittee(null); }
        toast.success('Đã xoá hội đồng', `Hội đồng "${c?.name}" đã bị xoá.`);
      },
      (_type: string, msg: string) => toast.error('Lỗi', msg || 'Không thể xoá hội đồng.'),
      setDeleting,
    );
  };

  const memberColumns: TableColumn<CommitteeMemberInfo>[] = [
    { key: 'stt', label: 'STT', align: 'center', render: (row) => <span className="text-gray-500">{(detailCommittee?.members_detail || []).findIndex((m) => m.id === row.id) + 1}</span> },
    { key: 'lecturer_name', label: 'Họ tên', render: (row) => <span className="font-medium text-gray-800">{row.lecturer_name}</span> },
    { key: 'role', label: 'Vai trò', render: (row) => { const cfg = COMMITTEE_ROLE_CONFIG[row.role]; return <Badge variant={cfg?.variant || 'neutral'}>{cfg?.label || row.role}</Badge>; } },
  ];

  const regColumns: TableColumn<{ id: number; project_title: string; student_name: string; student_id: string }>[] = [
    { key: 'stt', label: 'STT', align: 'center', render: (row) => <span className="text-gray-500">{(detailCommittee?.registrations_detail || []).findIndex((r) => r.id === row.id) + 1}</span> },
    { key: 'project_title', label: 'Đề tài', render: (row) => <span className="font-medium text-gray-800 line-clamp-1">{row.project_title}</span> },
    { key: 'student_name', label: 'Sinh viên', render: (row) => <div><div className="text-sm text-gray-800">{row.student_name}</div><div className="text-xs text-gray-400">{row.student_id}</div></div> },
  ];

  return (
    <div className="space-y-6">
      <FilterBar
        searchValue={search} onSearchChange={setSearch} searchPlaceholder="Tìm kiếm tên hội đồng, phòng..."
        dropdowns={[
          { key: 'period', value: selectedPeriodId, onChange: setSelectedPeriodId, placeholder: periodsLoading ? 'Đang tải...' : 'Chọn đợt đăng ký', loading: periodsLoading, widthClassName: 'w-full sm:w-64', options: [{ value: 'current-project', label: 'Đợt đồ án hiện tại' }, { value: 'current-thesis', label: 'Đợt khóa luận hiện tại' }, ...periods.map((p) => ({ value: String(p.id), label: `${p.name} (${p.academic_year})` }))] },
          { key: 'status', value: statusFilter, onChange: (v) => setStatusFilter(v === 'all' ? '' : v), placeholder: 'Tất cả trạng thái', widthClassName: 'w-full sm:w-52', options: [{ value: 'all', label: 'Tất cả' }, ...STATUS_OPTIONS] },
        ]}
        onRefresh={loadCommittees} refreshLoading={loading}
        actions={<Button variant="primary" icon="fa-solid fa-plus" onClick={() => { setIsCreating(true); setSelectedId(null); regPagination.resetPage(); }}>Tạo hội đồng</Button>}
      />

      <TwoPanelLayout
        leftContent={
          <SidebarCardList
            title="Hội đồng" count={committees.length} items={committees}
            selectedId={isCreating ? null : selectedId}
            onSelect={(id) => { setSelectedId(id); setIsCreating(false); }}
            emptyText="Không có hội đồng nào" icon="fa-solid fa-people-group"
            renderItem={(item, _isSelected) => {
              const c = item as MyCommittee;
              const cfg = COMMITTEE_STATUS_CONFIG[c.status];
              return (
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-gray-800 line-clamp-2 leading-snug">{c.name}</div>
                    <div className="text-xs text-gray-400 mt-1.5 flex items-center gap-1"><i className="fa-regular fa-calendar"></i>{formatDate(c.defense_date)}</div>
                    <div className="text-xs text-gray-400 mt-0.5 flex items-center gap-1"><i className="fa-solid fa-location-dot"></i>{c.location}</div>
                  </div>
                  <Badge variant={cfg?.variant || 'neutral'} className="shrink-0 text-[10px]">{cfg?.label}</Badge>
                </div>
              );
            }}
          />
        }
        rightContent={
          isCreating ? (
            <SectionCard title="Tạo hội đồng mới" icon="fa-solid fa-plus-circle">
              <div className="max-h-[calc(100vh-280px)] overflow-y-auto pr-1 space-y-5">
                <Input label="Tên hội đồng" required placeholder="VD: Hội đồng phản biện Đợt 1 - Nhóm A" value={form.name} onChange={updateForm('name')} />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input label="Phòng" required placeholder="VD: Phòng 201 - Nhà A" value={form.location} onChange={updateForm('location')} />
                  <Input label="Ngày giờ bảo vệ" required type="datetime-local" value={form.defense_date} onChange={updateForm('defense_date')} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex items-center gap-2 py-2">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0"><i className="fa-regular fa-calendar text-primary text-sm"></i></div>
                    <div><div className="text-[11px] text-gray-400 font-medium uppercase">Đợt đăng ký</div><div className="text-sm font-semibold text-gray-800">{periods.find((p) => String(p.id) === selectedPeriodId)?.name || 'Đợt hiện tại'}</div></div>
                  </div>
                  <Select label="Trạng thái" value={form.status} onChange={updateForm('status')} options={STATUS_OPTIONS} />
                </div>
                <div className="border-t border-gray-100 pt-5">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-gray-800 text-sm flex items-center gap-2"><i className="fa-solid fa-user-group text-primary"></i>Thành viên hội đồng</h4>
                    <Button variant="outline" size="sm" icon="fa-solid fa-plus" onClick={addMemberRow}>Thêm thành viên</Button>
                  </div>
                  <div className="space-y-3">
                    {members.map((m, idx) => (
                      <div key={idx} className="flex items-end gap-3">
                        <div className="flex-1"><Select placeholder={lecturersLoading ? 'Đang tải...' : 'Chọn giảng viên'} value={m.lecturer} onChange={(e: ChangeEvent<HTMLSelectElement>) => updateMember(idx, 'lecturer', e.target.value)} options={lecturers.map((l) => ({ value: String(l.id), label: l.full_name }))} /></div>
                        <div className="flex-1"><Select placeholder="Chọn vai trò" value={m.role} onChange={(e: ChangeEvent<HTMLSelectElement>) => updateMember(idx, 'role', e.target.value)} options={MEMBER_ROLE_OPTIONS} /></div>
                        {members.length > 1 && <Button variant="ghost" size="icon" icon="fa-solid fa-trash" className="!text-red-400 hover:!text-red-600 shrink-0" onClick={() => removeMemberRow(idx)} />}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="border-t border-gray-100 pt-5">
                  <h4 className="font-semibold text-gray-800 text-sm flex items-center gap-2 mb-3"><i className="fa-solid fa-file-lines text-primary"></i>Danh sách đăng ký</h4>
                  {registrationsLoading ? <p className="text-sm text-gray-400 text-center py-4">Đang tải...</p> : availableRegistrations.length === 0 ? <p className="text-sm text-gray-400 text-center py-4">Không có đăng ký nào</p> : (
                    <>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div className="border border-gray-200 rounded-xl overflow-hidden">
                          <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-200"><span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Chọn đăng ký ({selectedRegistrationIds.length} đã chọn)</span></div>
                          <div className="max-h-[280px] overflow-y-auto divide-y divide-gray-100">
                            {availableRegistrations.map((r: any) => (
                              <label key={r.id} className={`flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors ${selectedRegistrationIds.includes(r.id) ? 'bg-primary/5' : 'hover:bg-gray-50'}`}>
                                <input type="checkbox" checked={selectedRegistrationIds.includes(r.id)} onChange={() => toggleRegistration(r.id)} className="mt-0.5 w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary/30" />
                                <div className="min-w-0 flex-1"><div className="text-sm font-medium text-gray-800 line-clamp-2 leading-snug">{r.project_title}</div><div className="text-xs text-gray-400 mt-1">{r.student_name} - {r.student_id}</div></div>
                              </label>
                            ))}
                          </div>
                        </div>
                        <div className="border border-gray-200 rounded-xl overflow-hidden">
                          <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-200"><span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Chi tiết đăng ký</span></div>
                          <div className="p-4">
                            {selectedRegistrationIds.length > 0 ? <div className="space-y-3">{selectedRegistrationIds.map((regId) => { const reg = availableRegistrations.find((r: any) => r.id === regId); if (!reg) return null; return (<div key={regId} className="p-3 bg-gray-50 rounded-lg border border-gray-100"><div className="text-sm font-bold text-gray-800 leading-snug">{reg.project_title}</div><div className="text-xs text-gray-500 mt-1">{reg.student_name} ({reg.student_id})</div>{reg.lecturer_name && <div className="text-xs text-gray-400 mt-0.5">GVHD: {reg.lecturer_name}</div>}</div>); })}</div> : <div className="flex flex-col items-center justify-center py-10 text-gray-300"><i className="fa-regular fa-hand-pointer text-3xl mb-3"></i><p className="text-xs font-medium">Chọn đăng ký bên trái</p></div>}
                          </div>
                        </div>
                      </div>
                      <Pagination {...regPagination.paginationProps} />
                    </>
                  )}
                </div>
                <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                  <Button variant="outline" size="sm" onClick={resetForm}>Hủy</Button>
                  <Button variant="primary" size="sm" icon="fa-solid fa-check" onClick={handleCreate} loading={submitting} disabled={submitting}>Tạo hội đồng</Button>
                </div>
              </div>
            </SectionCard>
          ) : !selectedCommittee ? (
            <EmptyDetailState mainText="Chọn một hội đồng từ danh sách bên trái" subText='hoặc bấm "Tạo hội đồng" để tạo mới' />
          ) : detailLoading && !detailCommittee ? (
            <div className="flex items-center justify-center py-20">
              <i className="fa-solid fa-circle-notch animate-spin text-primary text-2xl"></i>
            </div>
          ) : (
            <div className="space-y-6">
              <DetailHeader
                title={detailCommittee?.name || ''}
                badges={[
                  { label: COMMITTEE_STATUS_CONFIG[detailCommittee?.status || 'not_started']?.label || '', variant: COMMITTEE_STATUS_CONFIG[detailCommittee?.status || 'not_started']?.variant || 'neutral', dot: true },
                  { label: `${detailCommittee?.registrations_detail?.length || 0} đề tài`, variant: 'neutral' },
                  { label: `${detailCommittee?.members_detail?.length || 0} thành viên`, variant: 'neutral' },
                ]}
                actions={<Button variant="danger" size="sm" icon="fa-solid fa-trash" onClick={() => detailCommittee && handleDelete(detailCommittee.id)} loading={deleting} disabled={deleting}>Xoá hội đồng</Button>}
              />
              <SectionCard title="Thông tin hội đồng" icon="fa-solid fa-circle-info">
                <InfoTileGrid items={[
                  { icon: 'fa-solid fa-location-dot', label: 'Phòng', value: detailCommittee?.location },
                  { icon: 'fa-regular fa-calendar', label: 'Ngày giờ bảo vệ', value: detailCommittee?.defense_date ? formatDate(detailCommittee.defense_date) : '' },
                ]} />
              </SectionCard>
              <SectionCard title="Thành viên hội đồng" icon="fa-solid fa-user-group">
                <GenericTable rows={detailCommittee?.members_detail || []} columns={memberColumns} rowKey={(row) => row.id} emptyText="Chưa có thành viên" loading={detailLoading} />
              </SectionCard>
              <SectionCard title="Danh sách đề tài được giao" icon="fa-solid fa-file-lines">
                <GenericTable rows={detailCommittee?.registrations_detail || []} columns={regColumns} rowKey={(row) => row.id} emptyText="Chưa có đề tài nào được giao" loading={detailLoading} />
              </SectionCard>
            </div>
          )
        }
      />
    </div>
  );
}
