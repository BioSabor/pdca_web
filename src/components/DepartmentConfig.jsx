import { useState, useEffect } from "react";
import { departmentService } from "../services/projectService";
import { Plus, Trash2, Building2 } from "lucide-react";
import useRealtimeDepartments from "../hooks/useRealtimeDepartments";

export default function DepartmentConfig() {
    const { departments: realtimeDepartments, loading } = useRealtimeDepartments();
    const [departments, setDepartments] = useState([]);
    const [saving, setSaving] = useState(false);

    // Sincronizar estado local con datos en tiempo real (solo si no estamos guardando)
    useEffect(() => {
        if (!saving) {
            setDepartments(realtimeDepartments);
        }
    }, [realtimeDepartments, saving]);

    function addDepartment() {
        const newId = "dept_" + Date.now();
        setDepartments([...departments, { id: newId, name: "Nuevo Departamento" }]);
    }

    function removeDepartment(id) {
        setDepartments(departments.filter(d => d.id !== id));
    }

    function updateDepartment(id, name) {
        setDepartments(departments.map(d => d.id === id ? { ...d, name } : d));
    }

    async function handleSave() {
        setSaving(true);
        try {
            await departmentService.updateDepartments(departments);
            alert("Departamentos guardados correctamente");
        } catch (error) {
            alert("Error al guardar departamentos");
        } finally {
            setSaving(false);
        }
    }

    if (loading) return <div className="p-8 text-gray-600 dark:text-gray-300">Cargando departamentos...</div>;

    return (
        <div className="max-w-4xl">
            <div className="mb-6">
                <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Gestión de Departamentos</h2>
                <p className="text-gray-500 dark:text-gray-400 text-sm">Define las áreas o departamentos de la empresa para categorizar proyectos.</p>
            </div>

            <div className="space-y-3 mb-6">
                {departments.length === 0 && (
                    <div className="text-center py-8 bg-gray-50 dark:bg-gray-800 rounded-lg text-gray-400 dark:text-gray-500">
                        No hay departamentos definidos. Añade uno para empezar.
                    </div>
                )}
                {departments.map((dept, index) => (
                    <div key={dept.id} className="flex items-center gap-3 bg-white dark:bg-gray-900 p-4 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                        <Building2 className="w-5 h-5 text-gray-300 dark:text-gray-500" />
                        <span className="text-gray-400 dark:text-gray-500 text-sm font-mono w-6">{index + 1}</span>
                        <input
                            type="text"
                            value={dept.name}
                            onChange={(e) => updateDepartment(dept.id, e.target.value)}
                            className="flex-1 border border-gray-300 dark:border-gray-700 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none dark:bg-gray-900 dark:text-gray-100"
                            placeholder="Nombre del departamento"
                        />
                        <button
                            onClick={() => removeDepartment(dept.id)}
                            className="text-red-400 hover:text-red-600 dark:text-red-300 dark:hover:text-red-200 p-1"
                            title="Eliminar departamento"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                ))}
            </div>

            <div className="flex justify-between">
                <button
                    onClick={addDepartment}
                    className="flex items-center gap-2 px-4 py-2 text-blue-600 dark:text-blue-300 border border-blue-300 dark:border-blue-700 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition"
                >
                    <Plus className="w-4 h-4" />
                    Añadir Departamento
                </button>

                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                >
                    {saving ? "Guardando..." : "Guardar Cambios"}
                </button>
            </div>
        </div>
    );
}
