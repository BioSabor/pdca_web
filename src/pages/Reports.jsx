import { useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import PageContainer from "../components/ui/PageContainer";
import ErrorState from "../components/ui/ErrorState";
import { SkeletonRows } from "../components/ui/Skeleton";
import ReportsFilters from "../components/reports/ReportsFilters";
import OverviewTab from "../components/reports/OverviewTab";
import CompletedTab from "../components/reports/CompletedTab";
import PendingByUserTab from "../components/reports/PendingByUserTab";
import InProgressTab from "../components/reports/InProgressTab";
import useRealtimeAllActions from "../hooks/useRealtimeAllActions";
import useRealtimeAllProjects from "../hooks/useRealtimeAllProjects";
import useRealtimeProjects from "../hooks/useRealtimeProjects";
import useActionsForProjects from "../hooks/useActionsForProjects";
import useRealtimeStatuses from "../hooks/useRealtimeStatuses";
import useRealtimeUsers from "../hooks/useRealtimeUsers";
import useRealtimeDepartments from "../hooks/useRealtimeDepartments";
import { addDays, endOfWeekISO, startOfWeekISO } from "../lib/dates";
import { cn } from "../lib/utils";

const TABS = [
    { id: "overview", label: "Resumen" },
    { id: "completed", label: "Terminadas" },
    { id: "pending", label: "Pendientes por usuario" },
    { id: "inprogress", label: "En curso por usuario" },
];

// Rango por defecto: últimas 4 semanas (3 completas anteriores + la actual).
function getDefaultRange() {
    const monday = startOfWeekISO();
    return { start: addDays(monday, -21), end: endOfWeekISO() };
}

// Informes 2.0: orquestador. Todas las suscripciones viven aquí (una sola vez,
// acotadas por rol) y los filtros globales aplican a todas las pestañas.
export default function Reports() {
    const { currentUser } = useAuth();
    const isAdmin = currentUser?.role === "admin";

    const [activeTab, setActiveTab] = useState("overview");

    // ── Filtros globales ─────────────────────────────────
    const defaultRange = useMemo(() => getDefaultRange(), []);
    const [selectedDepartments, setSelectedDepartments] = useState([]);
    const [selectedProjects, setSelectedProjects] = useState([]);
    const [startDate, setStartDate] = useState(defaultRange.start);
    const [endDate, setEndDate] = useState(defaultRange.end);

    // ── Datos por rol ────────────────────────────────────
    // Admin: escucha global (todos los proyectos y acciones).
    // No-admin: solo sus proyectos y las acciones de esos proyectos.
    const {
        projects: allProjects,
        loading: loadingAllProjects,
        error: errorAllProjects,
        retry: retryAllProjects,
    } = useRealtimeAllProjects({ enabled: isAdmin });
    const {
        allActions,
        loading: loadingAllActions,
        error: errorAllActions,
        retry: retryAllActions,
    } = useRealtimeAllActions({ enabled: isAdmin });
    const {
        projects: myProjects,
        loading: loadingMyProjects,
        error: errorMyProjects,
        retry: retryMyProjects,
    } = useRealtimeProjects(isAdmin ? null : currentUser?.uid);

    const myProjectIds = useMemo(
        () => (isAdmin ? [] : myProjects.map((p) => p.id)),
        [isAdmin, myProjects]
    );
    const {
        actions: myActions,
        loading: loadingMyActions,
        error: errorMyActions,
        retry: retryMyActions,
    } = useActionsForProjects(myProjectIds);

    const { statuses, loading: loadingStatuses, error: errorStatuses, retry: retryStatuses } =
        useRealtimeStatuses();
    const { users, loading: loadingUsers, error: errorUsers, retry: retryUsers } = useRealtimeUsers();
    const {
        departments,
        loading: loadingDepartments,
        error: errorDepartments,
        retry: retryDepartments,
    } = useRealtimeDepartments();

    const loading =
        (isAdmin
            ? loadingAllProjects || loadingAllActions
            : loadingMyProjects || loadingMyActions) ||
        loadingStatuses ||
        loadingUsers ||
        loadingDepartments;

    const dataError =
        (isAdmin ? errorAllProjects || errorAllActions : errorMyProjects || errorMyActions) ||
        errorStatuses ||
        errorUsers ||
        errorDepartments;

    function retryAll() {
        if (isAdmin) {
            retryAllProjects();
            retryAllActions();
        } else {
            retryMyProjects();
            retryMyActions();
        }
        retryStatuses();
        retryUsers();
        retryDepartments();
    }

    // ── Scope + filtros derivados ────────────────────────
    const projects = isAdmin ? allProjects : myProjects;
    const actions = isAdmin ? allActions : myActions;

    const scopedProjects = useMemo(() => {
        return projects.filter((project) => {
            if (
                selectedDepartments.length > 0 &&
                !(project.assignedDepartments || []).some((id) => selectedDepartments.includes(id))
            ) {
                return false;
            }
            if (selectedProjects.length > 0 && !selectedProjects.includes(project.id)) return false;
            return true;
        });
    }, [projects, selectedDepartments, selectedProjects]);

    const scopedActions = useMemo(() => {
        const scopedIds = new Set(scopedProjects.map((p) => p.id));
        return actions.filter((action) => action.projectId && scopedIds.has(action.projectId));
    }, [actions, scopedProjects]);

    const projectTitleById = useMemo(() => {
        const titles = {};
        projects.forEach((p) => {
            titles[p.id] = p.title;
        });
        return titles;
    }, [projects]);

    const getUserName = useMemo(() => {
        const byId = new Map(users.map((u) => [u.id, u]));
        return (uid) => {
            const user = byId.get(uid);
            const name = user?.displayName || user?.email?.split("@")[0] || uid;
            return user?.disabled ? `${name} (inactivo)` : name;
        };
    }, [users]);

    const filtersDirty =
        selectedDepartments.length > 0 ||
        selectedProjects.length > 0 ||
        startDate !== defaultRange.start ||
        endDate !== defaultRange.end;

    function clearFilters() {
        setSelectedDepartments([]);
        setSelectedProjects([]);
        setStartDate(defaultRange.start);
        setEndDate(defaultRange.end);
    }

    const tabProps = {
        scopedActions,
        statuses,
        startDate,
        endDate,
        users,
        projectTitleById,
        getUserName,
    };

    return (
        <PageContainer
            title="Informes"
            subtitle={
                isAdmin
                    ? "Actividad y cumplimiento de toda la organización"
                    : "Actividad y cumplimiento de tus proyectos"
            }
            maxWidth="7xl"
        >
            {dataError ? (
                <ErrorState error={dataError} onRetry={retryAll} />
            ) : loading ? (
                <SkeletonRows rows={6} />
            ) : (
                <>
                    <ReportsFilters
                        departments={departments}
                        projects={projects}
                        selectedDepartments={selectedDepartments}
                        onDepartmentsChange={setSelectedDepartments}
                        selectedProjects={selectedProjects}
                        onProjectsChange={setSelectedProjects}
                        startDate={startDate}
                        onStartDateChange={setStartDate}
                        endDate={endDate}
                        onEndDateChange={setEndDate}
                        onClear={clearFilters}
                        isDirty={filtersDirty}
                    />

                    {/* Navegación de pestañas (segmented control responsive) */}
                    <div className="mb-6">
                        <div
                            role="tablist"
                            aria-label="Secciones del informe"
                            className="flex flex-wrap gap-1 rounded-2xl border border-line bg-surface-2 p-1"
                        >
                            {TABS.map((tab) => (
                                <button
                                    key={tab.id}
                                    id={`reports-tab-${tab.id}`}
                                    role="tab"
                                    aria-selected={activeTab === tab.id}
                                    aria-controls="reports-tabpanel"
                                    onClick={() => setActiveTab(tab.id)}
                                    className={cn(
                                        "min-w-[9rem] flex-1 rounded-xl px-3 py-2 text-sm font-medium transition-colors sm:px-4",
                                        activeTab === tab.id
                                            ? "bg-surface text-brand-600 shadow-card dark:text-brand-300"
                                            : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                                    )}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div
                        id="reports-tabpanel"
                        role="tabpanel"
                        aria-labelledby={`reports-tab-${activeTab}`}
                    >
                        {activeTab === "overview" && <OverviewTab {...tabProps} />}
                        {activeTab === "completed" && <CompletedTab {...tabProps} />}
                        {activeTab === "pending" && <PendingByUserTab {...tabProps} />}
                        {activeTab === "inprogress" && <InProgressTab {...tabProps} />}
                    </div>
                </>
            )}
        </PageContainer>
    );
}
