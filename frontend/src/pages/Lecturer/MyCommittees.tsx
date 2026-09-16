import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePageHeader, usePagination, useSearch, usePeriod } from '../../hooks';
import { fetchWithAuth } from '../../utils/ApiHelper';
import { endpoints } from '../../config/Apis';
import Button from '../../components/Ui/Button';
import Badge from '../../components/Ui/Badge';
import FilterBar from '../../components/FilterBar';
import GenericTable, { TableColumn } from '../../components/GenericTable';
import Pagination from '../../components/Ui/Pagination';
import { COMMITTEE_STATUS_CONFIG, COMMITTEE_ROLE_CONFIG } from '../../types';
import type { MyCommittee, RegistrationPeriod } from '../../types';

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
    + ' ' + d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

export default function MyCommittees() {
  const navigate = useNavigate();
  const { projectPeriod, thesisPeriod } = usePeriod();
  const period = projectPeriod || thesisPeriod;
  const [committees, setCommittees] = useState<MyCommittee[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [periods, setPeriods] = useState<RegistrationPeriod[]>([]);
  const [periodsLoading, setPeriodsLoading] = useState(true);
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>('');
  const { search, setSearch, searchParams } = useSearch();
  const { resetPage, paginationParams, handlePaginatedResponse, paginationProps } = usePagination();

  usePageHeader({
    title: 'Hội đồng tham gia',
    description: 'Danh sách các hội đồng bạn tham gia với vai trò ủy viên.',
  });

  useEffect(() => {
    loadPeriods();
  }, []);

  useEffect(() => {
    if (period?.id && !selectedPeriodId) {
      setSelectedPeriodId(String(period.id));
    }
  }, [period?.id]);

  useEffect(() => {
    resetPage();
  }, [statusFilter, searchParams]);

  useEffect(() => {
    if (selectedPeriodId) loadCommittees();
  }, [selectedPeriodId, paginationParams.page, searchParams, statusFilter]);

  const loadPeriods = async () => {
    await fetchWithAuth(
      endpoints.registrationPeriods,
      (data: RegistrationPeriod[]) => setPeriods(data),
      () => {},
      {},
      () => setPeriodsLoading(false)
    );
  };

  const loadCommittees = async () => {
    if (!selectedPeriodId) return;
    setLoading(true);
    await fetchWithAuth(
      endpoints.committees(selectedPeriodId),
      (data: any) => {
        const raw = Array.isArray(data) ? data : data?.results ?? [];
        const list = raw.map((c: any) => ({
          ...c,
          role_in_committee: c.role_in_committee ?? c.role,
        }));
        handlePaginatedResponse(list, { count: list.length });
        setCommittees(list);
      },
      () => {},
      { search: searchParams.search || undefined, status: statusFilter || undefined },
      setLoading
    );
  };

  const columns: TableColumn<MyCommittee>[] = useMemo(
    () => [
      {
        key: 'stt',
        label: 'STT',
        align: 'center',
        render: (row) => {
          const idx = committees.findIndex((c) => c.id === row.id);
          return <span className="font-medium text-gray-500">{idx + 1}</span>;
        },
      },
      {
        key: 'name',
        label: 'Tên hội đồng',
        render: (row) => (
          <span className="font-medium text-gray-800">{row.name}</span>
        ),
      },
      {
        key: 'location',
        label: 'Phòng',
        render: (row) => (
          <div className="flex items-center gap-2">
            <i className="fa-solid fa-location-dot text-gray-400 text-xs"></i>
            <span className="text-gray-600">{row.location || '—'}</span>
          </div>
        ),
      },
      {
        key: 'defense_date',
        label: 'Ngày giờ',
        render: (row) => (
          <div className="flex items-center gap-2">
            <i className="fa-regular fa-calendar text-gray-400 text-xs"></i>
            <span className="text-gray-600">{formatDate(row.defense_date)}</span>
          </div>
        ),
      },
      {
        key: 'role_in_committee',
        label: 'Vai trò',
        render: (row) => {
          const cfg = COMMITTEE_ROLE_CONFIG[row.role_in_committee];
          return <Badge variant={cfg?.variant || 'neutral'}>{cfg?.label || row.role_in_committee}</Badge>;
        },
      },
      {
        key: 'status',
        label: 'Trạng thái',
        render: (row) => {
          const cfg = COMMITTEE_STATUS_CONFIG[row.status];
          return <Badge variant={cfg?.variant || 'neutral'} dot>{cfg?.label || row.status}</Badge>;
        },
      },
      {
        key: 'actions',
        label: 'Thao tác',
        align: 'right',
        render: (row) => (
          <Button
            variant="outline"
            size="sm"
            icon="fa-regular fa-eye"
            onClick={() => navigate(`/my-committees/${row.id}`, { state: { periodId: selectedPeriodId } })}
          >
            Chi tiết
          </Button>
        ),
      },
    ],
    [navigate, selectedPeriodId]
  );

  return (
    <div className="space-y-6">
      <div className="mx-auto w-full space-y-6">
        <FilterBar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Tìm kiếm tên hội đồng, phòng..."
          dropdowns={[
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
                ...periods.map((p) => ({ value: String(p.id), label: `${p.name} (${p.academic_year})` })),
              ],
            },
            {
              key: 'status',
              value: statusFilter,
              onChange: (v) => setStatusFilter(v === 'all' ? '' : v),
              placeholder: 'Tất cả trạng thái',
              widthClassName: 'w-full sm:w-56',
              options: [
                { value: '', label: 'Tất cả' },
                { value: 'NOT_STARTED', label: 'Chưa diễn ra' },
                { value: 'IN_PROGRESS', label: 'Đang diễn ra' },
                { value: 'COMPLETED', label: 'Kết thúc' },
              ],
            },
          ]}
          onRefresh={loadCommittees}
          refreshLoading={loading}
        />

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <i className="fa-solid fa-circle-notch animate-spin text-primary text-2xl"></i>
          </div>
        ) : (
          <>
            <GenericTable
              rows={committees}
              columns={columns}
              rowKey={(row) => row.id}
              emptyText="Không có hội đồng nào"
            />
            <Pagination {...paginationProps} />
          </>
        )}
      </div>
    </div>
  );
}
