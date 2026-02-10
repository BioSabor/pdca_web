import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { projectService, actionService, statusService, userService, departmentService } from "../services/projectService";
import { ArrowLeft, Plus, Trash2, Filter, X, ChevronDown, Pencil, Trash, Building2 } from "lucide-react";
import { createPortal } from "react-dom";
import { useAuth } from "../context/AuthContext";
import GanttModal from "../components/GanttModal";

// Componente dropdown con checkboxes reutilizable
function MultiCheckDropdown({ options, selected, onChange, placeholder }) {
    const [open, setOpen] = useState(false);
    const btnRef = useRef(null);
    const dropRef = useRef(null);
    const [pos, setPos] = useState({ top: 0, left: 0 });

    useEffect(() => {
        function handleClickOutside(e) {
            if (btnRef.current && !btnRef.current.contains(e.target) &&
                dropRef.current && !dropRef.current.contains(e.target)) setOpen(false);
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    function handleOpen() {
        if (!open && btnRef.current) {
            const rect = btnRef.current.getBoundingClientRect();
            setPos({ top: rect.bottom + 2, left: rect.left });
        }
        setOpen(!open);
    }

    function toggle(value) {
        if (selected.includes(value)) {
            onChange(selected.filter(v => v !== value));
        } else {
            onChange([...selected, value]);
        }
    }

    const selectedLabels = options
        .filter(o => selected.includes(o.value))
        .map(o => o.label);

    return (
        <>
            <button
                ref={btnRef}
                type="button"
                onClick={handleOpen}
                className="flex items-center gap-2 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 min-w-[140px] justify-between"
            >
                <span className="truncate text-left">
                    {selected.length === 0
                        ? placeholder
                        : selectedLabels.length <= 2
                            ? selectedLabels.join(", ")
                            : `${selectedLabels.length} seleccionados`}
                </span>
                <ChevronDown className="w-3 h-3 text-gray-400 dark:text-gray-500 flex-shrink-0" />
            </button>
            {open && createPortal(
                <div
                    ref={dropRef}
                    className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg min-w-[200px] max-h-48 overflow-y-auto"
                    style={{ position: "fixed", top: pos.top, left: pos.left, zIndex: 9999 }}
                >
                    {options.map(opt => (
                        <label key={opt.value} className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800">
                            <input type="checkbox" checked={selected.includes(opt.value)} onChange={() => toggle(opt.value)} className="w-4 h-4 text-blue-600 rounded" />
                            {opt.color && <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: opt.color }}></span>}
                            <span className="text-sm text-gray-700 dark:text-gray-200">{opt.label}</span>
                        </label>
                    ))}
                </div>,
                document.body
            )}
        </>
    );
}

// Dropdown inline para editar usuarios asignados (anclado a la celda)
function UserCheckDropdown({ users, selected, onToggle, onClose, anchorEl }) {
    const dropRef = useRef(null);

    useEffect(() => {
        function handleClickOutside(e) {
            if (dropRef.current && !dropRef.current.contains(e.target) &&
                anchorEl && !anchorEl.contains(e.target)) onClose();
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [onClose, anchorEl]);

    return (
        <div
            ref={dropRef}
            className="absolute left-0 mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg min-w-[200px] max-h-48 overflow-y-auto z-30"
        >
            {users.map(u => (
                <label key={u.id} className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800">
                    <input type="checkbox" checked={selected.includes(u.id)} onChange={() => onToggle(u.id)} className="w-4 h-4 text-blue-600 rounded" />
                    <span className="text-sm text-gray-700 dark:text-gray-200">
                        {u.displayName || u.email}
                        {!u.email && <span className="text-xs text-gray-400 dark:text-gray-500 ml-1">(Entidad)</span>}
                    </span>
                </label>
            ))}
            <div className="border-t border-gray-200 dark:border-gray-700 p-2">
                <button onClick={onClose} className="text-xs text-blue-600 dark:text-blue-300 hover:underline w-full text-center">Cerrar</button>
            </div>
        </div>
    );
}

export default function ProjectDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { currentUser } = useAuth();
    const [project, setProject] = useState(null);
    const [actions, setActions] = useState([]);
    const [statuses, setStatuses] = useState([]);
    const [allUsers, setAllUsers] = useState([]);
    const [allDepartments, setAllDepartments] = useState([]);
    const [loading, setLoading] = useState(true);

    const [filterUsers, setFilterUsers] = useState([]);
    const [filterStatuses, setFilterStatuses] = useState([]);
    const [filterDateFrom, setFilterDateFrom] = useState("");
    const [filterDateTo, setFilterDateTo] = useState("");
    const [showFilters, setShowFilters] = useState(false);
    const [filtersLoaded, setFiltersLoaded] = useState(false);

    // Cargar filtros guardados
    useEffect(() => {
        if (!currentUser || !id) return;
        const key = `pdca_filters_${currentUser.uid}_${id}`;
        const saved = localStorage.getItem(key);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                setFilterUsers(parsed.filterUsers || []);
                setFilterStatuses(parsed.filterStatuses || []);
                setFilterDateFrom(parsed.filterDateFrom || "");
                setFilterDateTo(parsed.filterDateTo || "");
            } catch (error) {
                console.error("Error parsing filters", error);
            }
        } else {
            setFilterUsers([]);
            setFilterStatuses([]);
            setFilterDateFrom("");
            setFilterDateTo("");
        }
        setFiltersLoaded(true);
        return () => setFiltersLoaded(false);
    }, [currentUser, id]);

    // Guardar filtros
    useEffect(() => {
        if (!currentUser || !id || !filtersLoaded) return;
        const key = `pdca_filters_${currentUser.uid}_${id}`;
        const data = { filterUsers, filterStatuses, filterDateFrom, filterDateTo };
        localStorage.setItem(key, JSON.stringify(data));
    }, [filterUsers, filterStatuses, filterDateFrom, filterDateTo, currentUser, id, filtersLoaded]);

    const [showNewRow, setShowNewRow] = useState(false);
    const [newAction, setNewAction] = useState({
        action: "", assignedUsers: [], status: "pendiente",
        proposedStartDate: "", proposedEndDate: "", startDate: "", actualEndDate: "", observations: "",
        priority: false
    });

    const [editingUsersActionId, setEditingUsersActionId] = useState(null);
    const userCellRefs = useRef({});

    const [editingProject, setEditingProject] = useState(false);
    const [editTitle, setEditTitle] = useState("");
    const [editDescription, setEditDescription] = useState("");
    const [editAssignedUsers, setEditAssignedUsers] = useState([]);
    const [editAssignedDepartments, setEditAssignedDepartments] = useState([]);

    const [showGantt, setShowGantt] = useState(false);

    useEffect(() => { loadAll(); }, [id]);

    async function loadAll() {
        try {
            const [proj, acts, sts, users, depts] = await Promise.all([
                projectService.getProject(id),
                actionService.getActions(id),
                statusService.getStatuses(),
                userService.getAllUsers(),
                departmentService.getDepartments()
            ]);
            setProject(proj);
            setActions(acts);
            setStatuses(sts);
            setAllUsers(users);
            setAllDepartments(depts);
        } catch (error) {
            console.error("Error cargando proyecto:", error);
        } finally {
            setLoading(false);
        }
    }

    function getUserName(uid) {
        const user = allUsers.find(u => u.id === uid);
        return user?.displayName || user?.email?.split("@")[0] || uid;
    }

    function getStatusConfig(statusId) {
        return statuses.find(s => s.id === statusId) || { label: statusId, color: "#9CA3AF", type: "none" };
    }

    function getReadableTextColor(hexColor) {
        if (!hexColor || typeof hexColor !== "string") return "#111827";
        const clean = hexColor.replace("#", "");
        if (clean.length !== 6) return "#111827";
        const r = parseInt(clean.slice(0, 2), 16);
        const g = parseInt(clean.slice(2, 4), 16);
        const b = parseInt(clean.slice(4, 6), 16);
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        return luminance > 0.6 ? "#111827" : "#F9FAFB";
    }

    function autoResize(el) {
        if (!el) return;
        el.style.height = 'auto';
        el.style.height = el.scrollHeight + 'px';
    }

    const today = new Date().toISOString().split('T')[0];
    function isOverdue(dateStr) {
        return dateStr && dateStr < today;
    }

    const projectUsers = allUsers.filter(u => project?.assignedUsers?.includes(u.id));
    const projectDepartments = allDepartments.filter(d => project?.assignedDepartments?.includes(d.id));

    const filteredActions = actions.filter(a => {
        if (filterUsers.length > 0 && (!a.assignedUsers || !a.assignedUsers.some(u => filterUsers.includes(u)))) return false;
        if (filterStatuses.length > 0 && !filterStatuses.includes(a.status)) return false;
        if (filterDateFrom && a.startDate && a.startDate < filterDateFrom) return false;
        if (filterDateTo && a.startDate && a.startDate > filterDateTo) return false;
        return true;
    });

    async function handleAddAction() {
        if (!newAction.action.trim()) return alert("Escribe una descripción para la acción.");
        try {
            const { id: newId, seqId } = await actionService.addAction(id, newAction);
            setActions([...actions, { id: newId, seqId, ...newAction, createdAt: { seconds: Date.now() / 1000 } }]);
            setNewAction({
                action: "", assignedUsers: [], status: "pendiente",
                proposedEndDate: "", startDate: "", actualEndDate: "", observations: "",
                priority: false
            });
            setShowNewRow(false);
        } catch (error) {
            alert("Error al añadir acción");
        }
    }

    async function handleUpdateField(actionId, field, value) {
        try {
            await actionService.updateAction(id, actionId, { [field]: value });
            setActions(actions.map(a => a.id === actionId ? { ...a, [field]: value } : a));
        } catch (error) {
            console.error("Error al actualizar:", error);
        }
    }

    // Cambio de estado con auto-fill de fechas
    async function handleStatusChange(actionId, newStatusId) {
        const statusCfg = getStatusConfig(newStatusId);
        const action = actions.find(a => a.id === actionId);
        const updates = { status: newStatusId };

        if (statusCfg.type === "start") {
            // Auto-rellenar fecha inicio
            updates.startDate = today;
        } else if (statusCfg.type === "end") {
            // Auto-rellenar fecha fin real solo si está vacía
            if (!action?.actualEndDate) {
                updates.actualEndDate = today;
            }
        }

        try {
            await actionService.updateAction(id, actionId, updates);
            setActions(actions.map(a => a.id === actionId ? { ...a, ...updates } : a));
        } catch (error) {
            console.error("Error al actualizar estado:", error);
        }
    }

    async function handleDeleteAction(actionId) {
        if (!confirm("¿Eliminar esta acción?")) return;
        try {
            await actionService.deleteAction(id, actionId);
            setActions(actions.filter(a => a.id !== actionId));
        } catch (error) {
            alert("Error al eliminar acción");
        }
    }

    function toggleExistingActionUser(actionId, uid) {
        const action = actions.find(a => a.id === actionId);
        const current = action?.assignedUsers || [];
        const updated = current.includes(uid) ? current.filter(i => i !== uid) : [...current, uid];
        handleUpdateField(actionId, "assignedUsers", updated);
    }

    function clearFilters() {
        setFilterUsers([]);
        setFilterStatuses([]);
        setFilterDateFrom("");
        setFilterDateTo("");
    }

    const hasActiveFilters = filterUsers.length > 0 || filterStatuses.length > 0 || filterDateFrom || filterDateTo;

    const isCreator = currentUser?.uid === project?.createdBy;

    function startEditProject() {
        setEditTitle(project.title);
        setEditDescription(project.description || "");
        setEditAssignedUsers(project.assignedUsers || []);
        setEditAssignedDepartments(project.assignedDepartments || []);
        setEditingProject(true);
    }

    async function saveProjectEdits() {
        try {
            await projectService.updateProject(id, {
                title: editTitle,
                description: editDescription,
                assignedUsers: editAssignedUsers,
                assignedDepartments: editAssignedDepartments
            });
            setProject({
                ...project,
                title: editTitle,
                description: editDescription,
                assignedUsers: editAssignedUsers,
                assignedDepartments: editAssignedDepartments
            });
            setEditingProject(false);
        } catch (error) {
            alert("Error al actualizar proyecto");
        }
    }

    async function handleDeleteProject() {
        if (!confirm("¿Estás seguro de que quieres eliminar este proyecto y todas sus acciones? Esta acción no se puede deshacer.")) return;
        try {
            // Eliminar todas las acciones primero
            for (const action of actions) {
                await actionService.deleteAction(id, action.id);
            }
            await projectService.deleteProject(id);
            navigate("/");
        } catch (error) {
            alert("Error al eliminar proyecto");
        }
    }

    if (loading) return <div className="flex justify-center p-8">Cargando...</div>;
    if (!project) return <div className="text-center p-8">Proyecto no encontrado</div>;

    const userOptions = allUsers.map(u => ({
        value: u.id,
        label: `${u.displayName || u.email}${!u.email ? ' (Entidad)' : ''}`
    }));
    const deptOptions = allDepartments.map(d => ({ value: d.id, label: d.name }));
    const statusOptions = statuses.map(s => ({ value: s.id, label: s.label, color: s.color }));

    // Calcular progreso
    const totalActions = actions.length;
    const completedOrDiscarded = actions.filter(a => {
        const cfg = getStatusConfig(a.status);
        return cfg.type === 'end';
    }).length;
    const progressPercentage = totalActions > 0 ? Math.round((completedOrDiscarded / totalActions) * 100) : 0;
    const hasObservations = actions.some(a => (a.observations || "").trim().length > 0);


    return (
        <div>
            <div className="mb-6">
                <Link to="/" className="flex items-center text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 mb-4">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Volver al Panel
                </Link>

                {editingProject ? (
                    <div className="space-y-3 mb-3">
                        <input
                            type="text"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            className="text-3xl font-bold text-gray-800 dark:text-gray-100 w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-1 focus:ring-2 focus:ring-blue-500 focus:outline-none dark:bg-gray-900"
                        />
                        <textarea
                            value={editDescription}
                            onChange={(e) => setEditDescription(e.target.value)}
                            rows={2}
                            placeholder="Descripción del proyecto"
                            className="w-full text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none dark:bg-gray-900"
                        />
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-600 dark:text-gray-300">Usuarios asignados:</span>
                            <MultiCheckDropdown
                                options={userOptions}
                                selected={editAssignedUsers}
                                onChange={setEditAssignedUsers}
                                placeholder="Seleccionar usuarios"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-600 dark:text-gray-300">Departamentos:</span>
                            <MultiCheckDropdown
                                options={deptOptions}
                                selected={editAssignedDepartments}
                                onChange={setEditAssignedDepartments}
                                placeholder="Seleccionar departamentos"
                            />
                        </div>
                        <div className="flex gap-2 pt-2">
                            <button onClick={saveProjectEdits} className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">Guardar</button>
                            <button onClick={() => setEditingProject(false)} className="px-3 py-1.5 text-gray-600 dark:text-gray-300 text-sm border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">Cancelar</button>
                        </div>
                    </div>
                ) : (
                    <div className="flex items-start justify-between">
                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-gray-100">{project.title}</h1>
                            <p className="text-gray-600 dark:text-gray-300 mt-1">{project.description}</p>
                        </div>
                        {isCreator && (
                            <div className="flex gap-2 ml-4 flex-shrink-0">
                                <button onClick={() => setShowGantt(true)} className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/30 rounded-lg transition" title="Ver Diagrama de Gantt">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-bar-chart-horizontal-big"><path d="M3 3v18h18" /><rect width="12" height="4" x="7" y="5" rx="1" /><rect width="7" height="4" x="7" y="13" rx="1" /></svg>
                                </button>
                                <button onClick={startEditProject} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition" title="Editar proyecto">
                                    <Pencil className="w-4 h-4" />
                                </button>
                                <button onClick={handleDeleteProject} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition" title="Eliminar proyecto">
                                    <Trash className="w-4 h-4" />
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* Barra de progreso */}
                <div className="mt-4 mb-2">
                    <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                        <span>Progreso del proyecto</span>
                        <span>{progressPercentage}%</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 overflow-hidden">
                        <div
                            className="bg-blue-600 h-2.5 rounded-full transition-all duration-500"
                            style={{ width: `${progressPercentage}%` }}
                        ></div>
                    </div>
                </div>

                <div className="flex items-center gap-2 mt-4 flex-wrap">
                    <span className="text-xs text-gray-500 dark:text-gray-400">Usuarios:</span>
                    {projectUsers.map(u => (
                        <span key={u.id} className="text-xs bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-200 px-2 py-0.5 rounded-full">
                            {u.displayName || u.email}
                        </span>
                    ))}
                    {projectDepartments.length > 0 && (
                        <>
                            <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">Departamentos:</span>
                            {projectDepartments.map(d => (
                                <span key={d.id} className="text-xs bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                                    <Building2 className="w-3 h-3" />
                                    {d.name}
                                </span>
                            ))}
                        </>
                    )}
                </div>
            </div>

            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
                <div className="flex gap-2">
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition ${hasActiveFilters ? 'bg-blue-50 border-blue-300 text-blue-700 dark:bg-blue-900/30 dark:border-blue-700 dark:text-blue-200' : 'border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                            }`}
                    >
                        <Filter className="w-4 h-4" />
                        Filtros
                        {hasActiveFilters && (
                            <button onClick={(e) => { e.stopPropagation(); clearFilters(); }} className="ml-1">
                                <X className="w-3 h-3" />
                            </button>
                        )}
                    </button>
                </div>
                <button
                    onClick={() => setShowNewRow(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm"
                >
                    <Plus className="w-4 h-4" />
                    Nueva Acción
                </button>
            </div>

            {/* Filtros multi-select */}
            {showFilters && (
                <div className="bg-gray-50 dark:bg-gray-800/70 border border-gray-200 dark:border-gray-700 rounded-lg p-4 mb-4 flex flex-wrap gap-4 items-end">
                    <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Usuarios</label>
                        <MultiCheckDropdown options={userOptions} selected={filterUsers} onChange={setFilterUsers} placeholder="Todos" />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Estados</label>
                        <MultiCheckDropdown options={statusOptions} selected={filterStatuses} onChange={setFilterStatuses} placeholder="Todos" />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Fecha inicio desde</label>
                        <input type="date" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)} className="border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-1.5 text-sm dark:bg-gray-900 dark:text-gray-100" />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Fecha inicio hasta</label>
                        <input type="date" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)} className="border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-1.5 text-sm dark:bg-gray-900 dark:text-gray-100" />
                    </div>
                    {hasActiveFilters && (
                        <button onClick={clearFilters} className="text-xs text-red-500 hover:text-red-700 dark:text-red-300 dark:hover:text-red-200 px-2 py-1.5">
                            Limpiar filtros
                        </button>
                    )}
                </div>
            )}

            {/* Tabla de acciones */}
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-x-auto">
                <table className={`w-full ${hasObservations ? "min-w-[1200px]" : "min-w-[980px]"} divide-y divide-gray-200 dark:divide-gray-700 text-sm`}>
                    <thead className="bg-gray-50 dark:bg-gray-800">
                        <tr>
                            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase w-8">#</th>
                            <th className="px-1 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase w-8" title="Prioridad">⚡</th>
                            <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase w-16">Fecha</th>
                            <th className={`px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase ${hasObservations ? "min-w-[420px]" : "min-w-[560px]"} w-full`}>Acción</th>
                            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase min-w-[140px]">Responsable</th>
                            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase w-32">Estado</th>
                            <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase w-16 leading-3">F. Inicio<br />Propuesta</th>
                            <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase w-16 leading-3">F. Fin<br />Propuesta</th>
                            <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase w-16 leading-3">F. Inicio<br />Real</th>
                            <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase w-16 leading-3">F. Fin<br />Real</th>
                            <th className={`px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase ${hasObservations ? "min-w-[320px]" : "min-w-[140px]"} ${hasObservations ? "w-[30%]" : "w-[12%]"}`}>Observaciones</th>
                            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase w-10"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                        {filteredActions.map((action, index) => {
                            const statusCfg = getStatusConfig(action.status);
                            const isEditingUsers = editingUsersActionId === action.id;
                            return (
                                <tr key={action.id} className={`hover:bg-gray-50 dark:hover:bg-gray-800 transition ${action.priority ? 'bg-red-50/50 dark:bg-red-900/20' : ''}`}>
                                    <td className="px-3 py-2 text-gray-400 dark:text-gray-500">{action.seqId || "-"}</td>
                                    <td className="px-3 py-2 text-center">
                                        <input
                                            type="checkbox"
                                            checked={!!action.priority}
                                            onChange={(e) => handleUpdateField(action.id, "priority", e.target.checked)}
                                            className="w-4 h-4 text-red-500 rounded cursor-pointer accent-red-500"
                                            title="Marcar como prioritaria"
                                        />
                                    </td>
                                    <td className="px-3 py-2 text-gray-600 dark:text-gray-200 whitespace-nowrap">
                                        {action.createdAt?.seconds
                                            ? new Date(action.createdAt.seconds * 1000).toLocaleDateString('es-ES')
                                            : '-'}
                                    </td>
                                    <td className="px-3 py-2">
                                        <textarea
                                            defaultValue={action.action}
                                            onBlur={(e) => {
                                                if (e.target.value !== action.action)
                                                    handleUpdateField(action.id, "action", e.target.value);
                                            }}
                                            onInput={(e) => autoResize(e.target)}
                                            ref={(el) => { if (el) setTimeout(() => autoResize(el), 0); }}
                                            rows={1}
                                            className="w-full bg-transparent border-0 focus:ring-1 focus:ring-blue-400 rounded px-1 py-0.5 text-gray-800 dark:text-gray-100 resize-none overflow-hidden"
                                        />
                                    </td>
                                    {/* Responsable: portal dropdown */}
                                    <td
                                        className="px-3 py-2 relative"
                                        ref={(el) => { if (el) userCellRefs.current[action.id] = el; }}
                                    >
                                        <div
                                            onClick={() => setEditingUsersActionId(isEditingUsers ? null : action.id)}
                                            className="cursor-pointer text-gray-700 dark:text-gray-200 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded px-1 py-0.5 min-h-[24px]"
                                            title="Clic para editar responsables"
                                        >
                                            {(action.assignedUsers || []).length > 0
                                                ? action.assignedUsers.map(uid => getUserName(uid)).join(", ")
                                                : <span className="text-gray-400 dark:text-gray-500 italic">Sin asignar</span>}
                                        </div>
                                        {isEditingUsers && userCellRefs.current[action.id] && (
                                            <UserCheckDropdown
                                                users={projectUsers}
                                                selected={action.assignedUsers || []}
                                                onToggle={(uid) => toggleExistingActionUser(action.id, uid)}
                                                onClose={() => setEditingUsersActionId(null)}
                                                anchorEl={userCellRefs.current[action.id]}
                                            />
                                        )}
                                    </td>
                                    <td className="px-3 py-2">
                                        <select
                                            value={action.status || "pendiente"}
                                            onChange={(e) => handleStatusChange(action.id, e.target.value)}
                                            className="rounded-full text-sm font-semibold px-3 py-1.5 border-0 cursor-pointer w-full min-w-[120px] shadow-sm"
                                            style={{ backgroundColor: statusCfg.color, color: getReadableTextColor(statusCfg.color) }}
                                        >
                                            {statuses.map(s => (
                                                <option key={s.id} value={s.id} style={{ color: "#333", backgroundColor: "#fff" }}>{s.label}</option>
                                            ))}
                                        </select>
                                    </td>
                                    <td className="px-1 py-2">
                                        <input
                                            type="date"
                                            defaultValue={action.proposedStartDate || ""}
                                            onBlur={(e) => handleUpdateField(action.id, "proposedStartDate", e.target.value)}
                                            className="bg-transparent border-0 focus:ring-1 focus:ring-blue-400 rounded text-xs text-gray-700 dark:text-gray-200 w-full p-0"
                                        />
                                    </td>
                                    <td className="px-1 py-2">
                                        <input
                                            type="date"
                                            defaultValue={action.proposedEndDate || ""}
                                            onBlur={(e) => handleUpdateField(action.id, "proposedEndDate", e.target.value)}
                                            className={`bg-transparent border-0 focus:ring-1 focus:ring-blue-400 rounded text-xs w-full p-0 ${isOverdue(action.proposedEndDate) && statusCfg.type !== 'end'
                                                ? 'text-red-600 font-semibold'
                                                : 'text-gray-700 dark:text-gray-200'
                                                }`}
                                        />
                                    </td>
                                    <td className="px-1 py-2">
                                        <input
                                            type="date"
                                            defaultValue={action.startDate || ""}
                                            key={action.startDate || "empty-start"}
                                            onBlur={(e) => handleUpdateField(action.id, "startDate", e.target.value)}
                                            className="bg-transparent border-0 focus:ring-1 focus:ring-blue-400 rounded text-xs text-gray-700 dark:text-gray-200 w-full p-0"
                                        />
                                    </td>
                                    <td className="px-1 py-2">
                                        <input
                                            type="date"
                                            defaultValue={action.actualEndDate || ""}
                                            key={action.actualEndDate || "empty-end"}
                                            onBlur={(e) => handleUpdateField(action.id, "actualEndDate", e.target.value)}
                                            className="bg-transparent border-0 focus:ring-1 focus:ring-blue-400 rounded text-xs text-gray-700 dark:text-gray-200 w-full p-0"
                                        />
                                    </td>
                                    <td className="px-3 py-2">
                                        <textarea
                                            defaultValue={action.observations || ""}
                                            onBlur={(e) => {
                                                if (e.target.value !== (action.observations || ""))
                                                    handleUpdateField(action.id, "observations", e.target.value);
                                            }}
                                            onInput={(e) => autoResize(e.target)}
                                            ref={(el) => { if (el) setTimeout(() => autoResize(el), 0); }}
                                            rows={1}
                                            className="w-full bg-transparent border-0 focus:ring-1 focus:ring-blue-400 rounded px-1 py-0.5 text-gray-700 dark:text-gray-200 resize-none overflow-hidden"
                                        />
                                    </td>
                                    <td className="px-3 py-2">
                                        <button onClick={() => handleDeleteAction(action.id)} className="text-red-400 hover:text-red-600">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}

                        {/* Fila nueva acción */}
                        {showNewRow && (
                            <tr className="bg-blue-50 dark:bg-blue-900/20">
                                <td className="px-3 py-2 text-gray-400 dark:text-gray-500">+</td>
                                <td className="px-3 py-2 text-center">
                                    <input
                                        type="checkbox"
                                        checked={newAction.priority}
                                        onChange={(e) => setNewAction({ ...newAction, priority: e.target.checked })}
                                        className="w-4 h-4 text-red-500 rounded cursor-pointer accent-red-500"
                                        title="Marcar como prioritaria"
                                    />
                                </td>
                                <td className="px-3 py-2 text-xs text-gray-400 dark:text-gray-500">Hoy</td>
                                <td className="px-3 py-2">
                                    <textarea
                                        value={newAction.action}
                                        onChange={(e) => setNewAction({ ...newAction, action: e.target.value })}
                                        onInput={(e) => autoResize(e.target)}
                                        placeholder="Descripción de la acción..."
                                        rows={1}
                                        className="w-full border border-blue-300 dark:border-blue-700 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none overflow-hidden dark:bg-gray-900 dark:text-gray-100"
                                        autoFocus
                                    />
                                </td>
                                <td className="px-3 py-2">
                                    <MultiCheckDropdown
                                        options={userOptions}
                                        selected={newAction.assignedUsers}
                                        onChange={(selected) => setNewAction({ ...newAction, assignedUsers: selected })}
                                        placeholder="Seleccionar..."
                                    />
                                </td>
                                <td className="px-3 py-2">
                                    <select value={newAction.status} onChange={(e) => setNewAction({ ...newAction, status: e.target.value })}
                                        className="border border-blue-300 dark:border-blue-700 rounded text-xs py-1 w-full dark:bg-gray-900 dark:text-gray-100">
                                        {statuses.map(s => (<option key={s.id} value={s.id}>{s.label}</option>))}
                                    </select>
                                </td>
                                <td className="px-1 py-2">
                                    <input type="date" value={newAction.proposedStartDate}
                                        onChange={(e) => setNewAction({ ...newAction, proposedStartDate: e.target.value })}
                                        className="border border-blue-300 dark:border-blue-700 rounded text-xs px-1 py-0.5 w-full dark:bg-gray-900 dark:text-gray-100" />
                                </td>
                                <td className="px-1 py-2">
                                    <input type="date" value={newAction.proposedEndDate}
                                        onChange={(e) => setNewAction({ ...newAction, proposedEndDate: e.target.value })}
                                        className="border border-blue-300 dark:border-blue-700 rounded text-xs px-1 py-0.5 w-full dark:bg-gray-900 dark:text-gray-100" />
                                </td>
                                <td className="px-1 py-2">
                                    <input type="date" value={newAction.startDate}
                                        onChange={(e) => setNewAction({ ...newAction, startDate: e.target.value })}
                                        className="border border-blue-300 dark:border-blue-700 rounded text-xs px-1 py-0.5 w-full dark:bg-gray-900 dark:text-gray-100" />
                                </td>
                                <td className="px-1 py-2">
                                    <input type="date" value={newAction.actualEndDate}
                                        onChange={(e) => setNewAction({ ...newAction, actualEndDate: e.target.value })}
                                        className="border border-blue-300 dark:border-blue-700 rounded text-xs px-1 py-0.5 w-full dark:bg-gray-900 dark:text-gray-100" />
                                </td>
                                <td className="px-3 py-2">
                                    <textarea value={newAction.observations}
                                        onChange={(e) => setNewAction({ ...newAction, observations: e.target.value })}
                                        onInput={(e) => autoResize(e.target)}
                                        placeholder="Observaciones..."
                                        rows={1}
                                        className="w-full border border-blue-300 dark:border-blue-700 rounded px-1 py-0.5 text-sm resize-none overflow-hidden dark:bg-gray-900 dark:text-gray-100" />
                                </td>
                                <td className="px-3 py-2">
                                    <div className="flex gap-2">
                                        <button onClick={handleAddAction} className="px-3 py-1.5 bg-green-500 text-white rounded-lg hover:bg-green-600 text-sm font-medium transition">✓ Añadir</button>
                                        <button onClick={() => setShowNewRow(false)} className="px-3 py-1.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 text-sm font-medium transition">✗ Cancelar</button>
                                    </div>
                                </td>
                            </tr>
                        )}

                        {filteredActions.length === 0 && !showNewRow && (
                            <tr>
                                <td colSpan="11" className="text-center py-8 text-gray-400 dark:text-gray-500">
                                    {hasActiveFilters ? "No hay acciones que coincidan con los filtros." : "No hay acciones aún. Haz clic en \"Nueva Acción\" para empezar."}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal de Gantt */}
            <GanttModal
                isOpen={showGantt}
                onClose={() => setShowGantt(false)}
                actions={actions}
                projectTitle={project.title}
            />

            <div className="mt-4 text-xs text-gray-400 dark:text-gray-500 text-right">
                {filteredActions.length} de {actions.length} acción(es)
            </div>
        </div>
    );
}
