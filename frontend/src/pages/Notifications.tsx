import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePageHeader, useToast, useSearch, usePagination } from '../hooks';
import FilterBar from '../components/FilterBar';
import GenericTable, { type TableColumn } from '../components/GenericTable';
import Pagination from '../components/Ui/Pagination';
import Button from '../components/Ui/Button';
import Badge from '../components/Ui/Badge';
import Card from '../components/Ui/Card';
import { NOTIFICATION_TYPE_CONFIG } from '../types';
import type { Notification } from '../types';

const MOCK_NOTIFICATIONS: Notification[] = [
  { id: 1, title: 'Đăng ký đề tài thành công', message: 'Đề tài "Ứng dụng AI trong dự đoán năng suất nông nghiệp" đã được đăng ký thành công.', type: 'success', is_read: false, created_at: new Date(Date.now() - 5 * 60000).toISOString(), link: '/topic-registration' },
  { id: 2, title: 'Phân công giảng viên hướng dẫn', message: 'Bạn đã được phân công hướng dẫn đề tài "Hệ thống quản lý thư viện thông minh" của sinh viên Trần Thị F.', type: 'info', is_read: false, created_at: new Date(Date.now() - 30 * 60000).toISOString(), link: '/students' },
  { id: 3, title: 'Hạn nộp báo cáo định kỳ sắp đến', message: 'Bạn còn 3 ngày để nộp báo cáo định kỳ lần 2. Vui lòng hoàn thành đúng hạn.', type: 'warning', is_read: false, created_at: new Date(Date.now() - 2 * 3600000).toISOString(), link: '/reports' },
  { id: 4, title: 'Lịch báo cáo định kỳ mới', message: 'Giảng viên đã tạo lịch báo cáo định kỳ lần 3. Hạn nộp: 15/10/2026.', type: 'info', is_read: true, created_at: new Date(Date.now() - 5 * 3600000).toISOString(), link: '/reports' },
  { id: 5, title: 'Báo cáo đã được chấm', message: 'Báo cáo định kỳ lần 1 của bạn đã được chấm. Điểm: 8.5/10.', type: 'success', is_read: true, created_at: new Date(Date.now() - 24 * 3600000).toISOString(), link: '/grades-and-results' },
  { id: 6, title: 'Đợt đăng ký mới được mở', message: 'Đợt đăng ký đồ án HK1-2026 đã được mở. Thời gian đăng ký từ 01/09/2026 đến 15/09/2026.', type: 'info', is_read: true, created_at: new Date(Date.now() - 48 * 3600000).toISOString(), link: '/period' },
  { id: 7, title: 'Lỗi nộp báo cáo', message: 'Báo cáo của bạn không thể tải lên. Vui lòng kiểm tra định dạng file và thử lại.', type: 'error', is_read: false, created_at: new Date(Date.now() - 3 * 3600000).toISOString(), link: '/reports' },
  { id: 8, title: 'Cập nhật thông tin kỳ học', message: 'Thông tin kỳ học HK1-2026 đã được cập nhật. Vui lòng kiểm tra lại lịch trình.', type: 'info', is_read: true, created_at: new Date(Date.now() - 72 * 3600000).toISOString() },
  { id: 9, title: 'Phản hồi từ giảng viên hướng dẫn', message: 'Giảng viên Nguyễn Văn A đã phản hồi về báo cáo tiến độ của bạn. Xem chi tiết trong phần báo cáo.', type: 'info', is_read: false, created_at: new Date(Date.now() - 12 * 3600000).toISOString(), link: '/reports' },
  { id: 10, title: 'Điểm đồ án cuối kỳ', message: 'Điểm đồ án cuối kỳ của bạn đã được công bố. Xem chi tiết tại trang Điểm & Kết quả.', type: 'success', is_read: true, created_at: new Date(Date.now() - 96 * 3600000).toISOString(), link: '/grades-and-results' },
  { id: 11, title: 'Hệ thống bảo trì', message: 'Hệ thống sẽ bảo trì từ 22:00 đến 23:00 ngày 05/09/2026. Vui lòng lưu ý.', type: 'warning', is_read: true, created_at: new Date(Date.now() - 120 * 3600000).toISOString() },
  { id: 12, title: 'Tài khoản đã được kích hoạt', message: 'Tài khoản sinh viên của bạn đã được kích hoạt. Bạn có thể đăng nhập và sử dụng hệ thống.', type: 'success', is_read: true, created_at: new Date(Date.now() - 168 * 3600000).toISOString() },
];

const TYPE_OPTIONS = [
  { value: 'all', label: 'Tất cả' },
  { value: 'info', label: 'Thông tin' },
  { value: 'success', label: 'Thành công' },
  { value: 'warning', label: 'Cảnh báo' },
  { value: 'error', label: 'Lỗi' },
];

function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const d = new Date(dateStr).getTime();
  const diff = now - d;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Vừa xong';
  if (minutes < 60) return `${minutes} phút trước`;
  if (hours < 24) return `${hours} giờ trước`;
  if (days < 7) return `${days} ngày trước`;
  return new Date(dateStr).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function Notifications() {
  const navigate = useNavigate();
  const toast = useToast();
  const { search, setSearch, searchParams } = useSearch();
  const pagination = usePagination<Notification>({ pageSize: 8 });
  const [notifications, setNotifications] = useState<Notification[]>(MOCK_NOTIFICATIONS);
  const [typeFilter, setTypeFilter] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  usePageHeader({
    title: 'Thông báo',
    description: 'Theo dõi thông báo từ hệ thống.',
  });

  const filtered = useMemo(() => {
    return notifications.filter((n) => {
      if (typeFilter && n.type !== typeFilter) return false;
      if (searchParams.search) {
        const q = searchParams.search.toLowerCase();
        if (!n.title.toLowerCase().includes(q) && !n.message.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [notifications, typeFilter, searchParams.search]);

  const paginated = useMemo(() => {
    const start = (pagination.currentPage - 1) * pagination.pageSize;
    return filtered.slice(start, start + pagination.pageSize);
  }, [filtered, pagination.currentPage, pagination.pageSize]);

  const unreadCount = useMemo(() => notifications.filter((n) => !n.is_read).length, [notifications]);

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === paginated.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginated.map((n) => n.id)));
    }
  };

  const markAsRead = (id: number) => {
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, is_read: true } : n));
    toast.success('Đã đánh dấu đã đọc', '');
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    toast.success('Đã đánh dấu tất cả đã đọc', `${unreadCount} thông báo chưa đọc đã được đánh dấu.`);
  };

  const deleteSelected = () => {
    if (selectedIds.size === 0) return;
    setNotifications((prev) => prev.filter((n) => !selectedIds.has(n.id)));
    toast.success('Đã xoá thông báo', `${selectedIds.size} thông báo đã được xoá.`);
    setSelectedIds(new Set());
  };

  const handleRowClick = (n: Notification) => {
    if (!n.is_read) markAsRead(n.id);
    if (n.link) navigate(n.link);
  };

  const columns: TableColumn<Notification>[] = [
    {
      key: 'select', label: '', align: 'center', width: 'w-10',
      render: (row) => (
        <input
          type="checkbox"
          checked={selectedIds.has(row.id)}
          onChange={() => toggleSelect(row.id)}
          onClick={(e) => e.stopPropagation()}
          className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary/30"
        />
      ),
    },
    {
      key: 'type', label: '', width: 'w-12',
      render: (row) => {
        const cfg = NOTIFICATION_TYPE_CONFIG[row.type];
        return (
          <span className={`w-9 h-9 rounded-full ${cfg.bg} flex items-center justify-center`}>
            <i className={`${cfg.icon} ${cfg.color} text-sm`}></i>
          </span>
        );
      },
    },
    {
      key: 'title', label: 'Nội dung',
      render: (row) => (
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className={`text-sm font-semibold line-clamp-1 ${row.is_read ? 'text-gray-600' : 'text-gray-800'}`}>{row.title}</span>
            {!row.is_read && <span className="w-2 h-2 rounded-full bg-primary shrink-0"></span>}
          </div>
          <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{row.message}</p>
        </div>
      ),
    },
    {
      key: 'created_at', label: 'Thời gian', width: 'w-28',
      render: (row) => <span className="text-xs text-gray-400 whitespace-nowrap">{formatRelativeTime(row.created_at)}</span>,
    },
    {
      key: 'status', label: 'Trạng thái', width: 'w-24',
      render: (row) => (
        <Badge variant={row.is_read ? 'neutral' : 'primary'} dot={!row.is_read}>
          {row.is_read ? 'Đã đọc' : 'Chưa đọc'}
        </Badge>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <FilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Tìm kiếm thông báo..."
        dropdowns={[
          {
            key: 'type',
            value: typeFilter,
            onChange: (v) => { setTypeFilter(v === 'all' ? '' : v); pagination.resetPage(); },
            placeholder: 'Tất cả loại',
            widthClassName: 'w-full sm:w-44',
            options: TYPE_OPTIONS,
          },
        ]}
        onRefresh={() => { setNotifications([...MOCK_NOTIFICATIONS]); setSelectedIds(new Set()); }}
        refreshLoading={false}
        actions={
          <div className="flex items-center gap-2">
            {selectedIds.size > 0 && (
              <Button variant="danger" size="sm" icon="fa-solid fa-trash" onClick={deleteSelected}>
                Xoá ({selectedIds.size})
              </Button>
            )}
            {unreadCount > 0 && (
              <Button variant="outline" size="sm" icon="fa-solid fa-check-double" onClick={markAllAsRead}>
                Đọc tất cả ({unreadCount})
              </Button>
            )}
          </div>
        }
      />

      {unreadCount > 0 && (
        <Card variant="soft" className="!bg-primary/5 !border-primary/10">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <i className="fa-solid fa-bell text-primary text-sm"></i>
            </span>
            <div>
              <span className="text-sm font-semibold text-gray-800">{unreadCount} thông báo chưa đọc</span>
              <span className="text-xs text-gray-400 ml-2">Nhấn vào thông báo để xem chi tiết</span>
            </div>
          </div>
        </Card>
      )}

      <GenericTable
        rows={paginated}
        columns={columns}
        rowKey={(row) => row.id}
        selectable
        selectedIds={[...selectedIds]}
        allSelected={paginated.length > 0 && selectedIds.size === paginated.length}
        onToggleSelect={toggleSelectAll}
        onRowClick={handleRowClick}
        emptyText="Không có thông báo nào"
        emptyIcon="fa-regular fa-bell"
      />

      <Pagination
        {...pagination.paginationProps}
        totalCount={filtered.length}
      />
    </div>
  );
}
