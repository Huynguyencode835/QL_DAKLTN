import { useEffect, useState } from 'react';
import { useUser } from '../hooks';
import { useModal } from '../hooks';
import { fetchWithAuth, createWithAuth } from '../utils/ApiHelper';
import { endpoints } from '../config/Apis';
import { SectionCard } from '../components/Ui/Card';
import Input from '../components/Ui/Input';
import Dropdown from '../components/Ui/Dropdown';
import Select from '../components/Ui/Select';
import Textarea from '../components/Ui/Textarea';
import Button from '../components/Ui/Button';
import ChoiceCard from '../components/Ui/Choicecard';
import Badge from '../components/Ui/Badge';
import { DIFFICULTY_CONFIG } from '../types';
import type { RegistrationPeriod } from '../types';

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

  const [registrationPeriods, setRegistrationPeriods] = useState<RegistrationPeriod[]>([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState('');
  const [lecturers, setLecturers] = useState<any[]>([]);
  const [topics1, setTopics1] = useState<any[]>([]);
  const [topics2, setTopics2] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{ type: string; message: string } | null>(null);

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
    loadPeriods();
    loadLecturers();
  }, [user]);

  const loadLecturers = async () => {
    await fetchWithAuth(endpoints.lecturers, setLecturers, () => { });
  };

  const loadPeriods = async () => {
    await fetchWithAuth(endpoints.registrationPeriods, (data: RegistrationPeriod[]) => {
      setRegistrationPeriods(data);
      if (data.length > 0 && !selectedPeriodId) {
        setSelectedPeriodId(String(data[0].id));
      }
    }, () => { });
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
      isThesis: form.isThesis === 'true',
    };

    if (form.isThesis === 'true' && form.advisor1) {
      body.lecturer = parseInt(form.advisor1);
    }

    await createWithAuth(
      endpoints.registrations(selectedPeriodId),
      body,
      () => setSubmitResult({ type: 'success', message: 'Đăng ký thành công!' }),
      (type: string, msg: string) => setSubmitResult({ type: 'error', message: msg }),
      setSubmitting
    );
  };

  const lecturer1 = lecturers.find(l => l.id == form.advisor1);
  const lecturer2 = lecturers.find(l => l.id == form.advisor2);
  const hasSuggestions = (form.advisor1 && topics1.length > 0) || (form.advisor2 && topics2.length > 0);

  return (
    <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-background">
      <div className="max-w-4xl mx-auto w-full">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Thông tin Đăng ký Đồ án tốt nghiệp</h2>
          <p className="text-gray-600">Vui lòng điền đầy đủ và chính xác thông tin để đăng ký đề tài tốt nghiệp.</p>
        </div>

        {submitResult && (
          <div className={`mb-4 px-4 py-3 rounded-xl text-sm font-medium ${submitResult.type === 'success'
              ? 'bg-green-50 border border-green-200 text-green-700'
              : 'bg-red-50 border border-red-200 text-red-700'
            }`}>
            {submitResult.message}
          </div>
        )}

        <form className="space-y-8" onSubmit={handleSubmit}>
          <SectionCard title="Đợt đăng ký" icon="fa-solid fa-calendar">
            <Select
              label="Chọn đợt đăng ký"
              placeholder="Chọn đợt..."
              value={selectedPeriodId}
              onChange={(e: any) => setSelectedPeriodId(e.target.value)}
              options={registrationPeriods.map((p) => ({
                value: String(p.id),
                label: `${p.name} (${p.academic_year})`,
              }))}
            />
          </SectionCard>

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
