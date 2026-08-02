import { useEffect, useId, useRef, useState } from "react";
import type { DropdownProps } from "../../types";

export default function Dropdown({
  label,
  helperText,
  error,
  required,
  placeholder = "Chọn một mục",
  options = [],
  value,
  onChange,
  className = "",
  disabled = false,
}: DropdownProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<any>(null);
  const listId = useId();
  const hasError = Boolean(error);

  const selected = options.find((o) => String(o.value) === String(value));

  useEffect(() => {
    function handleClickOutside(e: any) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    function handleEsc(e: any) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEsc);
    };
  }, []);

  function handleSelect(opt: any) {
    onChange?.(opt.value);
    setOpen(false);
  }

  return (
    <div className="flex flex-col gap-1.5" ref={containerRef}>
      {label && (
        <label className="font-medium text-gray-700 text-sm">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}

      <div className="relative">
        <button
          type="button"
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className={`w-full flex items-center justify-between gap-2 border rounded-xl text-sm bg-white pl-3.5 pr-3 py-2.5 text-left transition-all duration-150 focus:outline-none focus:ring-2
            ${
              hasError
                ? "border-red-300 focus:ring-red-100 focus:border-red-400"
                : "border-gray-200 focus:ring-primary/20 focus:border-primary"
            }
            disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed
            ${className}`}
        >
          <span className={`truncate ${selected ? "text-gray-800" : "text-gray-400"}`}>
            {selected ? selected.label : placeholder}
          </span>
          <i
            className={`fa-solid fa-chevron-down text-xs text-gray-400 shrink-0 transition-transform duration-200 ${
              open ? "rotate-180" : ""
            }`}
          ></i>
        </button>

        {open && (
          <ul
            id={listId}
            role="listbox"
            className="absolute z-20 mt-1.5 w-full max-h-64 overflow-auto rounded-xl border border-gray-100 bg-white shadow-lg shadow-gray-900/5 py-1.5 animate-in fade-in slide-in-from-top-1 duration-150"
          >
            {options.length === 0 && (
              <li className="px-3.5 py-2.5 text-sm text-gray-400">
                Không có lựa chọn nào
              </li>
            )}
            {options.map((opt: any) => {
              const isSelected = String(opt.value) === String(value);
              return (
                <li key={opt.value} role="option" aria-selected={isSelected}>
                  <button
                    type="button"
                    onClick={() => handleSelect(opt)}
                    className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 text-left text-sm transition-colors duration-100
                      ${isSelected ? "bg-primary/5 text-primary" : "text-gray-700 hover:bg-gray-50"}`}
                  >
                    {opt.avatarText && (
                      <span
                        className={`w-7 h-7 shrink-0 rounded-full flex items-center justify-center text-xs font-semibold
                          ${isSelected ? "bg-primary text-white" : "bg-gray-100 text-gray-500"}`}
                      >
                        {opt.avatarText.toUpperCase()}
                      </span>
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{opt.label}</span>
                      {opt.description && (
                        <span className="block truncate text-xs text-gray-400">
                          {opt.description}
                        </span>
                      )}
                    </span>
                    {isSelected && (
                      <i className="fa-solid fa-check text-primary text-xs shrink-0"></i>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
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
}
