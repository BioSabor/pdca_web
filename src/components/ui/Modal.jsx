import { useRef, useId } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import useModalBehavior from "../../hooks/useModalBehavior";
import { cn } from "../../lib/utils";

const SIZES = {
    sm: "max-w-md",
    md: "max-w-lg",
    lg: "max-w-2xl",
    xl: "max-w-4xl",
    "5xl": "max-w-6xl",
};

export default function Modal({
    open,
    onClose,
    title,
    children,
    footer,
    size = "md",
    initialFocusRef,
    closeOnBackdrop = true,
    contentClassName,
}) {
    const panelRef = useRef(null);
    const titleId = useId();
    useModalBehavior({ open, onClose, panelRef, initialFocusRef });

    if (!open) return null;

    return createPortal(
        <div
            className="fixed inset-0 z-modal flex items-center justify-center bg-black/50 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-sm sm:p-4"
            onMouseDown={closeOnBackdrop ? (e) => { if (e.target === e.currentTarget) onClose?.(); } : undefined}
        >
            <div
                ref={panelRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby={title ? titleId : undefined}
                tabIndex={-1}
                className={cn(
                    "flex max-h-[90dvh] w-full flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-overlay outline-none",
                    SIZES[size] || SIZES.md
                )}
            >
                {title && (
                    <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3 sm:px-5 sm:py-4">
                        <h2 id={titleId} className="min-w-0 text-base font-semibold text-gray-900 dark:text-gray-100 sm:text-lg">
                            {title}
                        </h2>
                        <button
                            type="button"
                            onClick={onClose}
                            aria-label="Cerrar"
                            className="btn-icon btn-ghost -mr-2"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                )}
                <div className={cn("flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5", contentClassName)}>
                    {children}
                </div>
                {footer && (
                    <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line px-4 py-3 sm:gap-3 sm:px-5 sm:py-4">
                        {footer}
                    </div>
                )}
            </div>
        </div>,
        document.body
    );
}
