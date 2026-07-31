import { useMemo } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, CalendarClock, CalendarDays, CalendarX2, ListTodo, Inbox } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import useRealtimeMyActions from "../hooks/useRealtimeMyActions";
import useRealtimeProjects from "../hooks/useRealtimeProjects";
import useRealtimeStatuses from "../hooks/useRealtimeStatuses";
import PageContainer from "../components/ui/PageContainer";
import { SkeletonRows } from "../components/ui/Skeleton";
import EmptyState from "../components/ui/EmptyState";
import ErrorState from "../components/ui/ErrorState";
import PriorityBadge from "../components/ui/PriorityBadge";
import { useToast } from "../components/ui/Toast";
import { actionEvents } from "../services/actionEvents";
import { getStatusConfig, getStatusStyle } from "../lib/status";
import { isClosedStatus } from "../lib/progress";
import { priorityWeight } from "../lib/priority";
import { getPhaseConfig } from "../lib/pdca";
import { todayLocalISO, endOfWeekISO, formatShortDate } from "../lib/dates";

const GROUP_DEFS = [
    { id: "overdue", label: "Vencidas", icon: AlertTriangle, accent: "text-red-600 dark:text-red-400" },
    { id: "today", label: "Hoy", icon: CalendarClock, accent: "text-amber-600 dark:text-amber-400" },
    { id: "week", label: "Esta semana", icon: CalendarDays, accent: "text-brand-600 dark:text-brand-400" },
    { id: "later", label: "Más adelante", icon: ListTodo, accent: "text-gray-600 dark:text-gray-300" },
    { id: "nodate", label: "Sin fecha", icon: CalendarX2, accent: "text-gray-500 dark:text-gray-400" },
];

export default function MyTasks() {
    const { currentUser } = useAuth();
    const toast = useToast();
    const { actions, loading: loadingActions, error, retry } = useRealtimeMyActions(currentUser?.uid);
    const { projects, loading: loadingProjects } = useRealtimeProjects(currentUser?.uid);
    const { statuses, loading: loadingStatuses } = useRealtimeStatuses();

    const loading = loadingActions || loadingProjects || loadingStatuses;

    const projectsById = useMemo(() => {
        const map = {};
        projects.forEach((p) => (map[p.id] = p));
        return map;
    }, [projects]);

    const groups = useMemo(() => {
        const today = todayLocalISO();
        const weekEnd = endOfWeekISO();
        const result = { overdue: [], today: [], week: [], later: [], nodate: [] };

        for (const action of actions) {
            // Fuera: cerradas (terminadas/descartadas) y proyectos archivados
            if (isClosedStatus(getStatusConfig(statuses, action.status))) continue;
            const project = projectsById[action.projectId];
            if (project?.archived) continue;

            const due = action.proposedEndDate;
            if (!due) result.nodate.push(action);
            else if (due < today) result.overdue.push(action);
            else if (due === today) result.today.push(action);
            else if (due <= weekEnd) result.week.push(action);
            else result.later.push(action);
        }

        // Dentro de cada grupo: prioridad desc, luego fecha asc
        const sortFn = (a, b) =>
            priorityWeight(b.priority) - priorityWeight(a.priority) ||
            (a.proposedEndDate || "9999").localeCompare(b.proposedEndDate || "9999");
        Object.values(result).forEach((list) => list.sort(sortFn));
        return result;
    }, [actions, statuses, projectsById]);

    const totalOpen = GROUP_DEFS.reduce((sum, g) => sum + groups[g.id].length, 0);

    async function handleStatusChange(action, statusId) {
        const statusCfg = getStatusConfig(statuses, statusId);
        try {
            await actionEvents.changeStatus(
                {
                    actorId: currentUser.uid,
                    actorName: currentUser.displayName || currentUser.email,
                    projectTitle: projectsById[action.projectId]?.title || "",
                },
                action.projectId,
                action,
                statusCfg
            );
        } catch (err) {
            console.error(err);
            toast.error("No se pudo cambiar el estado");
        }
    }

    if (error) {
        return (
            <PageContainer title="Mis Tareas" maxWidth="4xl">
                <ErrorState
                    error={error}
                    onRetry={retry}
                    title={
                        error?.code === "failed-precondition"
                            ? "Falta un índice de Firestore"
                            : undefined
                    }
                />
                {error?.code === "failed-precondition" && (
                    <p className="mt-3 text-center text-sm text-gray-500 dark:text-gray-400">
                        Despliega los índices del repositorio:{" "}
                        <code className="rounded bg-surface-2 px-1">npx firebase deploy --only firestore:indexes</code>
                    </p>
                )}
            </PageContainer>
        );
    }

    return (
        <PageContainer
            title="Mis Tareas"
            subtitle={loading ? undefined : `${totalOpen} acción(es) abiertas asignadas a ti`}
            maxWidth="4xl"
        >
            {loading ? (
                <SkeletonRows rows={6} />
            ) : totalOpen === 0 ? (
                <EmptyState
                    icon={Inbox}
                    title="No tienes acciones pendientes"
                    description="Cuando te asignen acciones en cualquier proyecto aparecerán aquí, ordenadas por vencimiento."
                />
            ) : (
                <div className="space-y-6">
                    {GROUP_DEFS.map((groupDef) => {
                        const list = groups[groupDef.id];
                        if (list.length === 0) return null;
                        const Icon = groupDef.icon;
                        return (
                            <section key={groupDef.id}>
                                <h2 className={`mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide ${groupDef.accent}`}>
                                    <Icon className="h-4 w-4" />
                                    {groupDef.label}
                                    <span className="badge bg-surface-2 font-normal normal-case text-gray-500 dark:text-gray-300">
                                        {list.length}
                                    </span>
                                </h2>
                                <div className="card divide-y divide-line">
                                    {list.map((action) => (
                                        <TaskRow
                                            key={`${action.projectId}-${action.id}`}
                                            action={action}
                                            project={projectsById[action.projectId]}
                                            statuses={statuses}
                                            overdue={groupDef.id === "overdue"}
                                            onStatusChange={handleStatusChange}
                                        />
                                    ))}
                                </div>
                            </section>
                        );
                    })}
                </div>
            )}
        </PageContainer>
    );
}

function TaskRow({ action, project, statuses, overdue, onStatusChange }) {
    const phase = getPhaseConfig(action.phase);
    return (
        <div className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:gap-3">
            <div className="min-w-0 flex-1">
                <Link
                    to={`/projects/${action.projectId}?action=${action.id}`}
                    className="block truncate text-sm font-medium text-gray-800 hover:text-brand-600 dark:text-gray-100 dark:hover:text-brand-400"
                    title={action.action}
                >
                    {action.seqId ? `#${action.seqId} · ` : ""}{action.action}
                </Link>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                    <span className="truncate">{project?.title || "Proyecto"}</span>
                    {phase && (
                        <span
                            className="badge"
                            style={{ backgroundColor: `${phase.color}22`, color: phase.color }}
                        >
                            {phase.label}
                        </span>
                    )}
                    <PriorityBadge priority={action.priority} showLabel={false} />
                    {action.proposedEndDate && (
                        <span className={overdue ? "font-medium text-red-600 dark:text-red-400" : ""}>
                            {formatShortDate(action.proposedEndDate)}
                        </span>
                    )}
                </div>
            </div>
            <select
                value={action.status || ""}
                onChange={(e) => onStatusChange(action, e.target.value)}
                aria-label={`Estado de la acción ${action.action}`}
                className="w-full flex-shrink-0 cursor-pointer rounded-lg border-0 px-2 py-1.5 text-xs font-medium sm:w-44"
                style={getStatusStyle(statuses, action.status)}
            >
                {statuses.map((s) => (
                    <option key={s.id} value={s.id}>
                        {s.label}
                    </option>
                ))}
            </select>
        </div>
    );
}
