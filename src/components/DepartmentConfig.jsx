import { useState, useEffect } from "react";
import { departmentService } from "../services/projectService";
import { Plus, Trash2, Building2 } from "lucide-react";

export default function DepartmentConfig() {
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadDepartments();
    }, []);

    async function loadDepartments() {
        try {
            const data = await departmentService.getDepartments();
            setDepartments(data);
        } catch (error) {
            console.error("Error al cargar departamentos:", error);
        } finally {
            setLoading(false);
        }
    }

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

    if (loading) return <div className="p-8">Cargando departamentos...</div>;

    return (
        <div className="max-w-4xl">
            <div className="mb-6">
                <h2 className="text-xl font-bold text-gray-800">Gestión de Departamentos</h2>
                <p className="text-gray-500 text-sm">Define las áreas o departamentos de la empresa para categorizar proyectos.</p>
            </div>

            <div className="space-y-3 mb-6">
                {departments.length === 0 && (
                    <div className="text-center py-8 bg-gray-50 rounded-lg text-gray-400">
                        No hay departamentos definidos. Añade uno para empezar.
                    </div>
                )}
                {departments.map((dept, index) => (
                    <div key={dept.id} className="flex items-center gap-3 bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                        <Building2 className="w-5 h-5 text-gray-300" />
                        <span className="text-gray-400 text-sm font-mono w-6">{index + 1}</span>
                        <input
                            type="text"
                            value={dept.name}
                            onChange={(e) => updateDepartment(dept.id, e.target.value)}
                            className="flex-1 border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            placeholder="Nombre del departamento"
                        />
                        <button
                            onClick={() => removeDepartment(dept.id)}
                            className="text-red-400 hover:text-red-600 p-1"
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
                    className="flex items-center gap-2 px-4 py-2 text-blue-600 border border-blue-300 rounded-lg hover:bg-blue-50 transition"
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
