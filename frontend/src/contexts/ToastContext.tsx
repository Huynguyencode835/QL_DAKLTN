import { createContext, useCallback, useContext, useRef, useState, ReactNode } from 'react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: number;
  type: ToastType;
  message: string;
  description?: string;
}

interface ToastContextType {
  showToast: (type: ToastType, message: string, description?: string) => void;
  success: (message: string, description?: string) => void;
  error: (message: string, description?: string) => void;
  warning: (message: string, description?: string) => void;
  info: (message: string, description?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

const TOAST_CONFIG: Record<ToastType, { icon: string; bg: string; iconBg: string; text: string }> = {
  success: { icon: 'fa-solid fa-circle-check', bg: 'bg-white', iconBg: 'bg-green-100 text-green-600', text: 'text-gray-800' },
  error: { icon: 'fa-solid fa-circle-xmark', bg: 'bg-white', iconBg: 'bg-red-100 text-red-600', text: 'text-gray-800' },
  warning: { icon: 'fa-solid fa-triangle-exclamation', bg: 'bg-white', iconBg: 'bg-amber-100 text-amber-600', text: 'text-gray-800' },
  info: { icon: 'fa-solid fa-circle-info', bg: 'bg-white', iconBg: 'bg-blue-100 text-blue-600', text: 'text-gray-800' },
};

const DEFAULT_DURATION = 3500;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);

  const removeToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const showToast = useCallback((type: ToastType, message: string, description?: string) => {
    const id = ++idRef.current;
    setToasts(prev => [...prev, { id, type, message, description }]);
    setTimeout(() => removeToast(id), DEFAULT_DURATION);
  }, [removeToast]);

  const value: ToastContextType = {
    showToast,
    success: (message, description) => showToast('success', message, description),
    error: (message, description) => showToast('error', message, description),
    warning: (message, description) => showToast('warning', message, description),
    info: (message, description) => showToast('info', message, description),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}

      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 w-full max-w-sm pointer-events-none">
        {toasts.map(toast => {
          const cfg = TOAST_CONFIG[toast.type];
          return (
            <div
              key={toast.id}
              className={`pointer-events-auto flex items-start gap-3 rounded-xl shadow-lg shadow-gray-900/10 border border-gray-100 p-3.5 ${cfg.bg} animate-toast-in`}
            >
              <span className={`w-8 h-8 shrink-0 rounded-lg flex items-center justify-center ${cfg.iconBg}`}>
                <i className={`${cfg.icon} text-sm`}></i>
              </span>
              <div className="min-w-0 flex-1 pt-0.5">
                <p className={`text-sm font-semibold ${cfg.text} truncate`}>{toast.message}</p>
                {toast.description && (
                  <p className="text-xs text-gray-500 mt-0.5">{toast.description}</p>
                )}
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="shrink-0 text-gray-300 hover:text-gray-500 transition-colors"
              >
                <i className="fa-solid fa-xmark text-xs"></i>
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}