import { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { CheckCircle2, XCircle, AlertCircle, Info, X } from 'lucide-react';

const ToastContext = createContext();

let toastId = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const toast = useCallback(({ message, type = 'info', duration = 3500 }) => {
    const id = ++toastId;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration);
  }, []);

  const remove = useCallback((id) => setToasts(prev => prev.filter(t => t.id !== id)), []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {/* Toast container */}
      <div className="fixed bottom-4 right-4 z-[60] flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <ToastItem key={t.id} {...t} onClose={() => remove(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);

function ToastItem({ message, type, onClose }) {
  const icons = {
    success: <CheckCircle2 size={16} className="text-emerald-500 flex-shrink-0" />,
    error:   <XCircle     size={16} className="text-red-500 flex-shrink-0" />,
    warning: <AlertCircle size={16} className="text-amber-500 flex-shrink-0" />,
    info:    <Info        size={16} className="text-blue-500 flex-shrink-0" />,
  };

  return (
    <div className="pointer-events-auto flex items-center gap-3 px-4 py-3 bg-white dark:bg-slate-900 rounded-xl shadow-modal border border-slate-200 dark:border-slate-700 animate-slide-in min-w-[260px] max-w-sm">
      {icons[type]}
      <p className="text-sm text-slate-700 dark:text-slate-300 flex-1">{message}</p>
      <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
        <X size={14} />
      </button>
    </div>
  );
}
