import { useUser } from '../hooks';
import { TRAINING_TYPE_MAP, PROGRAM_TYPE_MAP } from '../types';
import Card, { SectionCard } from '../components/Ui/Card';
import Badge from '../components/Ui/Badge';
import Button from '../components/Ui/Button';

function InfoRow({ icon, label, value }: { icon: string; label: string; value: any }) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-gray-100 last:border-0">
      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center text-primary shrink-0 ring-1 ring-primary/10">
        <i className={`${icon} text-sm`}></i>
      </div>
      <div className="min-w-0">
        <div className="text-[11px] text-textMuted font-medium uppercase tracking-wide">{label}</div>
        <div className="text-sm font-semibold text-textMain truncate">{value || '---'}</div>
      </div>
    </div>
  );
}

function GpaRing({ value, max = 4 }: { value: string | number; max?: number }) {
  const pct = Math.min(Number(value) / max, 1);
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - pct);

  return (
    <div className="relative w-28 h-28 shrink-0">
      <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90 drop-shadow-sm">
        <circle cx="50" cy="50" r={radius} fill="none" stroke="#e5e7eb" strokeWidth="8" />
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="#0c56d0"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="drop-shadow-[0_0_6px_rgba(12,86,208,0.3)]"
          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-textMain leading-none">{value}</span>
        <span className="text-[10px] text-textMuted font-medium mt-0.5">GPA / {max}</span>
      </div>
    </div>
  );
}

function Avatar({ user }: { user: any }) {
  if (user.avatar) {
    return (
      <img
        src={user.avatar}
        alt={`${user.first_name} ${user.last_name}`}
        className="w-24 h-24 rounded-full border-4 border-white shadow-lg object-cover shrink-0"
      />
    );
  }
  const initials = `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`;
  return (
    <div className="w-24 h-24 rounded-full border-4 border-white shadow-lg shrink-0 bg-gradient-to-br from-primary to-[#38bdf8] flex items-center justify-center text-white text-2xl font-bold">
      {initials}
    </div>
  );
}

function ConductBadge({ score }: { score: number }) {
  if (!score && score !== 0) return null;
  let label = 'Trung bình';
  let variant: any = 'neutral';
  if (score >= 90) { label = 'Xuất sắc'; variant = 'success'; }
  else if (score >= 80) { label = 'Tốt'; variant = 'info'; }
  else if (score >= 65) { label = 'Khá'; variant = 'warning'; }
  return <Badge variant={variant}>{label}</Badge>;
}

function formatDate(dateStr: string) {
  if (!dateStr) return '---';
  const d = new Date(dateStr);
  return d.toLocaleDateString('vi-VN', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

export default function Profile() {
  const { user } = useUser();
  const data = user;
  const p = data?.profile || {};

  if (!data) {
    return (
      <div className="flex items-center justify-center h-64 text-textMuted">
        <i className="fa-solid fa-circle-notch animate-spin text-2xl mr-3"></i>
        Đang tải thông tin...
      </div>
    );
  }

  const fullName = `${data.first_name} ${data.last_name}`;

  const roleConfig: Record<string, { label: string; icon: string; badge: 'info' | 'primary' | 'warning' }> = {
    student: { label: 'Sinh viên', icon: 'fa-user-graduate', badge: 'info' },
    lecturer: { label: 'Giảng viên', icon: 'fa-chalkboard-user', badge: 'primary' },
    staff: { label: 'Nhân viên', icon: 'fa-building', badge: 'warning' },
  };
  const role = roleConfig[data.role] || roleConfig.staff;
  const isStudent = data.role === 'student';

  return (
    <div className="space-y-6">
      <Card variant="elevated" className="!p-0 overflow-hidden" bodyClassName="!p-0">
        <div className="h-28 w-full rounded-t-xl bg-gradient-to-br from-indigo-600 via-primary to-cyan-400" />

        <div className="px-6 pb-6">
          <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-12">
            <div className="relative z-10 w-24 h-24 rounded-full ring-4 ring-white shadow-md overflow-hidden shrink-0 bg-white mb-4">
              <Avatar user={data} />
            </div>

            <div className="flex-1 pt-2 sm:pt-0 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
              <div>
                <h1 className="text-xl font-bold text-textMain leading-tight">{fullName}</h1>
                <Badge variant={role.badge} className="mt-1.5">
                  <i className={`fa-solid ${role.icon} text-[10px]`}></i>
                  {role.label}
                </Badge>
              </div>
              <Button variant="primary" icon="fa-regular fa-pen-to-square" className="self-start sm:self-auto">
                Chỉnh sửa hồ sơ
              </Button>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <Card
          variant="elevated"
          className="lg:col-span-2"
          icon="fa-regular fa-circle-user"
          title="Thông tin cá nhân"
        >
          <InfoRow icon="fa-regular fa-envelope" label="Email" value={data.email} />
          <InfoRow icon="fa-solid fa-cake-candles" label="Ngày sinh" value={formatDate(data.dob)} />
          <InfoRow icon="fa-solid fa-phone" label="Số điện thoại" value={data.phone_number} />
          <InfoRow icon="fa-solid fa-id-badge" label="Vai trò" value={role.label} />
          {data.role === 'staff' && (
            <InfoRow icon="fa-solid fa-building-columns" label="Khoa" value={data.faculty?.name} />
          )}
        </Card>

        <SectionCard
          title={
            isStudent ? 'Thông tin học tập' :
            data.role === 'lecturer' ? 'Thông tin giảng dạy' :
            'Thông tin công việc'
          }
          icon={role.icon}
          className="lg:col-span-3"
        >
          {isStudent ? (
            <div className="flex flex-col sm:flex-row gap-6">
              <div className="grid grid-cols-2 gap-x-6 flex-1">
                <InfoRow icon="fa-solid fa-hashtag" label="Mã số sinh viên" value={p.student_id} />
                <InfoRow icon="fa-solid fa-people-group" label="Lớp" value={p.class_name} />
                <InfoRow icon="fa-solid fa-award" label="Hình thức đào tạo" value={TRAINING_TYPE_MAP[p.training_type] || p.training_type} />
                <InfoRow icon="fa-solid fa-calendar-days" label="Niên khóa" value={p.academic_year} />
                <InfoRow icon="fa-solid fa-book-open" label="Ngành học" value={p.major?.major_name} />
                <InfoRow icon="fa-solid fa-building-columns" label="Khoa" value={data.faculty?.name} />
                <InfoRow icon="fa-solid fa-layer-group" label="Chương trình" value={PROGRAM_TYPE_MAP[p.program_type] || p.program_type} />
                <InfoRow icon="fa-solid fa-medal" label="Điểm rèn luyện" value={
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{p.conduct_score}/100</span>
                    <ConductBadge score={p.conduct_score} />
                  </div>
                } />
              </div>
              <div className="flex flex-col items-center justify-center border-t sm:border-t-0 sm:border-l border-gray-100 pt-4 sm:pt-0 sm:pl-6 gap-4">
                <GpaRing value={parseFloat(p.gpa) || 0} />
              </div>
            </div>
          ) : data.role === 'lecturer' ? (
            <div className="grid grid-cols-2 gap-x-6">
              <InfoRow icon="fa-solid fa-building-columns" label="Khoa" value={data.faculty?.name} />
              <InfoRow icon="fa-solid fa-graduation-cap" label="Học vị" value={p.academic_degree} />
              <InfoRow icon="fa-solid fa-user-tie" label="Chức vụ" value={p.position} />
              <div className="col-span-2 py-3 border-b border-gray-100 last:border-0">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center text-primary shrink-0 ring-1 ring-primary/10">
                    <i className="fa-solid fa-flask text-sm"></i>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] text-textMuted font-medium uppercase tracking-wide">Chuyên ngành</div>
                    {p.specializations && p.specializations.length > 0 ? (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {p.specializations.map((s: any) => (
                          <Badge key={s.id} variant="primary" dot>{s.name}</Badge>
                        ))}
                      </div>
                    ) : (
                      <div className="text-sm font-semibold text-textMain">---</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-x-6">
              <InfoRow icon="fa-solid fa-user-tie" label="Chức vụ" value={p.position} />
              {data.faculty?.name && (
                <InfoRow icon="fa-solid fa-building-columns" label="Khoa" value={data.faculty?.name} />
              )}
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
