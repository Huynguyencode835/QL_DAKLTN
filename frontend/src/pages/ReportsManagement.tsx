import { useState, useEffect } from "react";
import { endpoints } from "../config/Apis";
import { fetchWithAuth } from "../utils/ApiHelper";
import FilterBar from "../components/FilterBar";
import { RegistrationPeriod, ReportTableData, Schedules, StudentReportRow } from "../types";
import Badge from "../components/Ui/Badge";
import GenericTable, { TableColumn } from "../components/GenericTable";
import Pagination from "../components/Ui/Pagination";
import { useReportDetail, useSearch, useUser, usePagination } from "../hooks";

const EMPTY_MATRIX: ReportTableData = { columns: [], rows: [] };

export default function ReportsManagement() {
    const { openDetail, detailLoading } = useReportDetail();
    const { search, setSearch, searchParams } = useSearch();
    const { user } = useUser();
    const role = user?.role || user?.user_type || 'lecturer';
    const isLecturer = role === 'lecturer';
    const [selectedPeriodId, setSelectedPeriodId] = useState<string>('current');
    const [periodsLoading, setPeriodsLoading] = useState(true);
    const [registrationPeriods, setRegistrationPeriods] = useState<RegistrationPeriod[]>([]);
    const [loading, setLoading] = useState(true);
    const [schedules, setSchedules] = useState<Schedules[]>([]);
    const [schedulesLoading, setSchedulesLoading] = useState(true);
    const [selectedScheduleId, setSelectedScheduleId] = useState<string>('');


    const [reportsMatrix, setReportsMatrix] = useState<ReportTableData>(EMPTY_MATRIX);
    const [totalCount, setTotalCount] = useState(0);
    const { currentPage, pageSize, resetPage, paginationParams, paginationProps: _paginationProps } = usePagination();
    const paginationProps = { ..._paginationProps, totalCount };

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

    const loadReportsMatrix = async (scheduleId?: string) => {
        const params: any = { ...paginationParams, ...searchParams };
        if (scheduleId && scheduleId !== 'default') {
            params.schedule = scheduleId;
        }
        await fetchWithAuth(
            endpoints.reportMatrix(selectedPeriodId),
            (data: ReportTableData & { count?: number }) => {
                setReportsMatrix({ columns: data.columns, rows: data.rows });
                if (typeof data.count === 'number') setTotalCount(data.count);
            },
            (err: any) => console.error('Lỗi tải bảng báo cáo:', err),
            params,
            setLoading
        );
    };

    useEffect(() => {
        loadPeriods();
        if (isLecturer) loadSchedules();
    }, []);

    useEffect(() => {
        resetPage();
    }, [selectedPeriodId, selectedScheduleId, searchParams]);

    useEffect(() => {
        if (isLecturer) loadSchedules();
    }, [selectedPeriodId]);

    useEffect(() => {
        loadReportsMatrix(selectedScheduleId);
    }, [selectedPeriodId, searchParams, selectedScheduleId, paginationParams.page]);

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
                    const variantMap: Record<string, string> = {
                        submitted: 'success',
                        approved: 'success',
                        rejected: 'danger',
                    };
                    const labelMap: Record<string, string> = {
                        submitted: 'Đã nộp',
                        approved: 'Đã duyệt',
                        rejected: 'Từ chối',
                    };
                    const v = variantMap[entry.status] || 'neutral';
                    const l = labelMap[entry.status] || 'Chưa nộp';
                    return (
                        <Badge variant={v as any} dot className="gap-1.5">
                            {l}
                            {entry.report_id != null && (
                                <button
                                    className="ml-0.5 text-inherit opacity-60 hover:opacity-100 transition-opacity"
                                    disabled={detailLoading}
                                    onClick={() => openDetail(entry.report_id!)}
                                    aria-label="Chi tiết báo cáo"
                                >
                                    <i className="fa-solid fa-eye text-[10px]" />
                                </button>
                            )}
                        </Badge>
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
                        ...(isLecturer ? [{
                            key: 'schedule',
                            value: selectedScheduleId,
                            onChange: setSelectedScheduleId,
                            placeholder: schedulesLoading ? 'Đang tải...' : 'Chọn lịch báo cáo',
                            loading: schedulesLoading,
                            widthClassName: 'w-full sm:w-64',
                            options: [
                                { value: 'default', label: 'Tổng quan' },
                                ...schedules.map((p) => ({
                                    value: String(p.id),
                                    label: `Lần ${p.sequence_number}${p.title ? `: ${p.title}` : ''}`,
                                })),
                            ],
                        }] : []),
                    ]}
                    onRefresh={() => loadReportsMatrix(selectedScheduleId)}
                    refreshLoading={loading}
                />
                <GenericTable rows={reportsMatrix.rows} columns={columns} rowKey={(row) => row.id} />
                <Pagination {...paginationProps} />
            </div>
        </main>
    );
}