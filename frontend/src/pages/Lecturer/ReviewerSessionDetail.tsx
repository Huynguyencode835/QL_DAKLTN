import { useEffect, useState, type ReactNode } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { usePageHeader, useToast, useUser, usePeriod } from '../../hooks';
import { fetchWithAuth, createWithAuth, updatePatchWithAuth } from '../../utils/ApiHelper';
import { endpoints } from '../../config/Apis';
import Modal from '../../components/Ui/Modal';
import PdfViewer from '../../components/PdfViewer';
import Card from '../../components/Ui/Card';
import Button from '../../components/Ui/Button';
import Badge from '../../components/Ui/Badge';
import Input from '../../components/Ui/Input';
import Textarea from '../../components/Ui/Textarea';
import { SectionCard } from '../../components/Ui/Card';
import type { ReviewerAssignmentRegistration, RegistrationGradeData } from '../../types';

const REG_STATUS: Record<string, { label: string; variant: 'success' | 'warning' | 'danger' | 'info' | 'neutral' }> = {
  approved: { label: 'Đã duyệt', variant: 'success' },
  waiting_lecturer: { label: 'Chờ duyệt', variant: 'warning' },
  rejected: { label: 'Từ chối', variant: 'danger' },
  assigned_lecturer: { label: 'Đã phân GV', variant: 'success' },
  waiting_staff_assignment: { label: 'Chờ giáo vụ', variant: 'warning' },
};

const REPORT_STATUS: Record<string, { label: string; variant: 'success' | 'warning' | 'danger' | 'info' | 'neutral' }> = {
  submitted: { label: 'Đã nộp', variant: 'info' },
  reviewed: { label: 'Đã đánh giá', variant: 'info' },
  approved: { label: 'Đã duyệt', variant: 'success' },
  rejected: { label: 'Từ chối', variant: 'danger' },
  late: { label: 'Nộp muộn', variant: 'warning' },
};

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
    + ' ' + d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

function InfoTile({ icon, label, value }: { icon: string; label: string; value: ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-gray-100 last:border-0">
      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center text-primary shrink-0 ring-1 ring-primary/10">
        <i className={`${icon} text-sm`}></i>
      </div>
      <div className="min-w-0">
        <div className="text-[11px] text-textMuted font-medium uppercase tracking-wide">{label}</div>
        <div className="text-sm font-semibold text-textMain">{value || '—'}</div>
      </div>
    </div>
  );
}

export default function ReviewerSessionDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const isStaffView = location.pathname.startsWith('/manage-reviewer-sessions');
  const backPath = isStaffView ? '/manage-reviewer-sessions' : '/my-reviewer-sessions';
  const statePeriodId = (location.state as { periodId?: string })?.periodId;
  const rawPeriodId = statePeriodId || String((location.state as any)?.periodId || '');
  const { thesisPeriod } = usePeriod();
  const periodId = rawPeriodId === 'current-thesis' ? String(thesisPeriod?.id || '') : rawPeriodId;
  const { user } = useUser();
  const toast = useToast();

  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedRegId, setSelectedRegId] = useState<number | null>(null);
  const [regDetail, setRegDetail] = useState<any>(null);
  const [finalReport, setFinalReport] = useState<any>(null);
  const [loadingReg, setLoadingReg] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [showReportHistory, setShowReportHistory] = useState(false);
  const [reportViewOpen, setReportViewOpen] = useState(false);
  const [reportPdfUrl, setReportPdfUrl] = useState<string | null>(null);
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [gradeData, setGradeData] = useState<Record<number, RegistrationGradeData>>({});
  const [submittingGrade, setSubmittingGrade] = useState(false);
  const [gradeSubmitSuccess, setGradeSubmitSuccess] = useState(false);
  const [myScore, setMyScore] = useState<string>('');
  const [myComment, setMyComment] = useState<string>('');

  usePageHeader({
    title: 'Chi tiết phản biện',
    description: session ? `Phản biện - ${session.reviewer_name}` : 'Đang tải...',
  });

  useEffect(() => {
    if (id && periodId) loadSession();
  }, [id, periodId]);

  useEffect(() => {
    if (selectedRegId) loadRegistrationData(selectedRegId);
    else {
      setRegDetail(null);
      setFinalReport(null);
      setReportViewOpen(false);
    }
  }, [selectedRegId]);

  useEffect(() => {
    if (reportViewOpen && finalReport?.latest?.id) loadReportPdfUrl(finalReport.latest.id);
    else { setReportPdfUrl(null); setPdfError(null); }
  }, [reportViewOpen, finalReport?.latest?.id]);

  const currentGradeData = selectedRegId ? gradeData[selectedRegId] : null;
  const myGrade = currentGradeData?.reviewer ?? null;

  useEffect(() => {
    setMyScore(myGrade?.score || '');
    setMyComment(myGrade?.comment || '');
  }, [myGrade?.id]);

  const loadSession = async () => {
    await fetchWithAuth(
      endpoints.reviewerSessionDetail(periodId, id!),
      (data: any) => setSession(data),
      () => { toast.error('Lỗi', 'Không thể tải đợt phản biện.'); navigate(-1); },
      {},
      setLoading,
    );
  };

  const loadGrade = (regId: number): Promise<RegistrationGradeData | null> => {
    return new Promise((resolve) => {
      fetchWithAuth(
        endpoints.gradeByRegistration(regId),
        (data: RegistrationGradeData) => {
          setGradeData((prev) => ({ ...prev, [regId]: data }));
          resolve(data);
        },
        () => { resolve(null); },
        {}
      );
    });
  };

  const loadRegistrationData = async (regId: number) => {
    setLoadingReg(true);
    setRegDetail(null);
    setFinalReport(null);
    setShowReportHistory(false);
    setReportViewOpen(false);
    setReportPdfUrl(null);
    setPdfError(null);
    setGradeSubmitSuccess(false);

    const [regRes, reportRes] = await Promise.allSettled([
      new Promise((resolve) => {
        fetchWithAuth(endpoints.registrationDetail(periodId, regId), (d: any) => resolve(d), () => resolve(null), {});
      }),
      new Promise((resolve) => {
        fetchWithAuth(`${endpoints.finalReport}?registration=${regId}`, (d: any) => resolve(d), () => resolve(null), {});
      }),
      loadGrade(regId),
    ]);

    setRegDetail(regRes.status === 'fulfilled' ? regRes.value : null);
    setFinalReport(reportRes.status === 'fulfilled' ? reportRes.value : null);
    setLoadingReg(false);
  };

  const loadReportPdfUrl = async (reportId: number) => {
    setLoadingPdf(true);
    setPdfError(null);
    setReportPdfUrl(null);
    await fetchWithAuth(
      endpoints.reportDownload(reportId),
      (data: any) => {
        const url = data?.url || data?.download_url || (typeof data === 'string' ? data : null);
        if (url) setReportPdfUrl(url);
        else setPdfError('Không lấy được đường dẫn file.');
      },
      () => setPdfError('Không tải được file báo cáo.'),
      {},
      setLoadingPdf
    );
  };

  const handleSaveGrade = async (regId: number, score: number, comment: string) => {
    setSubmittingGrade(true);
    setGradeSubmitSuccess(false);
    const isEdit = !!myGrade?.id;

    const onSuccess = async () => {
      toast.success(isEdit ? 'Cập nhật thành công' : 'Gửi thành công');
      setGradeSubmitSuccess(true);
      await loadGrade(regId);
      setTimeout(() => setGradeSubmitSuccess(false), 3000);
    };
    const onError = (type: string, msg: string) => {
      toast.error('Lỗi', type === 'network' ? 'Không thể kết nối.' : msg);
    };

    if (isEdit) {
      await updatePatchWithAuth(endpoints.gradeDetail(myGrade.id), { score, comment }, onSuccess, onError, setSubmittingGrade);
    } else {
      await createWithAuth(
        endpoints.grades,
        { registration: regId, grade_type: 'reviewer', component: 'overall', is_final: false, score, comment },
        onSuccess, onError, setSubmittingGrade
      );
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-12"><i className="fa-solid fa-circle-notch animate-spin text-primary text-2xl"></i></div>;
  }

  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-400">
        <i className="fa-solid fa-exclamation-triangle text-4xl mb-3"></i>
        <p className="text-sm font-medium">Không tìm thấy đợt phản biện</p>
        <Button variant="outline" size="sm" className="mt-4" onClick={() => navigate(backPath)}>Quay lại</Button>
      </div>
    );
  }

  const assignments: ReviewerAssignmentRegistration[] = session.assignments || [];
  const selectedAssignment = assignments.find((a) => a.registration_id === selectedRegId);

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" icon="fa-solid fa-arrow-left" onClick={() => navigate(backPath)}>Quay lại</Button>
          <div className="h-6 w-px bg-gray-200"></div>
          <div>
            <h2 className="text-lg font-bold text-textMain">Phản biện - {session.reviewer_name}</h2>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <Badge variant="neutral">{assignments.length} đề tài</Badge>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
          <div className="flex items-center gap-2"><i className="fa-regular fa-calendar text-gray-400"></i><span>{formatDate(session.defense_date)}</span></div>
          <div className="flex items-center gap-2"><i className="fa-solid fa-location-dot text-gray-400"></i><span>{session.location || 'Chưa có'}</span></div>
        </div>
      </div>

      {/* BODY */}
      <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
        {/* LEFT */}
        <div className="lg:col-span-3">
          <Card variant="elevated" icon="fa-solid fa-file-lines" title={`Đề tài (${assignments.length})`}>
            <div className="space-y-2 max-h-[370px] overflow-y-auto pr-1">
              {assignments.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">Chưa có đề tài nào</p>
              ) : (
                assignments.map((a) => {
                  const isSelected = selectedRegId === a.registration_id;
                  const st = REG_STATUS[a.approval_status || ''];
                  return (
                    <div
                      key={a.registration_id}
                      onClick={() => setSelectedRegId(a.registration_id)}
                      className={`p-3 rounded-xl cursor-pointer border transition-all duration-150 ${isSelected ? 'border-primary bg-primary/5 ring-1 ring-primary/20 shadow-sm' : 'border-gray-100 hover:bg-gray-50 hover:border-gray-200'}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium text-gray-800 line-clamp-2 leading-snug">{a.project_title}</div>
                          <div className="text-xs text-gray-400 mt-1.5">{a.student_name} · {a.student_id}</div>
                        </div>
                        {st && <Badge variant={st.variant} className="shrink-0 text-[10px]">{st.label}</Badge>}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </Card>
        </div>

        {/* RIGHT */}
        <div className="lg:col-span-7">
          {!selectedAssignment ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400 bg-white rounded-2xl border border-gray-100 shadow-sm">
              <i className="fa-regular fa-hand-pointer text-5xl mb-4"></i>
              <p className="text-sm font-medium">Chọn một đề tài từ danh sách bên trái để xem chi tiết</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Info + Report */}
              <div className={`grid grid-cols-1 gap-6 ${finalReport?.latest ? 'lg:grid-cols-2' : ''}`}>
                <SectionCard title="Thông tin đề tài" icon="fa-solid fa-file-lines">
                  {loadingReg ? (
                    <div className="flex justify-center py-6"><i className="fa-solid fa-circle-notch animate-spin text-primary text-xl"></i></div>
                  ) : (
                    <div className="space-y-1">
                      <div className="pb-3 border-b border-gray-100">
                        <h3 className="text-base font-bold text-textMain">{regDetail?.project_title || selectedAssignment.project_title}</h3>
                        <div className="flex items-center gap-3 mt-2">
                          <span className="text-sm text-gray-600"><i className="fa-solid fa-user-graduate text-gray-400 mr-1"></i>{regDetail?.student_name || selectedAssignment.student_name}</span>
                          <span className="text-gray-300">·</span>
                          <span className="font-mono text-xs">{regDetail?.student_id || selectedAssignment.student_id}</span>
                        </div>
                      </div>
                      <InfoTile icon="fa-solid fa-book-open" label="Mô tả" value={regDetail?.project_description || 'Chưa có mô tả'} />
                      <InfoTile icon="fa-solid fa-user-tie" label="Giảng viên hướng dẫn" value={regDetail?.lecturer_name || '—'} />
                      <InfoTile icon="fa-solid fa-graduation-cap" label="Trạng thái" value={regDetail?.status_display || selectedAssignment.approval_status} />
                      <div className="pt-2">
                        <Button variant="outline" size="sm" icon="fa-solid fa-expand" onClick={() => setDetailModalOpen(true)}>Xem chi tiết đầy đủ</Button>
                      </div>
                    </div>
                  )}
                </SectionCard>

                {finalReport?.latest && (
                  <SectionCard title="Báo cáo cuối kỳ" icon="fa-solid fa-file-pdf">
                    <div className="space-y-1">
                      <InfoTile icon="fa-solid fa-file" label="Tên file" value={finalReport.latest.file_name} />
                      <InfoTile icon="fa-solid fa-weight-hanging" label="Kích thước" value={`${(finalReport.latest.file_size / 1024).toFixed(1)} KB`} />
                      <InfoTile icon="fa-solid fa-clock" label="Ngày nộp" value={formatDate(finalReport.latest.created_date)} />
                      {(() => {
                        const st = REPORT_STATUS[finalReport.latest.status];
                        return <InfoTile icon="fa-solid fa-circle-check" label="Trạng thái" value={<Badge variant={st?.variant || 'neutral'} dot>{st?.label || finalReport.latest.status}</Badge>} />;
                      })()}
                      {finalReport.latest.feedback && <InfoTile icon="fa-solid fa-comment" label="Phản hồi" value={finalReport.latest.feedback} />}
                      <div className="pt-2">
                        <Button variant="outline" size="sm" icon={reportViewOpen ? 'fa-solid fa-eye-slash' : 'fa-solid fa-expand'} onClick={() => setReportViewOpen(!reportViewOpen)}>
                          {reportViewOpen ? 'Đóng báo cáo' : 'Xem báo cáo'}
                        </Button>
                      </div>
                      {finalReport.history?.length > 1 && (
                        <div className="pt-2">
                          <button onClick={() => setShowReportHistory(!showReportHistory)} className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 font-medium transition-colors">
                            <i className={`fa-solid fa-chevron-${showReportHistory ? 'up' : 'down'} text-xs`}></i>
                            Lịch sử nộp ({finalReport.history.length} lần)
                          </button>
                          {showReportHistory && (
                            <div className="mt-3 space-y-2">
                              {finalReport.history.map((r: any) => {
                                const st = REPORT_STATUS[r.status];
                                return (
                                  <div key={r.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-gray-50 text-sm">
                                    <i className="fa-solid fa-file-lines text-gray-400"></i>
                                    <span className="flex-1 truncate text-gray-700">{r.file_name}</span>
                                    <Badge variant={st?.variant || 'neutral'} className="text-[10px]">{st?.label || r.status}</Badge>
                                    <span className="text-xs text-gray-400 whitespace-nowrap">{formatDate(r.created_date)}</span>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </SectionCard>
                )}
              </div>

              {/* PDF Viewer */}
              {reportViewOpen && (
                <SectionCard title="Báo cáo" icon="fa-solid fa-square-poll-vertical">
                  <div className="mt-4 border-t border-gray-100 pt-4">
                    {loadingPdf && <div className="flex justify-center py-8"><i className="fa-solid fa-circle-notch animate-spin text-primary text-xl"></i></div>}
                    {pdfError && <p className="text-sm text-red-500 text-center py-4">{pdfError}</p>}
                    {reportPdfUrl && !loadingPdf && <PdfViewer fileUrl={reportPdfUrl} />}
                  </div>
                </SectionCard>
              )}

              {/* Grade Summary */}
              <SectionCard title="Bảng điểm" icon="fa-solid fa-star">
                {loadingReg ? (
                  <div className="flex justify-center py-6"><i className="fa-solid fa-circle-notch animate-spin text-primary text-xl"></i></div>
                ) : currentGradeData ? (
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                    <div className="p-3 rounded-xl bg-blue-50 border border-blue-100">
                      <div className="text-[11px] text-blue-600 font-medium uppercase tracking-wide">Quá trình</div>
                      <div className="text-lg font-bold text-blue-800 mt-1">{currentGradeData.process?.score ?? '—'}</div>
                    </div>
                    <div className="p-3 rounded-xl bg-purple-50 border border-purple-100">
                      <div className="text-[11px] text-purple-600 font-medium uppercase tracking-wide">Cuối kỳ</div>
                      <div className="text-lg font-bold text-purple-800 mt-1">{currentGradeData.final?.score ?? '—'}</div>
                    </div>
                    <div className="p-3 rounded-xl bg-amber-50 border border-amber-100">
                      <div className="text-[11px] text-amber-600 font-medium uppercase tracking-wide">Phản biện</div>
                      <div className="text-lg font-bold text-amber-800 mt-1">{currentGradeData.reviewer?.score ?? '—'}</div>
                    </div>
                    <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100">
                      <div className="text-[11px] text-emerald-600 font-medium uppercase tracking-wide">Điểm hướng dẫn</div>
                      <div className="text-lg font-bold text-emerald-800 mt-1">{currentGradeData.supervisor_final ?? '—'}</div>
                    </div>
                    <div className="p-3 rounded-xl bg-red-50 border border-red-100">
                      <div className="text-[11px] text-red-600 font-medium uppercase tracking-wide">Điểm cuối cùng</div>
                      <div className="text-lg font-bold text-red-800 mt-1">{currentGradeData.final_score ?? '—'}</div>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 text-center py-4">Chưa có dữ liệu điểm</p>
                )}
              </SectionCard>

              {/* My Grading */}
              <SectionCard title="Chấm điểm của tôi" icon="fa-solid fa-pen-to-square">
                {loadingReg ? (
                  <div className="flex justify-center py-6"><i className="fa-solid fa-circle-notch animate-spin text-primary text-xl"></i></div>
                ) : (
                  <div className="space-y-4">
                    {gradeSubmitSuccess && (
                      <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm">
                        <i className="fa-solid fa-circle-check"></i>
                        {myGrade?.id ? 'Cập nhật điểm thành công!' : 'Gửi điểm thành công!'}
                      </div>
                    )}
                    {myGrade?.is_final && (
                      <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-sm">
                        <i className="fa-solid fa-lock"></i>
                        Điểm đã chốt, không thể chỉnh sửa.
                      </div>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-[1fr_2fr_auto] gap-3 items-end">
                      <Input
                        label="Điểm"
                        type="number"
                        min="0" max="10" step="0.25"
                        placeholder="0.0"
                        value={myScore}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                          const v = e.target.value;
                          if (v === '') { setMyScore(''); return; }
                          const num = parseFloat(v);
                          if (!isNaN(num) && num >= 0 && num <= 10) setMyScore(v);
                        }}
                        disabled={myGrade?.is_final}
                      />
                      <Textarea
                        label="Nhận xét"
                        placeholder="Nhận xét..."
                        rows={2}
                        value={myComment}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setMyComment(e.target.value)}
                        disabled={myGrade?.is_final}
                      />
                      <Button
                        variant="primary" size="sm"
                        icon={submittingGrade ? 'fa-solid fa-circle-notch animate-spin' : myGrade?.id ? 'fa-solid fa-pen' : 'fa-solid fa-paper-plane'}
                        onClick={() => {
                          const num = parseFloat(myScore);
                          if (!isNaN(num) && selectedRegId) handleSaveGrade(selectedRegId, num, myComment);
                        }}
                        disabled={submittingGrade || !myScore || myGrade?.is_final}
                      >
                        {myGrade?.id ? 'Sửa điểm' : 'Gửi'}
                      </Button>
                    </div>
                  </div>
                )}
              </SectionCard>
            </div>
          )}
        </div>
      </div>

      {/* Modal chi tiết đầy đủ */}
      <Modal open={detailModalOpen} onClose={() => setDetailModalOpen(false)} title="Chi tiết đề tài" icon="fa-solid fa-file-lines" size="lg">
        {regDetail ? (
          <div className="space-y-6">
            <div>
              <h4 className="font-semibold text-sm text-gray-800 mb-3 flex items-center gap-2"><i className="fa-solid fa-user-graduate text-primary"></i>Thông tin sinh viên</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                <InfoTile icon="fa-solid fa-user" label="Họ tên" value={regDetail.student_info?.full_name} />
                <InfoTile icon="fa-solid fa-id-card" label="MSSV" value={regDetail.student_info?.student_id} />
                <InfoTile icon="fa-solid fa-envelope" label="Email" value={regDetail.student_info?.email} />
                <InfoTile icon="fa-solid fa-star" label="GPA" value={regDetail.student_info?.gpa?.toString()} />
                <InfoTile icon="fa-solid fa-school" label="Lớp" value={regDetail.student_info?.class_name} />
                <InfoTile icon="fa-solid fa-building-columns" label="Khoa" value={regDetail.student_info?.faculty} />
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-sm text-gray-800 mb-3 flex items-center gap-2"><i className="fa-solid fa-chalkboard-user text-primary"></i>Phân công giảng viên</h4>
              {(regDetail.lecturer_info?.length ?? 0) > 0 ? (
                <div className="space-y-2">
                  {regDetail.lecturer_info.map((l: any) => (
                    <div key={l.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
                      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0"><i className="fa-solid fa-user text-primary text-sm"></i></div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-800">{l.full_name}</div>
                        <div className="text-xs text-gray-400">{l.email}</div>
                      </div>
                      <Badge variant={l.role === 'main' ? 'primary' : l.role === 'reviewer' ? 'warning' : 'neutral'}>
                        {l.role === 'main' ? 'Hướng dẫn' : l.role === 'reviewer' ? 'Phản biện' : 'Ưu tiên'}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : <p className="text-sm text-gray-400">Chưa có phân công</p>}
            </div>
            <div>
              <h4 className="font-semibold text-sm text-gray-800 mb-3 flex items-center gap-2"><i className="fa-solid fa-book-open text-primary"></i>Thông tin đề tài</h4>
              <div className="grid grid-cols-1 gap-1">
                <InfoTile icon="fa-solid fa-heading" label="Tên đề tài" value={regDetail.project_title} />
                <InfoTile icon="fa-solid fa-align-left" label="Mô tả" value={regDetail.project_description || 'Chưa có mô tả'} />
                <InfoTile icon="fa-solid fa-graduation-cap" label="Chuyên ngành" value={regDetail.specialization?.name} />
                <InfoTile icon="fa-solid fa-circle-info" label="Trạng thái" value={regDetail.status_display} />
              </div>
            </div>
          </div>
        ) : (
          <div className="flex justify-center py-8"><i className="fa-solid fa-circle-notch animate-spin text-primary text-xl"></i></div>
        )}
      </Modal>
    </div>
  );
}
