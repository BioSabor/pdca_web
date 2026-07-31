import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";
import { cn } from "../../lib/utils";

const ToastContext = createContext(null);

const TONES = {
    success: { icon: CheckCircle2, className: "text-green-600 dark:text-green-400" },
    error: { icon: AlertCircle, className: "text-red-600 dark:text-red-400" },
    info: { icon: Info, className: "text-brand-600 dark:text-brand-400" },
};

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);
    const idRef = useRef(0);

    const dismiss = useCallback((id) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    const push = useCallback(
        (tone, message) => {
            const id = ++idRef.current;
            setToasts((prev) => [...prev.slice(-4), { id, tone, message }]);
            const timeout = tone === "error" ? 6000 : 4000;
            setTimeout(() => dismiss(id), timeout);
        },
        [dismiss]
    );

    const toast = useMemo(
        () => ({
            success: (msg) => push("success", msg),
            error: (msg) => push("error", msg),
            info: (msg) => push("info", msg),
        }),
        [push]
    );

    return (
        <ToastContext.Provider value={toast}>
            {children}
            {createPortal(
                <div
                    aria-live="polite"
                    className="pointer-events-none fixed inset-x-0 top-3 z-toast flex flex-col items-center gap-2 px-4 sm:inset-x-auto sm:bottom-4 sm:right-4 sm:top-auto sm:items-end"
                >
                    {toasts.map(({ id, tone, message }) => {
                        const { icon: Icon, className } = TONES[tone] || TONES.info;
                        return (
                            <div
                                key={id}
                                className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border border-line bg-surface p-3 shadow-overlay"
                            >
                                <Icon className={cn("mt-0.5 h-5 w-5 flex-shrink-0", className)} />
                                <p className="flex-1 text-sm text-gray-800 dark:text-gray-100">{message}</p>
                                <button
                                    type="button"
                                    onClick={() => dismiss(id)}
                                    aria-label="Cerrar aviso"
                                    className="rounded p-1 text-gray-400 hover:bg-surface-2 hover:text-gray-600 dark:hover:text-gray-200"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                        );
                    })}
                </div>,
                document.body
            )}
        </ToastContext.Provider>
    );
}

export function useToast() {
    const ctx = useContext(ToastContext);
    if (!ctx) throw new Error("useToast debe usarse dentro de <ToastProvider>");
    return ctx;
}
