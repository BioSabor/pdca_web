import { useState } from "react";
import KanbanCard from "./KanbanCard";
import { getStatusConfig } from "../../lib/status";
import { priorityWeight } from "../../lib/priority";
import { cn } from "../../lib/utils";

/**
 * Tablero Kanban: una columna por estado configurado, en su orden de
 * configuración. Arrastrar y soltar en escritorio (HTML5 DnD); en móvil las
 * tarjetas se mueven cambiando el estado desde la vista de tarjetas/tabla.
 * Respeta los filtros activos (recibe las acciones ya filtradas).
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
    const [draggingId, setDraggingId] = useState(null);
    const [dragOverColumn, setDragOverColumn] = useState(null);

    const byStatus = {};
    statuses.forEach((s) => (byStatus[s.id] = []));
    const orphans = [];
    for (const action of actions) {
        if (byStatus[action.status]) byStatus[action.status].push(action);
        else orphans.push(action);
    }
    Object.values(byStatus).forEach((list) =>
        list.sort(
            (a, b) =>
                priorityWeight(b.priority) - priorityWeight(a.priority) ||
                (a.proposedEndDate || "9999").localeCompare(b.proposedEndDate || "9999")
        )
    );

    async function handleDrop(statusId) {
        setDragOverColumn(null);
        if (!draggingId) return;
        const action = actions.find((a) => a.id === draggingId);
        setDraggingId(null);
        if (!action || action.status === statusId) return;
        await onStatusChange(action, getStatusConfig(statuses, statusId));
    }

    return (
        <div className="scroll-x flex snap-x gap-3 pb-4">
            {statuses.map((status) => {
                const list = byStatus[status.id] || [];
                const limit = wipLimits[status.id];
                const overLimit = limit != null && limit > 0 && list.length > limit;
                return (
                    <section
                        key={status.id}
                        aria-label={`Columna ${status.label}`}
                        onDragOver={(e) => {
                            e.preventDefault();
                            setDragOverColumn(status.id);
                        }}
                        onDragLeave={(e) => {
                            if (!e.currentTarget.contains(e.relatedTarget)) setDragOverColumn(null);
                        }}
                        onDrop={() => handleDrop(status.id)}
                        className={cn(
                            "flex w-[17rem] flex-shrink-0 snap-start flex-col rounded-2xl border bg-surface-2/50 transition-colors sm:w-72",
                            dragOverColumn === status.id ? "border-brand-400 bg-brand-500/10" : "border-line",
                            overLimit && "border-amber-400"
                        )}
                    >
                        <header className="flex items-center gap-2 px-3 py-2.5">
                            <span className="h-3 w-3 flex-shrink-0 rounded-full" style={{ backgroundColor: status.color }} aria-hidden="true" />
                            <h3 className="min-w-0 flex-1 truncate text-sm font-semibold text-gray-700 dark:text-gray-200">
                                {status.label}
                            </h3>
                            <span
                                className={cn(
                                    "badge bg-surface font-normal text-gray-500 dark:text-gray-300",
                                    overLimit && "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                                )}
                                title={limit != null && limit > 0 ? `Límite de trabajo en curso: ${limit}` : undefined}
                            >
                                {list.length}
                                {limit != null && limit > 0 ? `/${limit}` : ""}
                            </span>
                            {canEditLimits && (
                                <input
                                    type="number"
                                    min="0"
                                    value={limit ?? ""}
                                    onChange={(e) => onWipLimitChange?.(status.id, e.target.value === "" ? null : Number(e.target.value))}
                                    placeholder="∞"
                                    aria-label={`Límite WIP de ${status.label}`}
                                    title="Límite de trabajo en curso (vacío = sin límite)"
                                    className="w-12 rounded border border-line bg-surface px-1 py-0.5 text-center text-xs text-gray-600 dark:text-gray-300"
                                />
                            )}
                        </header>
                        <div className="flex-1 space-y-2 overflow-y-auto px-2 pb-2" style={{ maxHeight: "65dvh", minHeight: "8rem" }}>
                            {list.map((action) => (
                                <KanbanCard
                                    key={action.id}
                                    action={action}
                                    getUserName={getUserName}
                                    attachmentCount={attachmentCounts?.[action.id] || 0}
                                    dragging={draggingId === action.id}
                                    highlight={highlightId === action.id}
                                    onDragStart={(e) => {
                                        e.dataTransfer.effectAllowed = "move";
                                        e.dataTransfer.setData("text/plain", action.id);
                                        setDraggingId(action.id);
                                    }}
                                    onDragEnd={() => {
                                        setDraggingId(null);
                                        setDragOverColumn(null);
                                    }}
                                />
                            ))}
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
                <section className="w-[17rem] flex-shrink-0 rounded-2xl border border-dashed border-line p-3 sm:w-72">
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
    );
}
