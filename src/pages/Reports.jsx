import { useEffect, useMemo, useState } from "react";
import { collectionGroup, doc, getDoc, getDocs, query } from "firebase/firestore";
import { db } from "../firebase";
import { projectService, actionService, statusService, userService } from "../services/projectService";
import { useAuth } from "../context/AuthContext";
import { Users, AlertTriangle, Clock, ChevronDown } from "lucide-react";

function formatDateInput(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function getPreviousWeekRange() {
    const today = new Date();
    const dayIndex = (today.getDay() + 6) % 7; // Monday = 0
    const mondayThisWeek = new Date(today);
    mondayThisWeek.setDate(today.getDate() - dayIndex);
    const mondayPrevWeek = new Date(mondayThisWeek);
    mondayPrevWeek.setDate(mondayThisWeek.getDate() - 7);
    const sundayPrevWeek = new Date(mondayPrevWeek);
    sundayPrevWeek.setDate(mondayPrevWeek.getDate() + 6);
    return {
        start: formatDateInput(mondayPrevWeek),
        end: formatDateInput(sundayPrevWeek)
    };
}

// ─── Tab: Tareas Terminadas ─────────────────────────────────────────────
function CompletedTab() {
    const defaultRange = useMemo(() => getPreviousWeekRange(), []);
    const [startDate, setStartDate] = useState(defaultRange.start);
    const [endDate, setEndDate] = useState(defaultRange.end);
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [expandedUserId, setExpandedUserId] = useState(null);

    useEffect(() => {
        let isActive = true;

        async function loadReport() {
            setLoading(true);
            setError("");
            try {
                const [users, statuses] = await Promise.all([
                    userService.getAllUsers(),
                    statusService.getStatuses()
                ]);

                const endStatusIds = statuses.filter((s) => s.type === "end").map((s) => s.id);
                let actions = [];

                if (endStatusIds.length > 0) {
                    const actionsQuery = query(collectionGroup(db, "actions"));
                    const snapshot = await getDocs(actionsQuery);
                    actions = snapshot.docs
                        .map((actionDoc) => ({
                            id: actionDoc.id,
                            ...actionDoc.data(),
                            projectId: actionDoc.ref.parent.parent?.id || null
                        }))
                        .filter((action) => endStatusIds.includes(action.status));
                }

                const filteredActions = actions.filter((action) => {
                    if (!action.actualEndDate) return false;
                    return action.actualEndDate >= startDate && action.actualEndDate <= endDate;
                });

                const projectIds = [...new Set(filteredActions.map((a) => a.projectId).filter(Boolean))];
                const projectEntries = await Promise.all(
                    projectIds.map(async (projectId) => {
                        const projectRef = doc(db, "projects", projectId);
                        const projectSnap = await getDoc(projectRef);
                        return {
                            id: projectId,
                            title: projectSnap.exists() ? projectSnap.data().title : projectId
                        };
                    })
                );
                const projectTitleById = projectEntries.reduce((acc, item) => {
                    acc[item.id] = item.title;
                    return acc;
                }, {});

                const dataByUser = {};
                filteredActions.forEach((action) => {
                    const assigned = action.assignedUsers || [];
                    assigned.forEach((uid) => {
                        if (!dataByUser[uid]) {
                            dataByUser[uid] = { userId: uid, count: 0, projects: {} };
                        }
                        dataByUser[uid].count += 1;
                        const projectId = action.projectId || "unknown";
                        if (!dataByUser[uid].projects[projectId]) {
                            dataByUser[uid].projects[projectId] = [];
                        }
                        dataByUser[uid].projects[projectId].push(action);
                    });
                });

                const mappedRows = users.map((user) => {
                    const stats = dataByUser[user.id] || { count: 0, projects: {} };
                    return {
                        userId: user.id,
                        user,
                        count: stats.count,
                        projects: stats.projects,
                        projectTitles: projectTitleById
                    };
                });

                mappedRows.sort((a, b) => b.count - a.count);

                if (isActive) {
                    setRows(mappedRows);
                }
            } catch (err) {
                console.error("Error al cargar informes", err);
                if (isActive) {
                    setError("No se pudieron cargar los informes. Intentalo de nuevo.");
                }
            } finally {
                if (isActive) {
                    setLoading(false);
                }
            }
        }

        loadReport();
        return () => {
            isActive = false;
        };
    }, [startDate, endDate]);

    function toggleRow(userId) {
        setExpandedUserId((prev) => (prev === userId ? null : userId));
    }

    return (
        <>
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 md:p-6 mb-6">
                <div className="flex flex-col md:flex-row gap-4 md:items-end">
                    <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Desde</label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm dark:bg-gray-900 dark:text-gray-100"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Hasta</label>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm dark:bg-gray-900 dark:text-gray-100"
                        />
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                        Por defecto: semana anterior (lunes a domingo).
                    </div>
                </div>
            </div>

            {/* Mobile: card-based layout */}
            <div className="md:hidden space-y-2">
                {loading && (
                    <div className="p-6 text-gray-500 dark:text-gray-400 text-sm">Cargando informes...</div>
                )}
                {error && !loading && (
                    <div className="p-4 text-red-500 text-sm">{error}</div>
                )}
                {!loading && !error && rows.map((row) => (
                    <div key={row.userId} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
                        <div
                            className="flex items-center justify-between px-4 py-3 cursor-pointer"
                            onClick={() => toggleRow(row.userId)}
                        >
                            <span className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">
                                {row.user?.displayName || row.user?.email || row.userId}
                            </span>
                            <div className="flex items-center gap-2 flex-shrink-0">
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-200">
                                    {row.count}
                                </span>
                                <span className="text-[10px] text-blue-600 dark:text-blue-300">
                                    {expandedUserId === row.userId ? "▲" : "▼"}
                                </span>
                            </div>
                        </div>
                        {expandedUserId === row.userId && (
                            <div className="px-4 pb-3 border-t border-gray-100 dark:border-gray-700 pt-2">
                                {row.count === 0 && (
                                    <div className="text-xs text-gray-500 dark:text-gray-400">
                                        Sin acciones finalizadas en este periodo.
                                    </div>
                                )}
                                {row.count > 0 && (
                                    <div className="space-y-2">
                                        {Object.entries(row.projects).map(([projectId, actions]) => (
                                            <div key={projectId}>
                                                <div className="text-xs font-semibold text-gray-700 dark:text-gray-200 mb-1">
                                                    {row.projectTitles[projectId] || "Proyecto"} ({actions.length})
                                                </div>
                                                <ul className="space-y-0.5">
                                                    {actions.map((action) => (
                                                        <li key={action.id} className="text-xs text-gray-600 dark:text-gray-300 flex justify-between gap-2">
                                                            <span className="truncate">{action.action || "Sin descripcion"}</span>
                                                            {action.actualEndDate && (
                                                                <span className="text-[10px] text-gray-400 dark:text-gray-500 flex-shrink-0">{action.actualEndDate}</span>
                                                            )}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Desktop: table layout */}
            <div className="hidden md:block bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-x-auto">
                {loading && (
                    <div className="p-6 text-gray-500 dark:text-gray-400">Cargando informes...</div>
                )}
                {error && !loading && (
                    <div className="p-6 text-red-500">{error}</div>
                )}
                {!loading && !error && (
                    <table className="min-w-[720px] w-full text-sm">
                        <thead className="bg-gray-50 dark:bg-gray-800">
                            <tr>
                                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Usuario</th>
                                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Acciones finalizadas</th>
                                <th className="px-4 py-3"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                            {rows.map((row) => (
                                <>
                                    <tr
                                        key={row.userId}
                                        className="hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                                        onClick={() => toggleRow(row.userId)}
                                    >
                                        <td className="px-4 py-3 text-gray-800 dark:text-gray-100">
                                            {row.user?.displayName || row.user?.email || row.userId}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-200">
                                                {row.count}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right text-xs text-blue-600 dark:text-blue-300">
                                            {expandedUserId === row.userId ? "Ocultar" : "Ver detalle"}
                                        </td>
                                    </tr>
                                    {expandedUserId === row.userId && (
                                        <tr>
                                            <td colSpan={3} className="px-4 py-3 bg-gray-50 dark:bg-gray-800/60">
                                                {row.count === 0 && (
                                                    <div className="text-sm text-gray-500 dark:text-gray-400">
                                                        Sin acciones finalizadas en este periodo.
                                                    </div>
                                                )}
                                                {row.count > 0 && (
                                                    <div className="space-y-4">
                                                        {Object.entries(row.projects).map(([projectId, actions]) => (
                                                            <div key={projectId} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                                                                <div className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-2">
                                                                    {row.projectTitles[projectId] || "Proyecto"} ({actions.length})
                                                                </div>
                                                                <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-300">
                                                                    {actions.map((action) => (
                                                                        <li key={action.id} className="flex flex-col">
                                                                            <span>{action.action || "Sin descripcion"}</span>
                                                                            {action.actualEndDate && (
                                                                                <span className="text-xs text-gray-400 dark:text-gray-500">Finalizado: {action.actualEndDate}</span>
                                                                            )}
                                                                        </li>
                                                                    ))}
                                                                </ul>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    )}
                                </>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </>
    );
}

// ─── Tab: Pendientes por Usuario ────────────────────────────────────────
function PendingByUserTab() {
    const { currentUser } = useAuth();
    const [allUsers, setAllUsers] = useState([]);
    const [adminUserStats, setAdminUserStats] = useState({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadData() {
            if (!currentUser) return;
            try {
                const [projects, statuses, users] = await Promise.all([
                    projectService.getUserProjects(currentUser.uid),
                    statusService.getStatuses(),
                    userService.getAllUsers()
                ]);

                setAllUsers(users);
                const endStatuses = statuses.filter(s => s.type === "end").map(s => s.id);
                const userStats = {};

                for (const project of projects) {
                    const actions = await actionService.getActions(project.id);
                    for (const action of actions) {
                        if (endStatuses.includes(action.status)) continue;
                        for (const uid of (action.assignedUsers || [])) {
                            if (!userStats[uid]) userStats[uid] = { pending: 0, priority: 0 };
                            userStats[uid].pending++;
                            if (action.priority) userStats[uid].priority++;
                        }
                    }
                }

                setAdminUserStats(userStats);
            } catch (error) {
                console.error("Error al cargar pendientes por usuario", error);
            } finally {
                setLoading(false);
            }
        }
        loadData();
    }, [currentUser]);

    function getUserName(uid) {
        const user = allUsers.find(u => u.id === uid);
        return user?.displayName || user?.email?.split("@")[0] || uid;
    }

    if (loading) return <div className="flex justify-center items-center py-12 text-gray-500 dark:text-gray-400">Cargando...</div>;

    const sortedStats = Object.entries(adminUserStats).sort((a, b) => b[1].pending - a[1].pending);
    const totalPendAll = sortedStats.reduce((sum, [, s]) => sum + s.pending, 0);
    const totalPriorAll = sortedStats.reduce((sum, [, s]) => sum + s.priority, 0);

    if (sortedStats.length === 0) {
        return (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-12 text-center">
                <Users className="w-12 h-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
                <h3 className="text-lg font-medium text-gray-700 dark:text-gray-200">No hay acciones pendientes</h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Todos los usuarios tienen sus tareas al día.</p>
            </div>
        );
    }

    return (
        <>
            {/* Summary cards */}
            <div className="grid grid-cols-2 gap-3 md:gap-4 mb-6 md:max-w-lg md:mx-auto">
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
                    <div className="flex items-center gap-3">
                        <div className="bg-blue-100 dark:bg-blue-900/40 p-2 rounded-lg">
                            <Clock className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">{totalPendAll}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Total Pendientes</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
                    <div className="flex items-center gap-3">
                        <div className="bg-red-100 dark:bg-red-900/40 p-2 rounded-lg">
                            <AlertTriangle className="w-5 h-5 text-red-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">{totalPriorAll}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Prioritarias</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* User table */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                        <tr>
                            <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Usuario</th>
                            <th className="text-center py-3 px-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase w-24">Pendientes</th>
                            <th className="text-center py-3 px-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase w-24">Prioritarias</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedStats.map(([uid, stat]) => (
                            <tr key={uid} className="border-b border-gray-50 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/40">
                                <td className="py-3 px-4 text-gray-800 dark:text-gray-100">{getUserName(uid)}</td>
                                <td className="py-3 px-3 text-center">
                                    <span className="bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-200 px-2.5 py-1 rounded-full text-xs font-semibold">{stat.pending}</span>
                                </td>
                                <td className="py-3 px-3 text-center">
                                    {stat.priority > 0
                                        ? <span className="bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-200 px-2.5 py-1 rounded-full text-xs font-semibold">{stat.priority}</span>
                                        : <span className="text-gray-400 dark:text-gray-500 text-xs">0</span>}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </>
    );
}

// ─── Tab: En Curso por Usuario ──────────────────────────────────────────
function InProgressTab() {
    const { currentUser } = useAuth();
    const [allUsers, setAllUsers] = useState([]);
    const [userActions, setUserActions] = useState({});
    const [loading, setLoading] = useState(true);
    const [expandedUserId, setExpandedUserId] = useState(null);

    useEffect(() => {
        async function loadData() {
            if (!currentUser) return;
            try {
                const [projects, statuses, users] = await Promise.all([
                    projectService.getUserProjects(currentUser.uid),
                    statusService.getStatuses(),
                    userService.getAllUsers()
                ]);

                setAllUsers(users);
                const startStatuses = statuses.filter(s => s.type === "start").map(s => s.id);
                const dataByUser = {};

                for (const project of projects) {
                    const actions = await actionService.getActions(project.id);
                    for (const action of actions) {
                        if (!startStatuses.includes(action.status)) continue;
                        for (const uid of (action.assignedUsers || [])) {
                            if (!dataByUser[uid]) dataByUser[uid] = [];
                            dataByUser[uid].push({
                                id: action.id,
                                action: action.action,
                                priority: action.priority,
                                projectTitle: project.title,
                                projectId: project.id
                            });
                        }
                    }
                }

                setUserActions(dataByUser);
            } catch (error) {
                console.error("Error al cargar acciones en curso", error);
            } finally {
                setLoading(false);
            }
        }
        loadData();
    }, [currentUser]);

    function getUserName(uid) {
        const user = allUsers.find(u => u.id === uid);
        return user?.displayName || user?.email?.split("@")[0] || uid;
    }

    if (loading) return <div className="flex justify-center items-center py-12 text-gray-500 dark:text-gray-400">Cargando...</div>;

    const sortedUsers = Object.entries(userActions).sort((a, b) => b[1].length - a[1].length);
    const totalActions = sortedUsers.reduce((sum, [, actions]) => sum + actions.length, 0);

    if (sortedUsers.length === 0) {
        return (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-12 text-center">
                <Users className="w-12 h-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
                <h3 className="text-lg font-medium text-gray-700 dark:text-gray-200">No hay acciones en curso</h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Todas las acciones están finalizadas.</p>
            </div>
        );
    }

    return (
        <>
            {/* Summary */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 mb-6 md:max-w-xs">
                <div className="flex items-center gap-3">
                    <div className="bg-amber-100 dark:bg-amber-900/40 p-2 rounded-lg">
                        <Clock className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">{totalActions}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Acciones en curso</p>
                    </div>
                </div>
            </div>

            {/* Mobile: card layout */}
            <div className="md:hidden space-y-2">
                {sortedUsers.map(([uid, actions]) => (
                    <div key={uid} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
                        <div
                            className="flex items-center justify-between px-4 py-3 cursor-pointer"
                            onClick={() => setExpandedUserId(prev => prev === uid ? null : uid)}
                        >
                            <span className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">
                                {getUserName(uid)}
                            </span>
                            <div className="flex items-center gap-2 flex-shrink-0">
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-200">
                                    {actions.length}
                                </span>
                                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${expandedUserId === uid ? "rotate-180" : ""}`} />
                            </div>
                        </div>
                        {expandedUserId === uid && (
                            <div className="px-4 pb-3 border-t border-gray-100 dark:border-gray-700 pt-2 space-y-1.5">
                                {actions.map((a) => (
                                    <div key={a.id} className="text-xs">
                                        <span className="text-gray-500 dark:text-gray-400">{a.projectTitle}</span>
                                        <span className="text-gray-300 dark:text-gray-600 mx-1">·</span>
                                        <span className="text-gray-800 dark:text-gray-100">{a.action || "Sin descripción"}</span>
                                        {a.priority && <span className="ml-1 text-red-500">⚡</span>}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Desktop: table layout */}
            <div className="hidden md:block bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                        <tr>
                            <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Usuario</th>
                            <th className="text-center py-3 px-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase w-24">Acciones</th>
                            <th className="py-3 px-3 w-10"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedUsers.map(([uid, actions]) => (
                            <>
                                <tr
                                    key={uid}
                                    className="border-b border-gray-50 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/40 cursor-pointer"
                                    onClick={() => setExpandedUserId(prev => prev === uid ? null : uid)}
                                >
                                    <td className="py-3 px-4 text-gray-800 dark:text-gray-100">{getUserName(uid)}</td>
                                    <td className="py-3 px-3 text-center">
                                        <span className="bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-200 px-2.5 py-1 rounded-full text-xs font-semibold">{actions.length}</span>
                                    </td>
                                    <td className="py-3 px-3 text-right text-xs text-blue-600 dark:text-blue-300">
                                        {expandedUserId === uid ? "Ocultar" : "Ver"}
                                    </td>
                                </tr>
                                {expandedUserId === uid && (
                                    <tr>
                                        <td colSpan={3} className="px-4 py-3 bg-gray-50 dark:bg-gray-800/60">
                                            <div className="space-y-2">
                                                {actions.map((a) => (
                                                    <div key={a.id} className="flex items-start gap-2 text-sm">
                                                        <span className="text-xs bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-full flex-shrink-0">{a.projectTitle}</span>
                                                        <span className="text-gray-800 dark:text-gray-100">{a.action || "Sin descripción"}</span>
                                                        {a.priority && <span className="text-red-500 flex-shrink-0">⚡</span>}
                                                    </div>
                                                ))}
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </>
                        ))}
                    </tbody>
                </table>
            </div>
        </>
    );
}

// ─── Main Reports Component ─────────────────────────────────────────────
export default function Reports() {
    const [activeTab, setActiveTab] = useState("completed");

    const tabs = [
        { id: "completed", label: "Tareas Terminadas" },
        { id: "pending", label: "Pendientes por Usuario" },
        { id: "inprogress", label: "En Curso por Usuario" }
    ];

    return (
        <div className="max-w-6xl mx-auto">
            <div className="flex flex-col gap-2 mb-6">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-gray-100">Informes</h1>
            </div>

            {/* Tab navigation */}
            <div className="flex gap-1 mb-6 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${activeTab === tab.id
                            ? "bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 shadow-sm"
                            : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                            }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab content */}
            {activeTab === "completed" && <CompletedTab />}
            {activeTab === "pending" && <PendingByUserTab />}
            {activeTab === "inprogress" && <InProgressTab />}
        </div>
    );
}
