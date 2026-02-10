import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { projectService, userService, departmentService } from "../services/projectService";
import { ArrowLeft, X, Building2 } from "lucide-react";
import { Link } from "react-router-dom";

export default function CreateProject() {
    const { currentUser } = useAuth();
    const navigate = useNavigate();
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [allUsers, setAllUsers] = useState([]);
    const [selectedUsers, setSelectedUsers] = useState([]);
    const [allDepartments, setAllDepartments] = useState([]);
    const [selectedDepartments, setSelectedDepartments] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        async function loadUsers() {
            try {
                const [users, departments] = await Promise.all([
                    userService.getAllUsers(),
                    departmentService.getDepartments()
                ]);
                setAllUsers(users);
                setAllDepartments(departments);
                // El creador se asigna automáticamente
                setSelectedUsers([currentUser.uid]);
            } catch (err) {
                console.error("Error cargando usuarios", err);
            }
        }
        loadUsers();
    }, [currentUser]);

    function toggleUser(uid) {
        if (selectedUsers.includes(uid)) {
            // No permitir quitarse a sí mismo
            if (uid === currentUser.uid) return;
            setSelectedUsers(selectedUsers.filter(id => id !== uid));
        } else {
            setSelectedUsers([...selectedUsers, uid]);
        }
    }

    function toggleDepartment(deptId) {
        if (selectedDepartments.includes(deptId)) {
            setSelectedDepartments(selectedDepartments.filter(id => id !== deptId));
        } else {
            setSelectedDepartments([...selectedDepartments, deptId]);
        }
    }

    async function handleSubmit(e) {
        e.preventDefault();
        if (selectedDepartments.length === 0) {
            return setError("Debes asignar al menos un departamento al proyecto.");
        }
        if (selectedUsers.length === 0) {
            return setError("Debes asignar al menos un usuario al proyecto.");
        }
        setLoading(true);
        setError("");

        try {
            await projectService.createProject(currentUser.uid, {
                title,
                description,
                assignedUsers: selectedUsers,
                assignedDepartments: selectedDepartments
            });
            navigate("/");
        } catch (err) {
            setError("Error al crear el proyecto: " + err.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="max-w-2xl mx-auto">
            <Link to="/" className="flex items-center text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white mb-6">
                <ArrowLeft className="w-5 h-5 mr-2" />
                Volver al Panel
            </Link>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-8 border border-gray-100 dark:border-gray-700">
                <h1 className="text-2xl font-bold mb-6 text-gray-800 dark:text-gray-100">Crear Nuevo Proyecto</h1>

                {error && <div className="bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-200 p-3 rounded mb-4">{error}</div>}

                <form onSubmit={handleSubmit}>
                    <div className="mb-6">
                        <label className="block text-gray-700 dark:text-gray-200 font-medium mb-2">Título del Proyecto</label>
                        <input
                            type="text"
                            required
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                            placeholder="Ej: Plan de Mejora Continua - Línea 1"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                        />
                    </div>

                    <div className="mb-6">
                        <label className="block text-gray-700 dark:text-gray-200 font-medium mb-2">Descripción</label>
                        <textarea
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none h-24 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                            placeholder="Describe el objetivo del proyecto..."
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                        />
                    </div>

                    <div className="mb-6">
                        <label className="block text-gray-700 dark:text-gray-200 font-medium mb-2">Departamentos Asignados</label>
                        <div className="border border-gray-300 dark:border-gray-700 rounded-lg p-3 max-h-48 overflow-y-auto space-y-2 bg-white dark:bg-gray-900">
                            {allDepartments.length === 0 ? (
                                <p className="text-gray-400 dark:text-gray-500 text-sm">No hay departamentos configurados.</p>
                            ) : (
                                allDepartments.map(dept => (
                                    <label
                                        key={dept.id}
                                        className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition ${selectedDepartments.includes(dept.id)
                                            ? "bg-blue-50 border border-blue-200 dark:bg-blue-950 dark:border-blue-800"
                                            : "hover:bg-gray-50 dark:hover:bg-gray-700/50"
                                            }`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedDepartments.includes(dept.id)}
                                            onChange={() => toggleDepartment(dept.id)}
                                            className="w-4 h-4 text-blue-600 rounded"
                                        />
                                        <div className="h-8 w-8 rounded-full bg-indigo-100 dark:bg-indigo-950 flex items-center justify-center text-indigo-600 dark:text-indigo-300">
                                            <Building2 className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <span className="text-sm font-medium text-gray-800 dark:text-gray-100">{dept.name}</span>
                                        </div>
                                    </label>
                                ))
                            )}
                        </div>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{selectedDepartments.length} departamento(s) seleccionado(s)</p>
                    </div>

                    <div className="mb-6">
                        <label className="block text-gray-700 dark:text-gray-200 font-medium mb-2">Usuarios Asignados</label>
                        <div className="border border-gray-300 dark:border-gray-700 rounded-lg p-3 max-h-48 overflow-y-auto space-y-2 bg-white dark:bg-gray-900">
                            {allUsers.length === 0 ? (
                                <p className="text-gray-400 dark:text-gray-500 text-sm">Cargando usuarios...</p>
                            ) : (
                                allUsers.map(user => (
                                    <label
                                        key={user.id}
                                        className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition ${selectedUsers.includes(user.id)
                                            ? "bg-blue-50 border border-blue-200 dark:bg-blue-950 dark:border-blue-800"
                                            : "hover:bg-gray-50 dark:hover:bg-gray-700/50"
                                            }`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedUsers.includes(user.id)}
                                            onChange={() => toggleUser(user.id)}
                                            className="w-4 h-4 text-blue-600 rounded"
                                        />
                                        <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-950 flex items-center justify-center text-blue-600 dark:text-blue-300 text-sm font-bold">
                                            {(user.displayName || user.email)?.[0]?.toUpperCase()}
                                        </div>
                                        <div>
                                            <span className="text-sm font-medium text-gray-800 dark:text-gray-100">{user.displayName || "Sin nombre"}</span>
                                            <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">{user.email}</span>
                                        </div>
                                        {user.id === currentUser.uid && (
                                            <span className="text-xs bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-200 px-2 py-0.5 rounded-full ml-auto">Tú</span>
                                        )}
                                    </label>
                                ))
                            )}
                        </div>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{selectedUsers.length} usuario(s) seleccionado(s)</p>
                    </div>

                    <div className="flex justify-end gap-4">
                        <button
                            type="button"
                            onClick={() => navigate("/")}
                            className="px-6 py-2 text-gray-600 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                        >
                            {loading ? "Creando..." : "Crear Proyecto"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
