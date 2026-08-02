import type { CardProps, SectionCardProps } from "../../types";

const variantStyles: Record<string, string> = {
  soft: "bg-gray-50/50 border border-gray-100",
  elevated: "bg-white border border-gray-100 shadow-sm",
  outline: "bg-transparent border border-gray-200",
};

export default function Card({
  children,
  title,
  description,
  icon,
  actions,
  variant = "soft",
  className = "",
  bodyClassName = "",
  as: Tag = "div",
}: CardProps) {
  return (
    <Tag
      className={`flex flex-col gap-3 p-4 rounded-xl transition-shadow duration-200 ${variantStyles[variant]} ${className}`}
    >
      {(title || actions) && (
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5">
            {icon && (
              <span className="w-8 h-8 shrink-0 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <i className={`${icon} text-sm`}></i>
              </span>
            )}
            <div className="min-w-0">
              {title && (
                <h3 className="font-semibold text-gray-900 text-sm leading-tight">
                  {title}
                </h3>
              )}
              {description && (
                <p className="text-xs text-gray-500 mt-0.5">{description}</p>
              )}
            </div>
          </div>
          {actions && <div className="shrink-0">{actions}</div>}
        </div>
      )}
      <div className={bodyClassName}>{children}</div>
    </Tag>
  );
}

export function SectionCard({ children, title, icon, className = "" }: SectionCardProps) {
  return (
    <div
      className={`p-6 sm:p-8 bg-white border border-gray-100 rounded-2xl shadow-sm ${className}`}
    >
      {title && (
        <h3 className="font-bold text-gray-900 text-lg mb-6 pb-4 border-b border-gray-100 flex items-center gap-2.5">
          {icon && (
            <span className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <i className={`${icon} text-sm`}></i>
            </span>
          )}
          {title}
        </h3>
      )}
      <div className="space-y-6">{children}</div>
    </div>
  );
}
