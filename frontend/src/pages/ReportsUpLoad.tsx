import { useEffect, useState } from 'react';
import { useUser, usePageHeader, useToast } from '../hooks';
import { fetchWithAuth, createWithAuth } from '../utils/ApiHelper';
import { endpoints } from '../config/Apis';
import Card, { SectionCard } from '../components/Ui/Card';
import Button from '../components/Ui/Button';
import Badge from '../components/Ui/Badge';
import Input from '../components/Ui/Input';
import Select from '../components/Ui/Select';

const REPORT_STATUS_CONFIG: Record<string, { label: string; variant: 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'info' }> = {
  submitted: { label: 'Đã nộp', variant: 'info' },
  reviewed: { label: 'Đã xem / góp ý', variant: 'warning' },
  approved: { label: 'Đã duyệt', variant: 'success' },
  rejected: { label: 'Yêu cầu nộp lại', variant: 'danger' },
  late: { label: 'Nộp trễ', variant: 'danger' },
};

const REPORT_TYPE_CONFIG: Record<string, { label: string; variant: 'primary' | 'info' }> = {
  periodic: { label: 'Định kỳ', variant: 'primary' },
  final: { label: 'Cuối kỳ', variant: 'info' },
};

const REPORT_TYPE_OPTIONS = [
  { value: 'periodic', label: 'Báo cáo định kỳ' },
  { value: 'final', label: 'Báo cáo cuối kỳ' },
];

const emptyForm = {
  report_type: 'periodic',
  sequence_number: '',
  title: '',
  file: null as File | null,
};

function formatFileSize(bytes: number | undefined | null): string {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

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

export default function ReportsUpLoad() {
  const { user } = useUser();
  const toast = useToast();
  const [registration, setRegistration] = useState<any | null>(null);
  const [reports, setReports] = useState<any[]>([]);
  const [form, setForm] = useState({ ...emptyForm });
  const [loading, setLoading] = useState(true);
  const [loadingReports, setLoadingReports] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  usePageHeader({
    title: 'Nộp báo cáo',
    description: 'Nộp báo cáo định kỳ / cuối kỳ cho đồ án của bạn.',
  });

  const update = (field: string) => (e: any) => {
    const value = field === 'file' ? e.target?.files?.[0] ?? null : (e.target?.value ?? e);
    setForm(prev => ({ ...prev, [field]: value }));
  };

  useEffect(() => {
    if (!user) return;
    fetchWithAuth(
      endpoints.registrations("current"),
      (data: any[]) => {
        const reg = data && data.length > 0 ? data[0] : null;
        setRegistration(reg);
        setLoading(false);
      },
      () => setLoading(false),
    );
  }, [user]);

  useEffect(() => {
    if (!registration) return;
    setLoadingReports(true);
    fetchWithAuth(
      endpoints.reports,
      setReports,
      () => { },
      { registration_id: registration.id },
      setLoadingReports,
    );
  }, [registration]);

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

    const body = new FormData();
    body.append('registration_id', String(registration.id));
    body.append('report_type', form.report_type);
    if (form.report_type === 'periodic' && form.sequence_number) {
      body.append('sequence_number', form.sequence_number);
    }
    if (form.title) {
      body.append('title', form.title);
    }
    body.append('file', form.file);

    await createWithAuth(
      endpoints.reports,
      body,
      () => {
        toast.success('Nộp báo cáo thành công', 'Báo cáo của bạn đã được gửi lên hệ thống.');
        setForm({ ...emptyForm });
        fetchWithAuth(
          endpoints.reports,
          setReports,
          () => { },
          { registration_id: registration.id },
          setLoadingReports,
        );
      },
      (type: string, msg: string) => {
        toast.error(type === 'network' ? 'Lỗi mạng' : type === 'server' ? 'Lỗi máy chủ' : 'Lỗi', msg);
      },
      setSubmitting,
    );
  };

  const handleDownload = (report: any) => {
    fetchWithAuth(
      endpoints.reportDownload(report.id),
      (data: any) => {
        if (data?.url) window.open(data.url, '_blank');
      },
      (type: string, msg: string) => {
        toast.error('Không thể tải file', msg);
      },
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
      <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-gray-400">
          <i className="fa-solid fa-spinner fa-spin text-3xl"></i>
          <p className="text-sm">Đang tải thông tin đăng ký...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-background">
      <div className="max-w-7xl mx-auto w-full space-y-6">
        {!registration ? (
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
                    <Input
                      label="Số thứ tự báo cáo"
                      required
                      type="number"
                      min={1}
                      placeholder="VD: 1"
                      value={form.sequence_number}
                      onChange={update('sequence_number')}
                    />
                  )}
                </div>

                <Input
                  label="Tiêu đề báo cáo"
                  placeholder="Nhập tiêu đề báo cáo (tùy chọn)"
                  value={form.title}
                  onChange={update('title')}
                />

                <Input
                  label="File báo cáo"
                  required
                  type="file"
                  accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  onChange={update('file')}
                  helperText="Chỉ chấp nhận file PDF hoặc DOCX, tối đa 10MB."
                />

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
              ) : reports.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                  <i className="fa-regular fa-folder-open text-4xl mb-3"></i>
                  <p className="text-sm font-medium">Chưa có báo cáo nào được nộp</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {reports.map((report: any) => {
                    const status = REPORT_STATUS_CONFIG[report.status] || REPORT_STATUS_CONFIG.submitted;
                    const type = REPORT_TYPE_CONFIG[report.report_type] || { label: report.report_type, variant: 'info' as const };
                    return (
                      <Card
                        key={report.id}
                        variant="outline"
                        bodyClassName="!p-0 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 w-full"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <Badge variant={type.variant}>
                              {type.label}
                            </Badge>
                            {report.report_type === 'periodic' && report.sequence_number != null && (
                              <Badge variant="neutral">Lần {report.sequence_number}</Badge>
                            )}
                            <Badge variant={status.variant} dot>{status.label}</Badge>
                          </div>
                          <p className="font-medium text-gray-800 text-sm truncate">
                            {report.title || report.file_name}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-3 flex-wrap">
                            <span className="inline-flex items-center gap-1">
                              <i className="fa-regular fa-file"></i> {report.file_name}
                            </span>
                            <span>{formatFileSize(report.file_size)}</span>
                            <span className="inline-flex items-center gap-1">
                              <i className="fa-regular fa-clock"></i> {formatDate(report.created_date)}
                            </span>
                          </p>
                          {report.feedback && (
                            <p className="text-xs text-gray-500 mt-2 bg-gray-50 border border-gray-100 rounded-lg px-3 py-2">
                              <span className="font-medium text-gray-600">Góp ý: </span>{report.feedback}
                            </p>
                          )}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          icon="fa-solid fa-download"
                          className="shrink-0"
                          onClick={() => handleDownload(report)}
                        >
                          Tải xuống
                        </Button>
                      </Card>
                    );
                  })}
                </div>
              )}
            </SectionCard>
            </div>

            <div className="w-80 shrink-0 space-y-6">
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
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

function StatBox({ icon, label, value, color }: { icon: string; label: string; value: number; color: string }) {
  return (
    <div className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-white border border-gray-100">
      <span className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}>
        <i className={`${icon} text-sm`}></i>
      </span>
      <span className="text-lg font-bold text-gray-800 leading-none">{value}</span>
      <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wide text-center">{label}</span>
    </div>
  );
}
