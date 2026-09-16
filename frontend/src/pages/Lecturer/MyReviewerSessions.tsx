import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePageHeader, usePagination, useSearch, usePeriod } from '../../hooks';
import { fetchWithAuth } from '../../utils/ApiHelper';
import { endpoints } from '../../config/Apis';
import Badge from '../../components/Ui/Badge';
import FilterBar from '../../components/FilterBar';
import GenericTable, { TableColumn } from '../../components/GenericTable';
import Pagination from '../../components/Ui/Pagination';
import type { ReviewerAssignmentSession, RegistrationPeriod } from '../../types';

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
    + ' ' + d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

export default function MyReviewerSessions() {
  const navigate = useNavigate();
  const { thesisPeriod } = usePeriod();
  const [sessions, setSessions] = useState<ReviewerAssignmentSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [periods, setPeriods] = useState<RegistrationPeriod[]>([]);
  const [periodsLoading, setPeriodsLoading] = useState(true);
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>('');
  const { search, setSearch, searchParams } = useSearch();
  const { resetPage, paginationParams, handlePaginatedResponse, paginationProps } = usePagination();

  usePageHeader({
    title: 'Đợt phản biện',
    description: 'Danh sách các đợt phản biện bạn tham gia với vai trò phản biện.',
  });

  useEffect(() => {
    loadPeriods();
  }, []);

  useEffect(() => {
    if (thesisPeriod?.id && !selectedPeriodId) {
      setSelectedPeriodId(String(thesisPeriod.id));
    }
  }, [thesisPeriod?.id]);

  useEffect(() => {
    resetPage();
  }, [searchParams]);

  useEffect(() => {
    if (selectedPeriodId) loadSessions();
  }, [selectedPeriodId, paginationParams.page, searchParams]);

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
        handlePaginatedResponse(raw, { count: raw.length });
        setSessions(raw);
      },
      () => {},
      { search: searchParams.search || undefined },
      setLoading
    );
  };

  const columns: TableColumn<ReviewerAssignmentSession>[] = [
    {
      key: 'stt', label: 'STT', align: 'center',
      render: (row) => {
        const idx = sessions.findIndex((s) => s.id === row.id);
        return <span className="font-medium text-gray-500">{idx + 1}</span>;
      },
    },
    {
      key: 'reviewer_name', label: 'Giảng viên phản biện',
      render: (row) => <span className="font-medium text-gray-800">{row.reviewer_name}</span>,
    },
    {
      key: 'defense_date', label: 'Ngày giờ bảo vệ',
      render: (row) => (
        <div className="flex items-center gap-2">
          <i className="fa-regular fa-calendar text-gray-400 text-xs"></i>
          <span className="text-gray-600">{formatDate(row.defense_date)}</span>
        </div>
      ),
    },
    {
      key: 'location', label: 'Phòng',
      render: (row) => (
        <div className="flex items-center gap-2">
          <i className="fa-solid fa-location-dot text-gray-400 text-xs"></i>
          <span className="text-gray-600">{row.location || '—'}</span>
        </div>
      ),
    },
    {
      key: 'assignment_count', label: 'Số đề tài',
      render: (row) => (
        <Badge variant="neutral">{row.assignment_count} đề tài</Badge>
      ),
    },
    {
      key: 'actions', label: 'Thao tác', align: 'center',
      render: (row) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/my-reviewer-sessions/${row.id}`, { state: { periodId: selectedPeriodId } });
          }}
          className="px-3 py-1.5 text-xs font-medium text-primary bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors"
        >
          <i className="fa-solid fa-eye mr-1"></i>Xem
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="mx-auto w-full space-y-6">
        <FilterBar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Tìm kiếm phòng, ngày..."
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
        />

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <i className="fa-solid fa-circle-notch animate-spin text-primary text-2xl"></i>
          </div>
        ) : (
          <>
            <GenericTable
              rows={sessions}
              columns={columns}
              rowKey={(row) => row.id}
              emptyText="Không có đợt phản biện nào"
            />
            <Pagination {...paginationProps} />
          </>
        )}
      </div>
    </div>
  );
}
