import { useEffect, useState, type ChangeEvent } from 'react';
import { useModal, usePageHeader, useToast, useSearch, usePagination } from '../../hooks';
import { fetchWithAuth, createWithAuth, updatePatchWithAuth, deleteWithAuth } from '../../utils/ApiHelper';
import { endpoints } from '../../config/Apis';
import Card from '../../components/Ui/Card';
import Button from '../../components/Ui/Button';
import Badge from '../../components/Ui/Badge';
import Input from '../../components/Ui/Input';
import Textarea from '../../components/Ui/Textarea';
import Select from '../../components/Ui/Select';
import GenericTable, { TableColumn } from '../../components/GenericTable';
import Pagination from '../../components/Ui/Pagination';
import { DIFFICULTY_CONFIG, DIFFICULTY_OPTIONS } from '../../types';

const emptyForm = {
  title: '',
  description: '',
  technology: '',
  difficulty_level: 'medium',
};

const STATUS_FILTER_OPTIONS = [
  { value: '', label: 'Tất cả độ khó' },
  ...DIFFICULTY_OPTIONS,
];

export default function TopicManagement() {
  const { openModal, closeModal } = useModal();
  const toast = useToast();
  const [topics, setTopics] = useState<any[]>([]);

  usePageHeader({
    title: 'Quản lý Đề tài',
    description: 'Danh sách đề tài gợi ý của giảng viên.',
  });
  const [loading, setLoading] = useState(true);
  const [difficultyFilter, setDifficultyFilter] = useState('');
  const [form, setForm] = useState({ ...emptyForm });
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formModalOpen, setFormModalOpen] = useState(false);


  const { search, setSearch, searchParams } = useSearch();
  const { resetPage, paginationParams, handlePaginatedResponse, paginationProps } = usePagination({ pageSize: 5 });


  useEffect(() => { resetPage(); }, [searchParams, difficultyFilter]);
  useEffect(() => { loadTopics(); }, [searchParams, difficultyFilter, paginationParams.page]);

  const loadTopics = async () => {
    await fetchWithAuth(endpoints.myTopic, (data: any, paginatedData?: { count: number }) => {
          setTopics(handlePaginatedResponse(Array.isArray(data) ? data : data?.results ?? [], paginatedData));
        }, () => { }, { ...searchParams, ...paginationParams, difficulty_level: difficultyFilter || undefined }, setLoading);
    };

  const loadTopicDetail = async (id: number, onSuccess: any) => {
    await fetchWithAuth(endpoints.TopicDetail(id), onSuccess, () => { }, {});
  };

  const update = (field: string) => (e: any) => setForm(prev => ({ ...prev, [field]: e.target?.value ?? e }));

  const resetForm = () => { setForm({ ...emptyForm }); setEditingId(null); };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setSubmitting(true);
    const body = {
      title: form.title,
      description: form.description,
      technology: form.technology,
      difficulty_level: form.difficulty_level,
    };
    const onSuccess = () => {
      loadTopics();
      setFormModalOpen(false);
      resetForm();
      toast.success(editingId ? 'Cập nhật thành công' : 'Lưu thành công', editingId ? 'Đề tài đã được cập nhật' : 'Đề tài đã được tạo');
    };
    const onError = (type: string, msg: string) => {
      toast.error(type === 'network' ? 'Lỗi mạng' : type === 'server' ? 'Lỗi máy chủ' : 'Lỗi', msg);
    };

    if (editingId) {
      await updatePatchWithAuth(endpoints.TopicDetail(editingId), body, onSuccess, onError, setSubmitting);
    } else {
      await createWithAuth(endpoints.myTopic, body, onSuccess, onError, setSubmitting);
    }
  };

  const handleDelete = async (id: number) => {
    await deleteWithAuth(
      endpoints.TopicDetail(id),
      () => {
        loadTopics();
        toast.success('Xóa thành công', 'Đề tài đã bị xóa');
      },
      (type: string, msg: string) => {
        toast.error(type === 'network' ? 'Lỗi mạng' : type === 'server' ? 'Lỗi máy chủ' : 'Lỗi', msg);
      },
    );
  };

  const openFormModal = (topic: any = null) => {
    if (topic) {
      setEditingId(topic.id);
      loadTopicDetail(topic.id, (data: any) => {
        setForm({
          title: data.title || '',
          description: data.description || '',
          technology: data.technology || '',
          difficulty_level: data.difficulty_level || 'medium',
        });
      });
    } else {
      resetForm();
    }
    setFormModalOpen(true);
  };

  const openDeleteConfirm = (topic: any) => {
    openModal({
      title: 'Xóa đề tài',
      icon: 'fa-solid fa-trash-can',
      description: 'Bạn có chắc muốn xóa đề tài này?',
      size: 'sm',
      content: (
        <p className="text-sm text-gray-600">
          Đề tài <span className="font-semibold text-gray-800">"{topic.title}"</span> sẽ bị xóa vĩnh viễn.
        </p>
      ),
      footer: (
        <div className="flex items-center gap-2">
          <Button variant="danger" icon="fa-solid fa-trash-can" onClick={() => { handleDelete(topic.id); closeModal(); }}>
            Xóa
          </Button>
          <Button variant="outline" onClick={closeModal}>Hủy</Button>
        </div>
      ),
    });
  };

  const openDetailModal = (topic: any) => {
    loadTopicDetail(topic.id, (data: any) => {
      const diff = DIFFICULTY_CONFIG[data.difficulty_level] || DIFFICULTY_CONFIG.medium;
      openModal({
        title: data.title,
        description: 'Chi tiết đề tài',
        icon: 'fa-regular fa-file-lines',
        size: 'lg',
        content: (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-x-6 gap-y-4">
              <div>
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">ID</p>
                <p className="text-sm font-semibold text-gray-800">{data.id}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Độ khó</p>
                <Badge variant={diff.variant} dot>{diff.label}</Badge>
              </div>
              <div className="col-span-2">
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Tên đề tài</p>
                <p className="text-sm font-semibold text-gray-800">{data.title}</p>
              </div>
              <div className="col-span-2">
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Mô tả</p>
                <p className="text-sm text-gray-700 leading-relaxed">{data.description || '—'}</p>
              </div>
              <div className="col-span-2">
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Công nghệ</p>
                <p className="text-sm text-gray-700">{data.technology || '—'}</p>
              </div>
            </div>
          </div>
        ),
        footer: <Button variant="outline" size="sm" onClick={closeModal}>Đóng</Button>,
      });
    });
  };

  const columns: TableColumn<any>[] = [
    {
      key: 'title',
      label: 'Đề tài',
      render: (topic) => (
        <div className="min-w-0">
          <h4 className="font-medium text-gray-800 text-sm">{topic.title}</h4>
          <p className="text-xs text-gray-400 truncate mt-0.5">{topic.description}</p>
        </div>
      ),
    },
    {
      key: 'difficulty_level',
      label: 'Độ khó',
      align: 'center',
      render: (topic) => {
        const diff = DIFFICULTY_CONFIG[topic.difficulty_level] || DIFFICULTY_CONFIG.medium;
        return <Badge variant={diff.variant} dot>{diff.label}</Badge>;
      },
    },
    {
      key: 'actions',
      label: 'Thao tác',
      align: 'right',
      render: (topic) => (
        <Badge variant="neutral" className="!px-1.5 !py-0.5 !gap-1">
          <Button variant="ghost" size="icon" icon="fa-regular fa-eye" onClick={() => openDetailModal(topic)} aria-label="Chi tiết" />
          <Button variant="ghost" size="icon" icon="fa-regular fa-pen-to-square" onClick={() => openFormModal(topic)} aria-label="Sửa" />
          <Button variant="ghost" size="icon" icon="fa-regular fa-trash-can" onClick={() => openDeleteConfirm(topic)} aria-label="Xóa" />
        </Badge>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="mx-auto w-full space-y-6">
        <Card variant="elevated" bodyClassName="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Tìm kiếm theo tên hoặc mô tả..."
                leadingIcon="fa-solid fa-magnifying-glass"
                value={search}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
              />
            </div>
            <div className="w-full sm:w-48">
              <Select
                value={difficultyFilter}
                onChange={(e: ChangeEvent<HTMLSelectElement>) => setDifficultyFilter(e.target.value)}
                options={STATUS_FILTER_OPTIONS}
              />
            </div>
            <div className="w-full sm:w-34">
              <Button variant="ghost" icon="fa-solid fa-plus" onClick={() => openFormModal()}>
                Thêm đề tài
              </Button>
            </div>

            <div className="w-full sm:w-30">
              <Button variant="primary" icon="fa-solid fa-rotate" onClick={loadTopics} loading={loading}>
                Làm mới
              </Button>
            </div>
          </div>
        </Card>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <i className="fa-solid fa-circle-notch animate-spin text-primary text-2xl"></i>
            </div>
          ) : (
            <>
              <GenericTable
                rows={topics}
                columns={columns}
                rowKey={(topic) => topic.id}
                emptyText={search || difficultyFilter ? 'Không tìm thấy đề tài phù hợp' : 'Chưa có đề tài nào'}
              />
              <Pagination {...paginationProps} />
            </>
          )}
      </div>

      {formModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" aria-modal="true" role="dialog">
          <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-[2px]" onClick={() => setFormModalOpen(false)} />
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-xl shadow-gray-900/10 flex flex-col max-h-[90vh] outline-none animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between gap-3 px-6 py-5 border-b border-gray-100 shrink-0">
              <div className="flex items-start gap-3">
                <span className="w-10 h-10 shrink-0 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <i className="fa-solid fa-file-pen text-base"></i>
                </span>
                <div>
                  <h3 className="font-semibold text-gray-900 text-base">{editingId ? 'Sửa đề tài' : 'Thêm đề tài mới'}</h3>
                  <p className="text-sm text-gray-500 mt-1">{editingId ? 'Cập nhật thông tin đề tài' : 'Điền thông tin đề tài gợi ý'}</p>
                </div>
              </div>
              <button type="button" onClick={() => setFormModalOpen(false)} aria-label="Đóng" className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
                <i className="fa-solid fa-xmark text-sm"></i>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="px-6 py-5 overflow-y-auto space-y-5">
              <Input label="Tên đề tài" required placeholder="Nhập tên đề tài" value={form.title} onChange={update('title')} />
              <Textarea label="Mô tả" required placeholder="Nhập mô tả đề tài..." rows={4} value={form.description} onChange={update('description')} />
              <Input label="Công nghệ" placeholder="VD: Python, React, Django..." helperText="Nhập các công nghệ cách nhau bằng dấu phẩy" value={form.technology} onChange={update('technology')} />
              <Select label="Độ khó" required value={form.difficulty_level} onChange={update('difficulty_level')} options={DIFFICULTY_OPTIONS} />
              <div className="flex items-center justify-end gap-3 pt-2">
                <Button variant="outline" type="button" onClick={() => setFormModalOpen(false)}>Hủy</Button>
                <Button type="submit" icon="fa-regular fa-floppy-disk" loading={submitting} disabled={submitting}>
                  {editingId ? 'Cập nhật' : 'Lưu'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
