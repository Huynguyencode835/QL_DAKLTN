import { useEffect, useState } from 'react';
import { useUser, useModal, usePageHeader } from '../hooks';
import { fetchWithAuth, createWithAuth } from '../utils/ApiHelper';
import { endpoints } from '../config/Apis';
import { SectionCard } from '../components/Ui/Card';
import Card from '../components/Ui/Card';
import Input from '../components/Ui/Input';
import Dropdown from '../components/Ui/Dropdown';
import Textarea from '../components/Ui/Textarea';
import Button from '../components/Ui/Button';
import ChoiceCard from '../components/Ui/Choicecard';
import Badge from '../components/Ui/Badge';
import { DIFFICULTY_CONFIG } from '../types';

export default function TopicRegistration() {
  const { user } = useUser();
  const { openModal, closeModal } = useModal();
  const p = user?.profile || {};
  const [form, setForm] = useState({
    isThesis: 'false',
    gpa: '',
    advisor1: '',
    advisor2: '',
    note1: '',
    note2: '',
    phone: '',
    email: '',
    major: '',
    project_description: '',
    project_title: '',
  });

  const [lecturers, setLecturers] = useState<any[]>([]);
  const [topics1, setTopics1] = useState<any[]>([]);
  const [topics2, setTopics2] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{ type: string; message: string } | null>(null);
  const [existingRegistration, setExistingRegistration] = useState<any | null>(null);
  const [loadingReg, setLoadingReg] = useState(true);

  usePageHeader(existingRegistration
    ? {
      title: 'Đăng ký Đồ án tốt nghiệp',
      description: 'Thông tin đăng ký hiện tại của bạn',
    }
    : {
      title: 'Đăng ký Đồ án tốt nghiệp',
      description: 'Vui lòng điền đầy đủ và chính xác thông tin để đăng ký đề tài tốt nghiệp.',
    });

  const update = (field: string) => (e: any) => setForm(prev => ({ ...prev, [field]: e.target?.value ?? e }));


  useEffect(() => {
    if (!user) return;
    setForm(prev => ({
      ...prev,
      gpa: p.gpa || '',
      phone: user.phone_number || '',
      email: user.email || '',
      major: p.major?.major_name || '',
    }));
    loadLecturers();
    fetchWithAuth(
      endpoints.registrations("current"),
      (data: any[]) => {
        if (data && data.length > 0) {
          setExistingRegistration(data[0]);
        }
        setLoadingReg(false);
      },
      () => setLoadingReg(false),
    );
  }, [user]);

  const loadLecturers = async () => {
    await fetchWithAuth(endpoints.lecturers, setLecturers, () => { });
  };

  const loadLecturerTopics = async (id: string, onSuccess: any) => {
    await fetchWithAuth(endpoints.topic(id), onSuccess, () => { });
  };

  const loadTopicDetail = async (lecturerId: string, topicId: number, onSuccess: any) => {
    await fetchWithAuth(endpoints.topicDetail(lecturerId, topicId), onSuccess, () => { });
  };

  useEffect(() => {
    if (form.advisor1) {
      loadLecturerTopics(form.advisor1, setTopics1);
    } else {
      setTopics1([]);
    }
  }, [form.advisor1]);

  useEffect(() => {
    if (form.advisor2) {
      loadLecturerTopics(form.advisor2, setTopics2);
    } else {
      setTopics2([]);
    }
  }, [form.advisor2]);

  const selectTopic = (topic: any) => {
    setForm(prev => ({
      ...prev,
      project_title: topic.title,
      project_description: topic.description,
    }));
  };

  const viewTopicDetail = (advisorId: string, topic: any, lecturer: any) => {
    loadTopicDetail(advisorId, topic.id, (data: any) => {
      const difficulty = DIFFICULTY_CONFIG[data.difficulty_level];

      openModal({
        title: data.title,
        description: 'Chi tiết đề tài',
        icon: 'fa-regular fa-file-lines',
        size: 'lg',
        content: (
          <div className="space-y-4">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Mô tả</p>
              <p className="text-sm text-gray-700 leading-relaxed">{data.description}</p>
            </div>

            <div className="flex items-center gap-6">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Độ khó</p>
                <Badge variant={difficulty?.variant || 'neutral'} dot>
                  {difficulty?.label || data.difficulty_level || '—'}
                </Badge>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Giảng viên gợi ý</p>
                <p className="text-sm text-gray-700">{lecturer?.full_name || '—'}</p>
              </div>
            </div>

            {data.technology && (
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">Công nghệ sử dụng</p>
                <div className="flex flex-wrap gap-1.5">
                  {data.technology.split(',').map((tech: string) => (
                    <Badge key={tech.trim()} variant="info">{tech.trim()}</Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        ),
        footer:
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" size="sm" icon="fa-solid fa-check" onClick={() => {
              selectTopic(data);
              closeModal();
            }}>Chọn đề tài</Button>
            <Button variant="primary" size="sm" icon="fa-solid fa-close" onClick={closeModal}>Đóng</Button>
          </div>,
      });
    });
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setSubmitResult(null);
    setSubmitting(true);

    const body: any = {
      project_title: form.project_title || form.project_description,
      project_description: form.project_description,
      wants_thesis_upgrade: form.isThesis === 'true',
      advisor1: form.advisor1 ? parseInt(form.advisor1) : null,
      advisor2: form.advisor2 ? parseInt(form.advisor2) : null,
      note1: form.note1 || '',
      note2: form.note2 || '',
    };

    await createWithAuth(
      endpoints.registrations("current"),
      body,
      () => setSubmitResult({ type: 'success', message: 'Đăng ký thành công!' }),
      (type: string, msg: string) => setSubmitResult({ type: 'error', message: msg }),
      setSubmitting
    );
  };

  const STATUS_CONFIG: Record<string, { label: string; variant: string }> = {
    waiting_lecturer: { label: 'Chờ phân giảng viên', variant: 'warning' },
    assigned_lecturer: { label: 'Đã phân giảng viên', variant: 'info' },
  };
  const APPROVAL_CONFIG: Record<string, { label: string; variant: string }> = {
    pending: { label: 'Chờ duyệt', variant: 'warning' },
    approved: { label: 'Đã duyệt', variant: 'success' },
    rejected: { label: 'Từ chối', variant: 'danger' },
  };

  const lecturer1 = lecturers.find(l => l.id == form.advisor1);
  const lecturer2 = lecturers.find(l => l.id == form.advisor2);
  const hasSuggestions = (form.advisor1 && topics1.length > 0) || (form.advisor2 && topics2.length > 0);

  const statusCfg = STATUS_CONFIG[existingRegistration?.status] || ({} as { label: string; variant: string });
  const thesisLabel = existingRegistration?.wants_thesis_upgrade ? 'Khóa luận tốt nghiệp' : 'Hình thức khác';

  if (loadingReg) {
    return (
      <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-gray-400">
          <i className="fa-solid fa-spinner fa-spin text-3xl"></i>
          <p className="text-sm">Đang tải thông tin đăng ký...</p>
        </div>
      </main>
    );
  }

  if (existingRegistration) {
    return (
      <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-background">
        <div className="max-w-3xl mx-auto w-full">
          <Card
            variant="elevated"
            className="!p-0 overflow-hidden !rounded-2xl"
            bodyClassName="divide-y divide-gray-100"
          >
            {/* Header dùng chính prop title/icon/actions của Card */}
            <div className="flex items-start justify-between gap-3 px-6 py-5">
              <div className="flex items-start gap-2.5">
                <span className="w-8 h-8 shrink-0 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <i className="fa-regular fa-file-lines text-sm" />
                </span>
                <div>
                  <h3 className="font-semibold text-gray-900 text-sm leading-tight">
                    Đơn đăng ký luận văn
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">{thesisLabel}</p>
                </div>
              </div>
              <Badge variant={statusCfg.variant as any}>
                {statusCfg.label || existingRegistration.status}
              </Badge>
            </div>

            {/* Thông tin sinh viên */}
            <div className="px-6 py-5">
              <SectionLabel icon="fa-regular fa-user" text="Thông tin sinh viên" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
                <FieldRow label="Mã số sinh viên" value={p.student_id} />
                <FieldRow label="Họ và tên" value={user ? `${user.last_name} ${user.first_name}` : '---'} />
                <FieldRow label="Email" value={user?.email} />
                <FieldRow label="Lớp" value={p.class_name} />
                <FieldRow label="Khoa" value={user?.faculty?.name} />
              </div>
            </div>

            {/* Thông tin đề tài */}
            <div className="px-6 py-5">
              <SectionLabel icon="fa-regular fa-lightbulb" text="Thông tin đề tài" />
              <p className="text-sm font-medium text-gray-800 mb-2">
                {existingRegistration.project_title || '—'}
              </p>
              <p className="text-sm text-gray-600 leading-relaxed">
                {existingRegistration.project_description || '—'}
              </p>
            </div>

            {/* Giảng viên hướng dẫn */}
            {existingRegistration.lecturer_assignments?.length > 0 && (
              <div className="px-6 py-5">
                <SectionLabel icon="fa-solid fa-chalkboard-user" text="Giảng viên hướng dẫn" />
                <div className="divide-y divide-gray-50">
                  {existingRegistration.lecturer_assignments.map((a: any) => {
                    const appCfg = APPROVAL_CONFIG[a.approval_status] || ({} as { label: string; variant: string });
                    const roleLabel =
                      a.role === 'main' ? 'Chính thức'
                        : a.role === 'option1' ? 'Nguyện vọng 1'
                          : a.role === 'option2' ? 'Nguyện vọng 2'
                            : a.role;
                    const roleVariant =
                      a.role === 'main' ? 'primary'
                        : a.role === 'option1' || a.role === 'option2' ? 'warning'
                          : 'neutral';
                    return (
                      <div key={a.id} className="flex items-start justify-between py-3 first:pt-0 last:pb-0">
                        <div>
                          <p className="font-medium text-gray-800 text-sm">{a.lecturer_name}</p>
                          <Badge variant={roleVariant} className="mt-1">{roleLabel}</Badge>
                        </div>
                        <div className="text-right">
                          <Badge variant={appCfg.variant as any}>{appCfg.label}</Badge>
                          {a.note && (
                            <p className="text-xs text-gray-400 mt-1 max-w-[200px] truncate">{a.note}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Trạng thái đăng ký — dùng lại Card variant="soft" đúng như hệ thống sẵn có */}
            <Card
              variant="soft"
              icon="fa-solid fa-circle-info"
              className="!rounded-none !border-0 !bg-blue-50/60"
              bodyClassName="!p-0"
            >
              <p className="text-xs text-blue-700 leading-relaxed">
                {existingRegistration.status === 'waiting_lecturer'
                  ? 'Đơn đăng ký của bạn đang chờ được phân giảng viên hướng dẫn.'
                  : 'Đơn đăng ký của bạn đã được phân giảng viên hướng dẫn và đang chờ duyệt.'}
              </p>
            </Card>
          </Card>
        </div>

        <footer className="mt-8 border-t border-gray-200 pt-4 flex justify-between items-center text-xs text-gray-500 pb-2 px-6 max-w-3xl mx-auto">
          <p>© 2025 Thesis Portal - Hệ thống Quản lý Luận văn Tốt nghiệp</p>
          <p>
            Phiên bản 2.1.0 · Hỗ trợ:{' '}
            <a className="text-primary hover:underline" href="mailto:support@thesisportal.edu.vn">
              support@thesisportal.edu.vn
            </a>
          </p>
        </footer>
      </main>
    );
  }

  // Nhãn section nhỏ, đồng bộ style với icon-box của Card
  function SectionLabel({ icon, text }: { icon: string; text: string }) {
    return (
      <div className="flex items-center gap-2 mb-3">
        <i className={`${icon} text-primary text-xs`} />
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">{text}</p>
      </div>
    );
  }

  function FieldRow({ label, value }: { label: string; value?: string | null }) {
    return (
      <div>
        <p className="text-[11px] text-gray-400 mb-0.5">{label}</p>
        <p className="text-sm text-gray-800">{value || '—'}</p>
      </div>
    );
  }

  return (
    <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-background">
      <div className="max-w-4xl mx-auto w-full">
        {submitResult && (
          <div className={`mb-4 px-4 py-3 rounded-xl text-sm font-medium ${submitResult.type === 'success'
            ? 'bg-green-50 border border-green-200 text-green-700'
            : 'bg-red-50 border border-red-200 text-red-700'
            }`}>
            {submitResult.message}
          </div>
        )}

        <form className="space-y-8" onSubmit={handleSubmit}>
          <SectionCard title="Thông tin sinh viên" icon="fa-regular fa-user">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input label="Mã số sinh viên" value={p.student_id || ''} disabled />
              <Input label="Họ và tên" value={user ? `${user.last_name} ${user.first_name}` : '---'} disabled />
              <Input label="Số điện thoại" required value={form.phone} disabled />
              <Input label="Email" required value={form.email} disabled />
              <Input label="Lớp" value={p.class_name || ''} disabled />
              <Input label="Khoa" value={user?.faculty?.name || ''} disabled />
            </div>
          </SectionCard>

          <SectionCard title="Nguyện vọng làm Khóa luận" icon="fa-solid fa-star">
            <div className="flex flex-col gap-3">
              <label className="font-medium text-gray-700 text-sm">
                Bạn có nguyện vọng làm Khóa luận tốt nghiệp? <span className="text-red-500">*</span>
              </label>
              <div className="flex flex-col sm:flex-row gap-3">
                <ChoiceCard
                  checked={form.isThesis === 'true'}
                  label="Có, tôi muốn làm Khóa luận"
                  name="isThesis"
                  onChange={() => update('isThesis')('true')}
                  value="true"
                />
                <ChoiceCard
                  checked={form.isThesis === 'false'}
                  label="Không, tôi chọn hình thức khác"
                  name="isThesis"
                  onChange={() => update('isThesis')('false')}
                  value="false"
                />
              </div>
            </div>

            <div style={{ display: form.isThesis === 'true' ? 'block' : 'none' }}>
              <div className="space-y-6 mt-6">
                <Input
                  label="Điểm tích lũy hệ 4 (GPA)"
                  required
                  value={form.gpa}
                  suffix="/ 4.0"
                  disabled
                  className="max-w-xs"
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex flex-col gap-3 p-4 rounded-xl border border-gray-100 bg-gray-50/50">
                    <Dropdown
                      label="Nguyện vọng 1"
                      required
                      placeholder="Chọn giảng viên"
                      value={form.advisor1}
                      onChange={update('advisor1')}
                      options={lecturers.map((l: any) => ({
                        value: l.id, label: l.full_name, description: l.email, avatarText: l.full_name?.charAt(0),
                      }))}
                    />
                    <Textarea
                      label="Lời nhắn tới giảng viên"
                      rows={2}
                      placeholder="Nhập lời nhắn ngắn gọn..."
                      value={form.note1}
                      onChange={update('note1')}
                    />
                  </div>

                  <div className="flex flex-col gap-3 p-4 rounded-xl border border-gray-100 bg-gray-50/50">
                    <Dropdown
                      label="Nguyện vọng 2"
                      placeholder="Chọn giảng viên"
                      value={form.advisor2}
                      onChange={update('advisor2')}
                      options={lecturers.map((l: any) => ({
                        value: l.id, label: l.full_name, description: l.email, avatarText: l.full_name?.charAt(0),
                      }))}
                    />
                    <Textarea
                      label="Lời nhắn tới giảng viên"
                      rows={2}
                      placeholder="Nhập lời nhắn ngắn gọn..."
                      value={form.note2}
                      onChange={update('note2')}
                    />
                  </div>
                </div>

                <div className="flex items-start gap-2 p-3.5 rounded-xl bg-amber-50 border border-amber-100">
                  <i className="fa-solid fa-circle-info text-amber-500 mt-0.5 text-sm"></i>
                  <p className="text-xs text-amber-800 leading-relaxed">
                    Nguyện vọng của sinh viên sẽ được gửi đến giảng viên để xét duyệt. Sinh viên nên liên hệ trước với giảng viên.
                  </p>
                </div>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Thông tin đề tài" icon="fa-regular fa-file-lines">
            <Input
              label="Tên đề tài"
              required
              placeholder="Nhập tên đề tài dự kiến"
              value={form.project_title}
              onChange={update('project_title')}
            />
            <Textarea
              label="Mô tả đề tài"
              required
              placeholder="Ví dụ: Ứng dụng học sâu trong nhận dạng hình ảnh y tế..."
              rows={5}
              helperText="Mô tả ngắn gọn về lĩnh vực, công nghệ hoặc bài toán dự kiến giải quyết."
              value={form.project_description}
              onChange={update('project_description')}
            />

            {hasSuggestions && (
              <div className="mt-6 space-y-6">
                <h4 className="font-bold text-gray-800 text-sm flex items-center gap-2">
                  <i className="fa-solid fa-star text-yellow-400"></i>
                  Danh sách Đề tài gợi ý từ Giảng viên
                </h4>

                {form.advisor1 && topics1.length > 0 && (
                  <TopicSuggestionGroup
                    aspirationLabel="Nguyện vọng 1"
                    badgeVariant="primary"
                    lecturer={lecturer1}
                    topics={topics1}
                    onSelect={selectTopic}
                    onViewDetail={(topic: any) => viewTopicDetail(form.advisor1, topic, lecturer1)}
                  />
                )}

                {form.advisor2 && topics2.length > 0 && (
                  <TopicSuggestionGroup
                    aspirationLabel="Nguyện vọng 2"
                    badgeVariant="warning"
                    lecturer={lecturer2}
                    topics={topics2}
                    onSelect={selectTopic}
                    onViewDetail={(topic: any) => viewTopicDetail(form.advisor2, topic, lecturer2)}
                  />
                )}
              </div>
            )}
          </SectionCard>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => window.history.back()}>Hủy bỏ</Button>
            <Button type="submit" icon="fa-regular fa-paper-plane" loading={submitting} disabled={submitting}>
              Gửi đăng ký
            </Button>
          </div>
        </form>

        <div className="mt-6 p-4 bg-blue-50 border border-blue-100 rounded-lg flex items-start gap-3">
          <i className="fa-solid fa-circle-info text-blue-500 mt-0.5"></i>
          <div>
            <h4 className="font-bold text-blue-800 text-sm">Lưu ý quan trọng</h4>
            <ul className="list-disc list-inside text-xs text-blue-700 mt-2 space-y-1">
              <li>Sinh viên chỉ được gửi đăng ký một lần. Vui lòng kiểm tra kỹ thông tin trước khi gửi.</li>
              <li>Sau khi gửi, trạng thái đăng ký sẽ được cập nhật trong mục "Project Registration".</li>
            </ul>
          </div>
        </div>
      </div>

      <footer className="mt-8 border-t border-gray-200 pt-4 flex justify-between items-center text-xs text-gray-500 pb-2 px-6">
        <p>© 2025 Thesis Portal - Hệ thống Quản lý Luận văn Tốt nghiệp</p>
        <p>Phiên bản 2.1.0 · Hỗ trợ: <a className="text-primary hover:underline" href="mailto:support@thesisportal.edu.vn">support@thesisportal.edu.vn</a></p>
      </footer>
    </main>
  );
}

function TopicSuggestionGroup({ aspirationLabel, badgeVariant, lecturer, topics, onSelect, onViewDetail }: any) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Badge variant={badgeVariant}>{aspirationLabel}</Badge>
        <span className="text-xs text-gray-400">
          Giảng viên: <span className="font-medium text-gray-600">{lecturer?.full_name || '—'}</span>
        </span>
      </div>

      <div className="space-y-3">
        {topics.map((topic: any) => (
          <TopicCard
            key={topic.id}
            topic={topic}
            lecturer={lecturer}
            onSelect={() => onSelect(topic)}
            onViewDetail={() => onViewDetail(topic)}
          />
        ))}
      </div>
    </div>
  );
}

function TopicCard({ topic, lecturer, onSelect, onViewDetail }: any) {
  return (
    <div className="p-4 border border-gray-200 rounded-xl bg-white hover:border-primary/40 hover:shadow-sm transition-all duration-200">
      <h5 className="font-semibold text-gray-800 text-sm leading-snug mb-1">{topic.title}</h5>

      <p className="text-sm text-gray-500 leading-relaxed line-clamp-2">
        {topic.description}
      </p>

      <div className="flex items-center justify-between gap-3 mt-3 pt-3 border-t border-gray-100">
        <p className="text-xs text-gray-400 flex items-center gap-1.5 min-w-0">
          <i className="fa-solid fa-chalkboard-user shrink-0"></i>
          <span className="truncate">Gợi ý bởi {lecturer?.full_name || '—'}</span>
        </p>

        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" icon="fa-regular fa-eye" onClick={onViewDetail}>
            Chi tiết
          </Button>
          <Button variant="primary" size="sm" icon="fa-solid fa-check" onClick={onSelect}>
            Chọn
          </Button>
        </div>
      </div>
    </div>
  );
}
