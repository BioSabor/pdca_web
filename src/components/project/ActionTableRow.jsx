import { Fragment } from "react";
import { ChevronDown, GripVertical, ListTodo, MessageSquare, Paperclip, Trash2 } from "lucide-react";
import MultiCheckDropdown from "../ui/MultiCheckDropdown";
import ActionAttachments from "../ActionAttachments";
import ActionComments from "./ActionComments";
import Field from "../ui/Field";
import PrioritySelect from "./PrioritySelect";
import PhaseSelect from "./PhaseSelect";
import StatusSelect from "./StatusSelect";
import SubactionsPanel from "./SubactionsPanel";
import { getStatusConfig } from "../../lib/status";
import { isClosedStatus } from "../../lib/progress";
import { isBeforeToday, formatShortDate } from "../../lib/dates";
import { normalizePriority } from "../../lib/priority";
import { cn } from "../../lib/utils";

function autoResize(el) {
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
}

const DATE_FIELDS = [
    { field: "proposedStartDate", label: "F. inicio propuesta" },
    { field: "proposedEndDate", label: "F. fin propuesta" },
    { field: "startDate", label: "F. inicio real" },
    { field: "actualEndDate", label: "F. fin real" },
];

/**
 * Fila de la tabla de acciones con edición inline en tiempo real. Solo las
 * columnas de un vistazo (prioridad, acción, responsable, estado, una fecha
 * resumen) están siempre visibles; fechas exactas, fase, observaciones,
 * subacciones, adjuntos y comentarios viven en un único panel expandible
 * (mismo patrón que la tarjeta móvil) para no forzar scroll horizontal.
 * FIX B7: los inputs no controlados llevan key con el valor remoto para
 * remontarse cuando otro usuario edita el mismo campo.
 */
export default function ActionTableRow({
    action,
    statuses,
    isColumnVisible,
    totalColumns,
    api,
    assigneeOptions,
    projectUserOptions,
    attachmentCount,
    expanded,
    onToggleExpand,
    highlighted,
    rowRef,
    projectId,
    currentUserId,
    projectUsers,
    projectTitle,
    reorderable = false,
    dragging = false,
    itemProps,
    handleProps,
}) {
    const statusCfg = getStatusConfig(statuses, action.status);
    const closed = isClosedStatus(statusCfg);
    const priority = normalizePriority(action.priority);
    const subactionCount = (action.subactions || []).length;
    const commentsCount = action.commentsCount || 0;

    // Misma heurística que la tarjeta móvil: fin real si ya está, si no fin
    // propuesta; en rojo si venció sin fecha real y la acción sigue abierta.
    const summaryDateRaw =
        (isColumnVisible("actualEndDate") && action.actualEndDate) ||
        (isColumnVisible("proposedEndDate") && action.proposedEndDate) ||
        null;
    const summaryDateOverdue =
        isColumnVisible("proposedEndDate") &&
        !action.actualEndDate &&
        isBeforeToday(action.proposedEndDate) &&
        !closed;
    const showDateColumn = isColumnVisible("proposedEndDate") || isColumnVisible("actualEndDate");

    const anyDetailVisible = DATE_FIELDS.some(({ field }) => isColumnVisible(field));

    return (
        <Fragment>
            <tr
                ref={rowRef}
                {...itemProps}
                className={cn(
                    "transition hover:bg-surface-2/60",
                    priority === "high" && "bg-red-50/50 dark:bg-red-900/10",
                    highlighted && "ring-2 ring-inset ring-brand-500",
                    dragging && "opacity-30"
                )}
            >
                <td className="px-1 py-2">
                    {reorderable && (
                        <span
                            {...handleProps}
                            role="button"
                            tabIndex={-1}
                            aria-label="Arrastrar para reordenar"
                            title="Arrastra para reordenar"
                            className="flex h-7 w-6 cursor-grab touch-none items-center justify-center rounded text-gray-300 active:cursor-grabbing active:bg-surface-2 active:text-brand-500 dark:text-gray-600"
                        >
                            <GripVertical className="h-4 w-4" aria-hidden="true" />
                        </span>
                    )}
                </td>
                <td className="px-3 py-2 text-gray-400 dark:text-gray-500">{action.seqId || "-"}</td>
                <td className="px-2 py-2">
                    <input
                        type="number"
                        defaultValue={action.orden ?? ""}
                        key={`orden-${action.id}-${action.orden ?? ""}`}
                        onBlur={(e) => {
                            const val = e.target.value === "" ? null : Number(e.target.value);
                            if (val !== (action.orden ?? null)) api.updateField(action, "orden", val);
                        }}
                        aria-label="Orden"
                        className="w-14 rounded border-0 bg-transparent px-1 py-0.5 text-sm text-gray-700 focus:ring-1 focus:ring-brand-400 dark:text-gray-200 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    />
                </td>
                <td className="px-2 py-2 text-center">
                    <PrioritySelect
                        value={priority}
                        onChange={(v) => api.updateField(action, "priority", v)}
                    />
                </td>
                <td className="sticky left-0 z-10 bg-surface px-3 py-2">
                    <div className="flex items-start gap-2">
                        <span className="pt-1 text-xs text-gray-400 dark:text-gray-500">
                            #{action.seqId || "-"}
                        </span>
                        <textarea
                            defaultValue={action.action}
                            key={`act-${action.id}-${action.action}`}
                            onBlur={(e) => {
                                if (e.target.value !== action.action) {
                                    api.updateField(action, "action", e.target.value);
                                }
                            }}
                            onInput={(e) => autoResize(e.target)}
                            ref={(el) => {
                                if (el) setTimeout(() => autoResize(el), 0);
                            }}
                            rows={1}
                            aria-label="Descripción de la acción"
                            className="w-full resize-none overflow-hidden rounded border-0 bg-transparent px-1 py-0.5 text-gray-800 focus:ring-1 focus:ring-brand-400 dark:text-gray-100"
                        />
                    </div>
                </td>
                <td className="px-3 py-2">
                    <MultiCheckDropdown
                        options={assigneeOptions}
                        selected={action.assignedUsers || []}
                        onChange={(selected) => api.changeAssignees(action, selected)}
                        placeholder="Sin asignar"
                        className="min-w-[130px] border-0 bg-transparent px-1 py-0.5 hover:bg-surface-2"
                    />
                </td>
                <td className="px-3 py-2">
                    <StatusSelect
                        statuses={statuses}
                        value={action.status}
                        onChange={(statusId) => api.changeStatus(action, statusId)}
                        className="w-full min-w-[120px]"
                    />
                </td>
                {isColumnVisible("phase") && (
                    <td className="px-2 py-2">
                        <PhaseSelect
                            value={action.phase || ""}
                            onChange={(v) => api.updateField(action, "phase", v || null)}
                        />
                    </td>
                )}
                {showDateColumn && (
                    <td className="px-2 py-2 text-xs">
                        {summaryDateRaw ? (
                            <span className={cn(summaryDateOverdue && "font-semibold text-red-600")}>
                                {formatShortDate(summaryDateRaw)}
                            </span>
                        ) : (
                            <span className="text-gray-300 dark:text-gray-600">–</span>
                        )}
                    </td>
                )}
                <td className="px-2 py-2">
                    <div className="flex items-center justify-end gap-1">
                        {isColumnVisible("subactions") && subactionCount > 0 && (
                            <span
                                className="inline-flex items-center gap-0.5 rounded-full bg-surface-2 px-1.5 py-0.5 text-[10px] text-gray-500 dark:text-gray-400"
                                title={`${subactionCount} subacción(es)`}
                            >
                                <ListTodo className="h-3 w-3" /> {subactionCount}
                            </span>
                        )}
                        {isColumnVisible("attachments") && attachmentCount > 0 && (
                            <span
                                className="inline-flex items-center gap-0.5 rounded-full bg-surface-2 px-1.5 py-0.5 text-[10px] text-gray-500 dark:text-gray-400"
                                title={`${attachmentCount} adjunto(s)`}
                            >
                                <Paperclip className="h-3 w-3" /> {attachmentCount}
                            </span>
                        )}
                        {isColumnVisible("comments") && commentsCount > 0 && (
                            <span
                                className="inline-flex items-center gap-0.5 rounded-full bg-surface-2 px-1.5 py-0.5 text-[10px] text-gray-500 dark:text-gray-400"
                                title={`${commentsCount} comentario(s)`}
                            >
                                <MessageSquare className="h-3 w-3" /> {commentsCount}
                            </span>
                        )}
                        <button
                            type="button"
                            onClick={onToggleExpand}
                            aria-label={expanded ? "Ocultar detalles" : "Ver más detalles"}
                            aria-expanded={expanded}
                            className={cn(
                                "rounded p-1 transition",
                                expanded
                                    ? "bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-400"
                                    : "text-gray-400 hover:bg-surface-2 hover:text-gray-600 dark:hover:text-gray-300"
                            )}
                        >
                            <ChevronDown className={cn("h-4 w-4 transition-transform", expanded && "rotate-180")} />
                        </button>
                    </div>
                </td>
                <td className="px-3 py-2">
                    <button
                        type="button"
                        onClick={() => api.deleteAction(action)}
                        aria-label="Eliminar acción"
                        className="text-red-400 hover:text-red-600"
                    >
                        <Trash2 className="h-4 w-4" />
                    </button>
                </td>
            </tr>

            {expanded && (
                <tr className="bg-surface-2/40">
                    <td colSpan={totalColumns} className="space-y-4 px-6 py-4">
                        {anyDetailVisible && (
                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                                {DATE_FIELDS.filter(({ field }) => isColumnVisible(field)).map(({ field, label }) => (
                                    <Field key={field} label={label}>
                                        <input
                                            type="date"
                                            defaultValue={action[field] || ""}
                                            key={`${field}-${action.id}-${action[field] || ""}`}
                                            onChange={(e) => api.updateField(action, field, e.target.value)}
                                            className={cn(
                                                "input py-1.5 text-xs",
                                                field === "proposedEndDate" &&
                                                    isBeforeToday(action.proposedEndDate) &&
                                                    !closed &&
                                                    "font-semibold text-red-600"
                                            )}
                                        />
                                    </Field>
                                ))}
                            </div>
                        )}

                        {isColumnVisible("observations") && (
                            <Field label="Observaciones">
                                <textarea
                                    defaultValue={action.observations || ""}
                                    key={`obs-${action.id}-${action.observations || ""}`}
                                    onBlur={(e) => {
                                        if (e.target.value !== (action.observations || "")) {
                                            api.updateField(action, "observations", e.target.value);
                                        }
                                    }}
                                    rows={2}
                                    placeholder="Escribe observaciones..."
                                    className="input resize-none text-sm"
                                />
                            </Field>
                        )}

                        {isColumnVisible("subactions") && (
                            <div>
                                <p className="mb-2 text-xs font-semibold text-gray-600 dark:text-gray-300">
                                    Subacciones {subactionCount > 0 && `(${subactionCount})`}
                                </p>
                                <SubactionsPanel
                                    action={action}
                                    statuses={statuses}
                                    userOptions={projectUserOptions}
                                    onChangeSubactions={(next) => api.updateSubactions(action, next)}
                                />
                            </div>
                        )}

                        {isColumnVisible("attachments") && (
                            <div className="max-w-2xl">
                                <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-gray-600 dark:text-gray-300">
                                    Archivos adjuntos {attachmentCount > 0 && `(${attachmentCount})`}
                                </div>
                                <ActionAttachments projectId={projectId} actionId={action.id} userId={currentUserId} />
                            </div>
                        )}

                        {isColumnVisible("comments") && (
                            <div className="max-w-2xl">
                                <p className="mb-2 text-xs font-semibold text-gray-600 dark:text-gray-300">
                                    Comentarios {commentsCount > 0 && `(${commentsCount})`}
                                </p>
                                <ActionComments
                                    projectId={projectId}
                                    action={action}
                                    projectUsers={projectUsers}
                                    projectTitle={projectTitle}
                                />
                            </div>
                        )}
                    </td>
                </tr>
            )}
        </Fragment>
    );
}
