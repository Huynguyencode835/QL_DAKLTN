import { useState } from 'react';
import type { ReactNode } from 'react';
import { useModal } from '../contexts/ModalContext';
import { useToast } from '../contexts/ToastContext';
import { fetchWithAuth } from '../utils/ApiHelper';
import { endpoints } from '../config/Apis';
import Card, { SectionCard } from '../components/Ui/Card';
import Button from '../components/Ui/Button';
import Badge from '../components/Ui/Badge';

export const REPORT_STATUS_CONFIG: Record<string, { label: string; variant: 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'info' }> = {
  pending: { label: 'Chưa nộp', variant: 'neutral' },
  submitted: { label: 'Đã nộp', variant: 'info' },
  reviewed: { label: 'Đã xem / góp ý', variant: 'warning' },
  approved: { label: 'Đã duyệt', variant: 'success' },
  rejected: { label: 'Yêu cầu nộp lại', variant: 'danger' },
  late: { label: 'Nộp trễ', variant: 'danger' },
};

export interface ReportDetail {
  id: number;
  registration: number;
  report_type: string;
  sequence_number: number | null;
  title: string;
  file_name: string;
  file_size: number;
  status: string;
  feedback: string;
  reviewed_at: string | null;
  created_date: string;
}

export function formatFileSize(bytes: number | undefined | null): string {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatDate(iso: string | undefined | null): string {
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

function DetailInfo({ icon, label, value }: { icon: string; label: string; value: ReactNode }) {
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

export function useReportDetail() {
  const { openModal, closeModal } = useModal();
  const toast = useToast();
  const [detailLoading, setDetailLoading] = useState(false);
  const [downloadLoading, setDownloadLoading] = useState(false);

  const handleDownload = async (reportId: number) => {
    setDownloadLoading(true);
    await fetchWithAuth(
      endpoints.reportDownload(reportId),
      (data: any) => {
        if (data?.url) window.open(data.url, '_blank');
      },
      (type: string, msg: string) => {
        toast.error('Không thể tải file', msg);
      },
      {},
      setDownloadLoading,
    );
  };

  const openDetail = async (reportId: number) => {
    await fetchWithAuth(
      endpoints.reportDetail(reportId),
      (data: ReportDetail) => {
        const status = REPORT_STATUS_CONFIG[data.status] || REPORT_STATUS_CONFIG.submitted;
        openModal({
          title: data.title || data.file_name || 'Chi tiết báo cáo',
          description: 'Thông tin chi tiết báo cáo đã nộp',
          icon: 'fa-regular fa-file-lines',
          size: 'md',
          content: (
            <div className="space-y-5">
              <Card
                variant="soft"
                className="!bg-primary/5 !border-primary/10 !p-4"
                bodyClassName="!p-0 flex items-center justify-between gap-4"
              >
                <div className="min-w-0">
                  <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">Báo cáo</p>
                  <p className="text-sm font-semibold text-gray-800 truncate">{data.title || data.file_name || '—'}</p>
                </div>
                <Badge variant={status.variant} dot>{status.label}</Badge>
              </Card>

              <SectionCard title="Thông tin báo cáo" icon="fa-solid fa-circle-info">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <DetailInfo
                    icon="fa-solid fa-tags"
                    label="Loại báo cáo"
                    value={
                      data.report_type === 'periodic'
                        ? `Định kỳ${data.sequence_number != null ? ` - Lần ${data.sequence_number}` : ''}`
                        : 'Cuối kỳ'
                    }
                  />
                  <DetailInfo icon="fa-regular fa-file" label="Tên file" value={data.file_name} />
                  <DetailInfo icon="fa-solid fa-weight-hanging" label="Dung lượng" value={formatFileSize(data.file_size)} />
                  <DetailInfo icon="fa-regular fa-clock" label="Ngày nộp" value={formatDate(data.created_date)} />
                  <DetailInfo
                    icon="fa-regular fa-comment-dots"
                    label="Ngày phản hồi"
                    value={data.reviewed_at ? formatDate(data.reviewed_at) : 'Chưa phản hồi'}
                  />
                </div>
              </SectionCard>

              {data.feedback && (
                <SectionCard title="Góp ý của giảng viên" icon="fa-regular fa-comments">
                  <p className="text-sm text-gray-600 leading-relaxed bg-gray-50 border border-gray-100 rounded-lg px-3 py-2">
                    {data.feedback}
                  </p>
                </SectionCard>
              )}
            </div>
          ),
          footer: (
            <>
              <Button variant="outline" size="sm" onClick={closeModal}>
                Đóng
              </Button>
              <Button variant="primary" size="sm" icon="fa-solid fa-download" onClick={() => handleDownload(data.id)} loading={downloadLoading} disabled={downloadLoading}>
                Tải xuống
              </Button>
            </>
          ),
        });
      },
      (type: string, msg: string) => {
        toast.error('Không thể tải chi tiết báo cáo', msg);
      },
      {},
      setDetailLoading,
    );
  };

  return { openDetail, handleDownload, detailLoading, downloadLoading };
}
