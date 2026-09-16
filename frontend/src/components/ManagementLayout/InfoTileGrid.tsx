interface InfoTileItem {
  icon: string;
  label: string;
  value: string | undefined;
}

interface InfoTileGridProps {
  items: InfoTileItem[];
  columns?: 1 | 2;
}

export default function InfoTileGrid({ items, columns = 2 }: InfoTileGridProps) {
  const gridClass = columns === 1 ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2';

  return (
    <div className={`grid ${gridClass} gap-4`}>
      {items.map((item) => (
        <div key={item.label} className="flex items-start gap-3 py-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <i className={`${item.icon} text-primary text-sm`}></i>
          </div>
          <div>
            <div className="text-[11px] text-gray-400 font-medium uppercase">{item.label}</div>
            <div className="text-sm font-semibold text-gray-800">{item.value}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
