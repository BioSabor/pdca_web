import { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ChevronLeft, ChevronRight, X, ExternalLink, Calendar, Filter, ChevronDown } from "lucide-react";
import useRealtimeAllActions from "../hooks/useRealtimeAllActions";
import useRealtimeAllProjects from "../hooks/useRealtimeAllProjects";
import useRealtimeStatuses from "../hooks/useRealtimeStatuses";
import useRealtimeUsers from "../hooks/useRealtimeUsers";

// ── Helpers ──────────────────────────────────────────────

const MONTH_NAMES = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];
const DAY_NAMES = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const DAY_NAMES_SHORT = ["L", "M", "X", "J", "V", "S", "D"];

function toDateStr(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
}

function getDaysInMonth(year, month) {
    return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year, month) {
    const day = new Date(year, month, 1).getDay();
    return (day + 6) % 7;
}

function formatDateLabel(dateStr) {
    if (!dateStr) return "";
    const [y, m, d] = dateStr.split("-");
    return `${d}/${m}/${y}`;
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

    // Suscripciones en tiempo real
    const { allActions, loading: loadingActions } = useRealtimeAllActions();
    const { projects: allProjectsData, loading: loadingProjects } = useRealtimeAllProjects();
    const { users: usersData, loading: loadingUsers } = useRealtimeUsers();
    const { statuses: statusesData, loading: loadingStatuses } = useRealtimeStatuses();

    const loading = loadingActions || loadingProjects || loadingUsers || loadingStatuses;

    // Derivar mapas de los datos reactivos
    const projectTitles = useMemo(() => {
        const titles = {};
        allProjectsData.forEach(p => { titles[p.id] = p.title; });
        return titles;
    }, [allProjectsData]);

    const usersMap = useMemo(() => {
        const uMap = {};
        usersData.forEach(u => { uMap[u.id] = u.displayName || u.email || u.id; });
        return uMap;
    }, [usersData]);

    const usersArr = usersData;

    const statusesMap = useMemo(() => {
        const sMap = {};
        statusesData.forEach(s => { sMap[s.id] = s; });
        return sMap;
    }, [statusesData]);

    const statusesArr = statusesData;

    const [selectedDay, setSelectedDay] = useState(null);
    const [filtersOpen, setFiltersOpen] = useState(false);

    // ── Filter state ─────────────────────────────────────
    // selectedStatuses: array of status IDs (empty = all)
    // selectedProjects: array of project IDs (empty = all)
    // selectedUsers: array of user IDs (empty = current user only for non-admin; for admin, empty = all)
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

    // ── Derived: available projects from loaded actions ───
    const availableProjects = useMemo(() => {
        const ids = [...new Set(allActions.map(a => a.projectId).filter(Boolean))];
        return ids.map(id => ({ id, title: projectTitles[id] || id }))
            .sort((a, b) => a.title.localeCompare(b.title));
    }, [allActions, projectTitles]);

    // ── Filtered actions ─────────────────────────────────
    const filteredActions = useMemo(() => {
        return allActions.filter(action => {
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
    }, [allActions, selectedUsers, selectedStatuses, selectedProjects]);

    // ── Build day → actions map for current month ────────
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
                const dayKey = toDateStr(cursor);
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
    const todayStr = toDateStr(today);

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
        <div className="max-w-7xl mx-auto -mx-2 sm:mx-auto">
            {/* Header */}
            <div className="flex flex-col gap-1 mb-4 md:mb-6 px-2 sm:px-0">
                <h1 className="text-xl md:text-3xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2 md:gap-3">
                    <Calendar className="w-5 h-5 md:w-7 md:h-7 text-blue-600" />
                    Calendario
                    <span className="hidden sm:inline">de Actividades</span>
                </h1>
                <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 hidden sm:block">
                    Visualiza todas las acciones planificadas y en curso en el calendario.
                </p>
            </div>

            {/* Month navigation + Filter toggle */}
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-2.5 md:p-4 mb-4 md:mb-6 mx-2 sm:mx-0">
                <div className="flex items-center justify-between">
                    <button onClick={prevMonth}
                        className="p-1.5 md:p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 transition">
                        <ChevronLeft className="w-4 h-4 md:w-5 md:h-5" />
                    </button>
                    <div className="flex items-center gap-2 md:gap-3">
                        <h2 className="text-sm md:text-xl font-semibold text-gray-800 dark:text-gray-100">
                            {MONTH_NAMES[currentMonth]} {currentYear}
                        </h2>
                        <button onClick={goToday}
                            className="text-[10px] md:text-xs px-2 py-0.5 md:px-2.5 md:py-1 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-200 font-medium hover:bg-blue-200 dark:hover:bg-blue-900/60 transition">
                            Hoy
                        </button>
                    </div>
                    <div className="flex items-center gap-1">
                        <button onClick={() => setFiltersOpen(v => !v)}
                            className={`p-1.5 md:p-2 rounded-lg transition relative ${filtersOpen ? "bg-blue-100 dark:bg-blue-900/40 text-blue-600" : "hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300"}`}
                            title="Filtros">
                            <Filter className="w-4 h-4 md:w-5 md:h-5" />
                            {activeFilterCount > 0 && (
                                <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 md:w-4 md:h-4 rounded-full bg-blue-600 text-white text-[8px] md:text-[9px] font-bold flex items-center justify-center">
                                    {activeFilterCount}
                                </span>
                            )}
                        </button>
                        <button onClick={nextMonth}
                            className="p-1.5 md:p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 transition">
                            <ChevronRight className="w-4 h-4 md:w-5 md:h-5" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Filters panel */}
            {filtersOpen && (
                <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-3 md:p-4 mb-4 md:mb-6 mx-2 sm:mx-0 space-y-4">
                    {/* Status filter */}
                    <FilterSection title="Estado">
                        <div className="flex flex-wrap gap-1.5">
                            {statusesArr.map(s => {
                                const active = selectedStatuses.includes(s.id);
                                return (
                                    <button key={s.id}
                                        onClick={() => toggleArrayItem(selectedStatuses, setSelectedStatuses, s.id)}
                                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition border
                                            ${active
                                                ? "border-transparent text-white shadow-sm"
                                                : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                                            }`}
                                        style={active ? { backgroundColor: s.color } : {}}>
                                        <span className="w-2 h-2 rounded-full flex-shrink-0"
                                            style={{ backgroundColor: active ? "#fff" : s.color }} />
                                        {s.label}
                                    </button>
                                );
                            })}
                            {selectedStatuses.length > 0 && (
                                <button onClick={() => setSelectedStatuses([])}
                                    className="text-[10px] md:text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 px-2 py-1 transition">
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
                                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium transition border
                                            ${active
                                                ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                                                : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                                            }`}>
                                        {p.title}
                                    </button>
                                );
                            })}
                            {selectedProjects.length > 0 && (
                                <button onClick={() => setSelectedProjects([])}
                                    className="text-[10px] md:text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 px-2 py-1 transition">
                                    Limpiar
                                </button>
                            )}
                        </div>
                    </FilterSection>

                    {/* User filter (admin only) */}
                    {isAdmin && (
                        <FilterSection title="Usuario">
                            <div className="flex flex-wrap gap-1.5">
                                {usersArr.map(u => {
                                    const active = selectedUsers.includes(u.id);
                                    return (
                                        <button key={u.id}
                                            onClick={() => toggleArrayItem(selectedUsers, setSelectedUsers, u.id)}
                                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium transition border
                                                ${active
                                                    ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                                                    : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                                                }`}>
                                            {u.displayName || u.email || u.id}
                                        </button>
                                    );
                                })}
                                <button onClick={() => setSelectedUsers(currentUser?.uid ? [currentUser.uid] : [])}
                                    className="text-[10px] md:text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 px-2 py-1 transition">
                                    Solo yo
                                </button>
                                {selectedUsers.length > 0 && (
                                    <button onClick={() => setSelectedUsers([])}
                                        className="text-[10px] md:text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 px-2 py-1 transition">
                                        Todos
                                    </button>
                                )}
                            </div>
                        </FilterSection>
                    )}

                    {/* Reset all filters */}
                    <div className="flex justify-end pt-1 border-t border-gray-100 dark:border-gray-800">
                        <button onClick={() => {
                            setSelectedStatuses([]);
                            setSelectedProjects([]);
                            setSelectedUsers(currentUser?.uid ? [currentUser.uid] : []);
                        }}
                            className="text-xs text-red-500 hover:text-red-600 dark:hover:text-red-400 px-3 py-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition">
                            Restablecer filtros
                        </button>
                    </div>
                </div>
            )}

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <span className="ml-3 text-gray-500 dark:text-gray-400">Cargando actividades...</span>
                </div>
            ) : (
                <div className="flex flex-col lg:flex-row gap-6">
                    {/* Calendar Grid */}
                    <div className="flex-1 min-w-0">
                        <div className="bg-white dark:bg-gray-900 rounded-xl sm:rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden mx-0 sm:mx-0">
                            {/* Day headers */}
                            <div className="grid grid-cols-7 bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
                                {DAY_NAMES.map((name, i) => (
                                    <div key={name} className="py-1.5 md:py-2.5 text-center text-[10px] md:text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        <span className="hidden sm:inline">{name}</span>
                                        <span className="sm:hidden">{DAY_NAMES_SHORT[i]}</span>
                                    </div>
                                ))}
                            </div>

                            {/* Day cells */}
                            <div className="grid grid-cols-7">
                                {calendarCells.map(cell => {
                                    if (cell.day === null) {
                                        return <div key={cell.key} className="min-h-[48px] sm:min-h-[70px] md:min-h-[100px] border-b border-r border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50" />;
                                    }

                                    const hasActions = cell.actions.length > 0;
                                    const isSelected = selectedDay === cell.dateStr;

                                    return (
                                        <button
                                            key={cell.key}
                                            onClick={() => setSelectedDay(isSelected ? null : cell.dateStr)}
                                            className={`min-h-[48px] sm:min-h-[70px] md:min-h-[100px] p-1 sm:p-1.5 md:p-2 border-b border-r border-gray-100 dark:border-gray-800 text-left transition-colors relative group
                                                ${isSelected
                                                    ? "bg-blue-50 dark:bg-blue-900/20 ring-2 ring-inset ring-blue-500"
                                                    : hasActions
                                                        ? "hover:bg-blue-50/50 dark:hover:bg-blue-900/10 cursor-pointer"
                                                        : "hover:bg-gray-50 dark:hover:bg-gray-800/50"
                                                }`}
                                        >
                                            <span className={`inline-flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 rounded-full text-[11px] sm:text-xs md:text-sm font-medium
                                                ${cell.isToday
                                                    ? "bg-blue-600 text-white"
                                                    : "text-gray-700 dark:text-gray-300"
                                                }`}>
                                                {cell.day}
                                            </span>

                                            {hasActions && (
                                                <div className="mt-0.5 md:mt-1 space-y-0.5">
                                                    <div className="hidden md:block space-y-0.5">
                                                        {cell.actions.slice(0, 3).map((action, idx) => {
                                                            const status = statusesMap[action.status];
                                                            const color = status?.color || "#9CA3AF";
                                                            return (
                                                                <div key={`${action.id}-${idx}`}
                                                                    className="flex items-center gap-1 px-1 py-0.5 rounded text-xs truncate"
                                                                    style={{ backgroundColor: `${color}18` }}>
                                                                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                                                                        style={{ backgroundColor: color }} />
                                                                    <span className="truncate text-gray-700 dark:text-gray-300">
                                                                        {action.action || "Sin descripción"}
                                                                    </span>
                                                                </div>
                                                            );
                                                        })}
                                                        {cell.actions.length > 3 && (
                                                            <div className="text-[10px] text-gray-500 dark:text-gray-400 px-1 font-medium">
                                                                +{cell.actions.length - 3} más
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="flex gap-0.5 md:hidden flex-wrap justify-center">
                                                        {cell.actions.slice(0, 4).map((action, idx) => {
                                                            const status = statusesMap[action.status];
                                                            const color = status?.color || "#9CA3AF";
                                                            return (
                                                                <span key={`dot-${action.id}-${idx}`}
                                                                    className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full"
                                                                    style={{ backgroundColor: color }} />
                                                            );
                                                        })}
                                                        {cell.actions.length > 4 && (
                                                            <span className="text-[7px] sm:text-[8px] text-gray-400 leading-none">+{cell.actions.length - 4}</span>
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
                        <div className="mt-2 md:mt-3 flex flex-wrap gap-2 md:gap-3 px-1">
                            {Object.values(statusesMap).map(s => (
                                <div key={s.id} className="flex items-center gap-1 md:gap-1.5 text-[10px] md:text-xs text-gray-600 dark:text-gray-400">
                                    <span className="w-2 h-2 md:w-2.5 md:h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                                    {s.label}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Detail panel */}
                    {selectedDay && (
                        <>
                            {/* Desktop sidebar */}
                            <div className="hidden lg:block w-80 xl:w-96 flex-shrink-0">
                                <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto">
                                    <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                                        <h3 className="font-semibold text-gray-800 dark:text-gray-100">
                                            {formatDateLabel(selectedDay)}
                                        </h3>
                                        <button onClick={() => setSelectedDay(null)}
                                            className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition">
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <div className="p-4">
                                        {selectedActions.length === 0 ? (
                                            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-6">
                                                No hay actividades para este día.
                                            </p>
                                        ) : (
                                            <div className="space-y-3">
                                                {selectedActions.map((action, idx) => (
                                                    <ActionCard key={`${action.id}-${idx}`}
                                                        action={action}
                                                        statusesMap={statusesMap}
                                                        usersMap={usersMap}
                                                        projectTitles={projectTitles}
                                                        navigate={navigate} />
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Mobile modal */}
                            <div className="lg:hidden fixed inset-0 z-50 flex items-end sm:items-center justify-center">
                                <div className="absolute inset-0 bg-black/40" onClick={() => setSelectedDay(null)} />
                                <div className="relative w-full sm:max-w-lg bg-white dark:bg-gray-900 rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[80vh] flex flex-col">
                                    <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between flex-shrink-0">
                                        <h3 className="font-semibold text-gray-800 dark:text-gray-100">
                                            {formatDateLabel(selectedDay)}
                                        </h3>
                                        <button onClick={() => setSelectedDay(null)}
                                            className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition">
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <div className="p-4 overflow-y-auto flex-1">
                                        {selectedActions.length === 0 ? (
                                            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-6">
                                                No hay actividades para este día.
                                            </p>
                                        ) : (
                                            <div className="space-y-3">
                                                {selectedActions.map((action, idx) => (
                                                    <ActionCard key={`${action.id}-${idx}`}
                                                        action={action}
                                                        statusesMap={statusesMap}
                                                        usersMap={usersMap}
                                                        projectTitles={projectTitles}
                                                        navigate={navigate} />
                                                ))}
                                            </div>
                                        )}
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

// ── Filter Section sub-component ─────────────────────────

function FilterSection({ title, children }) {
    return (
        <div>
            <label className="block text-[11px] md:text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                {title}
            </label>
            {children}
        </div>
    );
}

// ── Action Card sub-component ────────────────────────────

function ActionCard({ action, statusesMap, usersMap, projectTitles, navigate }) {
    const status = statusesMap[action.status];
    const statusColor = status?.color || "#9CA3AF";
    const statusLabel = status?.label || action.status || "Sin estado";
    const projectTitle = projectTitles[action.projectId] || "Proyecto";

    const assignedNames = (action.assignedUsers || [])
        .map(uid => usersMap[uid] || uid)
        .join(", ");

    return (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-3 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wide truncate">
                    {projectTitle}
                </span>
                <button
                    onClick={(e) => { e.stopPropagation(); navigate(`/projects/${action.projectId}`); }}
                    className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition"
                    title="Ir al proyecto"
                >
                    <ExternalLink className="w-3.5 h-3.5" />
                </button>
            </div>

            <p className="text-sm font-medium text-gray-800 dark:text-gray-100 mb-2 line-clamp-2">
                {action.action || "Sin descripción"}
            </p>

            <div className="flex items-center gap-2 mb-2">
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold"
                    style={{ backgroundColor: `${statusColor}20`, color: statusColor }}>
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: statusColor }} />
                    {statusLabel}
                </span>
            </div>

            <div className="text-[11px] text-gray-500 dark:text-gray-400 space-y-0.5">
                {(action.startDate || action.proposedStartDate) && (
                    <div>
                        <span className="font-medium">Inicio:</span>{" "}
                        {formatDateLabel(action.startDate || action.proposedStartDate)}
                        {action.startDate && action.proposedStartDate && action.startDate !== action.proposedStartDate && (
                            <span className="ml-1 text-gray-400">(propuesto: {formatDateLabel(action.proposedStartDate)})</span>
                        )}
                    </div>
                )}
                {(action.actualEndDate || action.proposedEndDate) && (
                    <div>
                        <span className="font-medium">Fin:</span>{" "}
                        {formatDateLabel(action.actualEndDate || action.proposedEndDate)}
                        {action.actualEndDate && action.proposedEndDate && action.actualEndDate !== action.proposedEndDate && (
                            <span className="ml-1 text-gray-400">(propuesto: {formatDateLabel(action.proposedEndDate)})</span>
                        )}
                    </div>
                )}
            </div>

            {assignedNames && (
                <div className="mt-2 text-[11px] text-gray-500 dark:text-gray-400">
                    <span className="font-medium">Asignado a:</span> {assignedNames}
                </div>
            )}
        </div>
    );
}
