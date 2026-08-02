import { forwardRef, useId } from "react";

const Textarea = forwardRef(function Textarea(
  { label, helperText, error, required, className = "", id, rows = 3, ...props }: any,
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

      <textarea
        ref={ref}
        id={inputId}
        rows={rows}
        aria-invalid={hasError}
        className={`w-full border rounded-xl text-sm text-gray-800 bg-white px-3.5 py-2.5 resize-none transition-all duration-150 focus:outline-none focus:ring-2
          ${
            hasError
              ? "border-red-300 focus:ring-red-100 focus:border-red-400"
              : "border-gray-200 focus:ring-primary/20 focus:border-primary"
          }
          disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed
          ${className}`}
        {...props}
      />

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

export default Textarea;
