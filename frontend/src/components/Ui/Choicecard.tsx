import type { ChoiceCardProps } from "../../types";

export default function ChoiceCard({
  checked,
  icon,
  label,
  description,
  name,
  onChange,
  value,
  disabled = false,
}: ChoiceCardProps) {
  return (
    <label
      className={`flex-1 flex items-center gap-3 p-4 rounded-xl border-2 transition-all duration-200
        ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
        ${
          checked
            ? "border-primary bg-primary/5 shadow-sm"
            : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
        }`}
    >
      <input
        checked={checked}
        className="sr-only"
        disabled={disabled}
        name={name}
        onChange={onChange}
        type="radio"
        value={value}
      />
      <span
        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors
        ${checked ? "border-primary" : "border-gray-300"}`}
      >
        {checked && <span className="w-2.5 h-2.5 rounded-full bg-primary"></span>}
      </span>
      {icon && (
        <i className={`${icon} text-lg shrink-0 ${checked ? "text-primary" : "text-gray-300"}`}></i>
      )}
      <span className="min-w-0">
        <span className={`block text-sm font-medium ${checked ? "text-primary" : "text-gray-700"}`}>
          {label}
        </span>
        {description && <span className="block text-xs text-gray-400 mt-0.5">{description}</span>}
      </span>
    </label>
  );
}
