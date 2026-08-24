import { useCallback, useMemo, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import KanbanCard from "./KanbanCard";
import useKanbanDrag from "../../hooks/useKanbanDrag";
import { getStatusConfig } from "../../lib/status";
import { isClosedStatus } from "../../lib/progress";
import { priorityWeight } from "../../lib/priority";
import { cn } from "../../lib/utils";

// Cuántas tarjetas se pintan de entrada por columna y cuántas añade cada
// "mostrar más". Las columnas cerradas (Finalizado / Descartado) acumulan
// histórico, así que empiezan con menos.
const PAGE_SIZE = 15;
const CLOSED_PAGE_SIZE = 8;

// Orden de las columnas cerradas: lo último que se cerró, primero.
function closedRank(action) {
    if (action.actualEndDate) return Date.parse(`${action.actualEndDate}T00:00:00`) / 1000;
    return action.updatedAt?.seconds || action.createdAt?.seconds || 0;
}

/**
 * Tablero Kanban: una columna por estado configurado, en su orden de
 * configuración. Se arrastra con ratón y con el dedo (ver useKanbanDrag) y
 * respeta los filtros activos (recibe las acciones ya filtradas).
 */
export default function KanbanBoard({
    actions,
    statuses,
    getUserName,
    attachmentCounts,
    onStatusChange,
    wipLimits = {},
    canEditLimits = false,
    onWipLimitChange,
    highlightId,
}) {
    const boardRef = useRef(null);
    const [pageByStatus, setPageByStatus] = useState({});

    const { columns, orphans } = useMemo(() => {
        const byStatus = {};
        statuses.forEach((s) => (byStatus[s.id] = []));
        const rest = [];
        for (const action of actions) {
            if (byStatus[action.status]) byStatus[action.status].push(action);
            else rest.push(action);
        }
        const cols = statuses.map((status) => {
            const list = byStatus[status.id];
            const closed = isClosedStatus(status);
            list.sort(
                closed
                    ? (a, b) => closedRank(b) - closedRank(a)
                    : (a, b) =>
                          priorityWeight(b.priority) - priorityWeight(a.priority) ||
                          (a.proposedEndDate || "9999").localeCompare(b.proposedEndDate || "9999")
            );
            return { status, list, closed };
        });
        return { columns: cols, orphans: rest };
    }, [actions, statuses]);

    const handleDrop = useCallback(
        (action, statusId) => {
            if (!action || action.status === statusId) return;
            onStatusChange(action, getStatusConfig(statuses, statusId));
        },
        [onStatusChange, statuses]
    );

    const { drag, overColumn, previewRef, getCardProps, getHandleProps } = useKanbanDrag({
        boardRef,
        onDrop: handleDrop,
    });

    const showMore = useCallback((statusId, step, total) => {
        setPageByStatus((prev) => ({
            ...prev,
            [statusId]: Math.min(total, (prev[statusId] ?? step) + step),
        }));
    }, []);

    return (
        <>
            <div
                ref={boardRef}
                className={cn("scroll-x pb-4", drag ? "snap-none" : "snap-x")}
                aria-label="Tablero Kanban"
            >
                {/* w-max + mx-auto: centrado en pantallas anchas y, cuando no
                    cabe, se alinea a la izquierda y hace scroll con normalidad */}
                <div className="mx-auto flex w-max gap-3">
                    {columns.map(({ status, list, closed }) => {
                        const step = closed ? CLOSED_PAGE_SIZE : PAGE_SIZE;
                        const shown = Math.min(pageByStatus[status.id] ?? step, list.length);
                        const remaining = list.length - shown;
                        const limit = wipLimits[status.id];
                        const overLimit = limit != null && limit > 0 && list.length > limit;
                        return (
                            <section
                                key={status.id}
                                data-kanban-column={status.id}
                                aria-label={`Columna ${status.label}`}
                                className={cn(
                                    "flex w-[17rem] flex-shrink-0 snap-start flex-col rounded-2xl border bg-surface-2/50 transition-colors sm:w-72",
                                    overColumn === status.id && drag
                                        ? "border-brand-400 bg-brand-500/10"
                                        : "border-line",
                                    overLimit && "border-amber-400"
                                )}
                            >
                                <header className="flex items-center gap-2 px-3 py-2.5">
                                    <span
                                        className="h-3 w-3 flex-shrink-0 rounded-full"
                                        style={{ backgroundColor: status.color }}
                                        aria-hidden="true"
                                    />
                                    <h3 className="min-w-0 flex-1 truncate text-sm font-semibold text-gray-700 dark:text-gray-200">
                                        {status.label}
                                    </h3>
                                    <span
                                        className={cn(
                                            "badge bg-surface font-normal tabular-nums text-gray-500 dark:text-gray-300",
                                            overLimit &&
                                                "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                                        )}
                                        title={
                                            limit != null && limit > 0
                                                ? `Límite de trabajo en curso: ${limit}`
                                                : undefined
                                        }
                                    >
                                        {list.length}
                                        {limit != null && limit > 0 ? `/${limit}` : ""}
                                    </span>
                                    {canEditLimits && (
                                        <input
                                            type="number"
                                            min="0"
                                            value={limit ?? ""}
                                            onChange={(e) =>
                                                onWipLimitChange?.(
                                                    status.id,
                                                    e.target.value === "" ? null : Number(e.target.value)
                                                )
                                            }
                                            placeholder="∞"
                                            aria-label={`Límite WIP de ${status.label}`}
                                            title="Límite de trabajo en curso (vacío = sin límite)"
                                            className="w-12 rounded border border-line bg-surface px-1 py-0.5 text-center text-xs text-gray-600 dark:text-gray-300"
                                        />
                                    )}
                                </header>
                                <div
                                    data-kanban-list=""
                                    onScroll={(e) => {
                                        if (remaining <= 0) return;
                                        const el = e.currentTarget;
                                        if (el.scrollTop + el.clientHeight >= el.scrollHeight - 140) {
                                            showMore(status.id, step, list.length);
                                        }
                                    }}
                                    className="flex-1 space-y-2 overflow-y-auto overscroll-contain px-2 pb-2"
                                    style={{ maxHeight: "65dvh", minHeight: "8rem" }}
                                >
                                    {list.slice(0, shown).map((action) => (
                                        <KanbanCard
                                            key={action.id}
                                            action={action}
                                            getUserName={getUserName}
                                            attachmentCount={attachmentCounts?.[action.id] || 0}
                                            cardProps={getCardProps(action)}
                                            handleProps={getHandleProps(action)}
                                            dragging={drag?.id === action.id}
                                            highlight={highlightId === action.id}
                                        />
                                    ))}

                                    {remaining > 0 && (
                                        <button
                                            type="button"
                                            onClick={() => showMore(status.id, step, list.length)}
                                            className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-line py-2 text-xs font-medium text-gray-500 transition-colors hover:border-brand-400 hover:text-brand-600 dark:text-gray-400 dark:hover:text-brand-400"
                                        >
                                            <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
                                            Mostrar {Math.min(remaining, step)} más
                                            {closed ? " antiguas" : ""}
                                            <span className="text-gray-400 dark:text-gray-500">
                                                ({remaining})
                                            </span>
                                        </button>
                                    )}

                                    {list.length === 0 && (
                                        <p className="px-2 py-6 text-center text-xs text-gray-400 dark:text-gray-500">
                                            Sin acciones
                                        </p>
                                    )}
                                </div>
                            </section>
                        );
                    })}

                    {orphans.length > 0 && (
                        <section className="w-[17rem] flex-shrink-0 snap-start rounded-2xl border border-dashed border-line p-3 sm:w-72">
                            <h3 className="mb-2 text-sm font-semibold text-gray-500 dark:text-gray-400">
                                Estado desconocido
                            </h3>
                            <div className="space-y-2">
                                {orphans.map((action) => (
                                    <KanbanCard
                                        key={action.id}
                                        action={action}
                                        getUserName={getUserName}
                                        attachmentCount={attachmentCounts?.[action.id] || 0}
                                    />
                                ))}
                            </div>
                        </section>
                    )}
                </div>
            </div>

            <p className="mt-1 text-center text-xs text-gray-400 dark:text-gray-500 sm:hidden">
                Mantén pulsada una tarjeta (o arrastra por el asa) para moverla de columna.
            </p>

            {/* Tarjeta fantasma que sigue al puntero/dedo durante el arrastre */}
            {drag && (
                <div
                    ref={previewRef}
                    className="pointer-events-none fixed left-0 top-0 z-50 will-change-transform"
                    style={{ width: drag.width }}
                    aria-hidden="true"
                >
                    <KanbanCard
                        action={drag.action}
                        getUserName={getUserName}
                        attachmentCount={attachmentCounts?.[drag.action.id] || 0}
                        preview
                    />
                </div>
            )}
        </>
    );
}
