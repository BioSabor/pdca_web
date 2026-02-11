import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { projectService, actionService, statusService, userService, departmentService } from "../services/projectService";
import { Link, useNavigate } from "react-router-dom";
import { Plus, Calendar, Users, AlertTriangle, Clock, CheckCircle, Archive, RotateCcw, Building2 } from "lucide-react";

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


    useEffect(() => {
        async function loadData() {
            if (!currentUser) return;
            try {
                const [data, statuses, users, depts] = await Promise.all([
                    projectService.getUserProjects(currentUser.uid),
                    statusService.getStatuses(),
                    userService.getAllUsers(),
                    departmentService.getDepartments()
                ]);
                setProjects(data);
                setAllUsers(users);
                setDepartments(depts);

                // Cargar acciones de cada proyecto para estadísticas
                const endStatuses = statuses.filter(s => s.type === "end").map(s => s.id);

                const stats = {};

                let totalPending = 0;
                let totalPriority = 0;


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


                }

                setProjectStats(stats);
                setGlobalStats({ totalPending, totalPriority });
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
                <div className="grid grid-cols-3 gap-2 md:gap-4 mb-8 md:max-w-4xl md:mx-auto">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-3 md:p-5">
                        <div className="flex flex-col items-center text-center md:flex-row md:text-left gap-1 md:gap-3">
                            <div className="bg-blue-100 dark:bg-blue-900/40 p-1.5 md:p-2.5 rounded-lg">
                                <Clock className="w-4 h-4 md:w-5 md:h-5 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-lg md:text-2xl font-bold text-gray-800 dark:text-gray-100">{globalStats.totalPending}</p>
                                <p className="text-[10px] md:text-xs text-gray-500 dark:text-gray-400 leading-tight">Pendientes</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-3 md:p-5">
                        <div className="flex flex-col items-center text-center md:flex-row md:text-left gap-1 md:gap-3">
                            <div className="bg-red-100 dark:bg-red-900/40 p-1.5 md:p-2.5 rounded-lg">
                                <AlertTriangle className="w-4 h-4 md:w-5 md:h-5 text-red-600" />
                            </div>
                            <div>
                                <p className="text-lg md:text-2xl font-bold text-gray-800 dark:text-gray-100">{globalStats.totalPriority}</p>
                                <p className="text-[10px] md:text-xs text-gray-500 dark:text-gray-400 leading-tight">Prioritarias</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-3 md:p-5">
                        <div className="flex flex-col items-center text-center md:flex-row md:text-left gap-1 md:gap-3">
                            <div className="bg-green-100 dark:bg-green-900/40 p-1.5 md:p-2.5 rounded-lg">
                                <CheckCircle className="w-4 h-4 md:w-5 md:h-5 text-green-600" />
                            </div>
                            <div>
                                <p className="text-lg md:text-2xl font-bold text-gray-800 dark:text-gray-100">{projects.length}</p>
                                <p className="text-[10px] md:text-xs text-gray-500 dark:text-gray-400 leading-tight">Proyectos</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}


            {/* Proyectos */}
            <div className="flex justify-between items-center mb-6 gap-2">
                <h2 className="text-lg md:text-2xl font-bold text-gray-800 dark:text-gray-100 truncate">
                    {showArchived ? "Archivados" : "Mis Proyectos"}
                </h2>
                <div className="flex gap-1.5 md:gap-2 flex-shrink-0">
                    <button
                        onClick={() => setShowArchived(!showArchived)}
                        className={`flex items-center gap-1 md:gap-2 px-2 md:px-4 py-1.5 md:py-2 rounded-lg border transition text-xs md:text-sm ${showArchived ? 'bg-gray-100 text-gray-700 border-gray-300' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                    >
                        <Archive className="w-3.5 h-3.5 md:w-4 md:h-4" />
                        <span className="hidden sm:inline">{showArchived ? "Ver Activos" : "Ver Archivados"}</span>
                        <span className="sm:hidden">{showArchived ? "Activos" : "Archivo"}</span>
                    </button>
                    {!showArchived && (
                        <Link
                            to="/projects/new"
                            className="bg-blue-600 text-white px-2 md:px-4 py-1.5 md:py-2 rounded-lg flex items-center hover:bg-blue-700 transition text-xs md:text-sm"
                        >
                            <Plus className="w-3.5 h-3.5 md:w-4 md:h-4 mr-1 md:mr-2" />
                            <span className="hidden sm:inline">Nuevo Proyecto</span>
                            <span className="sm:hidden">Nuevo</span>
                        </Link>
                    )}
                </div>
            </div>

            {projects.filter(p => !!p.archived === showArchived).length === 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-12 text-center">
                    <div className="text-gray-400 dark:text-gray-500 mb-4">
                        {showArchived ? <Archive className="w-12 h-12 mx-auto mb-4" /> : <Plus className="w-12 h-12 mx-auto mb-4" />}
                        <h3 className="text-lg font-medium text-gray-700 dark:text-gray-200">{showArchived ? "No hay proyectos archivados" : "Aún no hay proyectos activos"}</h3>
                        {!showArchived && <p className="text-gray-500 dark:text-gray-400">Crea tu primer proyecto para empezar a gestionar acciones de mejora.</p>}
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
                                <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-700 dark:text-gray-200 mb-4 border-b border-gray-200 dark:border-gray-700 pb-2">
                                    {groupId === 'none' ? (
                                        <>
                                            <Users className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                                            {group.name}
                                        </>
                                    ) : (
                                        <>
                                            <Building2 className="w-5 h-5 text-blue-500" />
                                            {group.name}
                                        </>
                                    )}
                                    <span className="text-xs font-normal text-gray-400 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full ml-auto">
                                        {group.projects.length}
                                    </span>
                                </h3>
                                <div className="grid gap-2 md:gap-4 md:grid-cols-2 lg:grid-cols-3">
                                    {group.projects.map(project => {
                                        const stat = projectStats[project.id];
                                        const assignedUsers = project.assignedUsers || [];
                                        const visibleUsers = assignedUsers.slice(0, 3);
                                        const remainingUsers = assignedUsers.length - visibleUsers.length;

                                        return (
                                            <div
                                                key={`${groupId}-${project.id}`}
                                                onClick={() => navigate(`/projects/${project.id}`)}
                                                className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md transition p-3 md:p-6 border cursor-pointer ${showArchived ? 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/70' : 'border-gray-100 dark:border-gray-700'}`}
                                            >
                                                {/* Mobile: compact layout */}
                                                <div className="md:hidden">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100 truncate flex-1">{project.title}</h3>
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
                                                            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-0.5 rounded-full flex-shrink-0"
                                                            title={showArchived ? "Desarchivar proyecto" : "Archivar proyecto"}
                                                        >
                                                            {showArchived ? <RotateCcw className="w-3.5 h-3.5" /> : <Archive className="w-3.5 h-3.5" />}
                                                        </button>
                                                    </div>
                                                    {stat && (
                                                        <div className="flex items-center gap-2 mb-1.5">
                                                            <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
                                                                <div className="bg-blue-600 h-1.5 rounded-full transition-all duration-500" style={{ width: `${stat.progress}%` }}></div>
                                                            </div>
                                                            <span className="text-[10px] text-gray-500 dark:text-gray-400 flex-shrink-0">{stat.progress}%</span>
                                                        </div>
                                                    )}
                                                    <div className="flex items-center gap-2 text-[11px] text-gray-500 dark:text-gray-400 flex-wrap">
                                                        {stat && (
                                                            <>
                                                                <span className="flex items-center gap-0.5"><Users className="w-2.5 h-2.5" />{stat.myPending} mías</span>
                                                                <span className="text-gray-300 dark:text-gray-600">·</span>
                                                                <span className="flex items-center gap-0.5"><Clock className="w-2.5 h-2.5" />{stat.projectPending} total</span>
                                                                {stat.myPriority > 0 && (
                                                                    <>
                                                                        <span className="text-gray-300 dark:text-gray-600">·</span>
                                                                        <span className="flex items-center gap-0.5 text-red-500"><AlertTriangle className="w-2.5 h-2.5" />{stat.myPriority}</span>
                                                                    </>
                                                                )}
                                                            </>
                                                        )}
                                                        {assignedUsers.length > 0 && (
                                                            <>
                                                                <span className="text-gray-300 dark:text-gray-600">·</span>
                                                                <span>{assignedUsers.length} usuario(s)</span>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Desktop: original layout */}
                                                <div className="hidden md:block">
                                                    <div className="flex justify-between items-start mb-4">
                                                        <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                                                            <Users className="w-3 h-3 mr-1" />
                                                            {project.assignedUsers?.length || 0} usuario(s)
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center">
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
                                                                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition"
                                                                title={showArchived ? "Desarchivar proyecto" : "Archivar proyecto"}
                                                            >
                                                                {showArchived ? <RotateCcw className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-2 truncate">{project.title}</h3>
                                                    <p className="text-gray-600 dark:text-gray-300 text-sm mb-3 line-clamp-2">{project.description}</p>

                                                    <div className="flex flex-wrap gap-2 mb-3">
                                                        {visibleUsers.map((uid) => (
                                                            <span key={uid} className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-2 py-1 rounded-full">
                                                                {getUserName(uid)}
                                                            </span>
                                                        ))}
                                                        {remainingUsers > 0 && (
                                                            <span className="text-xs bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 px-2 py-1 rounded-full">
                                                                +{remainingUsers}
                                                            </span>
                                                        )}
                                                        {assignedUsers.length === 0 && (
                                                            <span className="text-xs text-gray-400 dark:text-gray-500">Sin usuarios asignados</span>
                                                        )}
                                                    </div>

                                                    {stat && (
                                                        <div className="mb-3">
                                                            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                                                                <span>Progreso</span>
                                                                <span>{stat.progress}%</span>
                                                            </div>
                                                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
                                                                <div
                                                                    className="bg-blue-600 h-1.5 rounded-full transition-all duration-500"
                                                                    style={{ width: `${stat.progress}%` }}
                                                                ></div>
                                                            </div>
                                                            <div className="flex gap-2 mt-2 flex-wrap">
                                                                <span className="flex items-center gap-1 text-xs bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-200 px-2 py-1 rounded-md" title="Mis acciones pendientes">
                                                                    <Users className="w-3 h-3" />
                                                                    {stat.myPending} mías
                                                                </span>
                                                                <span className="flex items-center gap-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-2 py-1 rounded-md" title="Total acciones pendientes en el proyecto">
                                                                    <Clock className="w-3 h-3" />
                                                                    {stat.projectPending} total
                                                                </span>
                                                                {stat.myPriority > 0 && (
                                                                    <span className="flex items-center gap-1 text-xs bg-red-50 dark:bg-red-900/40 text-red-700 dark:text-red-200 px-2 py-1 rounded-md">
                                                                        <AlertTriangle className="w-3 h-3" />
                                                                        {stat.myPriority} prioritaria(s)
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
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
