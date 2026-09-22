import { useEffect, useState } from 'react';
import { usePageHeader, useToast } from '../../hooks';
import { fetchWithAuth } from '../../utils/ApiHelper';
import { endpoints } from '../../config/Apis';
import Badge from '../../components/Ui/Badge';
import GenericTable, { TableColumn } from '../../components/GenericTable';
import {
  TwoPanelLayout,
  SidebarCardList,
  EmptyDetailState,
  DetailHeader,
  InfoTileGrid,
} from '../../components/ManagementLayout';
import { COMMITTEE_STATUS_CONFIG, COMMITTEE_ROLE_CONFIG, REVIEWER_APPROVAL_STATUS_CONFIG } from '../../types';
import type { CommitteeStatus, CommitteeMemberRole, ReviewerApprovalStatus } from '../../types';

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
    + ' ' + d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

interface CommitteeItem {
  id: number;
  name: string;
  defense_date: string;
  location: string;
  status: CommitteeStatus;
  registration_count: number;
}

interface ReviewerSessionItem {
  id: number;
  reviewer_name: string;
  defense_date: string;
  location: string;
  assignment_count: number;
}

type Tab = 'committees' | 'reviewer';

export default function MyDefenseSchedules() {
  const toast = useToast();
  const [tab, setTab] = useState<Tab>('committees');
  const [committees, setCommittees] = useState<CommitteeItem[]>([]);
  const [sessions, setSessions] = useState<ReviewerSessionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<any>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  usePageHeader({
    title: 'Lịch bảo vệ',
    description: 'Xem lịch bảo vệ hội đồng và phản biện của bạn',
  });

  useEffect(() => {
    if (tab === 'committees') loadCommittees();
    else loadSessions();
  }, [tab]);

  useEffect(() => {
    if (selectedId) {
      if (tab === 'committees') loadCommitteeDetail(selectedId);
      else loadSessionDetail(selectedId);
    }
  }, [selectedId, tab]);

  const loadCommittees = async () => {
    setLoading(true);
    setSelectedId(null);
    setDetail(null);
    await fetchWithAuth(
      endpoints.myCommittees,
      (data: CommitteeItem[]) => setCommittees(data),
      () => toast.error('Lỗi', 'Không thể tải danh sách hội đồng.'),
      {},
      setLoading,
    );
  };

  const loadSessions = async () => {
    setLoading(true);
    setSelectedId(null);
    setDetail(null);
    await fetchWithAuth(
      endpoints.myReviewerSessions,
      (data: ReviewerSessionItem[]) => setSessions(data),
      () => toast.error('Lỗi', 'Không thể tải danh sách phản biện.'),
      {},
      setLoading,
    );
  };

  const loadCommitteeDetail = async (id: number) => {
    setDetail(null);
    await fetchWithAuth(
      endpoints.myCommitteeDetail(id),
      (data: any) => setDetail(data),
      () => toast.error('Lỗi', 'Không thể tải chi tiết hội đồng.'),
      {},
      setLoadingDetail,
    );
  };

  const loadSessionDetail = async (id: number) => {
    setDetail(null);
    await fetchWithAuth(
      endpoints.myReviewerSessionDetail(id),
      (data: any) => setDetail(data),
      () => toast.error('Lỗi', 'Không thể tải chi tiết phản biện.'),
      {},
      setLoadingDetail,
    );
  };

  const selectedItem = tab === 'committees'
    ? committees.find((c) => c.id === selectedId) || null
    : sessions.find((s) => s.id === selectedId) || null;

  const memberColumns: TableColumn<any>[] = [
    { key: 'stt', label: 'STT', align: 'center', render: (row) => {
      const idx = detail?.members_detail?.findIndex((m: any) => m.id === row.id) ?? -1;
      return <span className="text-gray-500">{idx >= 0 ? idx + 1 : '—'}</span>;
    }},
    { key: 'lecturer_name', label: 'Họ tên', render: (row) => <span className="font-medium text-gray-800">{row.lecturer_name}</span> },
    { key: 'role', label: 'Vai trò', render: (row) => { const cfg = COMMITTEE_ROLE_CONFIG[row.role as CommitteeMemberRole]; return <Badge variant={cfg?.variant || 'neutral'}>{cfg?.label || row.role}</Badge>; } },
  ];

  const regColumns: TableColumn<any>[] = [
    { key: 'stt', label: 'STT', align: 'center', render: (row) => {
      const idx = detail?.registrations_detail?.findIndex((r: any) => r.id === row.id) ?? -1;
      return <span className="text-gray-500">{idx >= 0 ? idx + 1 : '—'}</span>;
    }},
    { key: 'project_title', label: 'Đề tài', render: (row) => <span className="font-medium text-gray-800 line-clamp-1">{row.project_title}</span> },
    { key: 'student_name', label: 'Sinh viên', render: (row) => <div><div className="text-sm text-gray-800">{row.student_name}</div><div className="text-xs text-gray-400">{row.student_id}</div></div> },
    { key: 'approval_status', label: 'Trạng thái', render: (row) => { const cfg = REVIEWER_APPROVAL_STATUS_CONFIG[row.approval_status as ReviewerApprovalStatus]; return cfg ? <Badge variant={cfg.variant} className="text-[10px]">{cfg.label}</Badge> : <span className="text-gray-400">—</span>; } },
  ];

  return (
    <div className="space-y-6">
      {/* Tab switcher */}
      <div className="flex gap-2 bg-gray-100 p-1 rounded-xl w-fit">
        <button
          onClick={() => { setTab('committees'); setSelectedId(null); setDetail(null); }}
          className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            tab === 'committees' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <i className="fa-solid fa-people-group mr-2"></i>Hội đồng
        </button>
        <button
          onClick={() => { setTab('reviewer'); setSelectedId(null); setDetail(null); }}
          className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            tab === 'reviewer' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <i className="fa-solid fa-users-rectangle mr-2"></i>Phản biện
        </button>
      </div>

      <TwoPanelLayout
        leftContent={
          loading ? (
            <div className="flex items-center justify-center py-12">
              <i className="fa-solid fa-circle-notch animate-spin text-primary text-2xl"></i>
            </div>
          ) : tab === 'committees' ? (
            <SidebarCardList
              title="Hội đồng" count={committees.length} items={committees}
              selectedId={selectedId}
              onSelect={(id) => setSelectedId(id)}
              emptyText="Bạn chưa có lịch bảo vệ hội đồng nào"
              icon="fa-solid fa-people-group"
              renderItem={(item) => {
                const c = item as CommitteeItem;
                const cfg = COMMITTEE_STATUS_CONFIG[c.status];
                return (
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-gray-800 line-clamp-2 leading-snug">{c.name}</div>
                      <div className="text-xs text-gray-400 mt-1.5 flex items-center gap-1"><i className="fa-regular fa-calendar"></i>{formatDate(c.defense_date)}</div>
                      <div className="text-xs text-gray-400 mt-0.5 flex items-center gap-1"><i className="fa-solid fa-location-dot"></i>{c.location || 'Chưa có'}</div>
                    </div>
                    <Badge variant={cfg?.variant || 'neutral'} className="shrink-0 text-[10px]">{cfg?.label}</Badge>
                  </div>
                );
              }}
            />
          ) : (
            <SidebarCardList
              title="Phản biện" count={sessions.length} items={sessions}
              selectedId={selectedId}
              onSelect={(id) => setSelectedId(id)}
              emptyText="Bạn chưa có lịch phản biện nào"
              icon="fa-solid fa-users-rectangle"
              renderItem={(item) => {
                const s = item as ReviewerSessionItem;
                return (
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-gray-800 line-clamp-2 leading-snug">{s.reviewer_name}</div>
                      <div className="text-xs text-gray-400 mt-1.5 flex items-center gap-1"><i className="fa-regular fa-calendar"></i>{formatDate(s.defense_date)}</div>
                      <div className="text-xs text-gray-400 mt-0.5 flex items-center gap-1"><i className="fa-solid fa-location-dot"></i>{s.location || 'Chưa có'}</div>
                    </div>
                    <Badge variant="neutral" className="shrink-0 text-[10px]">{s.assignment_count} đề tài</Badge>
                  </div>
                );
              }}
            />
          )
        }
        rightContent={
          !selectedItem ? (
            <EmptyDetailState
              mainText={tab === 'committees' ? 'Chọn một hội đồng từ danh sách bên trái' : 'Chọn một đợt phản biện từ danh sách bên trái'}
              subText="để xem chi tiết lịch bảo vệ"
            />
          ) : loadingDetail ? (
            <div className="flex items-center justify-center py-20">
              <i className="fa-solid fa-circle-notch animate-spin text-primary text-2xl"></i>
            </div>
          ) : tab === 'committees' && detail ? (
            <CommitteeDetailContent detail={detail} />
          ) : tab === 'reviewer' && detail ? (
            <SessionDetailContent detail={detail} />
          ) : null
        }
      />
    </div>
  );
}

function CommitteeDetailContent({ detail }: { detail: any }) {
  const statusCfg = COMMITTEE_STATUS_CONFIG[detail.status as CommitteeStatus];

  return (
    <div className="space-y-6">
      <DetailHeader
        title={detail.name}
        badges={[
          { label: statusCfg?.label || detail.status, variant: statusCfg?.variant || 'neutral', dot: true },
          { label: `${detail.registrations_detail?.length || 0} đề tài`, variant: 'neutral' },
          { label: `${detail.members_detail?.length || 0} thành viên`, variant: 'neutral' },
        ]}
      />

      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
        <div className="flex items-center gap-2">
          <i className="fa-regular fa-calendar text-gray-400"></i>
          <span>{formatDate(detail.defense_date)}</span>
        </div>
        <div className="flex items-center gap-2">
          <i className="fa-solid fa-location-dot text-gray-400"></i>
          <span>{detail.location || 'Chưa có'}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2 mb-4">
              <i className="fa-solid fa-user-group text-primary"></i>Thành viên hội đồng
            </h3>
            <GenericTable
              rows={detail.members_detail || []}
              columns={[
                { key: 'stt', label: 'STT', align: 'center', render: (row: any) => {
                  const idx = detail.members_detail?.findIndex((m: any) => m.id === row.id) ?? -1;
                  return <span className="text-gray-500">{idx >= 0 ? idx + 1 : '—'}</span>;
                }},
                { key: 'lecturer_name', label: 'Họ tên', render: (row: any) => <span className="font-medium text-gray-800">{row.lecturer_name}</span> },
                { key: 'role', label: 'Vai trò', render: (row: any) => { const cfg = COMMITTEE_ROLE_CONFIG[row.role as CommitteeMemberRole]; return <Badge variant={cfg?.variant || 'neutral'}>{cfg?.label || row.role}</Badge>; } },
              ]}
              rowKey={(row) => row.id}
              emptyText="Chưa có thành viên"
            />
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2 mb-4">
              <i className="fa-solid fa-file-lines text-primary"></i>Đề tài của bạn
            </h3>
            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
              {(detail.registrations_detail || []).map((r: any) => (
                <div key={r.id} className="p-3 rounded-xl border border-primary/20 bg-primary/5">
                  <div className="text-sm font-medium text-gray-800 line-clamp-2">{r.project_title}</div>
                  <div className="text-xs text-gray-400 mt-1">Trạng thái: {r.status}</div>
                </div>
              ))}
              {(!detail.registrations_detail || detail.registrations_detail.length === 0) && (
                <p className="text-sm text-gray-400 text-center py-3">Không tìm thấy đề tài của bạn trong hội đồng này</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SessionDetailContent({ detail }: { detail: any }) {
  return (
    <div className="space-y-6">
      <DetailHeader
        title={`Phản biện - ${detail.reviewer_name}`}
        badges={[
          { label: `${detail.assignments?.length || 0} đề tài`, variant: 'neutral' },
        ]}
      />

      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
        <div className="flex items-center gap-2">
          <i className="fa-regular fa-calendar text-gray-400"></i>
          <span>{formatDate(detail.defense_date)}</span>
        </div>
        <div className="flex items-center gap-2">
          <i className="fa-solid fa-location-dot text-gray-400"></i>
          <span>{detail.location || 'Chưa có'}</span>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2 mb-4">
          <i className="fa-solid fa-file-lines text-primary"></i>Đề tài của bạn
        </h3>
        <GenericTable
          rows={detail.assignments || []}
          columns={[
            { key: 'stt', label: 'STT', align: 'center', render: (row: any) => {
              const idx = detail.assignments?.findIndex((a: any) => a.registration_id === row.registration_id) ?? -1;
              return <span className="text-gray-500">{idx >= 0 ? idx + 1 : '—'}</span>;
            }},
            { key: 'project_title', label: 'Đề tài', render: (row: any) => <span className="font-medium text-gray-800 line-clamp-1">{row.project_title}</span> },
            { key: 'student_name', label: 'Sinh viên', render: (row: any) => <div><div className="text-sm text-gray-800">{row.student_name}</div><div className="text-xs text-gray-400">{row.student_id}</div></div> },
            { key: 'approval_status', label: 'Trạng thái', render: (row: any) => { const cfg = REVIEWER_APPROVAL_STATUS_CONFIG[row.approval_status as ReviewerApprovalStatus]; return cfg ? <Badge variant={cfg.variant} className="text-[10px]">{cfg.label}</Badge> : <span className="text-gray-400">—</span>; } },
          ]}
          rowKey={(row) => row.registration_id}
          emptyText="Không tìm thấy đề tài của bạn trong đợt này"
        />
      </div>
    </div>
  );
}
