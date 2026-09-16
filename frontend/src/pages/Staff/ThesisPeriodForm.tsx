import { useState, type ChangeEvent } from 'react';
import { SectionCard } from '../../components/Ui/Card';
import Button from '../../components/Ui/Button';
import Input from '../../components/Ui/Input';
import type { GradeWeightConfig, RegistrationPeriod } from '../../types';

interface ThesisFormValues {
  name: string;
  start_offset_days: string;
  thesis_supervisor: string;
  thesis_reviewer: string;
  thesis_committee: string;
}

function initForm(parentPeriod?: RegistrationPeriod): ThesisFormValues {
  const year = parentPeriod?.academic_year || '';
  return {
    name: `Đợt khóa luận ${year}`,
    start_offset_days: '7',
    thesis_supervisor: '0.50',
    thesis_reviewer: '0.20',
    thesis_committee: '0.30',
  };
}

function scopeSum(supervisor: string, reviewer: string, committee: string): number {
  return (parseFloat(supervisor) || 0) + (parseFloat(reviewer) || 0) + (parseFloat(committee) || 0);
}

interface ThesisPeriodFormProps {
  parentPeriod?: RegistrationPeriod | null;
  onSubmit: (data: Record<string, any>) => void;
  onCancel: () => void;
  loading?: boolean;
}

export default function ThesisPeriodForm({ parentPeriod, onSubmit, onCancel, loading = false }: ThesisPeriodFormProps) {
  const [form, setForm] = useState<ThesisFormValues>(() => initForm(parentPeriod ?? undefined));

  const update = (field: keyof ThesisFormValues) => (e: ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const sum = scopeSum(form.thesis_supervisor, form.thesis_reviewer, form.thesis_committee);
  const valid = Math.abs(sum - 1) < 0.001;

  const handleSubmit = () => {
    const grade_weight_configs: GradeWeightConfig[] = [
      { scope: 'thesis', component: 'supervisor', weight: parseFloat(form.thesis_supervisor) || 0 },
      { scope: 'thesis', component: 'reviewer', weight: parseFloat(form.thesis_reviewer) || 0 },
      { scope: 'thesis', component: 'committee', weight: parseFloat(form.thesis_committee) || 0 },
    ];

    const body: Record<string, any> = {
      name: form.name,
      start_offset_days: parseInt(form.start_offset_days, 10) || 7,
      grade_weight_configs,
    };

    onSubmit(body);
  };

  return (
    <SectionCard
      title="Tạo đợt khóa luận"
      icon="fa-solid fa-graduation-cap"
    >
      <div className="max-h-[calc(100vh-280px)] overflow-y-auto pr-1 space-y-5">
        {/* Thông tin từ đợt gốc */}
        {parentPeriod && (
          <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
            <h4 className="text-sm font-semibold text-blue-800 mb-2">
              <i className="fa-solid fa-circle-info mr-1"></i>
              Thông tin từ đợt đồ án gốc
            </h4>
            <div className="grid grid-cols-2 gap-2 text-xs text-blue-700">
              <div><span className="font-medium">Tên:</span> {parentPeriod.name}</div>
              <div><span className="font-medium">Năm học:</span> {parentPeriod.academic_year}</div>
              <div><span className="font-medium">Số tuần thực hiện:</span> {parentPeriod.execution_duration_weeks} tuần</div>
              <div><span className="font-medium">Số ngày nộp báo cáo:</span> {parentPeriod.report_submission_days} ngày</div>
            </div>
          </div>
        )}

        {/* Thông tin chung */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Tên đợt khóa luận"
            required
            placeholder="VD: Đợt khóa luận 2024-2025"
            value={form.name}
            onChange={update('name')}
          />
          <Input
            label="Số ngày bắt đầu sau khi đóng"
            type="number"
            min={0}
            required
            value={form.start_offset_days}
            onChange={update('start_offset_days')}
            helperText="Số ngày kể từ khi đợt đồ án đóng cửa"
          />
        </div>

        {/* Trọng số chấm điểm - Thesis scope */}
        <div className="border-t border-gray-100 pt-5">
          <h4 className="font-semibold text-gray-800 text-sm mb-3 flex items-center gap-2">
            <i className="fa-solid fa-weight-hanging text-primary"></i>
            Trọng số chấm điểm khóa luận
          </h4>
          <p className="text-xs text-gray-500 mb-4">
            Tổng trọng số phải bằng 1.00
          </p>
          <div className={`rounded-lg border p-4 transition-colors ${
            valid ? 'border-gray-200 bg-white' : 'border-red-300 bg-red-50'
          }`}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-gray-700">Khóa luận</span>
              <span className={`text-xs font-mono font-semibold px-2 py-0.5 rounded ${
                valid ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`}>
                Tổng: {sum.toFixed(2)}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">GVHD</label>
                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    max={1}
                    step={0.01}
                    value={form.thesis_supervisor}
                    onChange={update('thesis_supervisor')}
                    className="w-full rounded-lg border border-gray-300 pl-3 pr-14 py-2 text-sm text-right focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none">/ 1.00</span>
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Phản biện</label>
                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    max={1}
                    step={0.01}
                    value={form.thesis_reviewer}
                    onChange={update('thesis_reviewer')}
                    className="w-full rounded-lg border border-gray-300 pl-3 pr-14 py-2 text-sm text-right focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none">/ 1.00</span>
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Hội đồng</label>
                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    max={1}
                    step={0.01}
                    value={form.thesis_committee}
                    onChange={update('thesis_committee')}
                    className="w-full rounded-lg border border-gray-300 pl-3 pr-14 py-2 text-sm text-right focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none">/ 1.00</span>
                </div>
              </div>
            </div>
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
            icon="fa-solid fa-graduation-cap"
            loading={loading}
            disabled={loading || !valid || !form.name.trim()}
            onClick={handleSubmit}
          >
            Tạo đợt khóa luận
          </Button>
        </div>
      </div>
    </SectionCard>
  );
}
