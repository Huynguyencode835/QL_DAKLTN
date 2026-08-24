interface PeriodCardRowProps {
  icon: string;
  label: string;
  value: string;
  danger?: boolean;
}

export function PeriodCardRow({ icon, label, value, danger }: PeriodCardRowProps) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-gray-400 flex items-center gap-2 text-xs">
        <i className={`${icon} w-3.5`} /> {label}
      </span>
      <span className={danger ? 'font-bold text-red-600 text-xs' : 'font-medium text-gray-900 text-xs'}>{value}</span>
    </div>
  );
}

interface PeriodCardCountdownProps {
  days: number;
  sub: string;
  bg: string;
  labelColor: string;
  valueColor: string;
  subColor: string;
}

export function PeriodCardCountdown({ days, sub, bg, labelColor, valueColor, subColor }: PeriodCardCountdownProps) {
  return (
    <div className={`mt-5 rounded-xl p-4 text-center ${bg}`}>
      <div className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${labelColor}`}>Còn lại</div>
      <div className={`text-2xl font-bold ${valueColor}`}>{days} ngày</div>
      <div className={`text-[10px] mt-1 ${subColor}`}>{sub}</div>
    </div>
  );
}

export function PeriodCardGuide({ message }: { message: string }) {
  return (
    <div className="mt-5 bg-gray-100 rounded-xl p-4 text-center">
      <i className="fa-regular fa-circle-info text-gray-400 mb-1.5 block" />
      <p className="text-gray-500 text-[11px] leading-relaxed">{message}</p>
    </div>
  );
}

interface PeriodCardActionProps {
  label: string;
  icon: string;
  badgeBg: string;
  badgeText: string;
  onClick: () => void;
}

export function PeriodCardAction({ label, icon, badgeBg, badgeText, onClick }: PeriodCardActionProps) {
  return (
    <button
      onClick={onClick}
      className={`mt-4 w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all hover:shadow-sm ${badgeBg} ${badgeText}`}
    >
      <i className={`${icon} text-xs`} /> {label}
    </button>
  );
}