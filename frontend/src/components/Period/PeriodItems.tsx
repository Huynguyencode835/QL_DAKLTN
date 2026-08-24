import { formatPeriodDate } from "../../utils/periodUtils";

export function PeriodInfoItem({
  icon,
  label,
  value,
  rangeStart,
  rangeEnd,
  accent = false,
}: {
  icon: string;
  label: string;
  value: string;
  rangeStart?: string;
  rangeEnd?: string;
  accent?: boolean;
}) {
  return (
    <div className={`rounded-xl p-3.5 ${accent ? 'bg-blue-50/60' : 'bg-gray-50'}`}>
      <div className="flex items-center gap-1.5 mb-2">
        <i className={`${icon} text-xs ${accent ? 'text-blue-600' : 'text-gray-400'}`} />
        <span
          className={`text-[11px] font-medium uppercase tracking-wide ${accent ? 'text-blue-600' : 'text-gray-400'
            }`}
        >
          {label}
        </span>
      </div>
      <p className={`font-semibold text-gray-800 ${accent ? 'text-base' : 'text-sm'}`}>{value}</p>

      {rangeStart && rangeEnd && (
        <div className="flex items-center gap-1.5 mt-1.5 text-[11px] text-gray-500">
          <span>{formatPeriodDate(rangeStart)}</span>
          <i className="fa-solid fa-arrow-right text-[9px] text-blue-500" />
          <span>{formatPeriodDate(rangeEnd)}</span>
        </div>
      )}
    </div>
  );
}