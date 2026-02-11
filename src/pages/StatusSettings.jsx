import { useState, useEffect } from "react";
import { statusService } from "../services/projectService";
import { Plus, Trash2, GripVertical } from "lucide-react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function StatusSettings() {
    const [statuses, setStatuses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadStatuses();
    }, []);

    async function loadStatuses() {
        try {
            const data = await statusService.getStatuses();
            setStatuses(data);
        } catch (error) {
            console.error("Error al cargar estados:", error);
        } finally {
            setLoading(false);
        }
    }

    function addStatus() {
        const newId = "estado_" + Date.now();
        setStatuses([...statuses, { id: newId, label: "Nuevo Estado", color: "#9CA3AF", type: "none" }]);
    }

    function removeStatus(id) {
        if (statuses.length <= 1) return alert("Debe haber al menos un estado.");
        setStatuses(statuses.filter(s => s.id !== id));
    }

    function updateStatus(id, field, value) {
        setStatuses(statuses.map(s => s.id === id ? { ...s, [field]: value } : s));
    }

    async function handleSave() {
        setSaving(true);
        try {
            await statusService.updateStatuses(statuses);
            alert("Estados guardados correctamente");
        } catch (error) {
            alert("Error al guardar estados");
        } finally {
            setSaving(false);
        }
    }

    if (loading) return <div className="p-8">Cargando configuración...</div>;

    return (
        <div className="p-8 max-w-4xl mx-auto">
            <Link to="/admin" className="flex items-center text-gray-500 hover:text-gray-700 mb-6">
                <ArrowLeft className="w-5 h-5 mr-2" />
                Volver al Panel de Administración
            </Link>

            <h1 className="text-3xl font-bold mb-2 text-gray-800">Configuración de Estados</h1>
            <p className="text-gray-500 mb-8">Define los estados disponibles para las acciones, sus colores y su tipo.</p>

            <div className="space-y-3 mb-6">
                {statuses.map((status, index) => (
                    <div key={status.id} className="flex items-center gap-3 bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                        <GripVertical className="w-5 h-5 text-gray-300" />
                        <span className="text-gray-400 text-sm font-mono w-6">{index + 1}</span>
                        <input
                            type="color"
                            value={status.color}
                            onChange={(e) => updateStatus(status.id, "color", e.target.value)}
                            className="w-10 h-10 rounded cursor-pointer border-0"
                        />
                        <input
                            type="text"
                            value={status.label}
                            onChange={(e) => updateStatus(status.id, "label", e.target.value)}
                            className="flex-1 border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                        <select
                            value={status.type || "none"}
                            onChange={(e) => updateStatus(status.id, "type", e.target.value)}
                            className="border border-gray-300 rounded px-2 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        >
                            <option value="none">Sin tipo</option>
                            <option value="start">📅 Inicio</option>
                            <option value="inprogress">🔄 En curso</option>
                            <option value="end">🏁 Fin</option>
                        </select>
                        <div
                            className="px-3 py-1 rounded-full text-xs font-semibold text-white whitespace-nowrap"
                            style={{ backgroundColor: status.color }}
                        >
                            {status.label}
                        </div>
                        <button
                            onClick={() => removeStatus(status.id)}
                            className="text-red-400 hover:text-red-600 p-1"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                ))}
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-6 text-sm text-blue-700">
                <strong>Tipos de estado:</strong>
                <ul className="mt-1 ml-4 list-disc">
                    <li><strong>Inicio:</strong> Al seleccionar este estado, se rellena automáticamente la fecha de inicio de la acción.</li>
                    <li><strong>En curso:</strong> Marca la acción como en curso. Se usa para filtrar en informes.</li>
                    <li><strong>Fin:</strong> Al seleccionar este estado, se rellena automáticamente la fecha fin real (solo si estaba vacía).</li>
                    <li><strong>Sin tipo:</strong> No modifica ninguna fecha automáticamente.</li>
                </ul>
            </div>

            <div className="flex justify-between">
                <button
                    onClick={addStatus}
                    className="flex items-center gap-2 px-4 py-2 text-blue-600 border border-blue-300 rounded-lg hover:bg-blue-50 transition"
                >
                    <Plus className="w-4 h-4" />
                    Añadir Estado
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
