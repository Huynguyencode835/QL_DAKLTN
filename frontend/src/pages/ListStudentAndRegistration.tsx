import { type ChangeEvent, useEffect, useMemo, useState } from 'react';
import { useModal, useUser, usePageHeader, useToast, usePagination, useSearch } from '../hooks';
import { fetchWithAuth, createWithAuth, updatePatchWithAuth } from '../utils/ApiHelper';
import { endpoints } from '../config/Apis';
import Card, { SectionCard } from '../components/Ui/Card';
import Button from '../components/Ui/Button';
import Badge from '../components/Ui/Badge';
import Select from '../components/Ui/Select';
import Modal from '../components/Ui/Modal';
import { STATUS_CONFIG } from '../types';
import type { Registration, Lecturer, RegistrationPeriod, Specialization } from '../types';
import FilterBar from '../components/FilterBar';
import GenericTable, { TableColumn } from '../components/GenericTable';
import Pagination from '../components/Ui/Pagination';

function effectiveStatusKey(reg: Registration): string {
  if (reg.status === 'waiting_lecturer') return 'waiting_lecturer';
  if (reg.status === 'waiting_staff_assignment') return 'waiting_staff_assignment';
  const main = reg.lecturer_assignments?.find((a) => a.role === 'main');
  if (!main) return 'assigned_lecturer';
  if (main.approval_status === 'approved') return 'approved';
  return 'assigned_lecturer';
}

function RegInfo({ icon, label, value }: { icon: string; label: string; value: any }) {
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

export default function ListStudentsAndRegistration() {
  const { openModal, closeModal } = useModal();
  const { user } = useUser();
  const toast = useToast();
  const [registrationPeriods, setRegistrationPeriods] = useState<RegistrationPeriod[]>([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>('current-project');
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [lecturers, setLecturers] = useState<Lecturer[]>([]);
  const [specialization, setSpecialization] = useState<Specialization[]>([]);
  const [loading, setLoading] = useState(true);
  const [periodsLoading, setPeriodsLoading] = useState(true);
  const [assignLoading, setAssignLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const { search, setSearch, searchParams } = useSearch();
  const [statusFilter, setStatusFilter] = useState('');
  const [assigningReg, setAssigningReg] = useState<Registration | null>(null);
  const [selectedLecturer, setSelectedLecturer] = useState('');
  const [selectedSpecializaion, setSelectedSpecializaion] = useState('');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const { resetPage, paginationParams, handlePaginatedResponse, paginationProps } = usePagination();
  const isStaff = user?.role === 'staff';

  const selectedPeriod = useMemo(() => {
    if (!selectedPeriodId) return null;
    if (selectedPeriodId === 'current-project') {
      return registrationPeriods.find(p => p.period_type === 'project' && p.status === 'student_registration') || null;
    }
    if (selectedPeriodId === 'current-thesis') {
      return registrationPeriods.find(p => p.period_type === 'thesis' && p.status === 'student_registration') || null;
    }
    return registrationPeriods.find(p => String(p.id) === selectedPeriodId) || null;
  }, [selectedPeriodId, registrationPeriods]);

  const isStudentRegistration = selectedPeriod?.status === 'student_registration';
  const [periodTypeFilter, setPeriodTypeFilter] = useState('');
  const [activeTab, setActiveTab] = useState<'registrations' | 'thesis_upgrade'>('registrations');
  const [thesisPeriods, setThesisPeriods] = useState<RegistrationPeriod[]>([]);
  const [selectedThesisPeriodId, setSelectedThesisPeriodId] = useState<string>('');
  const [thesisRegistrations, setThesisRegistrations] = useState<Registration[]>([]);
  const [selectedThesisIds, setSelectedThesisIds] = useState<number[]>([]);
  const [convertLoading, setConvertLoading] = useState(false);
  const [bulkAssignLoading, setBulkAssignLoading] = useState(false);

  usePageHeader({
    title: 'Danh sách Sinh viên & Đăng ký',
    description: 'Quản lý danh sách sinh viên đã đăng ký đề tài và trạng thái xét duyệt.',
  });

  useEffect(() => {
    loadPeriods();
    if (isStaff) {
      fetchWithAuth(endpoints.lecturers, setLecturers, () => { }, {}, () => { });
      loadSpecializaion();
    }
  }, []);

  useEffect(() => {
    loadPeriods();
    setSelectedPeriodId(periodTypeFilter === 'thesis' ? 'current-thesis' : 'current-project');
  }, [periodTypeFilter]);

  useEffect(() => {
    const thesis = registrationPeriods.filter(p => p.period_type === 'thesis');
    setThesisPeriods(thesis);
  }, [registrationPeriods]);

  useEffect(() => {
    resetPage();
    setSelectedIds([]);
  }, [statusFilter, selectedPeriodId, searchParams]);

  useEffect(() => {
    setSelectedIds([]);
    if (selectedPeriodId) loadRegistrations();
  }, [selectedPeriodId, paginationParams.page, searchParams, statusFilter]);

  useEffect(() => {
    if (activeTab === 'thesis_upgrade' && selectedThesisPeriodId) {
      const thesisPeriod = thesisPeriods.find(p => String(p.id) === selectedThesisPeriodId);
      if (thesisPeriod?.parent_period) {
        loadThesisRegistrations(String(thesisPeriod.parent_period));
      }
    }
  }, [activeTab, selectedThesisPeriodId, paginationParams.page]);

  const loadPeriods = async () => {
    setPeriodsLoading(true);
    await fetchWithAuth(
      endpoints.registrationPeriods,
      (data: RegistrationPeriod[]) => setRegistrationPeriods(data),
      () => { },
      { period_type: periodTypeFilter || undefined },
      () => setPeriodsLoading(false)
    );
  };

  const loadSpecializaion = async () => {
    await fetchWithAuth(endpoints.specialization, (data: Specialization[]) => setSpecialization(data), () => { }, {}, () => { });
  };

  const loadRegistrations = async () => {
    if (!selectedPeriodId) return;
    setLoading(true);
    await fetchWithAuth(
      endpoints.registrations(selectedPeriodId),
      (data: Registration[], paginatedData?: { count: number }) => {
        setRegistrations(handlePaginatedResponse(data, paginatedData));
      },
      () => { },
      { ...paginationParams, ...searchParams, status: statusFilter || undefined },
      () => setLoading(false)
    );
  };

  const loadDetail = async (id: number, onSuccess: (data: Registration) => void) => {
    await fetchWithAuth(endpoints.registrationDetail(selectedPeriodId, id), onSuccess, (type: string, msg: string) => {
      toast.error(type === 'network' ? 'Lỗi mạng' : type === 'server' ? 'Lỗi máy chủ' : 'Lỗi', msg);
    }, {}, setDetailLoading);
  };

  const loadThesisRegistrations = async (parentPeriodId: string) => {
    setLoading(true);
    await fetchWithAuth(
      endpoints.registrationsThesis(parentPeriodId),
      (data: Registration[], paginatedData?: { count: number }) => {
        setThesisRegistrations(handlePaginatedResponse(data, paginatedData));
      },
      (type: string, msg: string) => {
        toast.error(type === 'network' ? 'Lỗi mạng' : type === 'server' ? 'Lỗi máy chủ' : 'Lỗi', msg);
      },
      paginationParams,
      () => setLoading(false)
    );
  };

  const handleConvertToThesis = async () => {
    if (selectedThesisIds.length === 0 || !selectedThesisPeriodId) return;
    setConvertLoading(true);
    await createWithAuth(
      endpoints.convertToThesis(selectedThesisPeriodId),
      { registration_ids: selectedThesisIds },
      (data: Registration[]) => {
        toast.success('Chuyển thành công', `Đã chuyển ${data.length} đăng ký sang khóa luận.`);
        setSelectedThesisIds([]);
        const thesisPeriod = thesisPeriods.find(p => String(p.id) === selectedThesisPeriodId);
        if (thesisPeriod?.parent_period) {
          loadThesisRegistrations(String(thesisPeriod.parent_period));
        }
      },
      (type: string, msg: string) => {
        toast.error(type === 'network' ? 'Lỗi mạng' : type === 'server' ? 'Lỗi máy chủ' : 'Lỗi', msg);
      },
      () => setConvertLoading(false)
    );
  };

  const handleApprove = async (id: number) => {
    setApproving(true);
    await updatePatchWithAuth(endpoints.approveRegistration(selectedPeriodId, id), {}, () => {
      loadRegistrations();
      toast.success('Đã duyệt đăng ký', 'Đăng ký của sinh viên đã được duyệt.');
      closeModal();
    }, (type: string, msg: string) => {
      toast.error(type === 'network' ? 'Lỗi mạng' : type === 'server' ? 'Lỗi máy chủ' : 'Lỗi', msg);
    }, () => setApproving(false));
  };

  const handleReject = async (id: number) => {
    setRejecting(true);
    await updatePatchWithAuth(endpoints.rejectRegistration(selectedPeriodId, id), {}, () => {
      loadRegistrations();
      toast.success('Đã từ chối đăng ký', 'Đăng ký của sinh viên đã bị từ chối.');
      closeModal();
    }, (type: string, msg: string) => {
      toast.error(type === 'network' ? 'Lỗi mạng' : type === 'server' ? 'Lỗi máy chủ' : 'Lỗi', msg);
    }, () => setRejecting(false));
  };

  const addLecturer = async (id: number, onSuccess?: () => void) => {
    await updatePatchWithAuth(
      endpoints.addLecturer(selectedPeriodId, id),
      { lecturer_id: Number(selectedLecturer) },
      () => {
        loadRegistrations();
        setAssigningReg(null);
        setSelectedLecturer('');
        onSuccess?.();
      },
      (type: string, msg: string) => {
        toast.error(type === 'network' ? 'Lỗi mạng' : type === 'server' ? 'Lỗi máy chủ' : 'Lỗi', msg);
      }
    );
  };

  const handleAssign = async () => {
    if (!assigningReg || !selectedLecturer) return;
    setAssignLoading(true);
    const lecturer = lecturers.find((l) => String(l.id) === selectedLecturer);
    await addLecturer(assigningReg.id, () => {
      toast.success('Phân giảng viên thành công', `Đã phân giảng viên ${lecturer?.full_name || ''} cho sinh viên.`);
    });
    setAssignLoading(false);
  };

  const openDetailModal = (reg: Registration) => {
    setDetailLoading(true);
    loadDetail(reg.id, (data) => {
      const si = data.student_info || {};
      const li = data.lecturer_info || [];
      const status = STATUS_CONFIG[effectiveStatusKey(data)] || STATUS_CONFIG.waiting_lecturer;
      const hasPendingApproval = li.some(
        (l) => l.lecturer_id === user?.id && l.role === 'preference' && l.approval_status === 'pending'
      );
      const ROLE_CONFIG: Record<string, { label: string; box: string; title: string }> = {
        main: { label: 'Giảng viên hướng dẫn', box: '!bg-blue-50/60 !border-blue-100', title: 'text-blue-600' },
        preference: { label: 'Nguyện vọng', box: '!bg-amber-50/60 !border-amber-100', title: 'text-amber-600' },
        reviewer: { label: 'Phản biện', box: '!bg-gray-50 !border-gray-100', title: 'text-gray-500' },
      };

      openModal({
        title: `Chi tiết đăng ký`,
        description: data.project_title || '—',
        icon: 'fa-regular fa-file-lines',
        size: 'lg',
        content: (
          <div className="space-y-5">
            <Card variant="soft" className="!bg-primary/5 !border-primary/10 !p-4" bodyClassName="!p-0 flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
                {si.avatar ? (
                  <img src={si.avatar} alt="" className="w-full h-full object-cover" />
                ) : (
                  <i className="fa-solid fa-user-graduate text-primary text-lg"></i>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">Thông tin sinh viên</p>
                <p className="text-sm font-semibold text-gray-800 truncate">{si.full_name || '—'}</p>
              </div>
            </Card>

            <SectionCard title="Thông tin sinh viên" icon="fa-solid fa-user-graduate">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <RegInfo icon="fa-solid fa-hashtag" label="MSSV" value={si.student_id} />
                <RegInfo icon="fa-regular fa-envelope" label="Email" value={si.email} />
                <RegInfo icon="fa-solid fa-school" label="Lớp" value={si.class_name} />
                <RegInfo icon="fa-solid fa-building-columns" label="Khoa" value={si.faculty} />
                <RegInfo icon="fa-solid fa-layer-group" label="Chuyên ngành" value={si.major} />
              </div>
            </SectionCard>

            <SectionCard title="Thông tin đăng ký" icon="fa-solid fa-file-circle-check">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <RegInfo icon="fa-solid fa-file-signature" label="Đề tài" value={data.project_title} />
                </div>
                <RegInfo
                  icon="fa-solid fa-book-open"
                  label="Loại"
                  value={data.is_thesis ? 'Khóa luận tốt nghiệp' : data.wants_thesis_upgrade ? 'Đồ án phát triển khóa luận' : 'Đồ án'}
                />
                <Card variant="soft" className="!p-3" bodyClassName="!p-0 flex items-center justify-between gap-3">
                  <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">Trạng thái</p>
                  <Badge variant={status.variant} dot>{status.label}</Badge>
                </Card>
              </div>
              {data.project_description && (
                <Card variant="soft" className="!p-3.5" bodyClassName="!p-0 space-y-1">
                  <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">Mô tả</p>
                  <p className="text-sm text-gray-700 leading-relaxed">{data.project_description}</p>
                </Card>
              )}
            </SectionCard>

            {li.length > 0 && (
              <SectionCard title="Giảng viên hướng dẫn" icon="fa-solid fa-chalkboard-user">
                <div className="space-y-2">
                  {li.map((l) => {
                    const cfg = ROLE_CONFIG[l.role] || ROLE_CONFIG.reviewer;
                    return (
                      <Card key={l.id || l.lecturer_id} variant="soft" className={`!p-3.5 ${cfg.box}`} bodyClassName="!p-0 space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className={`text-[11px] font-semibold uppercase tracking-wide ${cfg.title}`}>{cfg.label}</span>
                          <Badge variant={STATUS_CONFIG[l.approval_status]?.variant || 'warning'}>
                            {STATUS_CONFIG[l.approval_status]?.label || l.approval_status}
                          </Badge>
                        </div>
                        <p className="text-sm font-medium text-gray-800">{l.full_name}</p>
                        {l.note && (
                          <p className="text-xs text-gray-500 italic">"{l.note}"</p>
                        )}
                      </Card>
                    );
                  })}
                </div>
              </SectionCard>
            )}
          </div>
        ),
        footer: (
          <div className="flex items-center gap-2">
            {hasPendingApproval && isStudentRegistration && (
              <>
                <Button variant="success" size="sm" icon="fa-solid fa-check" onClick={() => handleApprove(reg.id)} loading={approving} disabled={approving}>
                  Duyệt
                </Button>
                <Button variant="danger" size="sm" icon="fa-solid fa-xmark" onClick={() => handleReject(reg.id)} loading={rejecting} disabled={rejecting}>
                  Từ chối
                </Button>
              </>
            )}
            <Button variant="outline" size="sm" onClick={closeModal} disabled={approving || rejecting}>Đóng</Button>
          </div>
        ),
      });
    });
  };

  const allFilteredSelected = registrations.length > 0 && registrations.every((r) => selectedIds.includes(r.id));

  const toggleSelectAll = () => {
    if (allFilteredSelected) {
      setSelectedIds((prev) => prev.filter((id) => !registrations.some((r) => r.id === id)));
    } else {
      setSelectedIds((prev) => [...new Set([...prev, ...registrations.map((r) => r.id)])]);
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  };

  const handleAddLecturers = async () => {
    const ids = [...selectedIds];
    setBulkAssignLoading(true);
    await Promise.all(ids.map((id) => addLecturer(id)));
    loadRegistrations();
    toast.success('Phân giảng viên thành công', `Đã phân giảng viên cho ${ids.length} sinh viên.`);
    setBulkAssignLoading(false);
  };

  const showCheckbox =
    isStaff && ['waiting_lecturer', 'waiting_staff_assignment'].includes(statusFilter) &&
    registrations.some((r) => r.status === statusFilter);

  const columns: TableColumn<Registration>[] = useMemo(() => {
    const cols: TableColumn<Registration>[] = [
      {
        key: 'student_id',
        label: 'MSSV',
        render: (reg) => (
          <Badge variant="primary" className="font-mono">{reg.student?.student_id || reg.student_id || '—'}</Badge>
        ),
      },
      {
        key: 'student_name',
        label: 'Họ tên',
        render: (reg) => (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
              {reg.avatar ? (
                <img src={reg.avatar} alt="" className="w-full h-full object-cover" />
              ) : (
                <i className="fa-solid fa-user text-primary/60 text-xs"></i>
              )}
            </div>
            <span className="font-medium text-gray-800">{reg.student?.full_name || reg.student_name || '—'}</span>
          </div>
        ),
      },
      {
        key: 'project_title',
        label: 'Đề tài',
        render: (reg) => <span className="text-gray-600 line-clamp-1">{reg.project_title || '—'}</span>,
      },
      {
        key: 'wants_thesis_upgrade',
        label: 'Loại',
        render: (reg) => (
          <Badge variant={reg.is_thesis ? 'info' : reg.wants_thesis_upgrade ? 'warning' : 'neutral'} dot>
            {reg.is_thesis ? 'Khóa luận' : reg.wants_thesis_upgrade ? 'Đồ án phát triển khóa luận' : 'Đồ án'}
          </Badge>
        ),
      },
      {
        key: 'status',
        label: 'Trạng thái',
        render: (reg) => {
          const status = STATUS_CONFIG[effectiveStatusKey(reg)] || STATUS_CONFIG.waiting_lecturer;
          return <Badge variant={status.variant} dot>{status.label}</Badge>;
        },
      },
    ];

    if (isStaff) {
      cols.push({
        key: 'lecturer_name',
        label: 'GV hướng dẫn',
        render: (reg) => (
          <Badge variant={reg.lecturer_name ? 'success' : 'neutral'} dot>
            {reg.lecturer_name || 'Đang chờ...'}
          </Badge>
        ),
      });
    }

    cols.push({
      key: 'actions',
      label: 'Thao tác',
      align: 'right',
      render: (reg) => (
        <div className="flex items-center justify-end gap-2">
          {isStaff && !reg.lecturer_assignments?.some((a) => a.role === 'main') &&
            (reg.status === 'waiting_staff_assignment' ||
              (reg.status === 'waiting_lecturer' && !reg.wants_thesis_upgrade)) && (
              <Button
                variant="primary"
                size="sm"
                icon="fa-solid fa-chalkboard-user"
                onClick={() => { setAssigningReg(reg); setSelectedLecturer(''); }}
              >
                Phân GVHD
              </Button>
            )}
          <Button variant="outline" size="sm" icon="fa-regular fa-eye" onClick={() => openDetailModal(reg)}>
            Chi tiết
          </Button>
        </div>
      ),
    });

    return cols;
  }, [isStaff]);

  const thesisColumns: TableColumn<Registration>[] = useMemo(() => [
    {
      key: 'student_id',
      label: 'MSSV',
      render: (reg) => (
        <Badge variant="primary" className="font-mono">{reg.student?.student_id || reg.student_id || '—'}</Badge>
      ),
    },
    {
      key: 'student_name',
      label: 'Họ tên',
      render: (reg) => (
        <span className="font-medium text-gray-800">{reg.student?.full_name || reg.student_name || '—'}</span>
      ),
    },
    {
      key: 'project_title',
      label: 'Đề tài',
      render: (reg) => <span className="text-gray-600 line-clamp-1">{reg.project_title || '—'}</span>,
    },
    {
      key: 'lecturer_name',
      label: 'GV hướng dẫn',
      render: (reg) => <span>{reg.lecturer_name || '—'}</span>,
    },
    {
      key: 'wants_thesis_upgrade',
      label: 'Điều kiện',
      render: () => <Badge variant="info" dot>Đủ điều kiện</Badge>,
    },
  ], []);

  return (
    <div className="space-y-6">
      <div className="mx-auto w-full space-y-6">
        {isStaff && thesisPeriods.length > 0 && (
          <div className="flex gap-2">
            <Button
              variant={activeTab === 'registrations' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('registrations')}
            >
              Danh sách đăng ký
            </Button>
            <Button
              variant={activeTab === 'thesis_upgrade' ? 'primary' : 'outline'}
              size="sm"
              icon="fa-solid fa-arrow-up-right-dots"
              onClick={() => setActiveTab('thesis_upgrade')}
            >
              Nâng cấp khóa luận
            </Button>
          </div>
        )}

        {activeTab === 'registrations' && (
          <FilterBar
            searchValue={search}
            onSearchChange={setSearch}
            searchPlaceholder="Tìm kiếm theo tên hoặc MSSV..."
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
                key: 'period',
                value: selectedPeriodId,
                onChange: setSelectedPeriodId,
                placeholder: periodsLoading ? 'Đang tải...' : 'Chọn đợt đăng ký',
                loading: periodsLoading,
                widthClassName: 'w-full sm:w-64',
                options: [
                  { value: 'current-project', label: 'Đợt đồ án hiện tại' },
                  { value: 'current-thesis', label: 'Đợt khóa luận hiện tại' },
                  ...registrationPeriods.map((p) => ({ value: String(p.id), label: `${p.name} (${p.academic_year})` })),
                ],
              },
              {
                key: 'status',
                value: statusFilter,
                onChange: (v) => setStatusFilter(v === 'all' ? '' : v),
                placeholder: 'Tất cả trạng thái',
                widthClassName: 'w-full sm:w-48',
                options: [
                  { value: 'all', label: 'Tất cả' },
                  { value: 'waiting_lecturer', label: 'Chờ phân GV' },
                  { value: 'waiting_staff_assignment', label: 'Chờ giáo vụ phân công' },
                  { value: 'assigned_lecturer', label: 'Đã duyệt' },
                ],
              },
            ]}
            onRefresh={loadRegistrations}
            refreshLoading={loading}
          />
        )}

        {activeTab === 'thesis_upgrade' && (
          <Card variant="elevated" bodyClassName="space-y-4">
            <Select
              label="Chọn đợt khóa luận"
              placeholder="Chọn đợt khóa luận..."
              value={selectedThesisPeriodId}
              onChange={(e: ChangeEvent<HTMLSelectElement>) => {
                setSelectedThesisPeriodId(e.target.value);
                setSelectedThesisIds([]);
              }}
              options={thesisPeriods.map((p) => ({
                value: String(p.id),
                label: `${p.name} (${p.academic_year})`,
              }))}
            />
          </Card>
        )}

        {activeTab === 'registrations' && showCheckbox && (
          <Card variant="elevated" bodyClassName="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <Select
                  label="Lọc theo chuyên môn"
                  placeholder="Chọn chuyên môn..."
                  value={selectedSpecializaion}
                  onChange={(e: ChangeEvent<HTMLSelectElement>) => setSelectedSpecializaion(e.target.value)}
                  options={specialization.map((l) => ({ value: String(l.id), label: l.name }))}
                />
              </div>
              <div className="flex-1">
                <Select
                  label="Chọn giảng viên hướng dẫn muốn phân"
                  placeholder="Chọn giảng viên..."
                  value={selectedLecturer}
                  onChange={(e: ChangeEvent<HTMLSelectElement>) => setSelectedLecturer(e.target.value)}
                  options={lecturers.map((l) => ({ value: String(l.id), label: l.full_name }))}
                />
              </div>
            </div>
          </Card>
        )}

        {activeTab === 'registrations' && (
          <>
            {!selectedPeriodId ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                <i className="fa-solid fa-calendar-week text-4xl mb-3"></i>
                <p className="text-sm font-medium">Vui lòng chọn đợt đăng ký</p>
              </div>
            ) : loading ? (
              <div className="flex items-center justify-center py-12">
                <i className="fa-solid fa-circle-notch animate-spin text-primary text-2xl"></i>
              </div>
            ) : (
              <>
                <GenericTable
                  rows={registrations}
                  columns={columns}
                  rowKey={(reg) => reg.id}
                  emptyText="Không có sinh viên nào"
                  selectable={showCheckbox}
                  selectedIds={selectedIds}
                  allSelected={allFilteredSelected}
                  onToggleSelect={(id) => toggleSelect(Number(id))}
                  onToggleSelectAll={toggleSelectAll}
                />
                <Pagination {...paginationProps} />
              </>
            )}

            {showCheckbox && (
              <div className="flex justify-between items-center gap-4 mt-2">
                <div className="flex items-end gap-1">
                  {selectedIds.length > 0 && (
                    <span className="text-xs text-gray-500 whitespace-nowrap py-2">
                      Đã chọn <strong className="text-primary">{selectedIds.length}</strong> sinh viên
                    </span>
                  )}
                </div>
                <div className="flex justify-end overflow-x-auto">
                  <Button variant="primary" icon="fa-solid fa-rotate" onClick={handleAddLecturers} loading={bulkAssignLoading} disabled={bulkAssignLoading}>
                    Phân giảng viên hướng dẫn
                  </Button>
                </div>
              </div>
            )}
          </>
        )}

        {activeTab === 'thesis_upgrade' && (
          <>
            {!selectedThesisPeriodId ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                <i className="fa-solid fa-calendar-week text-4xl mb-3"></i>
                <p className="text-sm font-medium">Vui lòng chọn đợt khóa luận</p>
              </div>
            ) : loading ? (
              <div className="flex items-center justify-center py-12">
                <i className="fa-solid fa-circle-notch animate-spin text-primary text-2xl"></i>
              </div>
            ) : (
              <>
                <GenericTable
                  rows={thesisRegistrations}
                  columns={thesisColumns}
                  rowKey={(reg) => reg.id}
                  emptyText="Không có sinh viên đủ điều kiện"
                  selectable
                  selectedIds={selectedThesisIds}
                  allSelected={thesisRegistrations.length > 0 && thesisRegistrations.every((r) => selectedThesisIds.includes(r.id))}
                  onToggleSelect={(id) => {
                    const numId = Number(id);
                    setSelectedThesisIds((prev) => (prev.includes(numId) ? prev.filter((i) => i !== numId) : [...prev, numId]));
                  }}
                  onToggleSelectAll={() => {
                    if (thesisRegistrations.every((r) => selectedThesisIds.includes(r.id))) {
                      setSelectedThesisIds((prev) => prev.filter((id) => !thesisRegistrations.some((r) => r.id === id)));
                    } else {
                      setSelectedThesisIds((prev) => [...new Set([...prev, ...thesisRegistrations.map((r) => r.id)])]);
                    }
                  }}
                />
                <Pagination {...paginationProps} />
              </>
            )}

            {selectedThesisIds.length > 0 && (
              <div className="flex justify-between items-center gap-4 mt-2">
                <div className="flex items-end gap-1">
                  <span className="text-xs text-gray-500 whitespace-nowrap py-2">
                    Đã chọn <strong className="text-primary">{selectedThesisIds.length}</strong> đăng ký
                  </span>
                </div>
                <div className="flex justify-end overflow-x-auto">
                  <Button
                    variant="success"
                    icon="fa-solid fa-arrow-up-right-dots"
                    loading={convertLoading}
                    onClick={handleConvertToThesis}
                  >
                    Chuyển sang khóa luận ({selectedThesisIds.length})
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <Modal
        open={assigningReg !== null}
        onClose={() => { setAssigningReg(null); setSelectedLecturer(''); }}
        title="Phân giảng viên hướng dẫn"
        description={assigningReg?.project_title || '—'}
        icon="fa-solid fa-chalkboard-user"
        size="sm"
        footer={
          <div className="flex items-center gap-2">
            <Button variant="primary" size="sm" icon="fa-solid fa-check" loading={assignLoading} disabled={!selectedLecturer} onClick={handleAssign}>
              Xác nhận
            </Button>
            <Button variant="outline" size="sm" onClick={() => { setAssigningReg(null); setSelectedLecturer(''); }}>
              Hủy
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Chọn giảng viên hướng dẫn cho sinh viên <strong>{assigningReg?.student_name || assigningReg?.student?.full_name || '—'}</strong>
          </p>
          <Select
            label="Giảng viên hướng dẫn"
            placeholder="Chọn giảng viên..."
            value={selectedLecturer}
            onChange={(e: ChangeEvent<HTMLSelectElement>) => setSelectedLecturer(e.target.value)}
            options={lecturers.map((l) => ({ value: String(l.id), label: l.full_name }))}
          />
        </div>
      </Modal>
    </div>
  );
}