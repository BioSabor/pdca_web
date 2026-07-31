import { useEffect, useState, useCallback } from "react";

// Posiciona un elemento flotante (portal, position: fixed) bajo un ancla,
// con corrección de colisiones contra el viewport y reposicionamiento en
// scroll/resize. Extraído del MultiCheckDropdown original de ProjectDetail.
export default function usePortalPosition(anchorRef, floatingRef, { open, offset = 2, padding = 8 } = {}) {
    const [pos, setPos] = useState({ top: 0, left: 0 });

    const compute = useCallback(() => {
        const anchor = anchorRef.current;
        if (!anchor) return;
        const btnRect = anchor.getBoundingClientRect();
        let top = btnRect.bottom + offset;
        let left = btnRect.left;

        const floating = floatingRef.current;
        if (floating) {
            const dropRect = floating.getBoundingClientRect();
            if (left + dropRect.width > window.innerWidth - padding) {
                left = Math.max(padding, window.innerWidth - dropRect.width - padding);
            }
            if (left < padding) left = padding;
            if (top + dropRect.height > window.innerHeight - padding) {
                const aboveTop = btnRect.top - dropRect.height - offset;
                top = aboveTop >= padding
                    ? aboveTop
                    : Math.max(padding, window.innerHeight - dropRect.height - padding);
            }
        }
        setPos((prev) => (prev.top === top && prev.left === left ? prev : { top, left }));
    }, [anchorRef, floatingRef, offset, padding]);

    // Cálculo inicial al abrir y recálculo cuando el flotante ya tiene tamaño
    useEffect(() => {
        if (!open) return;
        compute();
        // Segundo pase en el siguiente frame, cuando el portal ya está montado y medible
        const raf = requestAnimationFrame(compute);
        return () => cancelAnimationFrame(raf);
    }, [open, compute]);

    // Reposicionar en scroll (incluidos contenedores internos, fase captura) y resize
    useEffect(() => {
        if (!open) return;
        window.addEventListener("scroll", compute, true);
        window.addEventListener("resize", compute);
        return () => {
            window.removeEventListener("scroll", compute, true);
            window.removeEventListener("resize", compute);
        };
    }, [open, compute]);

    return pos;
}
