import { useState, type ChangeEvent } from 'react';
import { SectionCard } from '../../components/Ui/Card';
import Button from '../../components/Ui/Button';
import Input from '../../components/Ui/Input';
import type { GradeWeightConfig, RegistrationPeriod } from '../../types';

interface WeightRow {
  component: string;
  label: string;
  weight: string;
}

interface WeightGroup {
  scope: string;
  scopeLabel: string;
  rows: WeightRow[];
}

const DEFAULT_WEIGHT_GROUPS: WeightGroup[] = [
  {
    scope: 'common',
    scopeLabel: 'Chung',
    rows: [
      { component: 'process', label: 'Điểm quá trình', weight: '0.40' },
      { component: 'final', label: 'Điểm cuối kỳ', weight: '0.60' },
    ],
  },
  {
    scope: 'thesis',
    scopeLabel: 'Khóa luận',
    rows: [
      { component: 'supervisor', label: 'GVHD', weight: '0.50' },
      { component: 'reviewer', label: 'Phản biện', weight: '0.20' },
      { component: 'committee', label: 'Hội đồng', weight: '0.30' },
    ],
  },
  {
    scope: 'project_with_committee',
    scopeLabel: 'Đồ án - có hội đồng',
    rows: [
      { component: 'supervisor', label: 'GVHD', weight: '0.50' },
      { component: 'committee', label: 'Hội đồng', weight: '0.50' },
    ],
  },
  {
    scope: 'project_no_committee',
    scopeLabel: 'Đồ án - không hội đồng',
    rows: [
      { component: 'supervisor', label: 'GVHD', weight: '1.00' },
    ],
  },
];

function buildDefaultGroups(): WeightGroup[] {
  return DEFAULT_WEIGHT_GROUPS.map((g) => ({
    ...g,
    rows: g.rows.map((r) => ({ ...r })),
  }));
}

function buildGroupsFromConfigs(configs: GradeWeightConfig[]): WeightGroup[] {
  const map = new Map<string, GradeWeightConfig>();
  for (const c of configs) {
    map.set(`${c.scope}__${c.component}`, c);
  }
  return DEFAULT_WEIGHT_GROUPS.map((g) => ({
    ...g,
    rows: g.rows.map((r) => {
      const found = map.get(`${g.scope}__${r.component}`);
      return { ...r, weight: found ? String(found.weight) : r.weight };
    }),
  }));
}

function scopeSum(rows: WeightRow[]): number {
  return rows.reduce((s, r) => s + (parseFloat(r.weight) || 0), 0);
}

interface PeriodFormValues {
  name: string;
  academic_year: string;
  student_registration_start: string;
  student_registration_end: string;
  report_submission_days: string;
  execution_duration_weeks: string;
  weightGroups: WeightGroup[];
}

const EMPTY_FORM: Omit<PeriodFormValues, 'weightGroups'> = {
  name: '',
  academic_year: '',
  student_registration_start: '',
  student_registration_end: '',
  report_submission_days: '7',
  execution_duration_weeks: '10',
};

function toDatetimeLocal(iso: string | undefined | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function initForm(period?: RegistrationPeriod): PeriodFormValues {
  if (!period) return { ...EMPTY_FORM, weightGroups: buildDefaultGroups() };
  return {
    name: period.name || '',
    academic_year: period.academic_year || '',
    student_registration_start: toDatetimeLocal(period.student_registration_start),
    student_registration_end: toDatetimeLocal(period.student_registration_end),
    report_submission_days: String(period.report_submission_days ?? 7),
    execution_duration_weeks: String(period.execution_duration_weeks ?? 10),
    weightGroups: period.grade_weight_configs?.length
      ? buildGroupsFromConfigs(period.grade_weight_configs)
      : buildDefaultGroups(),
  };
}

interface PeriodFormProps {
  mode: 'create' | 'edit';
  initialValues?: RegistrationPeriod;
  onSubmit: (data: Record<string, any>) => void;
  onCancel: () => void;
  loading?: boolean;
}

export default function PeriodForm({ mode, initialValues, onSubmit, onCancel, loading = false }: PeriodFormProps) {
  const [form, setForm] = useState<PeriodFormValues>(() => initForm(initialValues));

  const update = (field: keyof PeriodFormValues) => (e: ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const updateWeight = (groupIdx: number, rowIdx: number) => (e: ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val !== '' && !/^\d*\.?\d{0,2}$/.test(val) && parseFloat(val) > 1) return;
    setForm((prev) => {
      const groups = prev.weightGroups.map((g, gi) =>
        gi === groupIdx
          ? {
              ...g,
              rows: g.rows.map((r, ri) =>
                ri === rowIdx ? { ...r, weight: val } : r,
              ),
            }
          : g,
      );
      return { ...prev, weightGroups: groups };
    });
  };

  const handleSubmit = () => {
    const msPerDay = 24 * 60 * 60 * 1000;
    const daysBetween = (from: string, to: string) => {
      if (!from || !to) return undefined;
      const diff = Math.ceil((new Date(to).getTime() - new Date(from).getTime()) / msPerDay);
      return diff > 0 ? diff : undefined;
    };

    const grade_weight_configs: GradeWeightConfig[] = form.weightGroups.flatMap((g) =>
      g.rows.map((r) => ({
        scope: g.scope as GradeWeightConfig['scope'],
        component: r.component as GradeWeightConfig['component'],
        weight: parseFloat(r.weight) || 0,
      })),
    );

    const body: Record<string, any> = {
      name: form.name,
      academic_year: form.academic_year,
      student_registration_start: form.student_registration_start
        ? new Date(form.student_registration_start).toISOString()
        : null,
      student_registration_days: daysBetween(form.student_registration_start, form.student_registration_end),
      report_submission_days: parseInt(form.report_submission_days, 10) || undefined,
      execution_duration_weeks: parseInt(form.execution_duration_weeks, 10),
      grade_weight_configs,
    };

    onSubmit(body);
  };

  const allValid = form.weightGroups.every((g) => {
    const sum = scopeSum(g.rows);
    return Math.abs(sum - 1) < 0.001;
  });

  return (
    <SectionCard
      title={mode === 'create' ? 'Tạo đợt đăng ký mới' : 'Chỉnh sửa đợt đăng ký'}
      icon={mode === 'create' ? 'fa-solid fa-plus-circle' : 'fa-solid fa-pen'}
    >
      <div className="max-h-[calc(100vh-280px)] overflow-y-auto pr-1 space-y-5">
        {/* Thông tin chung */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Tên đợt"
            required
            placeholder="VD: Đợt 1 - Học kỳ 2"
            value={form.name}
            onChange={update('name')}
          />
          <Input
            label="Năm học"
            required
            placeholder="VD: 2024-2025"
            value={form.academic_year}
            onChange={update('academic_year')}
          />
        </div>

        {/* Thời gian đăng ký */}
        <div className="border-t border-gray-100 pt-5">
          <h4 className="font-semibold text-gray-800 text-sm mb-3 flex items-center gap-2">
            <i className="fa-solid fa-user-check text-primary"></i>
            Thời gian đăng ký
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Bắt đầu đăng ký"
              required
              type="datetime-local"
              value={form.student_registration_start}
              onChange={update('student_registration_start')}
            />
            <Input
              label="Kết thúc đăng ký"
              required
              type="datetime-local"
              value={form.student_registration_end}
              onChange={update('student_registration_end')}
            />
          </div>
        </div>

        {/* Thời gian nộp báo cáo & Thực hiện */}
        <div className="border-t border-gray-100 pt-5">
          <h4 className="font-semibold text-gray-800 text-sm mb-3 flex items-center gap-2">
            <i className="fa-solid fa-file-arrow-up text-primary"></i>
            Thời gian nộp báo cáo & Thực hiện
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Số ngày nộp báo cáo"
              type="number"
              min={1}
              required
              value={form.report_submission_days}
              onChange={update('report_submission_days')}
              helperText="Số ngày kể từ khi kết thúc thực hiện đồ án"
            />
            <Input
              label="Số tuần thực hiện"
              type="number"
              min={1}
              max={52}
              required
              value={form.execution_duration_weeks}
              onChange={update('execution_duration_weeks')}
              helperText="Tính từ khi kết thúc đăng ký"
            />
          </div>
        </div>

        {/* Trọng số chấm điểm */}
        <div className="border-t border-gray-100 pt-5">
          <h4 className="font-semibold text-gray-800 text-sm mb-3 flex items-center gap-2">
            <i className="fa-solid fa-weight-hanging text-primary"></i>
            Trọng số chấm điểm
          </h4>
          <p className="text-xs text-gray-500 mb-4">
            Tổng trọng số mỗi nhóm phải bằng 1.00
          </p>
          <div className="space-y-4">
            {form.weightGroups.map((group, gi) => {
              const sum = scopeSum(group.rows);
              const valid = Math.abs(sum - 1) < 0.001;
              return (
                <div
                  key={group.scope}
                  className={`rounded-lg border p-4 transition-colors ${
                    valid
                      ? 'border-gray-200 bg-white'
                      : 'border-red-300 bg-red-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-gray-700">
                      {group.scopeLabel}
                    </span>
                    <span
                      className={`text-xs font-mono font-semibold px-2 py-0.5 rounded ${
                        valid
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      Tổng: {sum.toFixed(2)}
                    </span>
                  </div>
                  <div className={`grid gap-3 ${
                    group.rows.length === 1
                      ? 'grid-cols-1'
                      : group.rows.length === 2
                      ? 'grid-cols-2'
                      : 'grid-cols-3'
                  }`}>
                    {group.rows.map((row, ri) => (
                      <div key={row.component}>
                        <label className="block text-xs text-gray-500 mb-1">
                          {row.label}
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            min={0}
                            max={1}
                            step={0.01}
                            value={row.weight}
                            onChange={updateWeight(gi, ri)}
                            className="w-full rounded-lg border border-gray-300 pl-3 pr-14 py-2 text-sm text-right focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none">
                            / 1.00
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Buttons */}
        <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
          <Button variant="outline" size="sm" onClick={onCancel}>
            Hủy
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon="fa-solid fa-check"
            loading={loading}
            disabled={loading || !allValid}
            onClick={handleSubmit}
          >
            {mode === 'create' ? 'Tạo đợt' : 'Lưu thay đổi'}
          </Button>
        </div>
      </div>
    </SectionCard>
  );
}
