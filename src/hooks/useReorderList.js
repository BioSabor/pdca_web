import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Arrastrar y soltar para reordenar una lista vertical (basado en Pointer
 * Events, igual que useKanbanDrag: funciona con ratón y con el dedo). El
 * asa (GripVertical) arranca el arrastre al instante y lleva `touch-action:
 * none` para que el navegador no le robe el gesto al scroll de la página.
 *
 * Cada grupo reordenable es un contenedor `data-reorder-list={groupId}` con
 * tarjetas `data-reorder-item={itemKey}` dentro. Al pasar el puntero sobre
 * otra tarjeta del MISMO grupo, la arrastrada ocupa su posición (reflow en
 * vivo); soltar fuera del grupo simplemente no cambia nada más.
 */

const EDGE_ZONE = 64; // franja junto al borde del scroll que activa el autoscroll
const EDGE_SPEED = 16; // px por frame a velocidad máxima

export default function useReorderList({ groups, onReorder, disabled = false }) {
    const [dragKey, setDragKey] = useState(null);
    const [dragGroup, setDragGroup] = useState(null);
    const [liveOrder, setLiveOrder] = useState(null);

    const previewRef = useRef(null);
    const gestureRef = useRef(null);
    const orderRef = useRef(null);
    const scrollElRef = useRef(null);
    const rafRef = useRef(0);
    const scrollDyRef = useRef(0);

    const groupsRef = useRef(groups);
    groupsRef.current = groups;
    const onReorderRef = useRef(onReorder);
    onReorderRef.current = onReorder;

    const movePreview = useCallback((x, y) => {
        const gesture = gestureRef.current;
        const node = previewRef.current;
        if (!gesture || !node) return;
        node.style.transform = `translate3d(${x - gesture.offsetX}px, ${y - gesture.offsetY}px, 0)`;
    }, []);

    const stopAutoScroll = useCallback(() => {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        rafRef.current = 0;
        scrollDyRef.current = 0;
    }, []);

    const tick = useCallback(() => {
        if (scrollDyRef.current && scrollElRef.current) {
            scrollElRef.current.scrollTop += scrollDyRef.current;
        }
        rafRef.current = requestAnimationFrame(tick);
    }, []);

    const preventTouch = useCallback((e) => {
        if (e.cancelable) e.preventDefault();
    }, []);

    const handleMoveRef = useRef(() => {});
    const handleUpRef = useRef(() => {});
    const handleCancelRef = useRef(() => {});
    const handleKeyRef = useRef(() => {});
    const listeners = useRef({
        move: (e) => handleMoveRef.current(e),
        up: (e) => handleUpRef.current(e),
        cancel: (e) => handleCancelRef.current(e),
        key: (e) => handleKeyRef.current(e),
    });

    const cleanup = useCallback(() => {
        gestureRef.current = null;
        orderRef.current = null;
        scrollElRef.current = null;
        stopAutoScroll();
        window.removeEventListener("pointermove", listeners.current.move);
        window.removeEventListener("pointerup", listeners.current.up);
        window.removeEventListener("pointercancel", listeners.current.cancel);
        window.removeEventListener("keydown", listeners.current.key);
        document.removeEventListener("touchmove", preventTouch);
        document.body.style.userSelect = "";
        document.body.style.webkitUserSelect = "";
        setDragKey(null);
        setDragGroup(null);
        setLiveOrder(null);
    }, [preventTouch, stopAutoScroll]);

    handleMoveRef.current = (e) => {
        const gesture = gestureRef.current;
        if (!gesture || e.pointerId !== gesture.pointerId) return;
        if (e.cancelable) e.preventDefault();

        movePreview(e.clientX, e.clientY);

        const under = document.elementFromPoint(e.clientX, e.clientY);
        const listEl = under?.closest?.("[data-reorder-list]");
        const itemEl = under?.closest?.("[data-reorder-item]");
        if (listEl?.dataset.reorderList === gesture.groupId && itemEl) {
            const overKey = itemEl.dataset.reorderItem;
            const current = orderRef.current;
            const fromIndex = current.indexOf(gesture.itemKey);
            const toIndex = current.indexOf(overKey);
            if (fromIndex !== -1 && toIndex !== -1 && fromIndex !== toIndex) {
                const next = current.slice();
                next.splice(fromIndex, 1);
                next.splice(toIndex, 0, gesture.itemKey);
                orderRef.current = next;
                gesture.moved = true;
                setLiveOrder(next);
            }
        }

        const scrollEl = scrollElRef.current;
        if (scrollEl) {
            const rect = scrollEl.getBoundingClientRect();
            let dy = 0;
            if (e.clientY < rect.top + EDGE_ZONE) {
                dy = -EDGE_SPEED * Math.min(1, (rect.top + EDGE_ZONE - e.clientY) / EDGE_ZONE);
            } else if (e.clientY > rect.bottom - EDGE_ZONE) {
                dy = EDGE_SPEED * Math.min(1, (e.clientY - (rect.bottom - EDGE_ZONE)) / EDGE_ZONE);
            }
            scrollDyRef.current = dy;
        }
    };

    handleUpRef.current = (e) => {
        const gesture = gestureRef.current;
        if (!gesture || e.pointerId !== gesture.pointerId) return;
        const finalOrder = orderRef.current;
        const groupId = gesture.groupId;
        const moved = gesture.moved;
        cleanup();
        if (moved && finalOrder) onReorderRef.current?.(groupId, finalOrder);
    };

    handleCancelRef.current = () => cleanup();
    handleKeyRef.current = (e) => {
        if (e.key === "Escape") cleanup();
    };

    // Si el componente muere a mitad de gesto, no dejamos listeners sueltos
    useEffect(() => cleanup, [cleanup]);

    const getHandleProps = useCallback(
        (groupId, itemKey) => ({
            onPointerDown: (e) => {
                if (disabled) return;
                if (gestureRef.current) return;
                if (e.button != null && e.button > 0) return; // solo botón principal
                e.preventDefault();
                e.stopPropagation();

                const card = e.currentTarget.closest("[data-reorder-item]");
                const rect = card?.getBoundingClientRect();
                scrollElRef.current = e.currentTarget.closest("main") || document.scrollingElement;

                gestureRef.current = {
                    pointerId: e.pointerId,
                    groupId,
                    itemKey,
                    offsetX: e.clientX - (rect?.left ?? e.clientX),
                    offsetY: e.clientY - (rect?.top ?? e.clientY),
                    width: rect?.width,
                    moved: false,
                };
                orderRef.current = (groupsRef.current[groupId] || []).slice();
                setDragKey(itemKey);
                setDragGroup(groupId);
                setLiveOrder(orderRef.current);

                navigator.vibrate?.(15);
                document.addEventListener("touchmove", preventTouch, { passive: false });
                document.body.style.userSelect = "none";
                document.body.style.webkitUserSelect = "none";

                window.addEventListener("pointermove", listeners.current.move);
                window.addEventListener("pointerup", listeners.current.up);
                window.addEventListener("pointercancel", listeners.current.cancel);
                window.addEventListener("keydown", listeners.current.key);

                requestAnimationFrame(() => movePreview(e.clientX, e.clientY));
                rafRef.current = requestAnimationFrame(tick);
            },
        }),
        [disabled, movePreview, preventTouch, tick]
    );

    const getItemProps = useCallback(
        (itemKey) => ({
            "data-reorder-item": itemKey,
        }),
        []
    );

    return {
        dragKey,
        dragGroup,
        liveOrder,
        dragWidth: gestureRef.current?.width,
        previewRef,
        getHandleProps,
        getItemProps,
    };
}
