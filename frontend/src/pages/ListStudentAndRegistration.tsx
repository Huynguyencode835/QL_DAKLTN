import { type ChangeEvent, useEffect, useState } from 'react';
import { useModal } from '../hooks';
import { useUser } from '../hooks';
import { fetchWithAuth, updatePatchWithAuth, createWithAuth, updateWithAuth } from '../utils/ApiHelper';
import { endpoints } from '../config/Apis';
import Card from '../components/Ui/Card';
import Button from '../components/Ui/Button';
import Badge from '../components/Ui/Badge';
import Input from '../components/Ui/Input';
import Select from '../components/Ui/Select';
import Modal from '../components/Ui/Modal';
import { STATUS_CONFIG } from '../types';
import type { Registration, Lecturer, RegistrationPeriod } from '../types';
import Dropdown from '../components/Ui/Dropdown';

function effectiveStatusKey(reg: Registration): string {
  if (reg.status === 'waiting_lecturer') return 'waiting_lecturer';
  const main = reg.lecturer_assignments?.find((a) => a.role === 'main');
  if (!main) return 'assigned_lecturer';  // still pending
  if (main.approval_status === 'approved') return 'approved';
  if (main.approval_status === 'rejected') return 'rejected';
  return 'assigned_lecturer';  // pending
}

export default function ListStudentsAndRegistration() {
  const { openModal, closeModal } = useModal();
  const { user } = useUser();
  const [registrationPeriods, setRegistrationPeriods] = useState<RegistrationPeriod[]>([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>('current');
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [lecturers, setLecturers] = useState<Lecturer[]>([]);
  const [loading, setLoading] = useState(true);
  const [periodsLoading, setPeriodsLoading] = useState(true);
  const [assignLoading, setAssignLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [assigningReg, setAssigningReg] = useState<Registration | null>(null);
  const [selectedLecturer, setSelectedLecturer] = useState('');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const isStaff = user?.role === 'staff';

  useEffect(() => {
    loadPeriods();
    if (isStaff) {
      fetchWithAuth(endpoints.lecturers, setLecturers, () => { }, {}, () => { });
    }
  }, []);

  useEffect(() => {
    if (selectedPeriodId) {
      loadRegistrations();
    }
  }, [selectedPeriodId]);

  const loadPeriods = async () => {
    setPeriodsLoading(true);
    await fetchWithAuth(
      endpoints.registrationPeriods,
      (data: RegistrationPeriod[]) => {
        setRegistrationPeriods(data);
      }, () => { }, {}, () => setPeriodsLoading(false));
  };

  const loadRegistrations = async () => {
    if (!selectedPeriodId) return;
    setLoading(true);
    await fetchWithAuth(endpoints.registrations(selectedPeriodId), (data) => { setRegistrations(data); }, () => { }, {}, () => setLoading(false));
  };

  const loadDetail = async (id: number, onSuccess: (data: Registration) => void) => {
    await fetchWithAuth(endpoints.registrationDetail(selectedPeriodId, id), onSuccess, () => { }, {}, setDetailLoading);
  };

  const handleApprove = async (id: number) => {
    await updatePatchWithAuth(
      endpoints.approveRegistration(selectedPeriodId, id),
      {},
      () => loadRegistrations(),
      () => { },
    );
  };

  const handleReject = async (id: number) => {
    await updatePatchWithAuth(
      endpoints.rejectRegistration(selectedPeriodId, id),
      {},
      () => loadRegistrations(),
      () => { },
    );
  };

  const addLecturer = async (id: number) => {
    await updatePatchWithAuth(
      endpoints.addLecturer(selectedPeriodId, id),
      { lecturer_id: 33 },//Number(selectedLecturer)
      () => {
        loadRegistrations();
        setAssigningReg(null);
        setSelectedLecturer('');
      },
      (type: string, message: string, raw?: any) => {
        console.log('Error type:', type);
        console.log('Error message:', message);
        console.log('Error raw:', raw);
      },
    );
  }

  const handleAssign = async () => {
    if (!assigningReg || !selectedLecturer) return;
    setAssignLoading(true);
    await addLecturer(assigningReg.id);
    setAssignLoading(false);
  };

  const openDetailModal = (reg: Registration) => {
    setDetailLoading(true);
    loadDetail(reg.id, (data) => {
      const si = data.student_info || {};
      const li = data.lecturer_info || [];
      const status = STATUS_CONFIG[effectiveStatusKey(data)] || STATUS_CONFIG.waiting_lecturer;
      const hasPendingMain = li.some((l) => l.role === 'main' && l.approval_status === 'pending');
      const mainAssignment = li.find((l) => l.role === 'main');
      const backupAssignment = li.find((l) => l.role === 'backup');
      openModal({
        title: `Chi tiết đăng ký`,
        description: data.project_title || '—',
        icon: 'fa-regular fa-file-lines',
        size: 'lg',
        content: (
          <div className="space-y-6">
            <div className="bg-gray-50/80 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
                  {si.avatar ? (
                    <img src={si.avatar} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <i className="fa-solid fa-user-graduate text-primary text-lg"></i>
                  )}
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Thông tin sinh viên</h4>
                  <p className="text-sm font-medium text-gray-800">{si.full_name || '—'}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                <div>
                  <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">MSSV</p>
                  <p className="text-sm font-semibold text-gray-800">{si.student_id || '—'}</p>
                </div>
                <div>
                  <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">Email</p>
                  <p className="text-sm text-gray-700">{si.email || '—'}</p>
                </div>
                <div>
                  <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">Lớp</p>
                  <p className="text-sm text-gray-700">{si.class_name || '—'}</p>
                </div>
                <div>
                  <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">Khoa</p>
                  <p className="text-sm text-gray-700">{si.faculty || '—'}</p>
                </div>
                <div>
                  <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">Chuyên ngành</p>
                  <p className="text-sm text-gray-700">{si.major || '—'}</p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                <i className="fa-solid fa-file-circle-check text-primary"></i>
                Thông tin đăng ký
              </h4>
              <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                <div className="col-span-2">
                  <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">Đề tài</p>
                  <p className="text-sm font-medium text-gray-800">{data.project_title || '—'}</p>
                </div>
                <div>
                  <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">Loại</p>
                  <p className="text-sm text-gray-700">{data.is_Thesis ? 'Khóa luận tốt nghiệp' : 'Thực tập tốt nghiệp'}</p>
                </div>
                <div>
                  <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">Trạng thái</p>
                  <Badge variant={status.variant} dot>{status.label}</Badge>
                </div>
              </div>
              {data.project_description && (
                <div>
                  <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-1">Mô tả</p>
                  <p className="text-sm text-gray-700 leading-relaxed bg-gray-50 rounded-xl p-3.5 border border-gray-100">{data.project_description}</p>
                </div>
              )}
            </div>

            {li.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                  <i className="fa-solid fa-chalkboard-user text-primary"></i>
                  Giảng viên hướng dẫn
                </h4>
                <div className="space-y-2">
                  {mainAssignment && (
                    <div className="bg-blue-50/60 rounded-xl p-3.5 border border-blue-100">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[11px] font-semibold text-blue-600 uppercase tracking-wide">Nguyện vọng 1</span>
                        <Badge variant={STATUS_CONFIG[mainAssignment.approval_status]?.variant || 'warning'}>
                          {STATUS_CONFIG[mainAssignment.approval_status]?.label || mainAssignment.approval_status}
                        </Badge>
                      </div>
                      <p className="text-sm font-medium text-gray-800">{mainAssignment.full_name}</p>
                      {mainAssignment.note && (
                        <p className="text-xs text-gray-500 mt-1 italic">"{mainAssignment.note}"</p>
                      )}
                    </div>
                  )}
                  {backupAssignment && (
                    <div className="bg-amber-50/60 rounded-xl p-3.5 border border-amber-100">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[11px] font-semibold text-amber-600 uppercase tracking-wide">Nguyện vọng 2</span>
                        <Badge variant={STATUS_CONFIG[backupAssignment.approval_status]?.variant || 'warning'}>
                          {STATUS_CONFIG[backupAssignment.approval_status]?.label || backupAssignment.approval_status}
                        </Badge>
                      </div>
                      <p className="text-sm font-medium text-gray-800">{backupAssignment.full_name}</p>
                      {backupAssignment.note && (
                        <p className="text-xs text-gray-500 mt-1 italic">"{backupAssignment.note}"</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ),
        footer: (
          <div className="flex items-center gap-2">
            {hasPendingMain && (
              <>
                <Button variant="success" size="sm" icon="fa-solid fa-check" onClick={() => { handleApprove(reg.id); closeModal(); }}>
                  Duyệt
                </Button>
                <Button variant="danger" size="sm" icon="fa-solid fa-xmark" onClick={() => { handleReject(reg.id); closeModal(); }}>
                  Từ chối
                </Button>
              </>
            )}
            <Button variant="outline" size="sm" onClick={closeModal}>Đóng</Button>
          </div>
        ),
      });
    });
  };

  const filtered = registrations.filter((reg) => {
    const studentName = reg.student?.full_name || reg.student_name || '';
    const studentId = reg.student?.student_id || reg.student_id || '';
    const q = search.toLowerCase();
    if (statusFilter === 'all') return true;
    if (q && !studentName.toLowerCase().includes(q) && !studentId.toLowerCase().includes(q)) return false;
    if (statusFilter && reg.status !== statusFilter) return false;
    return true;
  });

  const allFilteredSelected = filtered.length > 0 && filtered.every((r) => selectedIds.includes(r.id));

  const toggleSelectAll = () => {
    if (allFilteredSelected) {
      setSelectedIds((prev) => prev.filter((id) => !filtered.some((r) => r.id === id)));
    } else {
      setSelectedIds((prev) => [...new Set([...prev, ...filtered.map((r) => r.id)])]);
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleAddLecturers = async () => {
    await Promise.all(
      [...selectedIds].map((id) => addLecturer(id))
    );
    loadRegistrations();
  };

  return (
    <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-background">
      <div className="max-w-7xl mx-auto w-full space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Danh sách Sinh viên & Đăng ký</h2>
          <p className="text-gray-600">Quản lý danh sách sinh viên đã đăng ký đề tài và trạng thái xét duyệt.</p>
        </div>

        <Card variant="elevated" bodyClassName="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Tìm kiếm theo tên hoặc MSSV..."
                leadingIcon="fa-solid fa-magnifying-glass"
                value={search}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
              />
            </div>
            <div className="w-full sm:w-64">
              <Dropdown
                placeholder={periodsLoading ? 'Đang tải...' : 'Chọn đợt đăng ký'}
                value={selectedPeriodId}
                onChange={(value) => setSelectedPeriodId(String(value))}
                options={[
                  { value: 'current', label: 'Đợt hiện tại (đang mở)' },
                  ...registrationPeriods.map((p) => ({
                    value: String(p.id),
                    label: `${p.name} (${p.academic_year})`,
                  })),
                ]}
              />
            </div>
            <div className="w-full sm:w-48">
              <Dropdown
                value={statusFilter}
                onChange={(value) => setStatusFilter(String(value))}
                placeholder="Tất cả trạng thái"
                options={[
                  { value: 'all', label: 'Tất cả' },
                  { value: 'waiting_lecturer', label: 'Chờ phân GV' },
                  { value: 'assigned_lecturer', label: 'Chờ duyệt' },
                  { value: 'approved', label: 'Đã duyệt' },
                  { value: 'rejected', label: 'Từ chối' },
                ]}
              />
            </div>
            <Button variant="primary" icon="fa-solid fa-rotate" onClick={loadRegistrations} loading={loading}>
              Làm mới
            </Button>
          </div>
        </Card>

        <Card variant="elevated" bodyClassName="space-y-0">
          {!selectedPeriodId ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <i className="fa-solid fa-calendar-week text-4xl mb-3"></i>
              <p className="text-sm font-medium">Vui lòng chọn đợt đăng ký</p>
            </div>
          ) : loading ? (
            <div className="flex items-center justify-center py-12">
              <i className="fa-solid fa-circle-notch animate-spin text-primary text-2xl"></i>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <i className="fa-solid fa-users-slash text-4xl mb-3"></i>
              <p className="text-sm font-medium">Không có sinh viên nào</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left">
                    {registrations.some((registration) => registration.status === "waiting_lecturer") && statusFilter === "waiting_lecturer" && (
                      <th className="pb-3 pr-2 w-10">
                        <input
                          type="checkbox"
                          checked={allFilteredSelected}
                          onChange={toggleSelectAll}
                          className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary/30 cursor-pointer"
                        />
                      </th>
                    )}

                    <th className="pb-3 font-semibold text-gray-600 text-xs uppercase tracking-wider">MSSV</th>
                    <th className="pb-3 font-semibold text-gray-600 text-xs uppercase tracking-wider">Họ tên</th>
                    <th className="pb-3 font-semibold text-gray-600 text-xs uppercase tracking-wider">Đề tài</th>
                    <th className="pb-3 font-semibold text-gray-600 text-xs uppercase tracking-wider">Trạng thái</th>
                    {isStaff && <th className="pb-3 font-semibold text-gray-600 text-xs uppercase tracking-wider">GV hướng dẫn</th>}
                    <th className="pb-3 font-semibold text-gray-600 text-xs uppercase tracking-wider text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map((reg) => {
                    const status = STATUS_CONFIG[effectiveStatusKey(reg)] || STATUS_CONFIG.waiting_lecturer;
                    const checked = selectedIds.includes(reg.id);
                    return (
                      <tr key={reg.id} className={`hover:bg-gray-50/50 transition-colors ${checked ? 'bg-primary/5' : ''}`}>

                        {registrations.some((registration) => registration.status === "waiting_lecturer") && statusFilter === "waiting_lecturer" && (
                          <td className="py-3.5 pr-2">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleSelect(reg.id)}
                              className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary/30 cursor-pointer"
                            />
                          </td>
                        )}
                        <td className="py-3.5 pr-4">
                          <span className="font-mono text-sm text-gray-800">{reg.student?.student_id || reg.student_id || '—'}</span>
                        </td>
                        <td className="py-3.5 pr-4">
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
                        </td>
                        <td className="py-3.5 pr-4">
                          <span className="text-gray-600 line-clamp-1">{reg.project_title || '—'}</span>
                        </td>
                        <td className="py-3.5 pr-4">
                          <Badge variant={status.variant} dot>{status.label}</Badge>
                        </td>
                        {isStaff && (
                          <td className="py-3.5 pr-4">
                            <span className="text-gray-700">{reg.lecturer_name || '—'}</span>
                          </td>
                        )}
                        <td className="py-3.5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {isStaff && reg.status === 'waiting_lecturer' && !reg.lecturer_assignments?.some((a: any) => a.role === 'main') && (
                              <Button
                                variant="primary"
                                size="sm"
                                icon="fa-solid fa-chalkboard-user"
                                onClick={() => { setAssigningReg(reg); setSelectedLecturer(''); }}
                              >
                                Phân GVHD
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              icon="fa-regular fa-eye"
                              onClick={() => openDetailModal(reg)}
                            >
                              Chi tiết
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {selectedPeriodId && statusFilter === "waiting_lecturer" && registrations.some((registration) => registration.status === "waiting_lecturer") && (
          <div className="flex justify-between items-center gap-4 mt-2">
            <div className="flex items-end gap-1">
              {selectedIds.length > 0 && (
                <span className="text-xs text-gray-500 whitespace-nowrap py-2">
                  Đã chọn <strong className="text-primary">{selectedIds.length}</strong> sinh viên
                </span>
              )}
            </div>
            <div className="flex justify-end overflow-x-auto">
              <Button variant="primary" icon="fa-solid fa-rotate" onClick={()=>{
                handleAddLecturers();
              }} loading={loading}>
                Phân giảng viên hướng dẫn
              </Button>
            </div>
          </div>
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
            <Button
              variant="primary"
              size="sm"
              icon="fa-solid fa-check"
              loading={assignLoading}
              disabled={!selectedLecturer}
              onClick={handleAssign}
            >
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
    </main>
  );
}