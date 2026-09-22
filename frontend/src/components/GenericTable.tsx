// GenericTable.tsx
import { ReactNode } from 'react';

export interface TableColumn<T> {
  key: string;
  label: string;
  align?: 'left' | 'right' | 'center';
  render: (row: T) => ReactNode;
  headerClassName?: string;
}

interface GenericTableProps<T> {
  rows: T[];
  columns: TableColumn<T>[];
  rowKey: (row: T) => string | number;
  emptyText?: string;
  loading?: boolean;

  // Checkbox chọn dòng - optional
  selectable?: boolean;
  selectedIds?: (string | number)[];
  allSelected?: boolean;
  onToggleSelect?: (id: string | number) => void;
  onToggleSelectAll?: () => void;
}

export default function GenericTable<T>({
  rows,
  columns,
  rowKey,
  emptyText = 'Không có dữ liệu',
  loading = false,
  selectable = false,
  selectedIds = [],
  allSelected = false,
  onToggleSelect,
  onToggleSelectAll,
}: GenericTableProps<T>) {
  if (loading) {
    return (
      <div className="overflow-hidden rounded-2xl border border-gray-100 shadow-sm bg-white">
        <div className="flex items-center justify-center py-16">
          <i className="fa-solid fa-circle-notch animate-spin text-primary text-2xl"></i>
        </div>
      </div>
    );
  }

  return (
    <div >
      <div className="overflow-hidden rounded-2xl border border-gray-100 shadow-sm bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead className="sticky top-0 z-10 bg-[#0c56d0]">
              <tr>
                {selectable && (
                  <th className="py-3.5 pl-5 pr-2 w-10">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={onToggleSelectAll}
                      className="w-4 h-4 rounded border-white/40 bg-white/10 text-primary focus:ring-white/30 cursor-pointer accent-white"
                    />
                  </th>
                )}
                {columns.map((col, idx) => (
                  <th
                    key={col.key}
                    className={`py-3.5 font-semibold text-white/90 text-xs uppercase tracking-wider whitespace-nowrap ${
                      idx === 0 && !selectable ? 'pl-5' : 'pl-4'
                    } pr-4 ${
                      col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                    } ${col.headerClassName ?? ''}`}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + (selectable ? 1 : 0)} className="py-10 text-center text-gray-400">
                    {emptyText}
                  </td>
                </tr>
              ) : (
                rows.map((row) => {
                  const id = rowKey(row);
                  const checked = selectedIds.includes(id);
                  return (
                    <tr
                      key={id}
                      className={`transition-colors ${checked ? 'bg-primary/5' : 'hover:bg-gray-50/60'}`}
                    >
                      {selectable && (
                        <td className="py-3.5 pl-5 pr-2">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => onToggleSelect?.(id)}
                            className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary/30 cursor-pointer"
                          />
                        </td>
                      )}
                      {columns.map((col, idx) => (
                        <td
                          key={col.key}
                          className={`py-3.5 pr-4 ${idx === 0 && !selectable ? 'pl-5' : 'pl-4'} ${
                            col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : ''
                          }`}
                        >
                          {col.render(row)}
                        </td>
                      ))}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}