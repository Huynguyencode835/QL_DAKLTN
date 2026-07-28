import { forwardRef, useId } from "react";
import type { SelectProps } from "../../types";

const Select = forwardRef(function Select(
  {
    label,
    helperText,
    error,
    required,
    placeholder = "Chọn một mục",
    options = [],
    className = "",
    id,
    ...props
  }: SelectProps,
  ref: any
) {
  const autoId = useId();
  const inputId = id || autoId;
  const hasError = Boolean(error);

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="font-medium text-gray-700 text-sm">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}

      <div className="relative">
        <select
          ref={ref}
          id={inputId}
          aria-invalid={hasError}
          className={`w-full appearance-none border rounded-xl text-sm text-gray-800 bg-white pl-3.5 pr-10 py-2.5 transition-all duration-150 focus:outline-none focus:ring-2
            ${
              hasError
                ? "border-red-300 focus:ring-red-100 focus:border-red-400"
                : "border-gray-200 focus:ring-primary/20 focus:border-primary"
            }
            disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed
            ${className}`}
          {...props}
        >
          <option value="">{placeholder}</option>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <i className="fa-solid fa-chevron-down absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none"></i>
      </div>

      {error ? (
        <p className="text-xs text-red-500 flex items-center gap-1">
          <i className="fa-solid fa-circle-exclamation"></i> {error}
        </p>
      ) : helperText ? (
        <p className="text-xs text-gray-400">{helperText}</p>
      ) : null}
    </div>
  );
});

export default Select;
