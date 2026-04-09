'use client';

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { CheckCircle, XCircle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType>({ showToast: () => {} });

export const useToast = () => useContext(ToastContext);

const ICONS = {
  success: CheckCircle,
  error: XCircle,
  info: Info,
};

const COLORS = {
  success: { bg: 'bg-emerald-50', icon: 'text-emerald-500', border: 'border-emerald-100' },
  error: { bg: 'bg-red-50', icon: 'text-red-500', border: 'border-red-100' },
  info: { bg: 'bg-blue-50', icon: 'text-blue-500', border: 'border-blue-100' },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map((toast) => {
          const Icon = ICONS[toast.type];
          const colors = COLORS[toast.type];
          return (
            <div
              key={toast.id}
              className={`animate-slide-up pointer-events-auto ${colors.bg} rounded-xl shadow-[var(--shadow-toast)] border ${colors.border} px-4 py-3 flex items-center gap-3 min-w-[280px] max-w-[420px]`}
            >
              <Icon size={18} className={colors.icon} />
              <span className="text-sm text-gray-700 flex-1">{toast.message}</span>
              <button
                onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
                className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
