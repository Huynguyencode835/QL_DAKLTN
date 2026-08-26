import type { MouseEventHandler, ReactNode } from 'react';
import Card from '../Ui/Card';
import Badge from '../Ui/Badge';
import type { BadgeVariant } from '../../types';

export interface ItemCard {
  id: string | number;
  title: string;
  subtitle?: ReactNode;
  icon?: string;
  iconClassName?: string;
  cardClassName?: string;
  badge?: { label: string; variant: BadgeVariant };
  actions?: ReactNode;
  onClick?: () => void;
}

interface ItemCardGridProps {
  items: ItemCard[];
  loading?: boolean;
  emptyText?: string;
  emptyIcon?: string;
}

export default function ItemCardGrid({
  items,
  loading = false,
  emptyText = 'Không có dữ liệu',
  emptyIcon = 'fa-inbox',
}: ItemCardGridProps) {
  const handleClick = (item: ItemCard) => () => {
    item.onClick?.();
  };

  const stopPropagation: MouseEventHandler = (e) => e.stopPropagation();

  return (
    <Card variant="elevated" bodyClassName="space-y-0">
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <i className="fa-solid fa-circle-notch animate-spin text-primary text-2xl"></i>
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-gray-400">
          <i className={`fa-solid ${emptyIcon} text-4xl mb-3`}></i>
          <p className="text-sm font-medium">{emptyText}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => (
            <div
              key={item.id}
              className={`group relative rounded-2xl p-4 transition-all duration-200 ${
                item.onClick ? 'cursor-pointer' : ''
              } ${item.cardClassName || 'bg-gray-50 hover:bg-gray-100'}`}
              onClick={handleClick(item)}
            >
              <div className="flex items-center gap-3 mb-3">
                {item.icon && (
                  <span
                    className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center ${
                      item.iconClassName || 'bg-gray-200 text-gray-500'
                    }`}
                  >
                    <i className={`fa-solid ${item.icon} text-sm`}></i>
                  </span>
                )}
                <div className="min-w-0">
                  <h3 className="font-semibold text-gray-800 text-sm truncate">{item.title}</h3>
                  {item.subtitle && <p className="text-xs text-gray-500">{item.subtitle}</p>}
                </div>
              </div>

              {item.badge && (
                <Badge variant={item.badge.variant} dot>
                  {item.badge.label}
                </Badge>
              )}

              {item.actions && (
                <div
                  className="mt-3 pt-3 border-t border-black/5 flex items-center justify-end gap-2"
                  onClick={stopPropagation}
                >
                  {item.actions}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
