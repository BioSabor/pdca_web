import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import usePortalPosition from "../../hooks/usePortalPosition";
import { cn } from "../../lib/utils";

// Panel flotante anclado a un elemento, en portal con corrección de colisiones.
// Base de todos los dropdowns de la app.
export default function Popover({ open, onClose, anchorRef, children, className, minWidth = 200 }) {
    const panelRef = useRef(null);
    const pos = usePortalPosition(anchorRef, panelRef, { open });

    useEffect(() => {
        if (!open) return;
        function handleClickOutside(e) {
            if (
                panelRef.current && !panelRef.current.contains(e.target) &&
                anchorRef.current && !anchorRef.current.contains(e.target)
            ) {
                onClose?.();
            }
        }
        function handleKeyDown(e) {
            if (e.key === "Escape") onClose?.();
        }
        document.addEventListener("mousedown", handleClickOutside);
        document.addEventListener("keydown", handleKeyDown);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [open, onClose, anchorRef]);

    if (!open) return null;

    return createPortal(
        <div
            ref={panelRef}
            className={cn(
                "z-popover max-h-60 overflow-y-auto rounded-lg border border-line bg-surface shadow-overlay",
                className
            )}
            style={{ position: "fixed", top: pos.top, left: pos.left, minWidth }}
        >
            {children}
        </div>,
        document.body
    );
}
