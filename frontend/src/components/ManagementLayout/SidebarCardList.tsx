import Card from '../Ui/Card';

interface SidebarCardListProps<T> {
  title: string;
  count: number;
  items: T[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  renderItem: (item: T, isSelected: boolean) => React.ReactNode;
  emptyText?: string;
  icon?: string;
}

export default function SidebarCardList<T extends { id: number }>({
  title,
  count,
  items,
  selectedId,
  onSelect,
  renderItem,
  emptyText = 'Không có dữ liệu',
  icon = 'fa-solid fa-list',
}: SidebarCardListProps<T>) {
  return (
    <Card variant="elevated" icon={icon} title={`${title} (${count})`}>
      <div className="space-y-2 max-h-[calc(100vh-320px)] overflow-y-auto pr-1">
        {items.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">{emptyText}</p>
        ) : (
          items.map((item) => {
            const isSelected = selectedId === item.id;
            return (
              <div
                key={item.id}
                onClick={() => onSelect(item.id)}
                className={`p-3 rounded-xl cursor-pointer border transition-all duration-150 ${
                  isSelected
                    ? 'border-primary bg-primary/5 ring-1 ring-primary/20 shadow-sm'
                    : 'border-gray-100 hover:bg-gray-50 hover:border-gray-200'
                }`}
              >
                {renderItem(item, isSelected)}
              </div>
            );
          })
        )}
      </div>
    </Card>
  );
}
