import { createContext, useCallback, useContext, useEffect, useId, useState, type ReactNode } from "react";
import { Check, Info, TriangleAlert, X } from "lucide-react";

export interface ToastMessage {
  title: string;
  detail?: string;
  tone?: "info" | "success" | "warning";
}

interface ToastEntry extends ToastMessage { id: number }
interface ToastContextValue { showToast: (message: ToastMessage) => void; dismissToast: (id: number) => void }

const ToastContext = createContext<ToastContextValue | null>(null);
let nextToastId = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastEntry[]>([]);
  const dismissToast = useCallback((id: number) => setToasts((items) => items.filter((item) => item.id !== id)), []);
  const showToast = useCallback((message: ToastMessage) => {
    const id = nextToastId++;
    setToasts((items) => [...items, { ...message, id }].slice(-3));
    window.setTimeout(() => setToasts((items) => items.filter((item) => item.id !== id)), 4200);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, dismissToast }}>
      {children}
      <div className="toast-stack" aria-live="polite" aria-relevant="additions text">
        {toasts.map((toast) => {
          const Icon = toast.tone === "success" ? Check : toast.tone === "warning" ? TriangleAlert : Info;
          return (
            <div className={`toast toast--${toast.tone ?? "info"}`} key={toast.id} role="status">
              <span className="toast__icon"><Icon size={16} aria-hidden="true" /></span>
              <div className="toast__copy"><strong>{toast.title}</strong>{toast.detail && <span>{toast.detail}</span>}</div>
              <button className="icon-button toast__close" onClick={() => dismissToast(toast.id)} aria-label="Dismiss notification"><X size={15} /></button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within ToastProvider");
  return context.showToast;
}

export function Dialog({
  title,
  eyebrow,
  children,
  onClose,
  footer,
}: {
  title: string;
  eyebrow?: string;
  children: ReactNode;
  onClose: () => void;
  footer?: ReactNode;
}) {
  const titleId = useId();
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="dialog" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className="dialog__header">
          <div>{eyebrow && <span className="section-eyebrow">{eyebrow}</span>}<h2 id={titleId}>{title}</h2></div>
          <button className="icon-button" onClick={onClose} aria-label="Close dialog"><X size={17} /></button>
        </div>
        <div className="dialog__body">{children}</div>
        {footer && <div className="dialog__footer">{footer}</div>}
      </section>
    </div>
  );
}
