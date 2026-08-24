import { MessageSquare, Paperclip, GripVertical } from "lucide-react";
import PriorityBadge from "../ui/PriorityBadge";
import { getPhaseConfig } from "../../lib/pdca";
import { isBeforeToday, formatShortDate } from "../../lib/dates";
import { cn } from "../../lib/utils";

export default function KanbanCard({
    action,
    getUserName,
    attachmentCount = 0,
    cardProps,
    handleProps,
    dragging,
    preview,
    highlight,
}) {
    const phase = getPhaseConfig(action.phase);
    const overdue = isBeforeToday(action.proposedEndDate);
    const assignees = (action.assignedUsers || []).slice(0, 3);
    const extraAssignees = (action.assignedUsers || []).length - assignees.length;

    return (
        <div
            data-kanban-card={action.id}
            {...cardProps}
            className={cn(
                "card touch-manipulation space-y-2 p-3",
                cardProps && "cursor-grab active:cursor-grabbing",
                dragging && "opacity-30",
                preview && "pointer-events-none rotate-1 scale-[1.02] shadow-card-hover ring-2 ring-brand-500",
                highlight && "ring-2 ring-brand-500"
            )}
        >
            <div className="flex items-start gap-1.5">
                <span
                    {...handleProps}
                    role={handleProps ? "button" : undefined}
                    tabIndex={handleProps ? -1 : undefined}
                    aria-label={handleProps ? "Arrastrar tarjeta" : undefined}
                    title={handleProps ? "Arrastra para cambiar de columna" : undefined}
                    className={cn(
                        "-my-1 -ml-1 flex flex-shrink-0 items-center justify-center rounded-lg py-1 text-gray-300 dark:text-gray-600",
                        handleProps
                            ? "w-7 cursor-grab touch-none active:cursor-grabbing active:bg-surface-2 active:text-brand-500 sm:w-5"
                            : "w-5"
                    )}
                >
                    <GripVertical className="h-4 w-4" aria-hidden="true" />
                </span>
                <p className="min-w-0 flex-1 text-sm text-gray-800 dark:text-gray-100">
                    {action.seqId ? (
                        <span className="mr-1 text-xs text-gray-400 dark:text-gray-500">#{action.seqId}</span>
                    ) : null}
                    {action.action}
                </p>
            </div>

            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <PriorityBadge priority={action.priority} showLabel={false} />
                {phase && (
                    <span className="badge" style={{ backgroundColor: `${phase.color}22`, color: phase.color }}>
                        {phase.label}
                    </span>
                )}
                {action.proposedEndDate && (
                    <span
                        className={cn(
                            "text-xs",
                            overdue ? "font-medium text-red-600 dark:text-red-400" : "text-gray-500 dark:text-gray-400"
                        )}
                    >
                        {formatShortDate(action.proposedEndDate)}
                    </span>
                )}
                {(action.commentsCount || 0) > 0 && (
                    <span className="flex items-center gap-0.5 text-xs text-gray-400 dark:text-gray-500">
                        <MessageSquare className="h-3 w-3" />
                        {action.commentsCount}
                    </span>
                )}
                {attachmentCount > 0 && (
                    <span className="flex items-center gap-0.5 text-xs text-gray-400 dark:text-gray-500">
                        <Paperclip className="h-3 w-3" />
                        {attachmentCount}
                    </span>
                )}
            </div>

            {assignees.length > 0 && (
                <div className="flex items-center gap-1">
                    {assignees.map((userId) => {
                        const name = getUserName(userId);
                        return (
                            <span
                                key={userId}
                                title={name}
                                className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-100 text-[11px] font-medium text-brand-700 dark:bg-brand-900/40 dark:text-brand-300"
                            >
                                {name.charAt(0).toUpperCase()}
                            </span>
                        );
                    })}
                    {extraAssignees > 0 && (
                        <span className="text-xs text-gray-400 dark:text-gray-500">+{extraAssignees}</span>
                    )}
                </div>
            )}
        </div>
    );
}
