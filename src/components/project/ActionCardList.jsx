import { useState } from "react";
import { Check, ChevronDown, GripVertical, Paperclip, Trash2 } from "lucide-react";
import StatusPill from "../ui/StatusPill";
import PriorityBadge from "../ui/PriorityBadge";
import Field from "../ui/Field";
import MultiCheckDropdown from "../ui/MultiCheckDropdown";
import ActionAttachments from "../ActionAttachments";
import ActionComments from "./ActionComments";
import StatusSelect from "./StatusSelect";
import PhaseSelect from "./PhaseSelect";
import PrioritySelect from "./PrioritySelect";
import SubactionsPanel from "./SubactionsPanel";
import { getStatusConfig } from "../../lib/status";
import { isClosedStatus, isDoneStatus } from "../../lib/progress";
import { isBeforeToday, formatShortDate } from "../../lib/dates";
import { normalizePriority } from "../../lib/priority";
import { getPhaseConfig } from "../../lib/pdca";
import { getReadableTextColor } from "../../lib/color";
import { cn } from "../../lib/utils";

const DATE_FIELDS = [
    { field: "proposedStartDate", label: "F. inicio propuesta" },
    { field: "proposedEndDate", label: "F. fin propuesta" },
    { field: "startDate", label: "F. inicio real" },
    { field: "actualEndDate", label: "F. fin real" },
];

/**
 * Lista de tarjetas con acordeón para móvil (<lg). Reutiliza los mismos
 * editores inline que la tabla (FIX B7: keys con el valor remoto).
 */
export default function ActionCardList({
    actions,
    statuses,
    projectUserOptions,
    getUserName,
    isColumnVisible,
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
    const [expandedCardId, setExpandedCardId] = useState(null);
    const [expandedSubsId, setExpandedSubsId] = useState(null);
    const [expandedCommentsId, setExpandedCommentsId] = useState(null);

    // Estados que alimentan el círculo de completar/reabrir de cada tarjeta
    const doneStatus = statuses.find(isDoneStatus) || null;
    const reopenStatus = statuses.find((s) => !isClosedStatus(s)) || statuses[0] || null;

    function assigneeOptionsFor(action) {
        const options = [...projectUserOptions];
        for (const uid of action.assignedUsers || []) {
            if (!options.some((o) => o.value === uid)) {
                options.push({ value: uid, label: getUserName(uid) });
            }
        }
        return options;
    }

    return (
        <div className="space-y-2.5">
            {actions.map((action) => {
                const statusCfg = getStatusConfig(statuses, action.status);
                const closed = isClosedStatus(statusCfg);
                const priority = normalizePriority(action.priority);
                const phaseCfg = getPhaseConfig(action.phase);
                const isExpanded = expandedCardId === action.id;
                const attachmentCount = attachmentCounts[action.id] || 0;

                // Fecha visible en cabecera: fin real > fin propuesta
                const cardDateRaw =
                    (isColumnVisible("actualEndDate") && action.actualEndDate) ||
                    (isColumnVisible("proposedEndDate") && action.proposedEndDate) ||
                    null;
                const cardDateOverdue =
                    isColumnVisible("proposedEndDate") &&
                    !action.actualEndDate &&
                    isBeforeToday(action.proposedEndDate) &&
                    !closed;

                return (
                    <div
                        key={action.id}
                        ref={registerRowRef(action.id)}
                        {...getItemProps(action.id)}
                        className={cn(
                            "card transition-all",
                            priority === "high" && "border-red-300 dark:border-red-800",
                            highlightId === action.id && "ring-2 ring-brand-500",
                            dragKey === action.id && "opacity-30"
                        )}
                    >
                        <div className="flex items-start gap-2 px-3 py-3 sm:px-4">
                            {reorderEnabled && (
                                <span
                                    {...getHandleProps(action.id)}
                                    role="button"
                                    tabIndex={-1}
                                    aria-label="Arrastrar para reordenar"
                                    title="Arrastra para reordenar"
                                    className="-ml-1 mt-0.5 flex h-7 w-6 flex-shrink-0 cursor-grab touch-none items-center justify-center rounded-lg text-gray-300 active:cursor-grabbing active:bg-surface-2 active:text-brand-500 dark:text-gray-600"
                                >
                                    <GripVertical className="h-4 w-4" aria-hidden="true" />
                                </span>
                            )}
                            {doneStatus ? (
                                <button
                                    type="button"
                                    onClick={() =>
                                        api.changeStatus(
                                            action,
                                            closed ? reopenStatus?.id : doneStatus.id
                                        )
                                    }
                                    disabled={closed && !reopenStatus}
                                    aria-label={
                                        closed
                                            ? `Reabrir "${action.action}"`
                                            : `Marcar "${action.action}" como ${doneStatus.label}`
                                    }
                                    title={closed ? "Reabrir" : `Marcar como ${doneStatus.label}`}
                                    className={cn(
                                        "mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                                        closed
                                            ? "border-transparent text-white"
                                            : "border-gray-300 text-transparent hover:border-green-500 hover:text-green-500 dark:border-gray-600"
                                    )}
                                    style={closed ? { backgroundColor: statusCfg.color } : undefined}
                                >
                                    <Check className="h-4 w-4" strokeWidth={3} />
                                </button>
                            ) : (
                                <span
                                    className="mt-2 h-3 w-3 flex-shrink-0 rounded-full"
                                    style={{ backgroundColor: statusCfg.color }}
                                    aria-hidden="true"
                                ></span>
                            )}
                            <button
                                type="button"
                                onClick={() => setExpandedCardId(isExpanded ? null : action.id)}
                                aria-expanded={isExpanded}
                                className="flex min-w-0 flex-1 items-start gap-2 text-left"
                            >
                                <span className="min-w-0 flex-1">
                                    <span
                                        className={cn(
                                            "block line-clamp-3 text-sm leading-snug text-gray-800 dark:text-gray-100",
                                            priority === "high" && "font-semibold",
                                            closed && "text-gray-400 line-through dark:text-gray-500"
                                        )}
                                    >
                                        {action.seqId ? (
                                            <span className="mr-1 text-xs text-gray-400 dark:text-gray-500">
                                                #{action.seqId}
                                            </span>
                                        ) : null}
                                        {action.action || "Sin descripción"}
                                    </span>
                                    <span className="mt-1 flex flex-wrap items-center gap-2">
                                        <PriorityBadge priority={priority} showLabel={false} />
                                        {phaseCfg && (
                                            <span
                                                className="badge"
                                                style={{
                                                    backgroundColor: phaseCfg.color,
                                                    color: getReadableTextColor(phaseCfg.color),
                                                }}
                                            >
                                                {phaseCfg.label}
                                            </span>
                                        )}
                                        {cardDateRaw && (
                                            <span
                                                className={cn(
                                                    "text-xs",
                                                    cardDateOverdue
                                                        ? "font-semibold text-red-500"
                                                        : "text-amber-600 dark:text-amber-400"
                                                )}
                                            >
                                                {formatShortDate(cardDateRaw)}
                                            </span>
                                        )}
                                        {(action.assignedUsers || []).length > 0 && (
                                            <span className="text-xs text-gray-400 dark:text-gray-500">
                                                · {action.assignedUsers.map((uid) => getUserName(uid)).join(", ")}
                                            </span>
                                        )}
                                    </span>
                                </span>
                                <span className="flex flex-shrink-0 flex-col items-end gap-1">
                                    <StatusPill status={statusCfg} size="sm" />
                                    <ChevronDown
                                        className={cn(
                                            "h-4 w-4 text-gray-400 transition-transform motion-reduce:transition-none",
                                            isExpanded && "rotate-180"
                                        )}
                                        aria-hidden="true"
                                    />
                                </span>
                            </button>
                        </div>

                        {isExpanded && (
                            <div className="space-y-3 border-t border-line px-3 pb-4 pt-3 sm:px-4">
                                <Field label="Estado">
                                    <StatusSelect
                                        statuses={statuses}
                                        value={action.status}
                                        onChange={(statusId) => api.changeStatus(action, statusId)}
                                        className="w-full"
                                    />
                                </Field>

                                <Field label="Responsables">
                                    <MultiCheckDropdown
                                        options={assigneeOptionsFor(action)}
                                        selected={action.assignedUsers || []}
                                        onChange={(selected) => api.changeAssignees(action, selected)}
                                        placeholder="Sin asignar"
                                        className="w-full"
                                    />
                                </Field>

                                <Field label="Prioridad">
                                    <PrioritySelect
                                        value={priority}
                                        onChange={(v) => api.updateField(action, "priority", v)}
                                        showLabel
                                    />
                                </Field>

                                <Field label="Fase">
                                    <PhaseSelect
                                        variant="chips"
                                        value={action.phase || ""}
                                        onChange={(v) => api.updateField(action, "phase", v || null)}
                                    />
                                </Field>

                                {DATE_FIELDS.some(({ field }) => isColumnVisible(field)) && (
                                    <div className="grid grid-cols-2 gap-2">
                                        {DATE_FIELDS.filter(({ field }) => isColumnVisible(field)).map(
                                            ({ field, label }) => (
                                                <Field key={field} label={label}>
                                                    <input
                                                        type="date"
                                                        defaultValue={action[field] || ""}
                                                        key={`c-${field}-${action.id}-${action[field] || ""}`}
                                                        onChange={(e) =>
                                                            api.updateField(action, field, e.target.value)
                                                        }
                                                        className={cn(
                                                            "input py-1.5 text-xs",
                                                            field === "proposedEndDate" &&
                                                                isBeforeToday(action.proposedEndDate) &&
                                                                !closed &&
                                                                "font-semibold text-red-600"
                                                        )}
                                                    />
                                                </Field>
                                            )
                                        )}
                                    </div>
                                )}

                                {isColumnVisible("observations") && (
                                    <Field label="Observaciones">
                                        <textarea
                                            defaultValue={action.observations || ""}
                                            key={`c-obs-${action.id}-${action.observations || ""}`}
                                            onBlur={(e) => {
                                                if (e.target.value !== (action.observations || "")) {
                                                    api.updateField(action, "observations", e.target.value);
                                                }
                                            }}
                                            rows={2}
                                            placeholder="Sin observaciones"
                                            className="input resize-none text-sm"
                                        />
                                    </Field>
                                )}

                                {isColumnVisible("subactions") && (
                                    <div>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setExpandedSubsId(
                                                    expandedSubsId === action.id ? null : action.id
                                                )
                                            }
                                            aria-expanded={expandedSubsId === action.id}
                                            className="text-xs text-brand-600 hover:text-brand-800 dark:text-brand-300 dark:hover:text-brand-200"
                                        >
                                            Subacciones ({(action.subactions || []).length})
                                        </button>
                                        {expandedSubsId === action.id && (
                                            <div className="mt-2">
                                                <SubactionsPanel
                                                    action={action}
                                                    statuses={statuses}
                                                    userOptions={projectUserOptions}
                                                    onChangeSubactions={(next) =>
                                                        api.updateSubactions(action, next)
                                                    }
                                                />
                                            </div>
                                        )}
                                    </div>
                                )}

                                {isColumnVisible("attachments") && (
                                    <div>
                                        <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-gray-600 dark:text-gray-300">
                                            <Paperclip className="h-3.5 w-3.5" /> Archivos adjuntos
                                            {attachmentCount > 0 && ` (${attachmentCount})`}
                                        </div>
                                        <ActionAttachments
                                            projectId={projectId}
                                            actionId={action.id}
                                            userId={currentUserId}
                                        />
                                    </div>
                                )}

                                {isColumnVisible("comments") && (
                                    <div>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setExpandedCommentsId(
                                                    expandedCommentsId === action.id ? null : action.id
                                                )
                                            }
                                            aria-expanded={expandedCommentsId === action.id}
                                            className="text-xs text-brand-600 hover:text-brand-800 dark:text-brand-300 dark:hover:text-brand-200"
                                        >
                                            Comentarios ({action.commentsCount || 0})
                                        </button>
                                        {expandedCommentsId === action.id && (
                                            <div className="mt-2">
                                                <ActionComments
                                                    projectId={projectId}
                                                    action={action}
                                                    projectUsers={projectUsers}
                                                    projectTitle={projectTitle}
                                                />
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div className="flex justify-end pt-1">
                                    <button
                                        type="button"
                                        onClick={() => api.deleteAction(action)}
                                        className="btn-ghost btn-sm text-red-500 hover:text-red-700"
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                        Eliminar acción
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                );
            })}

            {actions.length === 0 && (
                <div className="py-8 text-center text-sm text-gray-400 dark:text-gray-500">
                    {hasActiveFilters
                        ? "No hay acciones que coincidan con los filtros."
                        : 'No hay acciones aún. Pulsa "Nueva acción" para empezar.'}
                </div>
            )}
        </div>
    );
}
