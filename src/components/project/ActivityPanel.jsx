import { PlusCircle, Pencil, Trash2, RefreshCw, MessageSquare, Paperclip, FolderCog, History } from "lucide-react";
import Modal from "../ui/Modal";
import EmptyState from "../ui/EmptyState";
import { SkeletonRows } from "../ui/Skeleton";
import useRealtimeSubscription from "../../hooks/useRealtimeSubscription";
import { subscribeToActivity } from "../../services/activityService";
import { formatRelativeTime } from "../../lib/dates";

const TYPE_CONFIG = {
    action_created: { icon: PlusCircle, color: "text-green-600 dark:text-green-400", label: "creó la acción" },
    action_updated: { icon: Pencil, color: "text-brand-600 dark:text-brand-400", label: "editó la acción" },
    action_deleted: { icon: Trash2, color: "text-red-600 dark:text-red-400", label: "eliminó la acción" },
    status_changed: { icon: RefreshCw, color: "text-amber-600 dark:text-amber-400", label: "cambió el estado" },
    comment_added: { icon: MessageSquare, color: "text-brand-600 dark:text-brand-400", label: "comentó" },
    attachment_added: { icon: Paperclip, color: "text-gray-600 dark:text-gray-300", label: "subió un adjunto" },
    attachment_deleted: { icon: Paperclip, color: "text-gray-500 dark:text-gray-400", label: "eliminó un adjunto" },
    project_updated: { icon: FolderCog, color: "text-brand-600 dark:text-brand-400", label: "editó el proyecto" },
};

const FIELD_LABELS = {
    action: "descripción",
    assignedUsers: "responsables",
    proposedStartDate: "fecha inicio propuesta",
    proposedEndDate: "fecha fin propuesta",
    startDate: "fecha inicio real",
    actualEndDate: "fecha fin real",
    observations: "observaciones",
    subactions: "subacciones",
    orden: "orden",
    priority: "prioridad",
    phase: "fase",
    status: "estado",
    labels: "etiquetas",
};

function describe(entry) {
    const cfg = TYPE_CONFIG[entry.type] || { label: entry.type };
    let extra = "";
    if (entry.type === "status_changed" && entry.detail?.from) {
        extra = `: ${entry.detail.from} → ${entry.detail.to}`;
    } else if (entry.type === "action_updated" && entry.detail?.fields?.length) {
        const names = entry.detail.fields.map((f) => FIELD_LABELS[f] || f);
        extra = ` (${names.join(", ")})`;
    } else if (entry.detail?.text) {
        extra = `: "${entry.detail.text}"`;
    }
    return `${cfg.label}${extra}`;
}

export default function ActivityPanel({ open, onClose, projectId }) {
    const { data: entries, loading } = useRealtimeSubscription(
        (onData, onError) => subscribeToActivity(projectId, onData, onError),
        [projectId],
        { enabled: open && !!projectId }
    );

    return (
        <Modal open={open} onClose={onClose} title="Actividad del proyecto" size="lg">
            {loading ? (
                <SkeletonRows rows={5} />
            ) : entries.length === 0 ? (
                <EmptyState
                    icon={History}
                    title="Sin actividad registrada"
                    description="Los cambios en acciones, comentarios y adjuntos aparecerán aquí."
                    className="border-0 shadow-none"
                />
            ) : (
                <ol className="space-y-1">
                    {entries.map((entry) => {
                        const cfg = TYPE_CONFIG[entry.type] || TYPE_CONFIG.action_updated;
                        const Icon = cfg.icon || History;
                        return (
                            <li key={entry.id} className="flex items-start gap-3 rounded-lg px-2 py-2 hover:bg-surface-2/60">
                                <Icon className={`mt-0.5 h-4 w-4 flex-shrink-0 ${cfg.color || ""}`} />
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm text-gray-800 dark:text-gray-100">
                                        <span className="font-medium">{entry.actorName || "Alguien"}</span>{" "}
                                        {describe(entry)}
                                        {entry.actionSeqId ? (
                                            <span className="text-gray-500 dark:text-gray-400"> · #{entry.actionSeqId}</span>
                                        ) : null}
                                    </p>
                                    <p className="text-xs text-gray-400 dark:text-gray-500">
                                        {formatRelativeTime(entry.createdAt)}
                                    </p>
                                </div>
                            </li>
                        );
                    })}
                </ol>
            )}
        </Modal>
    );
}
