import { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ChevronLeft, ChevronRight, X, ExternalLink, Calendar, CalendarX, Filter } from "lucide-react";
import useRealtimeAllActions from "../hooks/useRealtimeAllActions";
import useRealtimeAllProjects from "../hooks/useRealtimeAllProjects";
import useRealtimeProjects from "../hooks/useRealtimeProjects";
import useActionsForProjects from "../hooks/useActionsForProjects";
import useRealtimeStatuses from "../hooks/useRealtimeStatuses";
import useRealtimeUsers from "../hooks/useRealtimeUsers";
import { toLocalISO, todayLocalISO, formatShortDate } from "../lib/dates";
import { getStatusConfig } from "../lib/status";
import StatusPill from "../components/ui/StatusPill";
import EmptyState from "../components/ui/EmptyState";
import ErrorState from "../components/ui/ErrorState";
import { Skeleton } from "../components/ui/Skeleton";

// ── Helpers ──────────────────────────────────────────────

const MONTH_NAMES = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];
const DAY_NAMES = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const DAY_NAMES_SHORT = ["L", "M", "X", "J", "V", "S", "D"];

function getDaysInMonth(year, month) {
    return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year, month) {
    const day = new Date(year, month, 1).getDay();
    return (day + 6) % 7;
}

// ── Filter persistence helpers ───────────────────────────

function getFilterKey(uid) {
    return `pdca_calendar_filters_${uid}`;
}

function loadSavedFilters(uid) {
    try {
        const raw = localStorage.getItem(getFilterKey(uid));
        if (raw) return JSON.parse(raw);
    } catch { /* ignore */ }
    return null;
}

function saveFilters(uid, filters) {
    try {
        localStorage.setItem(getFilterKey(uid), JSON.stringify(filters));
    } catch { /* ignore */ }
}

// ── Component ────────────────────────────────────────────

export default function CalendarPage() {
    const navigate = useNavigate();
    const { currentUser } = useAuth();
    const isAdmin = currentUser?.role === "admin";
    const today = new Date();

    const [currentYear, setCurrentYear] = useState(today.getFullYear());
    const [currentMonth, setCurrentMonth] = useState(today.getMonth());

    // ── Datos por rol ────────────────────────────────────
    // Admin: escucha global (todas las acciones y proyectos).
    // No-admin: solo sus proyectos y las acciones de esos proyectos.
    const {
        allActions,
        loading: loadingAllActions,
        error: errorAllActions,
        retry: retryAllActions,
    } = useRealtimeAllActions({ enabled: isAdmin });
    const {
        projects: allProjects,
        loading: loadingAllProjects,
        error: errorAllProjects,
        retry: retryAllProjects,
    } = useRealtimeAllProjects({ enabled: isAdmin });
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
        actions: myProjectActions,
        loading: loadingMyActions,
        error: errorMyActions,
        retry: retryMyActions,
    } = useActionsForProjects(myProjectIds);

    const { users: usersData, loading: loadingUsers, error: errorUsers, retry: retryUsers } = useRealtimeUsers();
    const { statuses, loading: loadingStatuses, error: errorStatuses, retry: retryStatuses } = useRealtimeStatuses();

    const rawActions = isAdmin ? allActions : myProjectActions;
    const projects = isAdmin ? allProjects : myProjects;

    // Los proyectos archivados no aportan acciones al calendario
    const archivedProjectIds = useMemo(
        () => new Set(projects.filter((p) => p.archived).map((p) => p.id)),
        [projects]
    );
    const actions = useMemo(
        () => rawActions.filter((a) => !archivedProjectIds.has(a.projectId)),
        [rawActions, archivedProjectIds]
    );

    const loading =
        (isAdmin
            ? loadingAllActions || loadingAllProjects
            : loadingMyProjects || loadingMyActions) ||
        loadingUsers ||
        loadingStatuses;

    const dataError =
        (isAdmin
            ? errorAllActions || errorAllProjects
            : errorMyProjects || errorMyActions) ||
        errorUsers ||
        errorStatuses;

    function retryAll() {
        if (isAdmin) {
            retryAllActions();
            retryAllProjects();
        } else {
            retryMyProjects();
            retryMyActions();
        }
        retryUsers();
        retryStatuses();
    }

    // Derivar mapas de los datos reactivos
    const projectTitles = useMemo(() => {
        const titles = {};
        projects.forEach(p => { titles[p.id] = p.title; });
        return titles;
    }, [projects]);

    const usersMap = useMemo(() => {
        const uMap = {};
        usersData.forEach(u => { uMap[u.id] = u.displayName || u.email || u.id; });
        return uMap;
    }, [usersData]);

    const [selectedDay, setSelectedDay] = useState(null);
    const [filtersOpen, setFiltersOpen] = useState(false);

    // ── Filter state ─────────────────────────────────────
    // selectedStatuses: array of status IDs (empty = all)
    // selectedProjects: array of project IDs (empty = all)
    // selectedUsers: array of user IDs (empty = all; default = current user)
    const [selectedStatuses, setSelectedStatuses] = useState([]);
    const [selectedProjects, setSelectedProjects] = useState([]);
    const [selectedUsers, setSelectedUsers] = useState([]);
    const [filtersLoaded, setFiltersLoaded] = useState(false);

    // ── Load saved filters when user is known ────────────
    useEffect(() => {
        if (!currentUser?.uid) return;
        const saved = loadSavedFilters(currentUser.uid);
        if (saved) {
            if (Array.isArray(saved.statuses)) setSelectedStatuses(saved.statuses);
            if (Array.isArray(saved.projects)) setSelectedProjects(saved.projects);
            if (Array.isArray(saved.users)) setSelectedUsers(saved.users);
        } else {
            // Default: show current user's actions
            setSelectedUsers([currentUser.uid]);
        }
        setFiltersLoaded(true);
    }, [currentUser?.uid]);

    // ── Persist filters on change ────────────────────────
    useEffect(() => {
        if (!currentUser?.uid || !filtersLoaded) return;
        saveFilters(currentUser.uid, {
            statuses: selectedStatuses,
            projects: selectedProjects,
            users: selectedUsers
        });
    }, [selectedStatuses, selectedProjects, selectedUsers, currentUser?.uid, filtersLoaded]);

    // ── Derived: available projects from loaded actions ───
    const availableProjects = useMemo(() => {
        const ids = [...new Set(actions.map(a => a.projectId).filter(Boolean))];
        return ids.map(id => ({ id, title: projectTitles[id] || id }))
            .sort((a, b) => a.title.localeCompare(b.title));
    }, [actions, projectTitles]);

    // ── Filtered actions ─────────────────────────────────
    const filteredActions = useMemo(() => {
        return actions.filter(action => {
            // User filter
            if (selectedUsers.length > 0) {
                const assigned = action.assignedUsers || [];
                if (!assigned.some(uid => selectedUsers.includes(uid))) return false;
            }
            // Status filter
            if (selectedStatuses.length > 0) {
                if (!selectedStatuses.includes(action.status)) return false;
            }
            // Project filter
            if (selectedProjects.length > 0) {
                if (!selectedProjects.includes(action.projectId)) return false;
            }
            return true;
        });
    }, [actions, selectedUsers, selectedStatuses, selectedProjects]);

    // ── Build day → actions map for current month ────────
    // Una acción ocupa todos los días de su rango [inicio, fin].
    const dayActionsMap = useMemo(() => {
        const map = {};
        const monthStart = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-01`;
        const daysInMonth = getDaysInMonth(currentYear, currentMonth);
        const monthEnd = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(daysInMonth).padStart(2, "0")}`;

        filteredActions.forEach(action => {
            const start = action.startDate || action.proposedStartDate;
            const end = action.actualEndDate || action.proposedEndDate;
            if (!start && !end) return;

            const rangeStart = start || end;
            const rangeEnd = end || start;
            if (rangeEnd < monthStart || rangeStart > monthEnd) return;

            const effectiveStart = rangeStart > monthStart ? rangeStart : monthStart;
            const effectiveEnd = rangeEnd < monthEnd ? rangeEnd : monthEnd;

            let cursor = new Date(effectiveStart + "T00:00:00");
            const endDate = new Date(effectiveEnd + "T00:00:00");

            while (cursor <= endDate) {
                const dayKey = toLocalISO(cursor);
                if (!map[dayKey]) map[dayKey] = [];
                map[dayKey].push(action);
                cursor.setDate(cursor.getDate() + 1);
            }
        });

        return map;
    }, [filteredActions, currentYear, currentMonth]);

    // ── Filter toggle helpers ────────────────────────────
    const toggleArrayItem = useCallback((arr, setArr, item) => {
        setArr(prev => prev.includes(item) ? prev.filter(x => x !== item) : [...prev, item]);
    }, []);

    // ── Navigation ───────────────────────────────────────
    function prevMonth() {
        setSelectedDay(null);
        if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1); }
        else setCurrentMonth(m => m - 1);
    }
    function nextMonth() {
        setSelectedDay(null);
        if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1); }
        else setCurrentMonth(m => m + 1);
    }
    function goToday() {
        setSelectedDay(null);
        setCurrentYear(today.getFullYear());
        setCurrentMonth(today.getMonth());
    }

    // ── Build calendar grid ──────────────────────────────
    const daysInMonth = getDaysInMonth(currentYear, currentMonth);
    const firstDayOffset = getFirstDayOfWeek(currentYear, currentMonth);
    const todayStr = todayLocalISO();

    const calendarCells = [];
    for (let i = 0; i < firstDayOffset; i++) {
        calendarCells.push({ day: null, key: `empty-${i}` });
    }
    for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
        calendarCells.push({
            day: d, key: dateStr, dateStr,
            isToday: dateStr === todayStr,
            actions: dayActionsMap[dateStr] || []
        });
    }

    const selectedActions = selectedDay ? (dayActionsMap[selectedDay] || []) : [];

    // Active filter count for badge
    const activeFilterCount =
        (selectedStatuses.length > 0 ? 1 : 0) +
        (selectedProjects.length > 0 ? 1 : 0) +
        (selectedUsers.length > 0 && !(selectedUsers.length === 1 && selectedUsers[0] === currentUser?.uid) ? 1 : 0);

    // ── Render ───────────────────────────────────────────
    return (
        <div className="mx-auto max-w-7xl">
            {/* Header */}
            <div className="mb-4 flex flex-col gap-1 md:mb-6">
                <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900 dark:text-gray-100 md:gap-3 md:text-3xl">
                    <Calendar className="h-6 w-6 text-brand-600 md:h-7 md:w-7" />
                    Calendario
                    <span className="hidden sm:inline">de Actividades</span>
                </h1>
                <p className="hidden text-sm text-gray-500 dark:text-gray-400 sm:block">
                    Visualiza todas las acciones planificadas y en curso en el calendario.
                </p>
            </div>

            {/* Month navigation + Filter toggle */}
            <div className="card mb-4 p-2.5 md:mb-6 md:p-4">
                <div className="flex items-center justify-between">
                    <button onClick={prevMonth} aria-label="Mes anterior"
                        className="rounded-lg p-1.5 text-gray-600 transition hover:bg-surface-2 dark:text-gray-300 md:p-2">
                        <ChevronLeft className="h-4 w-4 md:h-5 md:w-5" />
                    </button>
                    <div className="flex items-center gap-2 md:gap-3">
                        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 md:text-xl">
                            {MONTH_NAMES[currentMonth]} {currentYear}
                        </h2>
                        <button onClick={goToday}
                            className="rounded-full bg-brand-100 px-2.5 py-0.5 text-xs font-medium text-brand-700 transition hover:bg-brand-200 dark:bg-brand-900/40 dark:text-brand-200 dark:hover:bg-brand-900/60">
                            Hoy
                        </button>
                    </div>
                    <div className="flex items-center gap-1">
                        <button onClick={() => setFiltersOpen(v => !v)}
                            aria-label="Filtros" title="Filtros"
                            className={`relative rounded-lg p-1.5 transition md:p-2 ${filtersOpen
                                ? "bg-brand-100 text-brand-600 dark:bg-brand-900/40"
                                : "text-gray-600 hover:bg-surface-2 dark:text-gray-300"}`}>
                            <Filter className="h-4 w-4 md:h-5 md:w-5" />
                            {activeFilterCount > 0 && (
                                <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-brand-600 px-0.5 text-xs font-bold text-white">
                                    {activeFilterCount}
                                </span>
                            )}
                        </button>
                        <button onClick={nextMonth} aria-label="Mes siguiente"
                            className="rounded-lg p-1.5 text-gray-600 transition hover:bg-surface-2 dark:text-gray-300 md:p-2">
                            <ChevronRight className="h-4 w-4 md:h-5 md:w-5" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Filters panel */}
            {filtersOpen && (
                <div className="card mb-4 space-y-4 p-3 md:mb-6 md:p-4">
                    {/* Status filter */}
                    <FilterSection title="Estado">
                        <div className="flex flex-wrap gap-1.5">
                            {statuses.map(s => {
                                const active = selectedStatuses.includes(s.id);
                                return (
                                    <button key={s.id}
                                        onClick={() => toggleArrayItem(selectedStatuses, setSelectedStatuses, s.id)}
                                        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition
                                            ${active
                                                ? "border-transparent text-white shadow-sm"
                                                : "border-line text-gray-600 hover:bg-surface-2 dark:text-gray-300"
                                            }`}
                                        style={active ? { backgroundColor: s.color } : {}}>
                                        <span className="h-2 w-2 flex-shrink-0 rounded-full"
                                            style={{ backgroundColor: active ? "#fff" : s.color }} />
                                        {s.label}
                                    </button>
                                );
                            })}
                            {selectedStatuses.length > 0 && (
                                <button onClick={() => setSelectedStatuses([])}
                                    className="px-2 py-1 text-xs text-gray-400 transition hover:text-gray-600 dark:hover:text-gray-200">
                                    Limpiar
                                </button>
                            )}
                        </div>
                    </FilterSection>

                    {/* Project filter */}
                    <FilterSection title="Proyecto">
                        <div className="flex flex-wrap gap-1.5">
                            {availableProjects.map(p => {
                                const active = selectedProjects.includes(p.id);
                                return (
                                    <button key={p.id}
                                        onClick={() => toggleArrayItem(selectedProjects, setSelectedProjects, p.id)}
                                        className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium transition
                                            ${active
                                                ? "border-brand-600 bg-brand-600 text-white shadow-sm"
                                                : "border-line text-gray-600 hover:bg-surface-2 dark:text-gray-300"
                                            }`}>
                                        {p.title}
                                    </button>
                                );
                            })}
                            {selectedProjects.length > 0 && (
                                <button onClick={() => setSelectedProjects([])}
                                    className="px-2 py-1 text-xs text-gray-400 transition hover:text-gray-600 dark:hover:text-gray-200">
                                    Limpiar
                                </button>
                            )}
                        </div>
                    </FilterSection>

                    {/* User filter (admin only) */}
                    {isAdmin && (
                        <FilterSection title="Usuario">
                            <div className="flex flex-wrap gap-1.5">
                                {usersData.map(u => {
                                    const active = selectedUsers.includes(u.id);
                                    return (
                                        <button key={u.id}
                                            onClick={() => toggleArrayItem(selectedUsers, setSelectedUsers, u.id)}
                                            className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium transition
                                                ${active
                                                    ? "border-indigo-600 bg-indigo-600 text-white shadow-sm"
                                                    : "border-line text-gray-600 hover:bg-surface-2 dark:text-gray-300"
                                                }`}>
                                            {u.displayName || u.email || u.id}
                                        </button>
                                    );
                                })}
                                <button onClick={() => setSelectedUsers(currentUser?.uid ? [currentUser.uid] : [])}
                                    className="px-2 py-1 text-xs text-gray-400 transition hover:text-gray-600 dark:hover:text-gray-200">
                                    Solo yo
                                </button>
                                {selectedUsers.length > 0 && (
                                    <button onClick={() => setSelectedUsers([])}
                                        className="px-2 py-1 text-xs text-gray-400 transition hover:text-gray-600 dark:hover:text-gray-200">
                                        Todos
                                    </button>
                                )}
                            </div>
                        </FilterSection>
                    )}

                    {/* Reset all filters */}
                    <div className="flex justify-end border-t border-line pt-1">
                        <button onClick={() => {
                            setSelectedStatuses([]);
                            setSelectedProjects([]);
                            setSelectedUsers(currentUser?.uid ? [currentUser.uid] : []);
                        }}
                            className="rounded-lg px-3 py-1 text-xs text-red-500 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400">
                            Restablecer filtros
                        </button>
                    </div>
                </div>
            )}

            {dataError ? (
                <ErrorState error={dataError} onRetry={retryAll} />
            ) : loading ? (
                <CalendarSkeleton />
            ) : (
                <div className="flex flex-col gap-6 lg:flex-row">
                    {/* Calendar Grid */}
                    <div className="min-w-0 flex-1">
                        <div className="card overflow-hidden">
                            <DayHeaders />

                            {/* Day cells */}
                            <div className="grid grid-cols-7">
                                {calendarCells.map(cell => {
                                    if (cell.day === null) {
                                        return <div key={cell.key} className="min-h-[48px] border-b border-r border-line bg-surface-2/40 sm:min-h-[70px] md:min-h-[100px]" />;
                                    }

                                    const hasActions = cell.actions.length > 0;
                                    const isSelected = selectedDay === cell.dateStr;

                                    return (
                                        <button
                                            key={cell.key}
                                            onClick={() => setSelectedDay(isSelected ? null : cell.dateStr)}
                                            className={`group relative min-h-[48px] border-b border-r border-line p-1 text-left transition-colors sm:min-h-[70px] sm:p-1.5 md:min-h-[100px] md:p-2
                                                ${isSelected
                                                    ? "bg-brand-50 ring-2 ring-inset ring-brand-500 dark:bg-brand-900/20"
                                                    : hasActions
                                                        ? "cursor-pointer hover:bg-brand-50/50 dark:hover:bg-brand-900/10"
                                                        : "hover:bg-surface-2/60"
                                                }`}
                                        >
                                            <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-xs font-medium sm:h-6 sm:w-6 md:h-7 md:w-7 md:text-sm
                                                ${cell.isToday
                                                    ? "bg-brand-600 text-white"
                                                    : "text-gray-700 dark:text-gray-300"
                                                }`}>
                                                {cell.day}
                                            </span>

                                            {hasActions && (
                                                <div className="mt-0.5 space-y-0.5 md:mt-1">
                                                    <div className="hidden space-y-0.5 md:block">
                                                        {cell.actions.slice(0, 3).map((action, idx) => {
                                                            const status = getStatusConfig(statuses, action.status);
                                                            return (
                                                                <div key={`${action.id}-${idx}`}
                                                                    className="flex items-center gap-1 truncate rounded px-1 py-0.5 text-xs"
                                                                    style={{ backgroundColor: `${status.color}20` }}>
                                                                    <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full"
                                                                        style={{ backgroundColor: status.color }} />
                                                                    <span className="truncate text-gray-700 dark:text-gray-300">
                                                                        {action.action || "Sin descripción"}
                                                                    </span>
                                                                </div>
                                                            );
                                                        })}
                                                        {cell.actions.length > 3 && (
                                                            <div className="px-1 text-xs font-medium text-gray-500 dark:text-gray-400">
                                                                +{cell.actions.length - 3} más
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="flex flex-wrap justify-center gap-0.5 md:hidden">
                                                        {cell.actions.slice(0, 4).map((action, idx) => {
                                                            const status = getStatusConfig(statuses, action.status);
                                                            return (
                                                                <span key={`dot-${action.id}-${idx}`}
                                                                    className="h-1.5 w-1.5 rounded-full sm:h-2 sm:w-2"
                                                                    style={{ backgroundColor: status.color }} />
                                                            );
                                                        })}
                                                        {cell.actions.length > 4 && (
                                                            <span className="text-xs leading-none text-gray-400 dark:text-gray-500">+{cell.actions.length - 4}</span>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Legend */}
                        <div className="mt-2 flex flex-wrap items-center gap-1.5 px-1 md:mt-3 md:gap-2">
                            {statuses.map(s => (
                                <StatusPill key={s.id} status={s} size="sm" />
                            ))}
                        </div>
                    </div>

                    {/* Detail panel */}
                    {selectedDay && (
                        <>
                            {/* Desktop sidebar */}
                            <div className="hidden w-80 flex-shrink-0 lg:block xl:w-96">
                                <div className="card sticky top-0 max-h-[calc(100dvh-6rem)] overflow-y-auto">
                                    <div className="flex items-center justify-between border-b border-line p-4">
                                        <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                                            {formatShortDate(selectedDay)}
                                        </h3>
                                        <button onClick={() => setSelectedDay(null)} aria-label="Cerrar panel"
                                            className="rounded-lg p-1 text-gray-400 transition hover:bg-surface-2 hover:text-gray-600 dark:hover:text-gray-200">
                                            <X className="h-4 w-4" />
                                        </button>
                                    </div>
                                    <div className="p-4">
                                        <DayActionList
                                            selectedActions={selectedActions}
                                            statuses={statuses}
                                            usersMap={usersMap}
                                            projectTitles={projectTitles}
                                            navigate={navigate} />
                                    </div>
                                </div>
                            </div>

                            {/* Mobile bottom sheet */}
                            <div className="fixed inset-0 z-modal flex items-end justify-center sm:items-center lg:hidden">
                                <div className="absolute inset-0 bg-black/40" onClick={() => setSelectedDay(null)} />
                                <div className="relative flex max-h-[80dvh] w-full flex-col rounded-t-2xl bg-surface shadow-overlay sm:max-w-lg sm:rounded-2xl">
                                    <div className="flex flex-shrink-0 items-center justify-between border-b border-line p-4">
                                        <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                                            {formatShortDate(selectedDay)}
                                        </h3>
                                        <button onClick={() => setSelectedDay(null)} aria-label="Cerrar"
                                            className="rounded-lg p-1 text-gray-400 transition hover:bg-surface-2 hover:text-gray-600 dark:hover:text-gray-200">
                                            <X className="h-4 w-4" />
                                        </button>
                                    </div>
                                    <div className="flex-1 overflow-y-auto p-4">
                                        <DayActionList
                                            selectedActions={selectedActions}
                                            statuses={statuses}
                                            usersMap={usersMap}
                                            projectTitles={projectTitles}
                                            navigate={navigate} />
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}

// ── Day headers row ──────────────────────────────────────

function DayHeaders() {
    return (
        <div className="grid grid-cols-7 border-b border-line bg-surface-2">
            {DAY_NAMES.map((name, i) => (
                <div key={name} className="py-1.5 text-center text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 md:py-2.5">
                    <span className="hidden sm:inline">{name}</span>
                    <span className="sm:hidden">{DAY_NAMES_SHORT[i]}</span>
                </div>
            ))}
        </div>
    );
}

// ── Loading skeleton (grid de celdas) ────────────────────

function CalendarSkeleton() {
    return (
        <div className="card overflow-hidden">
            <DayHeaders />
            <div className="grid grid-cols-7">
                {Array.from({ length: 35 }, (_, i) => (
                    <div key={i} className="min-h-[48px] border-b border-r border-line p-1 sm:min-h-[70px] sm:p-1.5 md:min-h-[100px] md:p-2">
                        <Skeleton className="h-5 w-5 rounded-full sm:h-6 sm:w-6 md:h-7 md:w-7" />
                        {i % 3 === 0 && <Skeleton className="mt-2 hidden h-4 w-full md:block" />}
                    </div>
                ))}
            </div>
        </div>
    );
}

// ── Day action list (panel lateral / hoja móvil) ─────────

function DayActionList({ selectedActions, statuses, usersMap, projectTitles, navigate }) {
    if (selectedActions.length === 0) {
        return (
            <EmptyState
                icon={CalendarX}
                title="Sin actividades"
                description="No hay actividades para este día."
                className="border-0 bg-transparent shadow-none" />
        );
    }
    return (
        <div className="space-y-3">
            {selectedActions.map((action, idx) => (
                <ActionCard key={`${action.id}-${idx}`}
                    action={action}
                    statuses={statuses}
                    usersMap={usersMap}
                    projectTitles={projectTitles}
                    navigate={navigate} />
            ))}
        </div>
    );
}

// ── Filter Section sub-component ─────────────────────────

function FilterSection({ title, children }) {
    return (
        <div>
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                {title}
            </span>
            {children}
        </div>
    );
}

// ── Action Card sub-component ────────────────────────────

function ActionCard({ action, statuses, usersMap, projectTitles, navigate }) {
    const status = getStatusConfig(statuses, action.status);
    const projectTitle = projectTitles[action.projectId] || "Proyecto";

    const assignedNames = (action.assignedUsers || [])
        .map(uid => usersMap[uid] || uid)
        .join(", ");

    return (
        <div className="rounded-xl border border-line bg-surface-2/50 p-3 transition-shadow hover:shadow-card">
            <div className="mb-2 flex items-center justify-between gap-2">
                <span className="truncate text-xs font-medium uppercase tracking-wide text-brand-600 dark:text-brand-400">
                    {projectTitle}
                </span>
                <button
                    onClick={(e) => { e.stopPropagation(); navigate(`/projects/${action.projectId}`); }}
                    aria-label="Ir al proyecto"
                    title="Ir al proyecto"
                    className="rounded p-1 text-gray-400 transition hover:bg-surface-2 hover:text-brand-600 dark:hover:text-brand-400"
                >
                    <ExternalLink className="h-3.5 w-3.5" />
                </button>
            </div>

            <p className="mb-2 line-clamp-2 text-sm font-medium text-gray-900 dark:text-gray-100">
                {action.action || "Sin descripción"}
            </p>

            <div className="mb-2 flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold"
                    style={{ backgroundColor: `${status.color}20`, color: status.color }}>
                    <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: status.color }} />
                    {status.label}
                </span>
            </div>

            <div className="space-y-0.5 text-xs text-gray-500 dark:text-gray-400">
                {(action.startDate || action.proposedStartDate) && (
                    <div>
                        <span className="font-medium">Inicio:</span>{" "}
                        {formatShortDate(action.startDate || action.proposedStartDate)}
                        {action.startDate && action.proposedStartDate && action.startDate !== action.proposedStartDate && (
                            <span className="ml-1 text-gray-400 dark:text-gray-500">(propuesto: {formatShortDate(action.proposedStartDate)})</span>
                        )}
                    </div>
                )}
                {(action.actualEndDate || action.proposedEndDate) && (
                    <div>
                        <span className="font-medium">Fin:</span>{" "}
                        {formatShortDate(action.actualEndDate || action.proposedEndDate)}
                        {action.actualEndDate && action.proposedEndDate && action.actualEndDate !== action.proposedEndDate && (
                            <span className="ml-1 text-gray-400 dark:text-gray-500">(propuesto: {formatShortDate(action.proposedEndDate)})</span>
                        )}
                    </div>
                )}
            </div>

            {assignedNames && (
                <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    <span className="font-medium">Asignado a:</span> {assignedNames}
                </div>
            )}
        </div>
    );
}
