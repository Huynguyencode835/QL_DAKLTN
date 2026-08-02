import { forwardRef, useId } from "react";
import type { InputProps } from "../../types";

const Input = forwardRef(function Input(
  {
    label,
    helperText,
    error,
    required,
    leadingIcon,
    trailingIcon,
    suffix,
    className = "",
    id,
    ...props
  }: InputProps,
  ref: any
) {
  const autoId = useId();
  const inputId = id || autoId;
  const hasError = Boolean(error);

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={inputId}
          className="font-medium text-gray-700 text-sm"
        >
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}

      <div className="relative">
        {leadingIcon && (
          <i
            className={`${leadingIcon} absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none`}
          ></i>
        )}

        <input
          ref={ref}
          id={inputId}
          aria-invalid={hasError}
          className={`w-full border rounded-xl text-sm text-gray-800 bg-white transition-all duration-150 py-2.5 focus:outline-none focus:ring-2
            ${leadingIcon ? "pl-10" : "pl-3.5"}
            ${trailingIcon || suffix ? "pr-10" : "pr-3.5"}
            ${
              hasError
                ? "border-red-300 focus:ring-red-100 focus:border-red-400"
                : "border-gray-200 focus:ring-primary/20 focus:border-primary"
            }
            disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed
            ${className}`}
          {...props}
        />

        {trailingIcon && !suffix && (
          <i
            className={`${trailingIcon} absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none`}
          ></i>
        )}
        {suffix && (
          <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-medium pointer-events-none">
            {suffix}
          </span>
        )}
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

export default Input;
