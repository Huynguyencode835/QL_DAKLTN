import Badge from '../Ui/Badge';
import type { BadgeVariant } from '../../types/ui';

interface DetailBadge {
  label: string;
  variant: BadgeVariant;
  dot?: boolean;
}

interface DetailHeaderProps {
  title: string;
  badges?: DetailBadge[];
  actions?: React.ReactNode;
}

export default function DetailHeader({ title, badges = [], actions }: DetailHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h2 className="text-lg font-bold text-textMain">{title}</h2>
        {badges.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mt-1">
            {badges.map((b, i) => (
              <Badge key={i} variant={b.variant} dot={b.dot}>{b.label}</Badge>
            ))}
          </div>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
