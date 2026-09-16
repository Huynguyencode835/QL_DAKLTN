interface TwoPanelLayoutProps {
  leftContent: React.ReactNode;
  rightContent: React.ReactNode;
  leftClassName?: string;
  rightClassName?: string;
}

export default function TwoPanelLayout({
  leftContent,
  rightContent,
  leftClassName = '',
  rightClassName = '',
}: TwoPanelLayoutProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
      <div className={`lg:col-span-3 ${leftClassName}`}>{leftContent}</div>
      <div className={`lg:col-span-7 ${rightClassName}`}>{rightContent}</div>
    </div>
  );
}
