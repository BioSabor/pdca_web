import { useState, useEffect, useRef } from "react";
import { statusService } from "../services/projectService";
import { Plus, Trash2 } from "lucide-react";
import useRealtimeStatuses from "../hooks/useRealtimeStatuses";
import StatusPill from "./ui/StatusPill";
import { SkeletonRows } from "./ui/Skeleton";
import { useToast } from "./ui/Toast";
import { useConfirm } from "./ui/ConfirmDialog";

const TYPE_OPTIONS = [
    { value: "none", label: "Sin automatismo" },
    { value: "start", label: "Inicia acción (fecha inicio)" },
    { value: "end", label: "Finaliza acción (fecha fin)" },
    { value: "cancelled", label: "Cancelado / Descartado" },
];

export default function StatusConfig() {
    const { statuses: realtimeStatuses, loading } = useRealtimeStatuses();
    const toast = useToast();
    const confirm = useConfirm();

    const [statuses, setStatuses] = useState([]);
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
            setStatuses(realtimeStatuses);
            setRemoteChanged(false);
        }
    }, [realtimeStatuses, loading, saving]);

    function discardLocalChanges() {
        setStatuses(realtimeStatuses);
        clearDirty();
    }

    function addStatus() {
        const newId = "estado_" + Date.now();
        markDirty();
        setStatuses((prev) => [
            ...prev,
            { id: newId, label: "Nuevo Estado", color: "#9CA3AF", type: "none" },
        ]);
    }

    async function removeStatus(status) {
        if (statuses.length <= 1) {
            toast.error("Debe haber al menos un estado.");
            return;
        }
        const ok = await confirm({
            title: "Eliminar estado",
            message: `Se eliminará el estado «${status.label}». Las acciones que lo usen quedarán con un estado huérfano y habrá que reasignarlas manualmente. El cambio se aplicará al guardar.`,
            confirmLabel: "Eliminar",
            tone: "danger",
        });
        if (!ok) return;
        markDirty();
        setStatuses((prev) => prev.filter((s) => s.id !== status.id));
    }

    function updateStatus(id, field, value) {
        markDirty();
        setStatuses((prev) => prev.map((s) => (s.id === id ? { ...s, [field]: value } : s)));
    }

    async function handleSave() {
        setSaving(true);
        try {
            await statusService.updateStatuses(statuses);
            clearDirty();
            toast.success("Estados guardados correctamente");
        } catch (error) {
            console.error("Error al guardar estados:", error);
            toast.error("Error al guardar los estados");
        } finally {
            setSaving(false);
        }
    }

    if (loading) return <SkeletonRows rows={4} />;

    return (
        <div className="max-w-4xl">
            <div className="mb-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                    Configuración de Estados
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                    Define los estados disponibles para las acciones, sus colores y su automatismo.
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
                {statuses.map((status, index) => (
                    <div
                        key={status.id}
                        className="card flex flex-wrap items-center gap-3 p-3 md:p-4"
                    >
                        <span className="w-5 text-center font-mono text-sm text-gray-400 dark:text-gray-500">
                            {index + 1}
                        </span>
                        <input
                            type="color"
                            value={status.color}
                            onChange={(e) => updateStatus(status.id, "color", e.target.value)}
                            className="h-10 w-10 flex-shrink-0 cursor-pointer rounded border-0 bg-transparent p-0"
                            aria-label={`Color del estado ${status.label}`}
                        />
                        <input
                            type="text"
                            value={status.label}
                            onChange={(e) => updateStatus(status.id, "label", e.target.value)}
                            className="input min-w-[10rem] flex-1"
                            aria-label={`Nombre del estado ${index + 1}`}
                        />
                        <select
                            value={status.type || "none"}
                            onChange={(e) => updateStatus(status.id, "type", e.target.value)}
                            className="input min-w-[13rem] flex-1"
                            aria-label={`Automatismo del estado ${status.label}`}
                        >
                            {TYPE_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                </option>
                            ))}
                        </select>
                        <StatusPill status={status} />
                        <button
                            type="button"
                            onClick={() => removeStatus(status)}
                            className="btn-icon btn-ghost text-red-500 dark:text-red-400"
                            aria-label={`Eliminar estado ${status.label}`}
                        >
                            <Trash2 className="h-4 w-4" />
                        </button>
                    </div>
                ))}
            </div>

            <div className="mb-6 rounded-lg border border-brand-200 bg-brand-50 p-3 text-sm text-brand-700 dark:border-brand-800 dark:bg-brand-900/20 dark:text-brand-200">
                <strong>Tipos de estado:</strong>
                <ul className="ml-4 mt-1 list-disc space-y-0.5">
                    <li>
                        <strong>Inicia acción:</strong> al seleccionarlo se rellena automáticamente la
                        fecha de inicio de la acción.
                    </li>
                    <li>
                        <strong>Finaliza acción:</strong> al seleccionarlo se rellena la fecha fin real
                        (solo si estaba vacía).
                    </li>
                    <li>
                        <strong>Cancelado / Descartado:</strong> las acciones con este estado no cuentan
                        en el progreso del proyecto.
                    </li>
                    <li>
                        <strong>Sin automatismo:</strong> no modifica ninguna fecha automáticamente.
                    </li>
                </ul>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
                <button type="button" onClick={addStatus} className="btn-secondary">
                    <Plus className="h-4 w-4" />
                    Añadir estado
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
