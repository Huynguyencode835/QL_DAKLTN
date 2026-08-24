import { useState, useEffect } from "react";
import { endpoints } from "../config/Apis";
import { fetchWithAuth } from "../utils/ApiHelper";
import FilterBar from "../components/FilterBar";
import { RegistrationPeriod, ReportEntry, ReportTableData, Schedules } from "../types";
import Badge from "../components/Ui/Badge";
import Button from "../components/Ui/Button";
import GenericTable, { TableColumn } from "../components/GenericTable";
import { useReportDetail, useSearch } from "../hooks";

const EMPTY_MATRIX: ReportTableData = { columns: [], rows: [] };

export default function ReportsManagement() {
    const { openDetail, detailLoading } = useReportDetail();
    const { search, setSearch, searchParams } = useSearch();
    const [selectedPeriodId, setSelectedPeriodId] = useState<string>('current');
    const [periodsLoading, setPeriodsLoading] = useState(true);
    const [registrationPeriods, setRegistrationPeriods] = useState<RegistrationPeriod[]>([]);
    const [loading, setLoading] = useState(true);
    const [schedules, setSchedules] = useState<Schedules[]>([]);
    const [schedulesLoading, setSchedulesLoading] = useState(true);
    const [selectedScheduleId, setSelectedScheduleId] = useState<string>('');


    const [reportsMatrix, setReportsMatrix] = useState<ReportTableData>(EMPTY_MATRIX);

    const loadPeriods = async () => {
        await fetchWithAuth(
            endpoints.registrationPeriods,
            (data: RegistrationPeriod[]) => setRegistrationPeriods(data),
            (err: any) => console.error('Lỗi tải đợt đăng ký:', err),
            {},
            setPeriodsLoading
        );
    };

    const loadSchedules = async () => {
        await fetchWithAuth(
            endpoints.schedules(selectedPeriodId),
            (data: Schedules[]) => setSchedules(data),
            (err: any) => console.error('Lỗi tải lịch báo cáo:', err),
            {},
            () => setSchedulesLoading(false)
        );
    };

    const loadReportsMatrix = async () => {
        await fetchWithAuth(
            endpoints.reportMatrix(selectedPeriodId),
            (data: ReportTableData) => setReportsMatrix(data),
            (err: any) => console.error('Lỗi tải bảng báo cáo:', err),
            { ...searchParams },
            setLoading
        );
    };

    useEffect(() => {
        loadPeriods();
    }, []);

    useEffect(() => {
        Promise.all([
            loadSchedules(),
            loadReportsMatrix(),
        ]);
    }, [selectedPeriodId, searchParams]);

    function statusBadge(entry: ReportEntry | undefined) {
        if (!entry) return <span className="text-gray-300">—</span>;
        switch (entry.status) {
            case 'submitted':
                return <Badge variant="success" dot>Đã nộp</Badge>;
            case 'approved':
                return <Badge variant="success" dot>Đã duyệt</Badge>;
            case 'rejected':
                return <Badge variant="danger" dot>Từ chối</Badge>;
            default:
                return <Badge variant="neutral" dot>Chưa nộp</Badge>;
        }
    }

    const columns: TableColumn<StudentReportRow>[] = [
        {
            key: 'student_id',
            label: 'MSSV',
            render: (row) => <Badge variant="primary" className="font-mono">{row.student_id}</Badge>,
        },
        {
            key: 'student_name',
            label: 'Họ tên',
            render: (row) => <span className="font-medium text-gray-800">{row.student_name}</span>,
        },
        {
            key: 'project_title',
            label: 'Đề tài',
            render: (row) => <span className="text-gray-600 line-clamp-1">{row.project_title}</span>,
        },
        ...reportsMatrix.columns.map(
            (col): TableColumn<StudentReportRow> => ({
                key: col.key,
                label: col.label,
                align: 'center',
                render: (row) => {
                    const entry = row.reports[col.key];
                    if (!entry) return <span className="text-gray-300">—</span>;
                    return (
                        <div className="flex items-center justify-center gap-2">
                            {statusBadge(entry)}
                            {entry.report_id != null && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    icon="fa-solid fa-eye"
                                    loading={detailLoading}
                                    disabled={detailLoading}
                                    onClick={() => openDetail(entry.report_id!)}
                                    aria-label="Chi tiết báo cáo"
                                />
                            )}
                        </div>
                    );
                },
            })
        ),
    ];

    return (
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
            <div className="max-w-7xl mx-auto w-full space-y-6">
                <FilterBar
                    searchValue={search}
                    onSearchChange={setSearch}
                    searchPlaceholder="Tìm kiếm theo tên hoặc MSSV..."
                    dropdowns={[
                        {
                            key: 'period',
                            value: selectedPeriodId,
                            onChange: setSelectedPeriodId,
                            placeholder: periodsLoading ? 'Đang tải...' : 'Chọn đợt đăng ký',
                            loading: periodsLoading,
                            widthClassName: 'w-full sm:w-64',
                            options: [
                                { value: 'current', label: 'Đợt hiện tại (đang mở)' },
                                ...registrationPeriods.map((p) => ({
                                    value: String(p.id),
                                    label: `${p.name} (${p.academic_year})`,
                                })),
                            ],
                        },
                        {
                            key: 'schedule',
                            value: selectedScheduleId,
                            onChange: setSelectedScheduleId,
                            placeholder: schedulesLoading ? 'Đang tải...' : 'Chọn lịch báo cáo',
                            loading: schedulesLoading,
                            widthClassName: 'w-full sm:w-64',
                            options: [
                                { value: 'defaul', label: 'Tổng quan' },
                                ...schedules.map((p) => ({
                                    value: String(p.id),
                                    label: `Lần ${p.sequence_number}${p.title ? `: ${p.title}` : ''}`,
                                })),
                            ],
                        },
                    ]}
                    onRefresh={loadReportsMatrix}
                    refreshLoading={loading}
                />
                <GenericTable rows={reportsMatrix.rows} columns={columns} rowKey={(row) => row.id} />
            </div>
        </main>
    );
}