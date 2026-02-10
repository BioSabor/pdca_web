import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { projectService, actionService, statusService, userService, departmentService } from "../services/projectService";
import { Link, useNavigate } from "react-router-dom";
import { Plus, ChevronRight, Calendar, Users, AlertTriangle, Clock, CheckCircle, Archive, RotateCcw, Building2 } from "lucide-react";

export default function Dashboard() {
    const { currentUser } = useAuth();
    const navigate = useNavigate();
    const [projects, setProjects] = useState([]);
    const [projectStats, setProjectStats] = useState({});
    const [globalStats, setGlobalStats] = useState(null);
    const [allUsers, setAllUsers] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showArchived, setShowArchived] = useState(false);

    const isAdmin = currentUser?.role === "admin";

    useEffect(() => {
        async function loadData() {
            if (!currentUser) return;
            try {
                const [data, statuses, users, depts] = await Promise.all([
                    projectService.getUserProjects(currentUser.uid),
                    statusService.getStatuses(),
                    isAdmin ? userService.getAllUsers() : Promise.resolve([]),
                    departmentService.getDepartments()
                ]);
                setProjects(data);
                if (isAdmin) setAllUsers(users);
                setDepartments(depts);

                // Cargar acciones de cada proyecto para estadísticas
                const endStatuses = statuses.filter(s => s.type === "end").map(s => s.id);

                const stats = {};
                let totalPending = 0;
                let totalPriority = 0;
                const adminUserStats = {};

                for (const project of data) {
                    const actions = await actionService.getActions(project.id);
                    const myActions = actions.filter(a => a.assignedUsers?.includes(currentUser.uid));
                    const myPending = myActions.filter(a => !endStatuses.includes(a.status));
                    const myPriority = myActions.filter(a => a.priority && !endStatuses.includes(a.status));

                    const completedOrDiscarded = actions.filter(a => endStatuses.includes(a.status)).length;
                    const progress = actions.length > 0 ? Math.round((completedOrDiscarded / actions.length) * 100) : 0;

                    stats[project.id] = {
                        total: actions.length,
                        myPending: myPending.length,
                        myPriority: myPriority.length,
                        projectPending: actions.filter(a => !endStatuses.includes(a.status)).length,
                        progress: progress
                    };

                    totalPending += myPending.length;
                    totalPriority += myPriority.length;

                    // Admin: estadísticas por usuario
                    if (isAdmin) {
                        for (const action of actions) {
                            if (endStatuses.includes(action.status)) continue;
                            for (const uid of (action.assignedUsers || [])) {
                                if (!adminUserStats[uid]) adminUserStats[uid] = { pending: 0, priority: 0 };
                                adminUserStats[uid].pending++;
                                if (action.priority) adminUserStats[uid].priority++;
                            }
                        }
                    }
                }

                setProjectStats(stats);
                setGlobalStats({ totalPending, totalPriority, adminUserStats });
            } catch (error) {
                console.error("Error al cargar datos", error);
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

    if (loading) return <div className="flex justify-center items-center h-full">Cargando...</div>;

    return (
        <div>
            {/* Resumen global */}
            {globalStats && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                        <div className="flex items-center gap-3">
                            <div className="bg-blue-100 p-2.5 rounded-lg">
                                <Clock className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-gray-800">{globalStats.totalPending}</p>
                                <p className="text-xs text-gray-500">Acciones pendientes</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                        <div className="flex items-center gap-3">
                            <div className="bg-red-100 p-2.5 rounded-lg">
                                <AlertTriangle className="w-5 h-5 text-red-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-gray-800">{globalStats.totalPriority}</p>
                                <p className="text-xs text-gray-500">De alta prioridad</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                        <div className="flex items-center gap-3">
                            <div className="bg-green-100 p-2.5 rounded-lg">
                                <CheckCircle className="w-5 h-5 text-green-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-gray-800">{projects.length}</p>
                                <p className="text-xs text-gray-500">Proyectos activos</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Admin: detalle por usuario */}
            {isAdmin && globalStats?.adminUserStats && Object.keys(globalStats.adminUserStats).length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-8">
                    <h2 className="text-lg font-bold text-gray-800 mb-3">Acciones Pendientes por Usuario</h2>
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-200">
                                    <th className="text-left py-2 px-3 text-gray-500 font-medium">Usuario</th>
                                    <th className="text-center py-2 px-3 text-gray-500 font-medium">Pendientes</th>
                                    <th className="text-center py-2 px-3 text-gray-500 font-medium">Prioritarias</th>
                                </tr>
                            </thead>
                            <tbody>
                                {Object.entries(globalStats.adminUserStats)
                                    .sort((a, b) => b[1].pending - a[1].pending)
                                    .map(([uid, stat]) => (
                                        <tr key={uid} className="border-b border-gray-50 hover:bg-gray-50">
                                            <td className="py-2 px-3 text-gray-800">{getUserName(uid)}</td>
                                            <td className="py-2 px-3 text-center">
                                                <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs font-semibold">{stat.pending}</span>
                                            </td>
                                            <td className="py-2 px-3 text-center">
                                                {stat.priority > 0
                                                    ? <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full text-xs font-semibold">{stat.priority}</span>
                                                    : <span className="text-gray-400 text-xs">0</span>}
                                            </td>
                                        </tr>
                                    ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Proyectos */}
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">
                    {showArchived ? "Proyectos Archivados" : "Mis Proyectos"}
                </h2>
                <div className="flex gap-2">
                    <button
                        onClick={() => setShowArchived(!showArchived)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition text-sm ${showArchived ? 'bg-gray-100 text-gray-700 border-gray-300' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                    >
                        <Archive className="w-4 h-4" />
                        {showArchived ? "Ver Activos" : "Ver Archivados"}
                    </button>
                    {!showArchived && (
                        <Link
                            to="/projects/new"
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center hover:bg-blue-700 transition text-sm"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Nuevo Proyecto
                        </Link>
                    )}
                </div>
            </div>

            {projects.filter(p => !!p.archived === showArchived).length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm p-12 text-center">
                    <div className="text-gray-400 mb-4">
                        {showArchived ? <Archive className="w-12 h-12 mx-auto mb-4" /> : <Plus className="w-12 h-12 mx-auto mb-4" />}
                        <h3 className="text-lg font-medium">{showArchived ? "No hay proyectos archivados" : "Aún no hay proyectos activos"}</h3>
                        {!showArchived && <p>Crea tu primer proyecto para empezar a gestionar acciones de mejora.</p>}
                    </div>
                </div>
            ) : (
                <div className="space-y-8">
                    {/* Agrupación por departamentos */}
                    {(() => {
                        const activeProjects = projects.filter(p => !!p.archived === showArchived);
                        // Crear mapa de grupos
                        const groups = {};
                        // Inicializar grupos con departamentos existentes
                        departments.forEach(d => groups[d.id] = { name: d.name, projects: [] });
                        // Grupo "Sin Departamento"
                        groups['none'] = { name: "Sin Departamento", projects: [] };

                        activeProjects.forEach(p => {
                            if (p.assignedDepartments && p.assignedDepartments.length > 0) {
                                p.assignedDepartments.forEach(deptId => {
                                    if (groups[deptId]) {
                                        groups[deptId].projects.push(p);
                                    } else {
                                        // Si el departamento fue borrado pero el proyecto lo tiene referenciado
                                        if (!groups['none'].projects.includes(p)) groups['none'].projects.push(p);
                                    }
                                });
                            } else {
                                groups['none'].projects.push(p);
                            }
                        });

                        // Filtrar grupos vacíos
                        const visibleGroups = Object.entries(groups).filter(([_, group]) => group.projects.length > 0);

                        // Si no hay departamentos definidos o usados, mostrar todo junto (como antes, pero dentro de "Sin Departamento" o similar)
                        if (visibleGroups.length === 0) return null; // Should not happen if there are projects

                        return visibleGroups.map(([groupId, group]) => (
                            <div key={groupId}>
                                <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-700 mb-4 border-b border-gray-200 pb-2">
                                    {groupId === 'none' ? (
                                        <>
                                            <Users className="w-5 h-5 text-gray-400" />
                                            {group.name}
                                        </>
                                    ) : (
                                        <>
                                            <Building2 className="w-5 h-5 text-blue-500" />
                                            {group.name}
                                        </>
                                    )}
                                    <span className="text-xs font-normal text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full ml-auto">
                                        {group.projects.length}
                                    </span>
                                </h3>
                                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                    {group.projects.map(project => {
                                        const stat = projectStats[project.id];
                                        return (
                                            <div
                                                key={`${groupId}-${project.id}`}
                                                onClick={() => navigate(`/projects/${project.id}`)}
                                                className={`bg-white rounded-xl shadow-sm hover:shadow-md transition p-6 border cursor-pointer ${showArchived ? 'border-gray-200 bg-gray-50' : 'border-gray-100'}`}
                                            >
                                                <div className="flex justify-between items-start mb-4">
                                                    <div className="flex items-center text-xs text-gray-500">
                                                        <Users className="w-3 h-3 mr-1" />
                                                        {project.assignedUsers?.length || 0} usuario(s)
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs text-gray-500 flex items-center">
                                                            <Calendar className="w-3 h-3 mr-1" />
                                                            {project.createdAt?.seconds
                                                                ? new Date(project.createdAt.seconds * 1000).toLocaleDateString('es-ES')
                                                                : 'Ahora'}
                                                        </span>
                                                        <button
                                                            onClick={async (e) => {
                                                                e.preventDefault();
                                                                e.stopPropagation();
                                                                if (!confirm(`¿Estás seguro de que quieres ${showArchived ? 'desarchivar' : 'archivar'} este proyecto?`)) return;
                                                                try {
                                                                    await projectService.toggleProjectArchive(project.id, !showArchived);
                                                                    setProjects(prev => prev.map(p => p.id === project.id ? { ...p, archived: !showArchived } : p));
                                                                } catch (error) {
                                                                    alert("Error al actualizar el proyecto");
                                                                }
                                                            }}
                                                            className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-200 transition"
                                                            title={showArchived ? "Desarchivar proyecto" : "Archivar proyecto"}
                                                        >
                                                            {showArchived ? <RotateCcw className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
                                                        </button>
                                                    </div>
                                                </div>
                                                <h3 className="text-lg font-bold text-gray-800 mb-2 truncate">{project.title}</h3>
                                                <p className="text-gray-600 text-sm mb-3 line-clamp-2">{project.description}</p>

                                                {stat && (
                                                    <div className="mb-3">
                                                        <div className="flex justify-between text-xs text-gray-500 mb-1">
                                                            <span>Progreso</span>
                                                            <span>{stat.progress}%</span>
                                                        </div>
                                                        <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                                                            <div
                                                                className="bg-blue-600 h-1.5 rounded-full transition-all duration-500"
                                                                style={{ width: `${stat.progress}%` }}
                                                            ></div>
                                                        </div>
                                                        <div className="flex gap-2 mt-2 flex-wrap">
                                                            <span className="flex items-center gap-1 text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-md" title="Mis acciones pendientes">
                                                                <Users className="w-3 h-3" />
                                                                {stat.myPending} mías
                                                            </span>
                                                            <span className="flex items-center gap-1 text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-md" title="Total acciones pendientes en el proyecto">
                                                                <Clock className="w-3 h-3" />
                                                                {stat.projectPending} total
                                                            </span>
                                                            {stat.myPriority > 0 && (
                                                                <span className="flex items-center gap-1 text-xs bg-red-50 text-red-700 px-2 py-1 rounded-md">
                                                                    <AlertTriangle className="w-3 h-3" />
                                                                    {stat.myPriority} prioritaria(s)
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ));
                    })()}
                </div>
            )}
        </div>
    );
}
