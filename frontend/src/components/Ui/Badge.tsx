import type { BadgeProps } from "../../types";

const variantStyles: Record<string, string> = {
  neutral: "bg-gray-100 text-gray-600",
  primary: "bg-primary/10 text-primary",
  success: "bg-emerald-50 text-emerald-600",
  warning: "bg-amber-50 text-amber-700",
  danger: "bg-red-50 text-red-600",
  info: "bg-blue-50 text-blue-600",
};

const dotStyles: Record<string, string> = {
  neutral: "bg-gray-400",
  primary: "bg-primary",
  success: "bg-emerald-500",
  warning: "bg-amber-500",
  danger: "bg-red-500",
  info: "bg-blue-500",
};

export default function Badge({ children, variant = "neutral", dot = false, className = "" }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${variantStyles[variant]} ${className}`}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${dotStyles[variant]}`}></span>}
      {children}
    </span>
  );
}
