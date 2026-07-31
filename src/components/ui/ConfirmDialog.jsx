import { createContext, useCallback, useContext, useRef, useState } from "react";
import Modal from "./Modal";
import { cn } from "../../lib/utils";

const ConfirmContext = createContext(null);

// Sustituto de window.confirm(): const ok = await confirm({ title, message, tone: "danger" })
export function ConfirmProvider({ children }) {
    const [state, setState] = useState(null);
    const resolveRef = useRef(null);

    const confirm = useCallback((options) => {
        return new Promise((resolve) => {
            resolveRef.current = resolve;
            setState({
                title: options?.title ?? "Confirmar",
                message: options?.message ?? "",
                confirmLabel: options?.confirmLabel ?? "Confirmar",
                cancelLabel: options?.cancelLabel ?? "Cancelar",
                tone: options?.tone ?? "default",
            });
        });
    }, []);

    function close(result) {
        resolveRef.current?.(result);
        resolveRef.current = null;
        setState(null);
    }

    return (
        <ConfirmContext.Provider value={confirm}>
            {children}
            <Modal
                open={!!state}
                onClose={() => close(false)}
                title={state?.title}
                size="sm"
                footer={
                    state && (
                        <>
                            <button type="button" className="btn-secondary" onClick={() => close(false)}>
                                {state.cancelLabel}
                            </button>
                            <button
                                type="button"
                                className={cn(state.tone === "danger" ? "btn-danger" : "btn-primary")}
                                onClick={() => close(true)}
                            >
                                {state.confirmLabel}
                            </button>
                        </>
                    )
                }
            >
                {state?.message && (
                    <p className="text-sm text-gray-600 dark:text-gray-300">{state.message}</p>
                )}
            </Modal>
        </ConfirmContext.Provider>
    );
}

export function useConfirm() {
    const ctx = useContext(ConfirmContext);
    if (!ctx) throw new Error("useConfirm debe usarse dentro de <ConfirmProvider>");
    return ctx;
}
