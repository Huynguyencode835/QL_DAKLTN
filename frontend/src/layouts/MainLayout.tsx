import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useUser } from '../hooks';
import SidebarItem from '../components/Layout/SidebarItem';
import Input from '../components/Ui/Input';
import Button from '../components/Ui/Button';

const menuConfig: Record<string, any> = {
  student: [
    {
      group: 'Quản lý',
      items: [
        { label: 'Quản lý tiến độ', icon: 'fa-chart-line', path: '/' },
        { label: 'Đăng ký đồ án & khóa luận', icon: 'fa-file-contract', path: '/topic-registration' },
        // { label: 'Nộp báo cáo định kỳ', icon: 'fa-calendar-check', path: '/submit-weekly-reports' },
        // {
        //   label: 'Nộp báo cáo',
        //   icon: 'fa-cloud-arrow-up',
        //   submenu: [
        //     { label: 'Đồ án tốt nghiệp', icon: 'fa-diagram-project', path: '/submit-thesis-reports' },
        //     { label: 'Khóa luận tốt nghiệp', icon: 'fa-book-open', path: '/submit-final-projects' },
        //   ],
        // },
        // { label: 'Yêu cầu đổi tên đề tài', icon: 'fa-pen-to-square', path: '/request-name-change' },
      ],
    },
    {
      group: 'Kết quả',
      items: [
        { label: 'Điểm & Kết quả', icon: 'fa-award', path: '/grades-and-results' },
      ],
    },
    {
      group: 'Cá nhân',
      items: [
        { label: 'Tài khoản', icon: 'fa-circle-user', path: '/profile' },
      ],
    },
  ],
  lecturer: [
    {
      group: 'Giảng dạy',
      items: [
        { label: 'Dashboard', icon: 'fa-house', path: '/' },
        { label: 'Quản lý danh sách sinh viên', icon: 'fa-users', path: '/students' },
        { label: 'Quản lý đăng ký đề tài', icon: 'fa-list-check', path: '/topic-management' },
      ],
    },
    {
      group: 'Kết quả',
      items: [
        { label: 'Điểm & Kết quả', icon: 'fa-award', path: '/grades-and-results' },
      ],
    },
    {
      group: 'Cá nhân',
      items: [
        { label: 'Tài khoản', icon: 'fa-circle-user', path: '/profile' },
      ],
    },
  ],
  staff: [
    {
      group: 'Quản lý',
      items: [
        { label: 'Dashboard', icon: 'fa-house', path: '/' },
        { label: 'Danh sách sinh viên & đăng ký', icon: 'fa-users', path: '/students' },
        { label: 'Quản lý đợt đăng ký', icon: 'fa-folder-tree', path: '/registration-periods' },
      ],
    },
    {
      group: 'Kết quả',
      items: [
        { label: 'Điều chỉnh điểm', icon: 'fa-sliders', path: '/manage-grades' },
      ],
    },
    {
      group: 'Cá nhân',
      items: [
        { label: 'Tài khoản', icon: 'fa-circle-user', path: '/profile' },
      ],
    },
  ],
  admin: [
    {
      group: 'Hệ thống',
      items: [
        { label: 'Dashboard', icon: 'fa-house', path: '/' },
        { label: 'Quản lý giảng viên', icon: 'fa-chalkboard-user', path: '/manage-lecturers' },
        { label: 'Quản lý sinh viên', icon: 'fa-user-graduate', path: '/manage-students' },
        { label: 'Quản lý đề tài', icon: 'fa-folder-tree', path: '/manage-topics' },
        { label: 'Quản lý hạn nộp', icon: 'fa-hourglass-half', path: '/manage-deadlines' },
        { label: 'Quản lý đợt đăng ký', icon: 'fa-calendar-clock', path: '/registration-periods' },
      ],
    },
    {
      group: 'Kết quả',
      items: [
        { label: 'Điều chỉnh điểm', icon: 'fa-sliders', path: '/manage-grades' },
      ],
    },
    {
      group: 'Cá nhân',
      items: [
        { label: 'Tài khoản', icon: 'fa-circle-user', path: '/profile' },
      ],
    },
  ],
};

const roleMeta: Record<string, any> = {
  student: { badge: 'STUDENT HUB', label: 'Sinh viên' },
  lecturer: { badge: 'LECTURER PORTAL', label: 'Giảng viên' },
  staff: { badge: 'STAFF PORTAL', label: 'Giáo vụ' },
  admin: { badge: 'ADMIN PANEL', label: 'Quản trị' },
};

// Derives up to two initials from a name for the avatar fallback
function getInitials(name?: string) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  const last = parts[parts.length - 1] || '';
  const first = parts[0] || '';
  return (first[0] || '').concat(parts.length > 1 ? last[0] || '' : '').toUpperCase() || '?';
}

export default function MainLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, loading } = useUser();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 h-screen text-gray-400 bg-background">
        <div className="w-8 h-8 rounded-full border-2 border-gray-200 border-t-[#152a56] animate-spin" />
        <span className="text-sm">Đang tải thông tin người dùng...</span>
      </div>
    );
  }

  const role = user?.role || user?.user_type || 'student';
  const meta = roleMeta[role];
  const isLoggedIn = !!user;

  return (
    <div className="flex h-screen overflow-hidden text-sm bg-background">
      <aside className="w-64 bg-[#1657d1] text-white flex flex-col h-full shrink-0 relative z-20 shadow-[6px_0_30px_-12px_rgba(0,0,0,0.45)]">
        <div className="relative p-5 flex items-center gap-3 border-b border-white/15">
          <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
            <i className="fa-solid fa-graduation-cap text-white text-[15px]" />
          </div>
          <div className="min-w-0">
            <h1 className="font-bold text-base leading-tight tracking-tight">Thesis Portal</h1>
            <span className="text-[10px] text-white/70 font-semibold tracking-[0.2em]">{meta.badge}</span>
          </div>
        </div>

        <nav className="no-scrollbar flex-1 overflow-y-auto py-4 space-y-6 relative">
          {menuConfig[role].map((group: any) => (
            <div key={group.group}>
              <div className="px-6 mb-2 text-[10px] font-bold text-[#ffd43b] uppercase tracking-[0.14em]">
                {group.group}
              </div>
              <ul className="px-3 space-y-0.5">
                {group.items.map((item: any) => (
                  <SidebarItem key={item.label} item={item} pathname={location.pathname} />
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <div className="relative p-3 border-t border-white/15 mt-auto">
          <div
            onClick={() => navigate(isLoggedIn ? '/profile' : '/login')}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 transition-colors cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-full ring-2 ring-white/30 shrink-0 bg-white/10 flex items-center justify-center overflow-hidden">
              {isLoggedIn && user?.avatar ? (
                <img src={user.avatar} alt="" className="w-full h-full object-cover" />
              ) : isLoggedIn ? (
                <span className="text-[11px] font-semibold text-white">
                  {getInitials(user.full_name || user.username)}
                </span>
              ) : (
                <i className="fa-solid fa-user text-white/50 text-sm" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              {isLoggedIn ? (
                <>
                  <div className="text-sm font-medium truncate">{user.full_name || user.username || 'Người dùng'}</div>
                  <div className="text-[10px] text-white/45 truncate">{user.student_id || user.email || ''}</div>
                </>
              ) : (
                <div className="text-sm font-medium text-white/55">Chưa đăng nhập</div>
              )}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {isLoggedIn && (
                <button
                  onClick={(e) => { e.stopPropagation(); logout(); navigate('/login'); }}
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-white/40 hover:text-red-400 hover:bg-white/10 transition-all"
                  title="Đăng xuất"
                >
                  <i className="fa-solid fa-right-from-bracket text-xs" />
                </button>
              )}
              <i className="fa-solid fa-ellipsis-vertical text-white/25 text-xs opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        <header className="bg-white/85 backdrop-blur-md border-b border-border h-16 flex items-center justify-between px-6 shrink-0 z-10 sticky top-0 shadow-[0_1px_10px_rgba(15,23,42,0.05)]">
          <div>
            <div className="text-[10px] text-[#1657d1] font-semibold uppercase tracking-[0.18em]">{meta.badge}</div>
            <h2 className="text-lg font-bold text-textMain leading-tight tracking-tight">Trang Chủ</h2>
          </div>
          <div className="flex items-center gap-5">
            <Input
              placeholder="Tìm kiếm..."
              leadingIcon="fa-solid fa-magnifying-glass"
              className="w-56"
            />
            <Button variant="ghost" size="icon" className="relative text-gray-400" icon="fa-regular fa-bell">
              <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-danger text-white text-[9px] font-bold rounded-full flex items-center justify-center ring-2 ring-white shadow-sm">
                3
              </span>
            </Button>
            <div
              onClick={() => navigate(isLoggedIn ? '/profile' : '/login')}
              className="flex items-center gap-3 border-l border-gray-200 pl-5 cursor-pointer group"
            >
              <div className="text-right hidden sm:block">
                <div className="text-[11px] text-gray-400 font-medium">Chào,</div>
                <div className="text-sm font-semibold text-gray-800">
                  {isLoggedIn ? (user.full_name || user.username || 'Người dùng') : 'Chưa đăng nhập'}
                </div>
              </div>
              <div className="w-9 h-9 rounded-full ring-2 ring-gray-200 group-hover:ring-[#1657d1]/50 bg-gray-100 flex items-center justify-center overflow-hidden transition-all">
                {isLoggedIn && user?.avatar ? (
                  <img src={user.avatar} alt="" className="w-full h-full object-cover" />
                ) : isLoggedIn ? (
                  <span className="text-[11px] font-semibold text-gray-500">
                    {getInitials(user.full_name || user.username)}
                  </span>
                ) : (
                  <i className="fa-solid fa-user text-gray-400 text-sm" />
                )}
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6 bg-background">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}