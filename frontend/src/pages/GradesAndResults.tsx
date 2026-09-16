import { useEffect, useMemo, useState, type ChangeEvent } from 'react';
import { useUser, usePageHeader, usePagination, useSearch, useToast } from '../hooks';
import { fetchWithAuth, createWithAuth, updatePatchWithAuth } from '../utils/ApiHelper';
import { endpoints } from '../config/Apis';
import { SectionCard } from '../components/Ui/Card';
import Button from '../components/Ui/Button';
import Badge from '../components/Ui/Badge';
import Input from '../components/Ui/Input';
import FilterBar from '../components/FilterBar';
import GenericTable, { TableColumn } from '../components/GenericTable';
import Pagination from '../components/Ui/Pagination';
import type { LecturerGradeRow, RegistrationPeriod } from '../types';

interface StudentGradeDetail {
  registration: number;
  process: { score: number; comment: string } | null;
  final: { score: number; comment: string } | null;
  reviewer: { score: number; comment: string } | null;
  committee_members: { member_name: string; role: string; score: number }[];
  committee_avg: number | null;
  supervisor_final: number | null;
  final_score: number | null;
}



function calcAvg(p: number | null, r: number | null, c: number | null): number | null {
  const vals = [p, r, c].filter((v): v is number => v != null);
  if (vals.length === 0) return null;
  return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10;
}

function LecturerGradeView({ readonly = false }: { readonly?: boolean }) {
  const toast = useToast();
  const [grades, setGrades] = useState<LecturerGradeRow[]>([]);
  const [periods, setPeriods] = useState<RegistrationPeriod[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>('current-project');
  const { search, setSearch, searchParams } = useSearch();
  const { resetPage, paginationParams, handlePaginatedResponse, paginationProps } = usePagination();
  const [editingRowId, setEditingRowId] = useState<number | null>(null);
  const [editingField, setEditingField] = useState<'process' | 'final' | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [originalGrades, setOriginalGrades] = useState<Record<number, { process: number | null; final: number | null }>>({});

  useEffect(() => {
    loadPeriods();
  }, []);

  useEffect(() => {
    resetPage();
  }, [selectedPeriodId, searchParams]);

  useEffect(() => {
    loadGrades();
  }, [paginationParams.page, searchParams, selectedPeriodId]);

  const loadPeriods = async () => {
    await fetchWithAuth(
      endpoints.registrationPeriods,
      (data: RegistrationPeriod[]) => setPeriods(data),
      () => {},
      {},
    );
  };

  const loadGrades = async () => {
    setLoading(true);
    const params: Record<string, any> = { ...paginationParams, ...searchParams };
    if (selectedPeriodId !== 'current-project' && selectedPeriodId !== 'current-thesis') {
      params.period = selectedPeriodId;
    }
    await fetchWithAuth(
      endpoints.grades,
      (data: LecturerGradeRow[], meta?: { count: number }) => {
        let filtered = data;
        if (searchParams.search) {
          const q = searchParams.search.toLowerCase();
          filtered = filtered.filter(
            (r) => r.student_name.toLowerCase().includes(q) || r.student_id.toLowerCase().includes(q) || r.project_title.toLowerCase().includes(q)
          );
        }
        handlePaginatedResponse(filtered, meta ? { count: meta.count } : { count: filtered.length });
        setGrades(filtered);
      },
      (type: string, msg: string) => {
        toast.error(type === 'network' ? 'Lỗi mạng' : type === 'server' ? 'Lỗi máy chủ' : 'Lỗi', msg);
      },
      params,
      () => setLoading(false)
    );
  };

  const startEditing = (row: LecturerGradeRow, field: 'process' | 'final') => {
    setEditingRowId(row.id);
    setEditingField(field);
    setOriginalGrades((prev) => ({
      ...prev,
      [row.id]: { process: row.process, final: row.supervisor_final },
    }));
    setEditValue(field === 'process' ? (row.process?.toString() ?? '') : (row.supervisor_final?.toString() ?? ''));
  };

  const cancelEditing = () => {
    setEditingRowId(null);
    setEditingField(null);
    setEditValue('');
  };

  const onEditValueChange = (value: string) => {
    if (value !== '' && (isNaN(Number(value)) || Number(value) < 0 || Number(value) > 10)) return;
    setEditValue(value);
  };

  const saveProcessGrade = async (rowId: number) => {
    const newScore = editValue !== '' ? parseFloat(editValue) : null;
    if (newScore !== null && (isNaN(newScore) || newScore < 0 || newScore > 10)) {
      toast.error('Lỗi', 'Điểm phải từ 0 đến 10');
      return;
    }

    const original = originalGrades[rowId];
    const oldScore = original?.process ?? null;

    if (newScore === oldScore) {
      cancelEditing();
      return;
    }

    const row = grades.find((g) => g.id === rowId);
    if (!row) return;

    const body = {
      registration: rowId,
      grade_type: 'supervisor',
      component: 'process',
      score: newScore,
    };

    const onSuccess = () => {
      setGrades((prev) =>
        prev.map((r) =>
          r.id === rowId
            ? { ...r, process: newScore, avg: calcAvg(newScore, r.reviewer, r.committee) }
            : r
        )
      );
      cancelEditing();
      toast.success('Đã lưu', 'Điểm quá trình đã được cập nhật.');
    };

    const onError = (type: string, msg: string) => {
      toast.error(type === 'network' ? 'Lỗi mạng' : type === 'server' ? 'Lỗi máy chủ' : 'Lỗi', msg);
    };

    if (row.process_grade_id) {
      await updatePatchWithAuth(endpoints.gradeDetail(row.process_grade_id), body, onSuccess, onError);
    } else {
      await createWithAuth(endpoints.grades, body, (data: any) => {
        setGrades((prev) =>
          prev.map((r) => (r.id === rowId ? { ...r, process_grade_id: data.id } : r))
        );
        onSuccess();
      }, onError);
    }
  };

  const saveFinalGrade = async (rowId: number) => {
    const newScore = editValue !== '' ? parseFloat(editValue) : null;
    if (newScore !== null && (isNaN(newScore) || newScore < 0 || newScore > 10)) {
      toast.error('Lỗi', 'Điểm phải từ 0 đến 10');
      return;
    }

    const original = originalGrades[rowId];
    const oldScore = original?.final ?? null;

    if (newScore === oldScore) {
      cancelEditing();
      return;
    }

    const body = {
      registration: rowId,
      grade_type: 'supervisor',
      component: 'final',
      score: newScore,
    };

    const row = grades.find((g) => g.id === rowId);

    const onSuccess = () => {
      setGrades((prev) =>
        prev.map((r) =>
          r.id === rowId
            ? { ...r, supervisor_final: newScore }
            : r
        )
      );
      cancelEditing();
      toast.success('Đã lưu', 'Điểm cuối kỳ đã được cập nhật.');
    };

    const onError = (type: string, msg: string) => {
      toast.error(type === 'network' ? 'Lỗi mạng' : type === 'server' ? 'Lỗi máy chủ' : 'Lỗi', msg);
    };

    if (row?.final_grade_id) {
      await updatePatchWithAuth(endpoints.gradeDetail(row.final_grade_id), body, onSuccess, onError);
    } else {
      await createWithAuth(endpoints.grades, body, (data: any) => {
        setGrades((prev) =>
          prev.map((r) => (r.id === rowId ? { ...r, final_grade_id: data.id } : r))
        );
        onSuccess();
      }, onError);
    }
  };

  const handleSave = (rowId: number) => {
    if (editingField === 'process') {
      saveProcessGrade(rowId);
    } else if (editingField === 'final') {
      saveFinalGrade(rowId);
    }
  };

  const columns: TableColumn<LecturerGradeRow>[] = useMemo(() => [
    {
      key: 'stt',
      label: 'STT',
      align: 'center',
      render: (row) => {
        const idx = grades.findIndex((g) => g.id === row.id);
        return <span className="text-gray-500">{idx + 1}</span>;
      },
    },
    {
      key: 'student_name',
      label: 'Sinh viên',
      render: (row) => (
        <div>
          <div className="font-medium text-gray-800">{row.student_name}</div>
          <div className="text-xs text-gray-400 font-mono">{row.student_id}</div>
        </div>
      ),
    },
    {
      key: 'project_title',
      label: 'Đề tài',
      render: (row) => <span className="text-gray-600 line-clamp-1 max-w-[200px]">{row.project_title}</span>,
    },
    {
      key: 'wants_thesis_upgrade',
      label: 'Loại',
      render: (row) => (
        <Badge variant={row.is_thesis ? 'info' : row.wants_thesis_upgrade ? 'warning' : 'neutral'} dot>
          {row.is_thesis ? 'Khóa luận' : row.wants_thesis_upgrade ? 'Đồ án phát triển khóa luận' : 'Đồ án'}
        </Badge>
      ),
    },
    {
      key: 'process',
      label: 'Quá trình',
      align: 'center',
      render: (row) => {
        if (!readonly && editingRowId === row.id && editingField === 'process') {
          return (
            <Input
              type="number"
              min="0"
              max="10"
              step="0.5"
              placeholder="0.0"
              className="!py-1.5 !text-center !w-20"
              value={editValue}
              onChange={(e: ChangeEvent<HTMLInputElement>) => onEditValueChange(e.target.value)}
            />
          );
        }
        return row.process != null ? <span className="font-semibold text-gray-800">{row.process}</span> : <span className="text-gray-300">—</span>;
      },
    },
    {
      key: 'reviewer',
      label: 'Phản biện',
      align: 'center',
      render: (row) => row.reviewer != null ? <span className="font-semibold text-gray-800">{row.reviewer}</span> : <span className="text-gray-300">—</span>,
    },
    {
      key: 'committee',
      label: 'Hội đồng',
      align: 'center',
      render: (row) => row.committee != null ? <span className="font-semibold text-gray-800">{row.committee}</span> : <span className="text-gray-300">—</span>,
    },
    {
      key: 'supervisor_final',
      label: 'Cuối kỳ',
      align: 'center',
      render: (row) => {
        if (!readonly && editingRowId === row.id && editingField === 'final') {
          return (
            <Input
              type="number"
              min="0"
              max="10"
              step="0.5"
              placeholder="0.0"
              className="!py-1.5 !text-center !w-20"
              value={editValue}
              onChange={(e: ChangeEvent<HTMLInputElement>) => onEditValueChange(e.target.value)}
            />
          );
        }
        return row.supervisor_final != null ? <span className="font-semibold text-gray-800">{row.supervisor_final}</span> : <span className="text-gray-300">—</span>;
      },
    },
    {
      key: 'avg',
      label: 'TB',
      align: 'center',
      render: (row) => row.avg != null ? <Badge variant="success">{row.avg}</Badge> : <span className="text-gray-300">—</span>,
    },
    ...(!readonly ? [{
      key: 'actions',
      label: 'Thao tác',
      align: 'right' as const,
      render: (row: LecturerGradeRow) => {
        if (editingRowId === row.id) {
          return (
            <div className="flex justify-end gap-1">
              <Button variant="primary" size="sm" icon="fa-solid fa-check" onClick={() => handleSave(row.id)}>
                Lưu
              </Button>
              <Button variant="outline" size="sm" icon="fa-solid fa-xmark" onClick={cancelEditing}>
                Hủy
              </Button>
            </div>
          );
        }
        return (
          <div className="flex justify-end gap-1">
            <Button variant="outline" size="sm" icon="fa-solid fa-pen" onClick={() => startEditing(row, 'process')}>
              Q.Trình
            </Button>
            <Button variant="outline" size="sm" icon="fa-solid fa-pen" onClick={() => startEditing(row, 'final')}>
              CKỳ
            </Button>
          </div>
        );
      },
    }] : []),
  ], [editingRowId, editingField, editValue, grades, readonly]);

  return (
    <div className="space-y-6">
      <div className="mx-auto w-full space-y-6">
        <FilterBar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Tìm kiếm tên sinh viên, MSSV, đề tài..."
          dropdowns={[
            {
              key: 'period',
              value: selectedPeriodId,
              onChange: setSelectedPeriodId,
              placeholder: 'Chọn đợt đăng ký',
              widthClassName: 'w-full sm:w-64',
              options: [
                { value: 'current-project', label: 'Đợt đồ án hiện tại' },
                { value: 'current-thesis', label: 'Đợt khóa luận hiện tại' },
                ...periods.map((p) => ({ value: String(p.id), label: `${p.name} (${p.academic_year})` })),
              ],
            },
          ]}
          onRefresh={loadGrades}
          refreshLoading={loading}
        />

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <i className="fa-solid fa-circle-notch animate-spin text-primary text-2xl"></i>
          </div>
        ) : (
          <>
            <GenericTable
              rows={grades}
              columns={columns}
              rowKey={(row) => row.id}
              emptyText="Không có dữ liệu điểm"
            />
            <Pagination {...paginationProps} />
          </>
        )}
      </div>
    </div>
  );
}

function StudentGradeView() {
  const toast = useToast();
  const { user } = useUser();
  const [periods, setPeriods] = useState<RegistrationPeriod[]>([]);
  const [periodsLoading, setPeriodsLoading] = useState(true);
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>('');
  const [registration, setRegistration] = useState<any | null>(null);
  const [gradeDetail, setGradeDetail] = useState<StudentGradeDetail | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadPeriods();
  }, []);

  useEffect(() => {
    if (selectedPeriodId) loadRegistration();
    else { setRegistration(null); setGradeDetail(null); }
  }, [selectedPeriodId]);

  const loadPeriods = async () => {
    await fetchWithAuth(
      endpoints.myRegistrationPeriods,
      (data: RegistrationPeriod[]) => {
        setPeriods(data);
        if (data.length > 0) {
          const current = data.find((p) => p.status === 'open') || data[0];
          setSelectedPeriodId(String(current.id));
        }
      },
      () => {},
      {},
      () => setPeriodsLoading(false)
    );
  };

  const loadRegistration = async () => {
    setLoading(true);
    setRegistration(null);
    setGradeDetail(null);
    await fetchWithAuth(
      endpoints.registrations(selectedPeriodId),
      async (data: any[]) => {
        const reg = data?.[0] || null;
        setRegistration(reg);
        if (reg) {
          await loadGradeDetail(reg.id);
        }
        setLoading(false);
      },
      () => {
        setLoading(false);
      },
      {}
    );
  };

  const loadGradeDetail = async (regId: number) => {
    await fetchWithAuth(
      endpoints.gradeByRegistration(regId),
      (data: StudentGradeDetail) => {
        setGradeDetail(data);
      },
      (type: string, msg: string) => {
        toast.error('Lỗi', msg || 'Không thể tải điểm.');
      },
    );
  };

  return (
    <div className="space-y-6">
      {/* Period filter */}
      <FilterBar
        searchValue=""
        onSearchChange={() => {}}
        isSearch={false}
        searchPlaceholder=""
        dropdowns={[
          {
            key: 'period',
            value: selectedPeriodId,
            onChange: setSelectedPeriodId,
            placeholder: periodsLoading ? 'Đang tải...' : 'Chọn đợt đăng ký',
            loading: periodsLoading,
            widthClassName: 'w-full sm:w-64',
            options: periods.map((p) => ({ value: String(p.id), label: `${p.name} (${p.academic_year})` })),
          },
        ]}
      />

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <i className="fa-solid fa-circle-notch animate-spin text-primary text-2xl"></i>
        </div>
      ) : !registration ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <i className="fa-solid fa-folder-open text-5xl mb-4"></i>
          <p className="text-sm font-medium">Bạn chưa có đăng ký nào trong đợt này</p>
        </div>
      ) : gradeDetail ? (
        <>
          <SectionCard title="Thông tin đề tài" icon="fa-solid fa-file-lines">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <div className="flex items-start gap-3 py-3 border-b border-gray-100">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center text-primary shrink-0 ring-1 ring-primary/10">
                    <i className="fa-solid fa-file-signature text-sm"></i>
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11px] text-textMuted font-medium uppercase tracking-wide">Đề tài</div>
                    <div className="text-sm font-semibold text-textMain">{registration.project_title}</div>
                  </div>
                </div>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Bảng điểm" icon="fa-solid fa-star">
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="px-4 py-3 text-left font-semibold text-gray-600"></th>
                    <th className="px-4 py-3 text-center font-semibold text-gray-600">Quá trình</th>
                    <th className="px-4 py-3 text-center font-semibold text-gray-600">Cuối kỳ (GVHD)</th>
                    <th className="px-4 py-3 text-center font-semibold text-gray-600">Phản biện</th>
                    <th className="px-4 py-3 text-center font-semibold text-gray-600">Hội đồng</th>
                    <th className="px-4 py-3 text-center font-semibold text-primary">TB</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-gray-100">
                    <td className="px-4 py-3 font-medium text-gray-700">Điểm</td>
                    <td className="px-4 py-3 text-center">
                      {gradeDetail.process?.score != null ? (
                        <span className="inline-flex items-center justify-center w-12 h-8 rounded-lg bg-primary/10 text-primary font-bold text-sm">
                          {gradeDetail.process.score}
                        </span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {gradeDetail.supervisor_final != null ? (
                        <span className="inline-flex items-center justify-center w-12 h-8 rounded-lg bg-primary/10 text-primary font-bold text-sm">
                          {gradeDetail.supervisor_final}
                        </span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {gradeDetail.reviewer?.score != null ? (
                        <span className="inline-flex items-center justify-center w-12 h-8 rounded-lg bg-amber-50 text-amber-700 font-bold text-sm">
                          {gradeDetail.reviewer.score}
                        </span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {gradeDetail.committee_avg != null ? (
                        <span className="inline-flex items-center justify-center w-12 h-8 rounded-lg bg-emerald-50 text-emerald-600 font-bold text-sm">
                          {gradeDetail.committee_avg}
                        </span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {gradeDetail.final_score != null ? (
                        <Badge variant="success">{gradeDetail.final_score}</Badge>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-medium text-gray-700">Nhận xét</td>
                    <td className="px-4 py-3 text-xs text-gray-600 max-w-[180px]">{gradeDetail.process?.comment || '—'}</td>
                    <td className="px-4 py-3 text-xs text-gray-600 max-w-[180px]">{gradeDetail.final?.comment || '—'}</td>
                    <td className="px-4 py-3 text-xs text-gray-600 max-w-[180px]">{gradeDetail.reviewer?.comment || '—'}</td>
                    <td className="px-4 py-3 text-xs text-gray-600 max-w-[180px]">
                      {gradeDetail.committee_members.length > 0
                        ? gradeDetail.committee_members.map((m) => `${m.member_name}: ${m.score}`).join(', ')
                        : '—'}
                    </td>
                    <td className="px-4 py-3"></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </SectionCard>

          {gradeDetail.committee_members.length > 0 && (
            <SectionCard title="Điểm từng thành viên hội đồng" icon="fa-solid fa-users">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {gradeDetail.committee_members.map((member, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 bg-white">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <i className="fa-solid fa-user text-primary text-xs"></i>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-gray-800 truncate">{member.member_name}</div>
                      <div className="text-xs text-gray-400">{member.role}</div>
                    </div>
                    <div className="text-sm font-bold text-primary">{member.score}</div>
                  </div>
                ))}
              </div>
            </SectionCard>
          )}

          {gradeDetail.process?.comment && (
            <SectionCard title="Nhận xét từ giảng viên hướng dẫn" icon="fa-solid fa-chalkboard-user">
              <div className="rounded-lg bg-primary/5 border border-primary/10 p-4">
                <p className="text-sm text-gray-600 leading-relaxed">{gradeDetail.process.comment}</p>
              </div>
            </SectionCard>
          )}
        </>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <i className="fa-solid fa-star text-5xl mb-4"></i>
          <p className="text-sm font-medium">Chưa có dữ liệu điểm cho đợt này</p>
        </div>
      )}
    </div>
  );
}

export default function GradesAndResults() {
  const { user } = useUser();
  const isStudent = user?.role === 'student';
  const isStaff = user?.role === 'staff';

  usePageHeader({
    title: 'Điểm & Kết quả',
    description: isStudent ? 'Xem điểm và nhận xét đề tài của bạn' : isStaff ? 'Xem điểm các đề tài trong khoa' : 'Quản lý điểm các đề tài trong hội đồng',
  });

  if (isStudent) return <StudentGradeView />;
  return <LecturerGradeView readonly={isStaff} />;
}
