import { useEffect, useMemo, useState } from "react";
import { collectionGroup, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebase";
import { statusService, userService } from "../services/projectService";

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

export default function Reports() {
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
                    const actionsQuery = query(
                        collectionGroup(db, "actions"),
                        where("status", "in", endStatusIds)
                    );
                    const snapshot = await getDocs(actionsQuery);
                    actions = snapshot.docs.map((actionDoc) => ({
                        id: actionDoc.id,
                        ...actionDoc.data(),
                        projectId: actionDoc.ref.parent.parent?.id || null
                    }));
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
        <div className="max-w-6xl mx-auto">
            <div className="flex flex-col gap-2 mb-6">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-gray-100">Informes</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                    Tareas terminadas por usuario en el periodo seleccionado.
                </p>
            </div>

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

            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-x-auto">
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
        </div>
    );
}
