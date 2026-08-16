import { useId } from "react";
import type { CheckboxProps, ToggleProps } from "../../types";

export function Checkbox({ label, description, checked, onChange, disabled = false, id }: CheckboxProps) {
  const autoId = useId();
  const inputId = id || autoId;

  return (
    <label
      htmlFor={inputId}
      className={`flex items-start gap-2.5 ${
        disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
      }`}
    >
      <span className="relative flex items-center justify-center mt-0.5 shrink-0">
        <input
          id={inputId}
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={onChange}
          className="peer sr-only"
        />
        <span
          className="w-[18px] h-[18px] rounded-md border-2 border-gray-300 bg-white
            peer-checked:bg-primary peer-checked:border-primary
            peer-focus-visible:ring-2 peer-focus-visible:ring-primary/30
            transition-colors duration-150 flex items-center justify-center"
        >
          <i className="fa-solid fa-check text-white text-[10px]"></i>
        </span>
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-medium text-gray-700">{label}</span>
        {description && <span className="block text-xs text-gray-400 mt-0.5">{description}</span>}
      </span>
    </label>
  );
}

export function Toggle({ label, description, checked, onChange, disabled = false, id }: ToggleProps) {
  const autoId = useId();
  const inputId = id || autoId;

  return (
    <label
      htmlFor={inputId}
      className={`flex items-center justify-between gap-4 ${
        disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
      }`}
    >
      <span className="min-w-0">
        <span className="block text-sm font-medium text-gray-700">{label}</span>
        {description && <span className="block text-xs text-gray-400 mt-0.5">{description}</span>}
      </span>
      <button
        id={inputId}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange?.(!checked)}
        className={`relative shrink-0 w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30
          ${checked ? "bg-primary" : "bg-gray-200"}`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200
            ${checked ? "translate-x-5" : "translate-x-0"}`}
        ></span>
      </button>
    </label>
  );
}
