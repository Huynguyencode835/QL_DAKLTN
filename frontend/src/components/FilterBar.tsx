import { ChangeEvent } from 'react';
import Card from './Ui/Card';
import Input from './Ui/Input';
import Dropdown from './Ui/Dropdown';
import Button from './Ui/Button';


export interface DropdownOption {
  value: string;
  label: string;
}

export interface FilterBarProps {
  // Search
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;

  // Dropdowns động - truyền vào bao nhiêu tùy ý
  dropdowns?: {
    key: string;
    value: string;
    onChange: (value: string) => void;
    options: DropdownOption[];
    placeholder?: string;
    loading?: boolean;
    widthClassName?: string; // vd: 'w-full sm:w-64'
  }[];

  // Nút refresh
  onRefresh?: () => void;
  refreshLoading?: boolean;
  refreshLabel?: string;
}

export default function FilterBar({
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Tìm kiếm...',
  dropdowns = [],
  onRefresh,
  refreshLoading,
  refreshLabel = 'Làm mới',
}: FilterBarProps) {
  return (
    <Card variant="elevated" bodyClassName="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <Input
            placeholder={searchPlaceholder}
            leadingIcon="fa-solid fa-magnifying-glass"
            value={searchValue}
            onChange={(e: ChangeEvent<HTMLInputElement>) => onSearchChange(e.target.value)}
          />
        </div>

        {dropdowns.map((dd) => (
          <div key={dd.key} className={dd.widthClassName ?? 'w-full sm:w-56'}>
            <Dropdown
              placeholder={dd.loading ? 'Đang tải...' : dd.placeholder}
              value={dd.value}
              onChange={(value) => dd.onChange(String(value))}
              options={dd.options}
            />
          </div>
        ))}

        {onRefresh && (
          <Button variant="primary" icon="fa-solid fa-rotate" onClick={onRefresh} loading={refreshLoading}>
            {refreshLabel}
          </Button>
        )}
      </div>
    </Card>
  );
}