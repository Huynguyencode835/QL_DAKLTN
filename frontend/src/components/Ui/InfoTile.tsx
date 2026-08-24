// InfoTile.tsx
type InfoTileProps = {
  icon: string;
  label: string;
  value?: string | null;
};

export default function InfoTile({ icon, label, value }: InfoTileProps) {
  return (
    <div className="flex items-start gap-2.5 rounded-xl border border-gray-100 bg-gray-50/40 px-3.5 py-3">
      <span className="w-8 h-8 shrink-0 rounded-lg bg-white border border-gray-100 text-gray-400 flex items-center justify-center">
        <i className={`${icon} text-xs`}></i>
      </span>
      <div className="min-w-0">
        <p className="text-xs text-gray-400">{label}</p>
        <p className="text-sm font-medium text-gray-800 truncate">{value || '—'}</p>
      </div>
    </div>
  );
}