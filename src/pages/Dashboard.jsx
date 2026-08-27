import { useState, useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import { projectService } from "../services/projectService";
import { Link } from "react-router-dom";
import { Plus, Users, AlertTriangle, Clock, Archive, Building2, Search, CheckCircle, ListTodo, ArrowRight } from "lucide-react";
import useRealtimeProjects from "../hooks/useRealtimeProjects";
import useActionsForProjects from "../hooks/useActionsForProjects";
import useRealtimeStatuses from "../hooks/useRealtimeStatuses";
import useRealtimeUsers from "../hooks/useRealtimeUsers";
import useRealtimeDepartments from "../hooks/useRealtimeDepartments";
import ProjectCard from "../components/dashboard/ProjectCard";
import { StatTile, WeekStat } from "../components/dashboard/StatTile";
import { Skeleton, SkeletonCard } from "../components/ui/Skeleton";
import EmptyState from "../components/ui/EmptyState";
import ErrorState from "../components/ui/ErrorState";
import { useToast } from "../components/ui/Toast";
import { useConfirm } from "../components/ui/ConfirmDialog";
import { getStatusConfig } from "../lib/status";
import { isClosedStatus, computeProgress } from "../lib/progress";
import { isHighlighted } from "../lib/priority";
import { normalizeText } from "../lib/utils";
import { todayLocalISO, endOfWeekISO } from "../lib/dates";

const SORT_OPTIONS = [
    { id: "recent", label: "Más recientes" },
    { id: "name", label: "Nombre" },
    { id: "progress", label: "Progreso" },
];

export default function Dashboard() {
    const { currentUser } = useAuth();
    const toast = useToast();
    const confirm = useConfirm();
    const [showArchived, setShowArchived] = useState(false);
    const [search, setSearch] = useState("");
    const [sortBy, setSortBy] = useState(
        () => localStorage.getItem(`pdca_dashboard_sort_${currentUser?.uid}`) || "recent"
    );

    // Suscripciones acotadas: solo los proyectos del usuario y SUS acciones
    // (antes se descargaban todas las acciones de la organización)
    const { projects, loading: loadingProjects, error: errorProjects, retry } = useRealtimeProjects(currentUser?.uid);
    const projectIds = useMemo(() => projects.map((p) => p.id), [projects]);
    const { actions: allActions, loading: loadingActions } = useActionsForProjects(projectIds);
    const { statuses, loading: loadingStatuses } = useRealtimeStatuses();
    const { users: allUsers } = useRealtimeUsers();
    const { departments, loading: loadingDepts } = useRealtimeDepartments();

    const loading = loadingProjects || loadingActions || loadingStatuses || loadingDepts;

    // Los proyectos archivados no computan en estadísticas ni pendientes
    const activeProjects = useMemo(() => projects.filter((p) => !p.archived), [projects]);
    const archivedProjectIds = useMemo(
        () => new Set(projects.filter((p) => p.archived).map((p) => p.id)),
        [projects]
    );

    const { projectStats, globalStats } = useMemo(() => {
        if (!currentUser || projects.length === 0) {
            return { projectStats: {}, globalStats: { totalPending: 0, totalPriority: 0 } };
        }
        const stats = {};
        let totalPending = 0;
        let totalPriority = 0;

        const actionsByProject = {};
        allActions.forEach((a) => {
            if (!a.projectId) return;
            (actionsByProject[a.projectId] ||= []).push(a);
        });

        const isOpen = (a) => !isClosedStatus(getStatusConfig(statuses, a.status));

        for (const project of projects) {
            const actions = actionsByProject[project.id] || [];
            const myActions = actions.filter((a) => a.assignedUsers?.includes(currentUser.uid));
            const myPending = myActions.filter(isOpen);
            const myPriority = myPending.filter((a) => isHighlighted(a.priority));

            stats[project.id] = {
                total: actions.length,
                myPending: myPending.length,
                myPriority: myPriority.length,
                projectPending: actions.filter(isOpen).length,
                progress: computeProgress(actions, statuses).pct,
            };
            // Las tarjetas de proyectos archivados siguen mostrando sus cifras,
            // pero no suman al resumen global.
            if (project.archived) continue;
            totalPending += myPending.length;
            totalPriority += myPriority.length;
        }
        return { projectStats: stats, globalStats: { totalPending, totalPriority } };
    }, [projects, allActions, statuses, currentUser]);

    // "Mi semana": mis acciones abiertas por vencimiento (en mis proyectos)
    const myWeek = useMemo(() => {
        if (!currentUser) return { overdue: 0, today: 0, week: 0 };
        const today = todayLocalISO();
        const weekEnd = endOfWeekISO();
        let overdue = 0;
        let todayCount = 0;
        let week = 0;
        for (const a of allActions) {
            if (!a.assignedUsers?.includes(currentUser.uid)) continue;
            if (archivedProjectIds.has(a.projectId)) continue;
            if (isClosedStatus(getStatusConfig(statuses, a.status))) continue;
            const due = a.proposedEndDate;
            if (!due) continue;
            if (due < today) overdue++;
            else if (due === today) todayCount++;
            else if (due <= weekEnd) week++;
        }
        return { overdue, today: todayCount, week };
    }, [allActions, statuses, currentUser, archivedProjectIds]);

    function getUserName(uid) {
        const user = allUsers.find((u) => u.id === uid);
        return user?.displayName || user?.email?.split("@")[0] || uid;
    }

    function changeSort(value) {
        setSortBy(value);
        localStorage.setItem(`pdca_dashboard_sort_${currentUser?.uid}`, value);
    }

    async function handleToggleArchive(project) {
        const ok = await confirm({
            title: showArchived ? "Desarchivar proyecto" : "Archivar proyecto",
            message: `¿Quieres ${showArchived ? "desarchivar" : "archivar"} "${project.title}"?`,
            confirmLabel: showArchived ? "Desarchivar" : "Archivar",
        });
        if (!ok) return;
        try {
            await projectService.toggleProjectArchive(project.id, !showArchived);
            toast.success(showArchived ? "Proyecto desarchivado" : "Proyecto archivado");
        } catch (error) {
            console.error(error);
            toast.error("No se pudo actualizar el proyecto");
        }
    }

    // Filtrado + orden
    const visibleProjects = useMemo(() => {
        let list = projects.filter((p) => !!p.archived === showArchived);
        if (search.trim()) {
            const q = normalizeText(search);
            list = list.filter(
                (p) => normalizeText(p.title).includes(q) || normalizeText(p.description).includes(q)
            );
        }
        const sorted = [...list];
        if (sortBy === "name") {
            sorted.sort((a, b) => (a.title || "").localeCompare(b.title || "", "es"));
        } else if (sortBy === "progress") {
            sorted.sort((a, b) => (projectStats[b.id]?.progress || 0) - (projectStats[a.id]?.progress || 0));
        } else {
            sorted.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        }
        return sorted;
    }, [projects, showArchived, search, sortBy, projectStats]);

    // Agrupación por departamento. Un proyecto con un departamento válido
    // NUNCA cae además en "Sin Departamento" (fix del duplicado).
    const visibleGroups = useMemo(() => {
        const groups = {};
        departments.forEach((d) => (groups[d.id] = { name: d.name, projects: [] }));
        groups["none"] = { name: "Sin Departamento", projects: [] };

        visibleProjects.forEach((p) => {
            const validDeptIds = (p.assignedDepartments || []).filter((id) => groups[id] && id !== "none");
            if (validDeptIds.length === 0) {
                groups["none"].projects.push(p);
            } else {
                validDeptIds.forEach((deptId) => groups[deptId].projects.push(p));
            }
        });

        return Object.entries(groups).filter(([, group]) => group.projects.length > 0);
    }, [visibleProjects, departments]);

    if (errorProjects) {
        return <ErrorState error={errorProjects} onRetry={retry} />;
    }

    if (loading) {
        return (
            <div className="mx-auto w-full max-w-7xl">
                <div className="mb-6 grid gap-3 md:gap-4 lg:grid-cols-3">
                    <div className="grid grid-cols-3 gap-2 sm:gap-3 md:gap-4 lg:col-span-2">
                        <Skeleton className="h-24 rounded-2xl" />
                        <Skeleton className="h-24 rounded-2xl" />
                        <Skeleton className="h-24 rounded-2xl" />
                    </div>
                    <Skeleton className="h-24 rounded-2xl" />
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4 lg:grid-cols-4">
                    <SkeletonCard />
                    <SkeletonCard />
                    <SkeletonCard />
                    <SkeletonCard />
                </div>
            </div>
        );
    }

    return (
        <div className="mx-auto w-full max-w-7xl">
            {/* Resumen global + Mi semana */}
            <div className="mb-6 grid gap-3 md:mb-8 md:gap-4 lg:grid-cols-3">
                <div className="grid grid-cols-3 gap-2 sm:gap-3 md:gap-4 lg:col-span-2">
                    <StatTile
                        icon={Clock}
                        accent="#6366F1"
                        value={globalStats.totalPending}
                        label="Pendientes"
                        title="Acciones abiertas asignadas a ti"
                    />
                    <StatTile
                        icon={AlertTriangle}
                        accent="#EF4444"
                        value={globalStats.totalPriority}
                        label="Prioritarias"
                        title="Tus acciones abiertas de prioridad alta"
                    />
                    <StatTile
                        icon={CheckCircle}
                        accent="#22C55E"
                        value={activeProjects.length}
                        label="Proyectos"
                        title="Proyectos activos en los que participas"
                    />
                </div>

                <Link to="/my-tasks" className="card-interactive block px-4 py-3 text-sm">
                    <span className="flex items-center gap-2 font-semibold text-gray-700 dark:text-gray-200">
                        <ListTodo className="h-4 w-4 flex-shrink-0 text-brand-600 dark:text-brand-400" />
                        Mi semana
                        <span className="ml-auto flex items-center gap-1 whitespace-nowrap text-xs font-medium text-brand-600 dark:text-brand-400">
                            <span className="hidden xs:inline">Ver Mis Tareas</span>
                            <ArrowRight className="h-4 w-4" />
                        </span>
                    </span>
                    <span className="mt-2 grid grid-cols-3 gap-2 text-center">
                        <WeekStat value={myWeek.overdue} label="vencidas" tone="danger" />
                        <WeekStat value={myWeek.today} label="para hoy" tone="warning" />
                        <WeekStat value={myWeek.week} label="esta semana" />
                    </span>
                </Link>
            </div>

            {/* Cabecera + controles */}
            <div className="mb-6 flex flex-col gap-3">
                <div className="flex items-center justify-between gap-2">
                    <h2 className="truncate text-xl font-bold text-gray-800 dark:text-gray-100 md:text-2xl">
                        {showArchived ? "Archivados" : "Mis Proyectos"}
                    </h2>
                    <div className="flex flex-shrink-0 gap-2">
                        <button
                            onClick={() => setShowArchived(!showArchived)}
                            className={showArchived ? "btn-primary btn-sm md:btn" : "btn-secondary btn-sm md:btn"}
                        >
                            <Archive className="h-4 w-4" />
                            <span className="hidden sm:inline">{showArchived ? "Ver activos" : "Ver archivados"}</span>
                            <span className="sm:hidden">{showArchived ? "Activos" : "Archivo"}</span>
                        </button>
                        {!showArchived && (
                            <Link to="/projects/new" className="btn-primary btn-sm md:btn">
                                <Plus className="h-4 w-4" />
                                <span className="hidden sm:inline">Nuevo Proyecto</span>
                                <span className="sm:hidden">Nuevo</span>
                            </Link>
                        )}
                    </div>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <div className="relative flex-1 sm:max-w-xs">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                        <input
                            type="search"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Buscar proyectos…"
                            aria-label="Buscar proyectos"
                            className="input pl-9"
                        />
                    </div>
                    <select
                        value={sortBy}
                        onChange={(e) => changeSort(e.target.value)}
                        aria-label="Ordenar proyectos"
                        className="input pr-8 sm:w-auto"
                    >
                        {SORT_OPTIONS.map((o) => (
                            <option key={o.id} value={o.id}>
                                Orden: {o.label}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {visibleProjects.length === 0 ? (
                search.trim() ? (
                    <EmptyState
                        icon={Search}
                        title="Sin resultados"
                        description={`Ningún proyecto coincide con "${search}".`}
                    />
                ) : (
                    <EmptyState
                        icon={showArchived ? Archive : Plus}
                        title={showArchived ? "No hay proyectos archivados" : "Aún no hay proyectos activos"}
                        description={
                            !showArchived
                                ? "Crea tu primer proyecto para empezar a gestionar acciones de mejora."
                                : undefined
                        }
                        action={
                            !showArchived && (
                                <Link to="/projects/new" className="btn-primary">
                                    <Plus className="h-4 w-4" />
                                    Nuevo Proyecto
                                </Link>
                            )
                        }
                    />
                )
            ) : (
                <div className="space-y-8">
                    {visibleGroups.map(([groupId, group]) => (
                        <section key={groupId}>
                            <h3 className="mb-3 flex items-center gap-2 px-1 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                {groupId === "none" ? (
                                    <Users className="h-4 w-4 flex-shrink-0 text-gray-400" />
                                ) : (
                                    <Building2 className="h-4 w-4 flex-shrink-0 text-brand-500" />
                                )}
                                <span className="min-w-0 truncate">{group.name}</span>
                                <span className="badge ml-auto flex-shrink-0 bg-surface-2 font-normal normal-case text-gray-500 dark:text-gray-300">
                                    {group.projects.length}
                                </span>
                            </h3>
                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4 lg:grid-cols-4">
                                {group.projects.map((project) => {
                                    const validDeptCount = (project.assignedDepartments || []).filter((id) =>
                                        departments.some((d) => d.id === id)
                                    ).length;
                                    // Archivar solo lo permiten las reglas al creador o admin
                                    const canArchive =
                                        currentUser?.role === "admin" ||
                                        project.createdBy === currentUser?.uid;
                                    return (
                                        <ProjectCard
                                            key={`${groupId}-${project.id}`}
                                            project={project}
                                            stat={projectStats[project.id]}
                                            archived={showArchived}
                                            onToggleArchive={
                                                canArchive ? () => handleToggleArchive(project) : undefined
                                            }
                                            getUserName={getUserName}
                                            extraDeptCount={groupId !== "none" ? validDeptCount - 1 : 0}
                                        />
                                    );
                                })}
                            </div>
                        </section>
                    ))}
                </div>
            )}
        </div>
    );
}
