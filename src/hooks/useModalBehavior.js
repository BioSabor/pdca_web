import { useEffect } from "react";

const FOCUSABLE =
    'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Comportamiento estándar de un diálogo modal: cierre con Escape, focus trap,
// foco inicial, restauración del foco al cerrar y bloqueo del scroll del body.
export default function useModalBehavior({ open, onClose, panelRef, initialFocusRef }) {
    useEffect(() => {
        if (!open) return;

        const previouslyFocused = document.activeElement;

        // Bloqueo de scroll con compensación de la barra
        const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
        const prevOverflow = document.body.style.overflow;
        const prevPadding = document.body.style.paddingRight;
        document.body.style.overflow = "hidden";
        if (scrollbarWidth > 0) document.body.style.paddingRight = `${scrollbarWidth}px`;

        // Foco inicial
        const focusTarget = initialFocusRef?.current
            || panelRef.current?.querySelector(FOCUSABLE)
            || panelRef.current;
        focusTarget?.focus?.({ preventScroll: true });

        function handleKeyDown(e) {
            if (e.key === "Escape") {
                e.stopPropagation();
                onClose?.();
                return;
            }
            if (e.key !== "Tab" || !panelRef.current) return;
            const focusables = Array.from(panelRef.current.querySelectorAll(FOCUSABLE))
                .filter((el) => el.offsetParent !== null || el === document.activeElement);
            if (focusables.length === 0) {
                e.preventDefault();
                return;
            }
            const first = focusables[0];
            const last = focusables[focusables.length - 1];
            if (e.shiftKey && document.activeElement === first) {
                e.preventDefault();
                last.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault();
                first.focus();
            }
        }

        document.addEventListener("keydown", handleKeyDown, true);
        return () => {
            document.removeEventListener("keydown", handleKeyDown, true);
            document.body.style.overflow = prevOverflow;
            document.body.style.paddingRight = prevPadding;
            previouslyFocused?.focus?.({ preventScroll: true });
        };
    }, [open, onClose, panelRef, initialFocusRef]);
}
