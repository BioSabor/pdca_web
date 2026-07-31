import { Fragment } from "react";
import { Eye, EyeOff, Plus, Trash2, Paperclip, MessageSquare } from "lucide-react";
import MultiCheckDropdown from "../ui/MultiCheckDropdown";
import AttachmentToggleButton from "../AttachmentToggleButton";
import ActionAttachments from "../ActionAttachments";
import ActionComments from "./ActionComments";
import PrioritySelect from "./PrioritySelect";
import PhaseSelect from "./PhaseSelect";
import StatusSelect from "./StatusSelect";
import SubactionsPanel from "./SubactionsPanel";
import { getStatusConfig } from "../../lib/status";
import { isClosedStatus } from "../../lib/progress";
import { isBeforeToday } from "../../lib/dates";
import { normalizePriority } from "../../lib/priority";
import { cn } from "../../lib/utils";

function autoResize(el) {
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
}

const DATE_LABELS = {
    proposedStartDate: "Fecha inicio propuesta",
    proposedEndDate: "Fecha fin propuesta",
    startDate: "Fecha inicio real",
    actualEndDate: "Fecha fin real",
};

/**
 * Fila de la tabla de acciones con edición inline en tiempo real.
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
    expandedObs,
    expandedSubs,
    expandedAtts,
    expandedComments,
    onToggleObs,
    onToggleSubs,
    onToggleAtts,
    onToggleComments,
    highlighted,
    rowRef,
    projectId,
    currentUserId,
    projectUsers,
    projectTitle,
}) {
    const statusCfg = getStatusConfig(statuses, action.status);
    const closed = isClosedStatus(statusCfg);
    const priority = normalizePriority(action.priority);
    const subactionCount = (action.subactions || []).length;
    const hasObservations = (action.observations || "").trim().length > 0;

    const dateCell = (field, { overdue = false } = {}) => (
        <td className="px-1 py-2">
            <input
                type="date"
                defaultValue={action[field] || ""}
                key={`${field}-${action.id}-${action[field] || ""}`}
                onChange={(e) => api.updateField(action, field, e.target.value)}
                aria-label={DATE_LABELS[field]}
                className={cn(
                    "w-full rounded border-0 bg-transparent p-0 text-xs focus:ring-1 focus:ring-brand-400",
                    overdue ? "font-semibold text-red-600" : "text-gray-700 dark:text-gray-200"
                )}
            />
        </td>
    );

    return (
        <Fragment>
            <tr
                ref={rowRef}
                className={cn(
                    "transition hover:bg-surface-2/60",
                    priority === "high" && "bg-red-50/50 dark:bg-red-900/10",
                    highlighted && "ring-2 ring-inset ring-brand-500"
                )}
            >
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
                {isColumnVisible("proposedStartDate") && dateCell("proposedStartDate")}
                {isColumnVisible("proposedEndDate") &&
                    dateCell("proposedEndDate", {
                        overdue: isBeforeToday(action.proposedEndDate) && !closed,
                    })}
                {isColumnVisible("startDate") && dateCell("startDate")}
                {isColumnVisible("actualEndDate") && dateCell("actualEndDate")}
                {isColumnVisible("observations") && (
                    <td className="px-2 py-2">
                        <textarea
                            defaultValue={action.observations || ""}
                            key={`obsc-${action.id}-${action.observations || ""}`}
                            onBlur={(e) => {
                                if (e.target.value !== (action.observations || "")) {
                                    api.updateField(action, "observations", e.target.value);
                                }
                            }}
                            onInput={(e) => autoResize(e.target)}
                            ref={(el) => {
                                if (el) setTimeout(() => autoResize(el), 0);
                            }}
                            rows={1}
                            placeholder="Observaciones..."
                            aria-label="Observaciones"
                            className="w-full min-w-[140px] resize-none overflow-hidden rounded border-0 bg-transparent px-1 py-0.5 text-xs text-gray-700 focus:ring-1 focus:ring-brand-400 dark:text-gray-200"
                        />
                    </td>
                )}
                <td className="px-1 py-2 text-center">
                    <button
                        type="button"
                        onClick={onToggleObs}
                        aria-label={expandedObs ? "Ocultar observaciones" : "Ver observaciones"}
                        aria-expanded={expandedObs}
                        className={cn(
                            "rounded p-1 transition",
                            hasObservations
                                ? "text-brand-500 hover:bg-brand-50 hover:text-brand-700 dark:hover:bg-brand-900/30"
                                : "text-gray-300 hover:bg-surface-2 hover:text-gray-500 dark:text-gray-600 dark:hover:text-gray-400"
                        )}
                    >
                        {hasObservations ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </button>
                </td>
                {isColumnVisible("subactions") && (
                    <td className="px-1 py-2 text-center">
                        <button
                            type="button"
                            onClick={onToggleSubs}
                            aria-label={`Subacciones (${subactionCount})`}
                            aria-expanded={expandedSubs}
                            className="rounded p-1 text-gray-500 transition hover:bg-brand-50 hover:text-brand-600 dark:text-gray-400 dark:hover:bg-brand-900/30 dark:hover:text-brand-300"
                        >
                            {subactionCount > 0 ? (
                                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-xs text-white">
                                    {subactionCount}
                                </span>
                            ) : (
                                <Plus className="h-4 w-4" />
                            )}
                        </button>
                    </td>
                )}
                {isColumnVisible("attachments") && (
                    <td className="px-1 py-2 text-center">
                        <AttachmentToggleButton
                            count={attachmentCount}
                            isExpanded={expandedAtts}
                            onClick={onToggleAtts}
                        />
                    </td>
                )}
                {isColumnVisible("comments") && (
                    <td className="px-1 py-2 text-center">
                        <button
                            type="button"
                            onClick={onToggleComments}
                            aria-label={`Comentarios (${action.commentsCount || 0})`}
                            aria-expanded={expandedComments}
                            className={cn(
                                "relative rounded p-1 transition",
                                (action.commentsCount || 0) > 0
                                    ? "text-brand-500 hover:bg-brand-50 hover:text-brand-700 dark:hover:bg-brand-900/30"
                                    : "text-gray-300 hover:bg-surface-2 hover:text-gray-500 dark:text-gray-600 dark:hover:text-gray-400"
                            )}
                        >
                            <MessageSquare className="h-4 w-4" />
                            {(action.commentsCount || 0) > 0 && (
                                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-600 px-0.5 text-[10px] font-bold leading-none text-white">
                                    {action.commentsCount}
                                </span>
                            )}
                        </button>
                    </td>
                )}
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

            {expandedObs && (
                <tr className="bg-brand-50/30 dark:bg-brand-900/10">
                    <td colSpan={totalColumns} className="px-6 py-3">
                        <div className="flex items-start gap-2">
                            <span className="flex-shrink-0 pt-1.5 text-xs font-medium text-gray-500 dark:text-gray-400">
                                Observaciones:
                            </span>
                            <textarea
                                defaultValue={action.observations || ""}
                                key={`obs-${action.id}-${action.observations || ""}`}
                                onBlur={(e) => {
                                    if (e.target.value !== (action.observations || "")) {
                                        api.updateField(action, "observations", e.target.value);
                                    }
                                }}
                                onInput={(e) => autoResize(e.target)}
                                ref={(el) => {
                                    if (el) setTimeout(() => autoResize(el), 0);
                                }}
                                rows={2}
                                placeholder="Escribe observaciones..."
                                aria-label="Observaciones"
                                className="input flex-1 resize-none overflow-hidden"
                            />
                        </div>
                    </td>
                </tr>
            )}

            {expandedAtts && (
                <tr className="bg-surface-2/40">
                    <td colSpan={totalColumns} className="px-6 py-3">
                        <div className="max-w-2xl">
                            <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-gray-600 dark:text-gray-300">
                                <Paperclip className="h-3.5 w-3.5" /> Archivos adjuntos
                            </div>
                            <ActionAttachments
                                projectId={projectId}
                                actionId={action.id}
                                userId={currentUserId}
                            />
                        </div>
                    </td>
                </tr>
            )}

            {expandedSubs && (
                <tr className="bg-surface-2/40">
                    <td colSpan={totalColumns} className="px-6 py-4">
                        <SubactionsPanel
                            action={action}
                            statuses={statuses}
                            userOptions={projectUserOptions}
                            onChangeSubactions={(next) => api.updateSubactions(action, next)}
                        />
                    </td>
                </tr>
            )}

            {expandedComments && (
                <tr className="bg-surface-2/40">
                    <td colSpan={totalColumns} className="px-6 py-4">
                        <div className="max-w-2xl">
                            <ActionComments
                                projectId={projectId}
                                action={action}
                                projectUsers={projectUsers}
                                projectTitle={projectTitle}
                            />
                        </div>
                    </td>
                </tr>
            )}
        </Fragment>
    );
}
