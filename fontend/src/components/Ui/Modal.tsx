import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import type { ModalProps, ModalSize } from "../../types";

const sizeStyles: Record<ModalSize, string> = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
  full: "max-w-[calc(100vw-2rem)] h-[calc(100vh-2rem)]",
};

export default function Modal({
  open,
  onClose,
  title,
  description,
  icon,
  children,
  footer,
  size = "md",
  closeOnOverlayClick = true,
  className = "",
}: ModalProps) {
  const dialogRef = useRef<any>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; });

  useEffect(() => {
    if (!open) return;

    function handleEsc(e: any) {
      if (e.key === "Escape") onCloseRef.current?.();
    }
    document.addEventListener("keydown", handleEsc);

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    dialogRef.current?.focus();

    return () => {
      document.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      aria-modal="true"
      role="dialog"
    >
      <div
        className="absolute inset-0 bg-gray-900/50 backdrop-blur-[2px] animate-in fade-in duration-200"
        onClick={() => closeOnOverlayClick && onClose?.()}
      />

      <div
        ref={dialogRef}
        tabIndex={-1}
        className={`relative w-full ${sizeStyles[size]} bg-white rounded-2xl shadow-xl shadow-gray-900/10
          flex flex-col max-h-[90vh] outline-none
          animate-in fade-in zoom-in-95 slide-in-from-bottom-2 duration-200 ${className}`}
      >
        {(title || icon) && (
          <div className="flex items-start justify-between gap-3 px-6 py-5 border-b border-gray-100 shrink-0">
            <div className="flex items-start gap-3 min-w-0">
              {icon && (
                <span className="w-10 h-10 shrink-0 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <i className={`${icon} text-base`}></i>
                </span>
              )}
              <div className="min-w-0">
                {title && (
                  <h3 className="font-semibold text-gray-900 text-base leading-tight truncate">
                    {title}
                  </h3>
                )}
                {description && (
                  <p className="text-sm text-gray-500 mt-1">{description}</p>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Đóng"
              className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors duration-150"
            >
              <i className="fa-solid fa-xmark text-sm"></i>
            </button>
          </div>
        )}

        <div className="px-6 py-5 overflow-y-auto">{children}</div>

        {footer && (
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 shrink-0 bg-gray-50/50 rounded-b-2xl">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
