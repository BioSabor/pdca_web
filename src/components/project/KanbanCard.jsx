import { MessageSquare, Paperclip, GripVertical } from "lucide-react";
import PriorityBadge from "../ui/PriorityBadge";
import { getPhaseConfig } from "../../lib/pdca";
import { isBeforeToday, formatShortDate } from "../../lib/dates";
import { cn } from "../../lib/utils";

export default function KanbanCard({
    action,
    getUserName,
    attachmentCount = 0,
    onDragStart,
    onDragEnd,
    dragging,
    highlight,
}) {
    const phase = getPhaseConfig(action.phase);
    const overdue = isBeforeToday(action.proposedEndDate);
    const assignees = (action.assignedUsers || []).slice(0, 3);
    const extraAssignees = (action.assignedUsers || []).length - assignees.length;

    return (
        <div
            draggable
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            className={cn(
                "card cursor-grab space-y-2 p-3 active:cursor-grabbing",
                dragging && "opacity-40",
                highlight && "ring-2 ring-brand-500"
            )}
        >
            <div className="flex items-start gap-1.5">
                <GripVertical className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-gray-300 dark:text-gray-600" aria-hidden="true" />
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
