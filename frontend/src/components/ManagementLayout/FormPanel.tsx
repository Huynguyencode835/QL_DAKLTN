import { SectionCard } from '../Ui/Card';

interface FormPanelProps {
  title: string;
  icon?: string;
  children: React.ReactNode;
  maxHeight?: string;
}

export default function FormPanel({
  title,
  icon = 'fa-solid fa-plus-circle',
  children,
  maxHeight = 'calc(100vh-280px)',
}: FormPanelProps) {
  return (
    <SectionCard title={title} icon={icon}>
      <div className={`max-h-[${maxHeight}] overflow-y-auto pr-1 space-y-5`}>
        {children}
      </div>
    </SectionCard>
  );
}
