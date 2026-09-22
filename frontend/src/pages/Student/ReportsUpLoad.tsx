import { useEffect, useRef, useState } from 'react';
import { useUser, usePageHeader, useToast, useReportDetail, usePeriod } from '../../hooks';
import { REPORT_STATUS_CONFIG, formatFileSize, formatDate } from '../../hooks/useReportDetail';
import { fetchWithAuth, createWithAuth } from '../../utils/ApiHelper';
import { endpoints } from '../../config/Apis';
import Card, { SectionCard } from '../../components/Ui/Card';
import Button from '../../components/Ui/Button';
import Badge from '../../components/Ui/Badge';
import Input from '../../components/Ui/Input';
import Select from '../../components/Ui/Select';
import type { Schedules } from '../../types';
import PeriodCardInProgress from '../../components/Period/PeriodCardInProgress';
import PeriodCardReportSubmission from '../../components/Period/PeriodCardReportSubmission';

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

interface MatrixColumn {
  key: string;
  label: string;
  schedule_id: number | null;
  deadline: string | null;
}

interface MatrixCell {
  status: string;
  report_id: number | null;
  submitted_at: string | null;
}

const REPORT_TYPE_OPTIONS = [
  { value: 'periodic', label: 'Báo cáo định kỳ' },
  { value: 'final', label: 'Báo cáo cuối kỳ' },
];

const emptyForm = {
  report_type: 'periodic',
  schedule_id: '',
  title: '',
  file: null as File | null,
};

export default function ReportsUpLoad() {
  const { user } = useUser();
  const toast = useToast();
  const { openDetail, handleDownload, detailLoading } = useReportDetail();
  const { projectPeriod, thesisPeriod } = usePeriod();

  const [tab, setTab] = useState<'project' | 'thesis'>('project');
  const [regProject, setRegProject] = useState<any | null>(null);
  const [regThesis, setRegThesis] = useState<any | null>(null);

  const registration = tab === 'project' ? regProject : regThesis;
  const currentPeriod = tab === 'project' ? projectPeriod : thesisPeriod;
  const matrixPeriodKey = tab === 'project' ? 'current-project' : 'current-thesis';
  const hasBoth = !!(regProject && regThesis);

  const [matrixColumns, setMatrixColumns] = useState<MatrixColumn[]>([]);
  const [matrixReports, setMatrixReports] = useState<Record<string, MatrixCell>>({});
  const [schedules, setSchedules] = useState<Schedules[]>([]);
  const [loadingSchedules, setLoadingSchedules] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [loading, setLoading] = useState(true);
  const [loadingReports, setLoadingReports] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [downloading, setDownloading] = useState<number | null>(null);

  usePageHeader({
    title: 'Nộp báo cáo',
    description: 'Nộp báo cáo định kỳ / cuối kỳ cho đồ án của bạn.',
  });

  const update = (field: string) => (e: any) => {
    setForm(prev => ({ ...prev, [field]: e.target?.value ?? e }));
  };

  const selectFile = (file: File | undefined | null) => {
    if (!file) return;
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      toast.error('File không hợp lệ', 'Chỉ chấp nhận file PDF hoặc DOCX.');
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      toast.error('File quá lớn', 'File vượt quá dung lượng cho phép 10MB.');
      return;
    }
    setForm(prev => ({ ...prev, file }));
  };

  const handleFileChange = (e: any) => {
    selectFile(e.target?.files?.[0]);
    e.target.value = '';
  };

  const handleDrop = (e: any) => {
    e.preventDefault();
    setDragging(false);
    selectFile(e.dataTransfer?.files?.[0]);
  };

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    const fetchReg = (key: string) =>
      new Promise<any | null>((resolve) => {
        fetchWithAuth(
          endpoints.registrations(key),
          (d: any[]) => resolve(d?.[0] || null),
          () => resolve(null),
        );
      });

    Promise.all([fetchReg('current-project'), fetchReg('current-thesis')]).then(([p, t]) => {
      if (cancelled) return;
      setRegProject(p);
      setRegThesis(t);
      if (!p && t) setTab('thesis');
      setLoading(false);
    });

    return () => { cancelled = true; };
  }, [user]);

  const loadMatrix = async () => {
    await fetchWithAuth(
      endpoints.reportMatrix(matrixPeriodKey),
      (data: { columns: MatrixColumn[]; rows: { reports: Record<string, MatrixCell> }[] }) => {
        setMatrixColumns(data?.columns || []);
        setMatrixReports(data?.rows?.[0]?.reports || {});
      },
      (type: string, msg: string) => {
        toast.error('Không thể tải danh sách báo cáo', msg);
        setMatrixColumns([]);
        setMatrixReports({});
      },
      {},
      setLoadingReports,
    );
  };

  useEffect(() => {
    if (!user || !registration) return;
    setLoadingReports(true);
    loadMatrix();
  }, [user, matrixPeriodKey, registration]);

  useEffect(() => {
    const periodId = registration?.registration_period;
    if (form.report_type !== 'periodic' || !periodId) return;
    setLoadingSchedules(true);
    fetchWithAuth(
      endpoints.schedules(periodId),
      (data: Schedules[]) => setSchedules(data),
      () => setSchedules([]),
      {},
      setLoadingSchedules,
    );
  }, [registration, form.report_type]);

  useEffect(() => {
    setForm({ ...emptyForm });
    setSchedules([]);
  }, [tab]);

  const handleSubmit = async (e: any) => {
    e.preventDefault();

    if (!registration) {
      toast.error('Không thể nộp báo cáo', 'Bạn chưa có đăng ký đề tài nào để nộp báo cáo.');
      return;
    }
    if (!form.file) {
      toast.error('Thiếu file', 'Vui lòng chọn file báo cáo (PDF hoặc DOCX).');
      return;
    }
    if (form.report_type === 'periodic' && !form.schedule_id) {
      toast.error('Thiếu lịch báo cáo', 'Vui lòng chọn lịch báo cáo định kỳ cần nộp.');
      return;
    }

    const isPeriodic = form.report_type === 'periodic';
    const body = new FormData();
    if (form.title) {
      body.append('title', form.title);
    }
    body.append('file', form.file);

    await createWithAuth(
      isPeriodic ? endpoints.uploadPeriodicReport(form.schedule_id) : endpoints.uploadFinalReport,
      body,
      () => {
        toast.success('Nộp báo cáo thành công', 'Báo cáo của bạn đã được gửi lên hệ thống.');
        setForm({ ...emptyForm });
        loadMatrix();
      },
      (type: string, msg: string) => {
        toast.error(type === 'network' ? 'Lỗi mạng' : type === 'server' ? 'Lỗi máy chủ' : 'Lỗi', msg);
      },
      setSubmitting,
    );
  };

  const REG_STATUS_CONFIG: Record<string, { label: string; variant: 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'info' }> = {
    waiting_lecturer: { label: 'Chờ phân giảng viên', variant: 'warning' },
    assigned_lecturer: { label: 'Đã phân giảng viên', variant: 'info' },
    approved: { label: 'Đã duyệt', variant: 'success' },
    rejected: { label: 'Từ chối', variant: 'danger' },
  };

  const regStatus = REG_STATUS_CONFIG[registration?.status] || { label: registration?.status || '—', variant: 'neutral' as const };
  const regStatusVariant = regStatus.variant;
  const regStatusLabel = regStatus.label;

  if (loading) {
    return (
      <main className="flex-1 overflow-y-auto p-4 md:p-6  flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-gray-400">
          <i className="fa-solid fa-spinner fa-spin text-3xl"></i>
          <p className="text-sm">Đang tải thông tin đăng ký...</p>
        </div>
      </main>
    );
  }

  if (!regProject && !regThesis) {
    return (
      <main className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="max-w-7xl mx-auto w-full">
          <Card
            variant="soft"
            icon="fa-solid fa-circle-info"
            title="Chưa có đăng ký đề tài"
            className="!p-4 bg-blue-50/60 border-blue-100"
            bodyClassName="!p-0"
          >
            <p className="text-sm text-blue-700">
              Bạn chưa có đăng ký đồ án / khóa luận nào đang mở. Vui lòng đăng ký đề tài trước khi nộp báo cáo.
            </p>
          </Card>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 overflow-y-auto p-4 md:p-6">
      <div className="max-w-7xl mx-auto w-full space-y-6">
        {hasBoth && (
          <div className="flex gap-2 bg-gray-100 p-1 rounded-xl w-fit">
            <button
              onClick={() => setTab('project')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === 'project' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Đồ án
            </button>
            <button
              onClick={() => setTab('thesis')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === 'thesis' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Khóa luận
            </button>
          </div>
        )}

        {!registration ? (
          <Card
            variant="soft"
            icon="fa-solid fa-circle-info"
            title={`Chưa có đăng ký ${tab === 'project' ? 'đồ án' : 'khóa luận'}`}
            className="!p-4 bg-blue-50/60 border-blue-100"
            bodyClassName="!p-0"
          >
            <p className="text-sm text-blue-700">
              Bạn chưa có đăng ký {tab === 'project' ? 'đồ án' : 'khóa luận'} nào đang mở. Vui lòng đăng ký đề tài trước khi nộp báo cáo.
            </p>
          </Card>
        ) : (
          <div className="flex flex-col lg:flex-row gap-6">
            <div className="flex-1 space-y-6">
              <SectionCard title="Nộp báo cáo mới" icon="fa-solid fa-cloud-arrow-up">
                <form className="space-y-6" onSubmit={handleSubmit}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Select
                      label="Loại báo cáo"
                      required
                      value={form.report_type}
                      onChange={update('report_type')}
                      options={REPORT_TYPE_OPTIONS}
                    />
                    {form.report_type === 'periodic' && (
                      <Select
                        label="Lịch báo cáo"
                        required
                        placeholder={loadingSchedules ? 'Đang tải lịch...' : 'Chọn lịch báo cáo'}
                        value={form.schedule_id}
                        onChange={update('schedule_id')}
                        disabled={loadingSchedules}
                        options={schedules.map((s) => ({
                          value: String(s.id),
                          label: `Lần ${s.sequence_number}${s.title ? ` - ${s.title}` : ''} (Hạn: ${formatDate(s.deadline)})`,
                        }))}
                        helperText="Chỉ hiển thị các lịch báo cáo áp dụng cho bạn trong đợt đang mở."
                      />
                    )}
                  </div>

                  <Input
                    label="Tiêu đề báo cáo"
                    placeholder="Nhập tiêu đề báo cáo (tùy chọn)"
                    value={form.title}
                    onChange={update('title')}
                  />

                  <div className="space-y-1.5">
                    <label className="font-medium text-gray-700 text-sm">
                      File báo cáo <span className="text-red-500">*</span>
                    </label>
                    <div
                      className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center transition-colors cursor-pointer group relative overflow-hidden ${dragging ? 'border-primary bg-primary/5' : 'border-gray-300 bg-gray-50 hover:bg-gray-100'
                        }`}
                      onClick={() => fileInputRef.current?.click()}
                      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                      onDragLeave={() => setDragging(false)}
                      onDrop={handleDrop}
                    >
                      <div className="w-16 h-16 rounded-full bg-primary/5 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <i className="fa-solid fa-cloud-arrow-up text-primary text-2xl"></i>
                      </div>
                      <p className="text-sm text-gray-500 text-center">
                        Kéo thả hoặc <span className="text-primary underline">nhấp để tải lên</span>
                      </p>
                      <p className={`text-xs mt-2 max-w-full px-4 truncate ${form.file ? 'text-gray-700 font-medium' : 'text-gray-400'}`}>
                        {form.file
                          ? `${form.file.name} (${formatFileSize(form.file.size)})`
                          : 'Định dạng PDF, DOCX (Tối đa 10MB)'}
                      </p>
                      <input
                        ref={fileInputRef}
                        type="file"
                        name="report_file"
                        accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                        className="hidden"
                        onChange={handleFileChange}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                    <Button
                      type="submit"
                      icon="fa-solid fa-cloud-arrow-up"
                      loading={submitting}
                      disabled={submitting}
                    >
                      Nộp báo cáo
                    </Button>
                  </div>
                </form>
              </SectionCard>

              <SectionCard title="Báo cáo đã nộp" icon="fa-regular fa-file-lines">
                {loadingReports ? (
                  <div className="flex items-center justify-center py-10">
                    <i className="fa-solid fa-circle-notch animate-spin text-primary text-2xl"></i>
                  </div>
                ) : matrixColumns.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                    <i className="fa-regular fa-folder-open text-4xl mb-3"></i>
                    <p className="text-sm font-medium">Chưa có mốc báo cáo nào</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-xs font-medium text-gray-400 uppercase tracking-wide border-b border-gray-100">
                          <th className="py-2.5 pr-4">Mốc báo cáo</th>
                          <th className="py-2.5 pr-4">Hạn nộp</th>
                          <th className="py-2.5 pr-4">Trạng thái</th>
                          <th className="py-2.5 pr-4">Ngày nộp</th>
                          <th className="py-2.5 text-right">Tải xuống</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {matrixColumns.map((col) => {
                          const cell = matrixReports[col.key];
                          const reportId = cell?.report_id;
                          const status = REPORT_STATUS_CONFIG[cell?.status || 'pending'] || REPORT_STATUS_CONFIG.pending;
                          return (
                            <tr key={col.key} className="text-gray-700">
                              <td className="py-3 pr-4 font-medium text-gray-800 whitespace-nowrap">{col.label}</td>
                              <td className="py-3 pr-4 whitespace-nowrap">{formatDate(col.deadline)}</td>
                              <td className="py-3 pr-4">
                                <Badge variant={status.variant} dot>{status.label}</Badge>
                              </td>
                              <td className="py-3 pr-4 whitespace-nowrap">
                                {cell?.submitted_at ? formatDate(cell.submitted_at) : '—'}
                              </td>
                              <td className="py-3 text-right">
                                {reportId ? (
                                  <div className="flex items-center justify-end gap-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      icon="fa-solid fa-eye"
                                      loading={detailLoading}
                                      disabled={detailLoading}
                                      onClick={() => openDetail(reportId)}
                                    >
                                      Chi tiết
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      icon="fa-solid fa-download"
                                      loading={downloading === reportId}
                                      disabled={downloading === reportId}
                                      onClick={async () => { setDownloading(reportId); try { await handleDownload(reportId); } finally { setDownloading(null); } }}
                                    >
                                      Tải xuống
                                    </Button>
                                  </div>
                                ) : (
                                  <span className="text-gray-300">—</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </SectionCard>
            </div>

            <div className="w-80 shrink-0">
              <div className="lg:sticky  space-y-6">
                <Card
                  variant="elevated"
                  title="Thông tin đề tài"
                  icon="fa-solid fa-book-open"
                  bodyClassName="!p-0 space-y-4"
                >
                  <div>
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Tên đề tài</p>
                    <p className="text-sm font-medium text-gray-800 leading-snug">
                      {registration.project_title || '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Mô tả</p>
                    <p className="text-xs text-gray-600 leading-relaxed line-clamp-4">
                      {registration.project_description || '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">GVHD</p>
                    <p className="text-sm font-medium text-gray-800">
                      {registration.lecturer_name || 'Chưa phân công'}
                    </p>
                  </div>
                  <div className="pt-3 border-t border-gray-100">
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Trạng thái đăng ký</p>
                    <Badge variant={regStatusVariant} dot>{regStatusLabel}</Badge>
                  </div>
                </Card>

                {currentPeriod && <PeriodCardInProgress period={currentPeriod} />}
                {currentPeriod && <PeriodCardReportSubmission period={currentPeriod} />}

              </div>
            </div>


          </div>
        )}
      </div>
    </main>
  );
}
