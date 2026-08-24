import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Arrastrar y soltar del Kanban basado en Pointer Events, así funciona igual
 * con ratón y con el dedo (el DnD nativo de HTML5 no existe en móvil).
 *
 * Gestos:
 *  - Asa (GripVertical): arranca el arrastre al instante. El asa lleva
 *    `touch-action: none`, así el navegador no intenta desplazar la columna.
 *  - Cuerpo de la tarjeta: con ratón arranca al mover ~10px; en táctil hace
 *    falta una pulsación larga (320 ms) para no robarle el scroll al dedo.
 *
 * Mientras se arrastra: el tablero se desplaza solo al acercarse a los bordes
 * y la columna bajo el dedo hace scroll vertical, para poder soltar en sitios
 * que no caben en pantalla.
 */

const LONG_PRESS_MS = 320;
const MOVE_TOLERANCE = 10;
const EDGE_ZONE = 72; // franja junto al borde que activa el autoscroll
const EDGE_SPEED = 18; // px por frame a velocidad máxima

export default function useKanbanDrag({ boardRef, onDrop, disabled = false }) {
    const [drag, setDrag] = useState(null); // { id, action, width } mientras se arrastra
    const [overColumn, setOverColumn] = useState(null);

    const previewRef = useRef(null);
    const gestureRef = useRef(null);
    const overRef = useRef(null);
    const rafRef = useRef(0);
    const autoScrollRef = useRef({ dx: 0, dy: 0, list: null });
    const dropRef = useRef(onDrop);

    useEffect(() => {
        dropRef.current = onDrop;
    }, [onDrop]);

    const movePreview = useCallback((x, y) => {
        const gesture = gestureRef.current;
        const node = previewRef.current;
        if (!gesture || !node) return;
        node.style.transform = `translate3d(${x - gesture.offsetX}px, ${y - gesture.offsetY}px, 0)`;
    }, []);

    // ---- ciclo de autoscroll mientras se arrastra ----
    const stopAutoScroll = useCallback(() => {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        rafRef.current = 0;
        autoScrollRef.current = { dx: 0, dy: 0, list: null };
    }, []);

    const tick = useCallback(() => {
        const { dx, dy, list } = autoScrollRef.current;
        if (dx && boardRef.current) boardRef.current.scrollLeft += dx;
        if (dy && list) list.scrollTop += dy;
        rafRef.current = requestAnimationFrame(tick);
    }, [boardRef]);

    // ---- fin del gesto (con o sin arrastre) ----
    const preventTouch = useCallback((e) => {
        if (e.cancelable) e.preventDefault();
    }, []);

    // La lógica vive en refs que se reasignan en cada render, pero lo que se
    // registra en `window` son estos envoltorios estables: así el
    // removeEventListener de `cleanup` retira exactamente lo que se añadió.
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
        const gesture = gestureRef.current;
        if (gesture?.timer) clearTimeout(gesture.timer);
        gestureRef.current = null;
        overRef.current = null;
        stopAutoScroll();
        window.removeEventListener("pointermove", listeners.current.move);
        window.removeEventListener("pointerup", listeners.current.up);
        window.removeEventListener("pointercancel", listeners.current.cancel);
        window.removeEventListener("keydown", listeners.current.key);
        document.removeEventListener("touchmove", preventTouch);
        document.body.style.userSelect = "";
        document.body.style.webkitUserSelect = "";
        setDrag(null);
        setOverColumn(null);
    }, [preventTouch, stopAutoScroll]);

    const startDrag = useCallback(
        (x, y) => {
            const gesture = gestureRef.current;
            if (!gesture || gesture.dragging) return;
            if (gesture.timer) clearTimeout(gesture.timer);
            gesture.dragging = true;
            gesture.lastX = x;
            gesture.lastY = y;

            document.addEventListener("touchmove", preventTouch, { passive: false });
            window.addEventListener("keydown", listeners.current.key);
            document.body.style.userSelect = "none";
            document.body.style.webkitUserSelect = "none";
            navigator.vibrate?.(20);

            overRef.current = gesture.fromStatus;
            setOverColumn(gesture.fromStatus);
            setDrag({ id: gesture.action.id, action: gesture.action, width: gesture.width });
            requestAnimationFrame(() => movePreview(gesture.lastX, gesture.lastY));
            rafRef.current = requestAnimationFrame(tick);
        },
        [movePreview, preventTouch, tick]
    );

    handleMoveRef.current = (e) => {
        const gesture = gestureRef.current;
        if (!gesture || e.pointerId !== gesture.pointerId) return;

        if (!gesture.dragging) {
            const dist = Math.hypot(e.clientX - gesture.startX, e.clientY - gesture.startY);
            if (dist < MOVE_TOLERANCE) return;
            // En táctil, moverse antes de la pulsación larga = desplazar, no arrastrar
            if (gesture.pointerType === "touch") {
                cleanup();
                return;
            }
            startDrag(e.clientX, e.clientY);
        }

        gesture.lastX = e.clientX;
        gesture.lastY = e.clientY;
        movePreview(e.clientX, e.clientY);

        // Columna bajo el puntero (la vista previa no intercepta: pointer-events none)
        const under = document.elementFromPoint(e.clientX, e.clientY);
        const columnId = under?.closest?.("[data-kanban-column]")?.dataset.kanbanColumn || null;
        if (columnId !== overRef.current) {
            overRef.current = columnId;
            setOverColumn(columnId);
        }

        // Autoscroll: horizontal del tablero, vertical de la columna
        let dx = 0;
        const board = boardRef.current;
        if (board) {
            const rect = board.getBoundingClientRect();
            if (e.clientX < rect.left + EDGE_ZONE) {
                dx = -EDGE_SPEED * Math.min(1, (rect.left + EDGE_ZONE - e.clientX) / EDGE_ZONE);
            } else if (e.clientX > rect.right - EDGE_ZONE) {
                dx = EDGE_SPEED * Math.min(1, (e.clientX - (rect.right - EDGE_ZONE)) / EDGE_ZONE);
            }
        }
        let dy = 0;
        const list = under?.closest?.("[data-kanban-list]") || null;
        if (list) {
            const rect = list.getBoundingClientRect();
            if (e.clientY < rect.top + EDGE_ZONE) {
                dy = -EDGE_SPEED * Math.min(1, (rect.top + EDGE_ZONE - e.clientY) / EDGE_ZONE);
            } else if (e.clientY > rect.bottom - EDGE_ZONE) {
                dy = EDGE_SPEED * Math.min(1, (e.clientY - (rect.bottom - EDGE_ZONE)) / EDGE_ZONE);
            }
        }
        autoScrollRef.current = { dx, dy, list };
    };

    handleUpRef.current = (e) => {
        const gesture = gestureRef.current;
        if (!gesture || e.pointerId !== gesture.pointerId) return;
        const target = overRef.current;
        const { action, fromStatus, dragging } = gesture;
        cleanup();
        if (dragging && target && target !== fromStatus) {
            dropRef.current?.(action, target);
        }
    };

    handleCancelRef.current = () => cleanup();

    handleKeyRef.current = (e) => {
        if (e.key === "Escape") cleanup();
    };

    // Si el componente muere a mitad de gesto, no dejamos listeners sueltos
    useEffect(() => cleanup, [cleanup]);

    const beginGesture = useCallback(
        (e, action, { immediate }) => {
            if (disabled) return;
            if (gestureRef.current) return;
            if (e.button != null && e.button > 0) return; // solo botón principal
            if (!immediate && e.target?.closest?.("button, a, input, textarea, select")) return;

            const card = e.currentTarget.closest("[data-kanban-card]") || e.currentTarget;
            const rect = card.getBoundingClientRect();
            gestureRef.current = {
                pointerId: e.pointerId,
                pointerType: e.pointerType,
                action,
                fromStatus: action.status,
                startX: e.clientX,
                startY: e.clientY,
                lastX: e.clientX,
                lastY: e.clientY,
                offsetX: e.clientX - rect.left,
                offsetY: e.clientY - rect.top,
                width: rect.width,
                dragging: false,
                timer: null,
            };

            window.addEventListener("pointermove", listeners.current.move);
            window.addEventListener("pointerup", listeners.current.up);
            window.addEventListener("pointercancel", listeners.current.cancel);

            if (immediate) {
                if (e.cancelable) e.preventDefault();
                startDrag(e.clientX, e.clientY);
            } else if (e.pointerType === "touch") {
                gestureRef.current.timer = setTimeout(
                    () => startDrag(gestureRef.current?.lastX ?? e.clientX, gestureRef.current?.lastY ?? e.clientY),
                    LONG_PRESS_MS
                );
            }
        },
        [disabled, startDrag]
    );

    const getCardProps = useCallback(
        (action) => ({
            onPointerDown: (e) => beginGesture(e, action, { immediate: false }),
        }),
        [beginGesture]
    );

    const getHandleProps = useCallback(
        (action) => ({
            onPointerDown: (e) => {
                e.stopPropagation();
                beginGesture(e, action, { immediate: true });
            },
        }),
        [beginGesture]
    );

    return { drag, overColumn, previewRef, getCardProps, getHandleProps };
}
