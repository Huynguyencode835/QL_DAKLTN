import { forwardRef } from "react";
import type { ButtonProps } from "../../types";

const variantStyles: Record<string, string> = {
  primary:
    "bg-primary text-white shadow-sm hover:bg-primary/90 active:bg-primary/95 focus-visible:ring-primary/30",
  secondary:
    "bg-gray-100 text-gray-800 hover:bg-gray-200 active:bg-gray-300 focus-visible:ring-gray-300",
  outline:
    "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 hover:border-gray-400 active:bg-gray-100 focus-visible:ring-gray-300",
  ghost:
    "bg-transparent text-gray-600 hover:bg-gray-100 active:bg-gray-200 focus-visible:ring-gray-300",
  danger:
    "bg-red-600 text-white shadow-sm hover:bg-red-700 active:bg-red-800 focus-visible:ring-red-300",
  success:
    "bg-emerald-600 text-white shadow-sm hover:bg-emerald-700 active:bg-emerald-800 focus-visible:ring-emerald-300",
};

const sizeStyles: Record<string, string> = {
  sm: "text-xs px-3 py-1.5 gap-1.5 rounded-lg",
  md: "text-sm px-4 py-2.5 gap-2 rounded-xl",
  lg: "text-base px-6 py-3 gap-2.5 rounded-xl",
  icon: "w-9 h-9 rounded-xl justify-center",
};

const Button = forwardRef(function Button(
  {
    children,
    variant = "primary",
    size = "md",
    icon,
    iconPosition = "left",
    loading = false,
    fullWidth = false,
    disabled = false,
    className = "",
    type = "button",
    ...props
  }: ButtonProps,
  ref: any
) {
  const isDisabled = disabled || loading;

  return (
    <button
      ref={ref}
      type={type}
      disabled={isDisabled}
      className={`inline-flex items-center font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-4
        disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none
        ${variantStyles[variant]} ${sizeStyles[size]}
        ${fullWidth ? "w-full justify-center" : ""}
        ${className}`}
      {...props}
    >
      {loading && (
        <i className="fa-solid fa-circle-notch animate-spin text-current"></i>
      )}
      {!loading && icon && iconPosition === "left" && (
        <i className={`${icon} text-current`}></i>
      )}
      {children && <span>{children}</span>}
      {!loading && icon && iconPosition === "right" && (
        <i className={`${icon} text-current`}></i>
      )}
    </button>
  );
});

export default Button;
