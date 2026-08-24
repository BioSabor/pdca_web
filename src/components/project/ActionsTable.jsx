import { useState } from "react";
import { ChevronDown, ChevronUp, Eye, ListTodo, Paperclip, MessageSquare } from "lucide-react";
import ActionTableRow from "./ActionTableRow";
import NewActionForm from "./NewActionForm";
import { cn } from "../../lib/utils";

const DATE_COLUMNS = ["proposedStartDate", "proposedEndDate", "startDate", "actualEndDate"];

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
    showNewForm,
    onCreate,
    onCancelNew,
    projectId,
    currentUserId,
    projectUsers,
    projectTitle,
}) {
    const [expandedObsId, setExpandedObsId] = useState(null);
    const [expandedSubsId, setExpandedSubsId] = useState(null);
    const [expandedAttsId, setExpandedAttsId] = useState(null);
    const [expandedCommentsId, setExpandedCommentsId] = useState(null);

    const totalColumns =
        6 + // #, orden, prioridad, acción, responsables, estado
        (isColumnVisible("phase") ? 1 : 0) +
        DATE_COLUMNS.filter(isColumnVisible).length +
        (isColumnVisible("observations") ? 1 : 0) +
        1 + // toggle de observaciones
        (isColumnVisible("subactions") ? 1 : 0) +
        (isColumnVisible("attachments") ? 1 : 0) +
        (isColumnVisible("comments") ? 1 : 0) +
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
            <table className="w-full min-w-[980px] divide-y divide-line text-sm">
                <thead className="bg-surface-2">
                    <tr>
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
                        {isColumnVisible("proposedStartDate") &&
                            sortableHeader(
                                "proposedStartDate",
                                <>
                                    F. inicio prop.
                                    {requiredFields.proposedStartDate && (
                                        <span className="ml-0.5 text-red-500">*</span>
                                    )}
                                </>,
                                "w-20 text-center leading-3"
                            )}
                        {isColumnVisible("proposedEndDate") &&
                            sortableHeader(
                                "proposedEndDate",
                                <>
                                    F. fin prop.
                                    {requiredFields.proposedEndDate && (
                                        <span className="ml-0.5 text-red-500">*</span>
                                    )}
                                </>,
                                "w-20 text-center leading-3"
                            )}
                        {isColumnVisible("startDate") &&
                            sortableHeader("startDate", "F. inicio real", "w-20 text-center leading-3")}
                        {isColumnVisible("actualEndDate") &&
                            sortableHeader("actualEndDate", "F. fin real", "w-20 text-center leading-3")}
                        {isColumnVisible("observations") && (
                            <th className={cn(thBase, "min-w-[140px]")} scope="col">
                                Observaciones
                            </th>
                        )}
                        <th className={cn(thBase, "w-10 px-1 text-center")} scope="col" title="Ver observaciones">
                            <Eye className="mx-auto h-3.5 w-3.5" aria-label="Observaciones" />
                        </th>
                        {isColumnVisible("subactions") && (
                            <th className={cn(thBase, "w-10 px-1 text-center")} scope="col" title="Subacciones">
                                <ListTodo className="mx-auto h-3.5 w-3.5" aria-label="Subacciones" />
                            </th>
                        )}
                        {isColumnVisible("attachments") && (
                            <th className={cn(thBase, "w-10 px-1 text-center")} scope="col" title="Adjuntos">
                                <Paperclip className="mx-auto h-3.5 w-3.5" aria-label="Adjuntos" />
                            </th>
                        )}
                        {isColumnVisible("comments") && (
                            <th className={cn(thBase, "w-10 px-1 text-center")} scope="col" title="Comentarios">
                                <MessageSquare className="mx-auto h-3.5 w-3.5" aria-label="Comentarios" />
                            </th>
                        )}
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
                            expandedObs={expandedObsId === action.id}
                            expandedSubs={expandedSubsId === action.id}
                            expandedAtts={expandedAttsId === action.id}
                            expandedComments={expandedCommentsId === action.id}
                            onToggleObs={() =>
                                setExpandedObsId(expandedObsId === action.id ? null : action.id)
                            }
                            onToggleSubs={() =>
                                setExpandedSubsId(expandedSubsId === action.id ? null : action.id)
                            }
                            onToggleAtts={() =>
                                setExpandedAttsId(expandedAttsId === action.id ? null : action.id)
                            }
                            onToggleComments={() =>
                                setExpandedCommentsId(expandedCommentsId === action.id ? null : action.id)
                            }
                            highlighted={highlightId === action.id}
                            rowRef={registerRowRef(action.id)}
                            projectId={projectId}
                            currentUserId={currentUserId}
                            projectUsers={projectUsers}
                            projectTitle={projectTitle}
                        />
                    ))}

                    {showNewForm && (
                        <NewActionForm
                            variant="row"
                            statuses={statuses}
                            userOptions={projectUserOptions}
                            requiredFields={requiredFields}
                            isColumnVisible={isColumnVisible}
                            onSubmit={onCreate}
                            onCancel={onCancelNew}
                        />
                    )}

                    {actions.length === 0 && !showNewForm && (
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
