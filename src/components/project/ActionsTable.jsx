import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import ActionTableRow from "./ActionTableRow";
import { cn } from "../../lib/utils";

function SortIcon({ column, sortColumn, sortDirection }) {
    if (sortColumn !== column) {
        return <ChevronDown className="ml-0.5 inline h-3 w-3 opacity-0 group-hover:opacity-40" />;
    }
    return sortDirection === "asc" ? (
        <ChevronUp className="ml-0.5 inline h-3 w-3 text-brand-500" />
    ) : (
        <ChevronDown className="ml-0.5 inline h-3 w-3 text-brand-500" />
    );
}

/**
 * Tabla de acciones (desktop, lg+). La columna "Acción" es sticky para no
 * perder el contexto al hacer scroll horizontal.
 */
export default function ActionsTable({
    actions,
    statuses,
    projectUserOptions,
    getUserName,
    requiredFields,
    isColumnVisible,
    sortColumn,
    sortDirection,
    toggleSort,
    api,
    attachmentCounts,
    highlightId,
    registerRowRef,
    hasActiveFilters,
    projectId,
    currentUserId,
    projectUsers,
    projectTitle,
    reorderEnabled = false,
    dragKey,
    getItemProps,
    getHandleProps,
}) {
    const [expandedId, setExpandedId] = useState(null);

    const showDateColumn = isColumnVisible("proposedEndDate") || isColumnVisible("actualEndDate");
    const totalColumns =
        8 + // asa de arrastre, #, orden, prioridad, acción, responsables, estado, detalles/expandir
        (isColumnVisible("phase") ? 1 : 0) +
        (showDateColumn ? 1 : 0) +
        1; // eliminar

    function assigneeOptionsFor(action) {
        const options = [...projectUserOptions];
        for (const uid of action.assignedUsers || []) {
            if (!options.some((o) => o.value === uid)) {
                options.push({ value: uid, label: getUserName(uid) });
            }
        }
        return options;
    }

    const thBase =
        "px-2 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-300";
    const thSortable = cn(thBase, "group cursor-pointer select-none");

    const sortableHeader = (column, label, extra) => (
        <th onClick={() => toggleSort(column)} className={cn(thSortable, extra)} scope="col">
            {label} <SortIcon column={column} sortColumn={sortColumn} sortDirection={sortDirection} />
        </th>
    );

    return (
        <div className="card scroll-x">
            <table className="w-full min-w-[900px] divide-y divide-line text-sm">
                <thead className="bg-surface-2">
                    <tr>
                        <th className={cn(thBase, "w-7 px-1")} scope="col">
                            <span className="sr-only">Reordenar</span>
                        </th>
                        {sortableHeader("seqId", "#", "w-8 px-3")}
                        {sortableHeader("orden", "Orden", "w-14")}
                        {sortableHeader("priority", "Prior.", "w-14 text-center")}
                        <th
                            onClick={() => toggleSort("action")}
                            className={cn(thSortable, "sticky left-0 z-10 min-w-[380px] w-full bg-surface-2 px-3")}
                            scope="col"
                        >
                            Acción{" "}
                            <SortIcon column="action" sortColumn={sortColumn} sortDirection={sortDirection} />
                        </th>
                        {sortableHeader(
                            "assignedUsers",
                            <>
                                Responsable
                                {requiredFields.assignedUsers && (
                                    <span className="ml-0.5 text-red-500">*</span>
                                )}
                            </>,
                            "min-w-[140px] px-3"
                        )}
                        {sortableHeader("status", "Estado", "w-32 px-3")}
                        {isColumnVisible("phase") && sortableHeader("phase", "Fase", "w-24")}
                        {showDateColumn && sortableHeader("proposedEndDate", "Fecha", "w-20")}
                        <th className={cn(thBase, "w-16 px-2 text-right")} scope="col">
                            <span className="sr-only">Más detalles</span>
                        </th>
                        <th className={cn(thBase, "w-10 px-3")} scope="col">
                            <span className="sr-only">Acciones de fila</span>
                        </th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-line/70">
                    {actions.map((action) => (
                        <ActionTableRow
                            key={action.id}
                            action={action}
                            statuses={statuses}
                            isColumnVisible={isColumnVisible}
                            totalColumns={totalColumns}
                            api={api}
                            assigneeOptions={assigneeOptionsFor(action)}
                            projectUserOptions={projectUserOptions}
                            attachmentCount={attachmentCounts[action.id] || 0}
                            expanded={expandedId === action.id}
                            onToggleExpand={() => setExpandedId(expandedId === action.id ? null : action.id)}
                            highlighted={highlightId === action.id}
                            rowRef={registerRowRef(action.id)}
                            projectId={projectId}
                            currentUserId={currentUserId}
                            projectUsers={projectUsers}
                            projectTitle={projectTitle}
                            reorderable={reorderEnabled}
                            dragging={dragKey === action.id}
                            itemProps={getItemProps(action.id)}
                            handleProps={getHandleProps(action.id)}
                        />
                    ))}

                    {actions.length === 0 && (
                        <tr>
                            <td colSpan={totalColumns} className="py-8 text-center text-gray-400 dark:text-gray-500">
                                {hasActiveFilters
                                    ? "No hay acciones que coincidan con los filtros."
                                    : 'No hay acciones aún. Haz clic en "Nueva acción" para empezar.'}
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
}
