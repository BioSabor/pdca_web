import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, UserPlus, MessageSquare, AtSign, RefreshCw, CheckCheck } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import useRealtimeSubscription from "../../hooks/useRealtimeSubscription";
import {
    subscribeToMyNotifications,
    markAsRead,
    markAllAsRead,
    pruneOld,
} from "../../services/notificationService";
import Popover from "../ui/Popover";
import { formatRelativeTime } from "../../lib/dates";
import { cn } from "../../lib/utils";

const TYPE_ICONS = {
    assigned: UserPlus,
    comment: MessageSquare,
    mention: AtSign,
    status_change: RefreshCw,
};

export default function NotificationBell() {
    const { currentUser } = useAuth();
    const navigate = useNavigate();
    const [open, setOpen] = useState(false);
    const btnRef = useRef(null);
    const prunedRef = useRef(false);

    const { data: notifications } = useRealtimeSubscription(
        (onData, onError) => subscribeToMyNotifications(currentUser?.uid, onData, onError),
        [currentUser?.uid],
        { enabled: !!currentUser?.uid }
    );

    const unreadCount = notifications.filter((n) => !n.read).length;

    // Limpieza oportunista de notificaciones antiguas al abrir el panel
    useEffect(() => {
        if (open && !prunedRef.current && currentUser?.uid) {
            prunedRef.current = true;
            pruneOld(currentUser.uid);
        }
    }, [open, currentUser?.uid]);

    function handleClick(notification) {
        if (!notification.read) markAsRead(notification.id).catch(console.error);
        setOpen(false);
        if (notification.projectId) {
            navigate(
                notification.actionId
                    ? `/projects/${notification.projectId}?action=${notification.actionId}`
                    : `/projects/${notification.projectId}`
            );
        }
    }

    return (
        <>
            <button
                ref={btnRef}
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="btn-icon btn-ghost relative"
                aria-label={
                    unreadCount > 0
                        ? `Notificaciones: ${unreadCount} sin leer`
                        : "Notificaciones"
                }
                aria-expanded={open}
            >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white">
                        {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                )}
            </button>
            <Popover
                open={open}
                onClose={() => setOpen(false)}
                anchorRef={btnRef}
                minWidth={320}
                className="max-h-[70dvh] w-80 max-w-[calc(100vw-1rem)]"
            >
                <div className="flex items-center justify-between border-b border-line px-3 py-2">
                    <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                        Notificaciones
                    </span>
                    {unreadCount > 0 && (
                        <button
                            type="button"
                            onClick={() => markAllAsRead(notifications).catch(console.error)}
                            className="flex items-center gap-1 text-xs text-brand-600 hover:underline dark:text-brand-400"
                        >
                            <CheckCheck className="h-3.5 w-3.5" />
                            Marcar todas leídas
                        </button>
                    )}
                </div>
                {notifications.length === 0 ? (
                    <p className="px-3 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                        No tienes notificaciones
                    </p>
                ) : (
                    notifications.map((n) => {
                        const Icon = TYPE_ICONS[n.type] || Bell;
                        return (
                            <button
                                key={n.id}
                                type="button"
                                onClick={() => handleClick(n)}
                                className={cn(
                                    "flex w-full items-start gap-3 border-b border-line px-3 py-2.5 text-left last:border-b-0 hover:bg-surface-2",
                                    !n.read && "bg-brand-50/60 dark:bg-brand-900/15"
                                )}
                            >
                                <Icon className="mt-0.5 h-4 w-4 flex-shrink-0 text-brand-600 dark:text-brand-400" />
                                <span className="min-w-0 flex-1">
                                    <span className="block text-sm text-gray-800 dark:text-gray-100">
                                        {n.message}
                                    </span>
                                    <span className="mt-0.5 block truncate text-xs text-gray-500 dark:text-gray-400">
                                        {n.projectTitle}
                                        {n.actionText ? ` · ${n.actionText}` : ""}
                                    </span>
                                    <span className="mt-0.5 block text-xs text-gray-400 dark:text-gray-500">
                                        {formatRelativeTime(n.createdAt)}
                                    </span>
                                </span>
                                {!n.read && (
                                    <span
                                        className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-brand-500"
                                        aria-hidden="true"
                                    />
                                )}
                            </button>
                        );
                    })
                )}
            </Popover>
        </>
    );
}
