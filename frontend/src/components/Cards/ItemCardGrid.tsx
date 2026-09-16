import type { MouseEventHandler, ReactNode } from 'react';
import Badge from '../Ui/Badge';
import type { BadgeVariant } from '../../types';

export interface ItemCard {
  id: string | number;
  title: string;
  subtitle?: ReactNode;
  icon?: string;
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
    <div>
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
              className={`group relative rounded-2xl overflow-hidden border border-gray-100 bg-white shadow-sm transition-all duration-200 hover:shadow-md ${
                item.onClick ? 'cursor-pointer' : ''
              }`}
              onClick={handleClick(item)}
            >
              {/* HEADER */}
              <div className="bg-[#0c56d0] px-4 py-1 flex items-center gap-3">
                {item.icon && (
                  <div className="w-9 h-9 rounded-lg bg-white/15 flex items-center justify-center shrink-0">
                    <i className={`fa-solid ${item.icon} text-white text-sm`}></i>
                  </div>
                )}
                <h3 className="font-semibold text-white text-sm truncate leading-tight">{item.title}</h3>
              </div>

              {/* BODY */}
              <div className="p-4 space-y-3">
                {item.subtitle && (
                  <div className="text-xs text-gray-500 leading-relaxed">{item.subtitle}</div>
                )}

                {item.badge && (
                  <Badge variant={item.badge.variant} dot>{item.badge.label}</Badge>
                )}

                {item.actions && (
                  <div
                    className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2"
                    onClick={stopPropagation}
                  >
                    {item.actions}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
