import { useState, useEffect, useRef } from "react";
import { departmentService } from "../services/projectService";
import { Plus, Trash2, Building2 } from "lucide-react";
import useRealtimeDepartments from "../hooks/useRealtimeDepartments";
import EmptyState from "./ui/EmptyState";
import { SkeletonRows } from "./ui/Skeleton";
import { useToast } from "./ui/Toast";
import { useConfirm } from "./ui/ConfirmDialog";

export default function DepartmentConfig() {
    const { departments: realtimeDepartments, loading } = useRealtimeDepartments();
    const toast = useToast();
    const confirm = useConfirm();

    const [departments, setDepartments] = useState([]);
    const [saving, setSaving] = useState(false);
    const [dirty, setDirty] = useState(false);
    const [remoteChanged, setRemoteChanged] = useState(false);
    const dirtyRef = useRef(false);

    function markDirty() {
        dirtyRef.current = true;
        setDirty(true);
    }

    function clearDirty() {
        dirtyRef.current = false;
        setDirty(false);
        setRemoteChanged(false);
    }

    // Sincronizar con el snapshot remoto solo si no hay ediciones locales.
    // Si llega un snapshot con cambios locales pendientes, se avisa sin sobrescribir.
    useEffect(() => {
        if (loading || saving) return;
        if (dirtyRef.current) {
            setRemoteChanged(true);
        } else {
            setDepartments(realtimeDepartments);
            setRemoteChanged(false);
        }
    }, [realtimeDepartments, loading, saving]);

    function discardLocalChanges() {
        setDepartments(realtimeDepartments);
        clearDirty();
    }

    function addDepartment() {
        const newId = "dept_" + Date.now();
        markDirty();
        setDepartments((prev) => [...prev, { id: newId, name: "Nuevo Departamento" }]);
    }

    async function removeDepartment(dept) {
        const ok = await confirm({
            title: "Eliminar departamento",
            message: `Se eliminará el departamento «${dept.name}». Los proyectos que lo usen quedarán sin departamento válido. El cambio se aplicará al guardar.`,
            confirmLabel: "Eliminar",
            tone: "danger",
        });
        if (!ok) return;
        markDirty();
        setDepartments((prev) => prev.filter((d) => d.id !== dept.id));
    }

    function updateDepartment(id, name) {
        markDirty();
        setDepartments((prev) => prev.map((d) => (d.id === id ? { ...d, name } : d)));
    }

    async function handleSave() {
        setSaving(true);
        try {
            await departmentService.updateDepartments(departments);
            clearDirty();
            toast.success("Departamentos guardados correctamente");
        } catch (error) {
            console.error("Error al guardar departamentos:", error);
            toast.error("Error al guardar los departamentos");
        } finally {
            setSaving(false);
        }
    }

    if (loading) return <SkeletonRows rows={4} />;

    return (
        <div className="max-w-4xl">
            <div className="mb-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                    Gestión de Departamentos
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                    Define las áreas o departamentos de la empresa para categorizar proyectos.
                </p>
            </div>

            {remoteChanged && (
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-200">
                    <p>
                        La configuración cambió en otro dispositivo. Si guardas, sobrescribirás esos
                        cambios.
                    </p>
                    <button
                        type="button"
                        onClick={discardLocalChanges}
                        className="btn-secondary btn-sm"
                    >
                        Descartar mis cambios y recargar
                    </button>
                </div>
            )}

            <div className="mb-6 space-y-3">
                {departments.length === 0 && (
                    <EmptyState
                        icon={Building2}
                        title="No hay departamentos definidos"
                        description="Añade uno para empezar a categorizar los proyectos."
                        action={
                            <button type="button" onClick={addDepartment} className="btn-secondary">
                                <Plus className="h-4 w-4" />
                                Añadir departamento
                            </button>
                        }
                    />
                )}
                {departments.map((dept, index) => (
                    <div
                        key={dept.id}
                        className="card flex flex-wrap items-center gap-3 p-3 md:p-4"
                    >
                        <Building2 className="h-5 w-5 flex-shrink-0 text-gray-300 dark:text-gray-500" />
                        <span className="w-5 text-center font-mono text-sm text-gray-400 dark:text-gray-500">
                            {index + 1}
                        </span>
                        <input
                            type="text"
                            value={dept.name}
                            onChange={(e) => updateDepartment(dept.id, e.target.value)}
                            className="input min-w-[10rem] flex-1"
                            placeholder="Nombre del departamento"
                            aria-label={`Nombre del departamento ${index + 1}`}
                        />
                        <button
                            type="button"
                            onClick={() => removeDepartment(dept)}
                            className="btn-icon btn-ghost text-red-500 dark:text-red-400"
                            aria-label={`Eliminar departamento ${dept.name}`}
                        >
                            <Trash2 className="h-4 w-4" />
                        </button>
                    </div>
                ))}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
                <button type="button" onClick={addDepartment} className="btn-secondary">
                    <Plus className="h-4 w-4" />
                    Añadir departamento
                </button>

                <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving || !dirty}
                    className="btn-primary"
                >
                    {saving ? "Guardando..." : "Guardar cambios"}
                </button>
            </div>
        </div>
    );
}
