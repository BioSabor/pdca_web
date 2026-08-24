import { useState } from "react";
import { Trash2 } from "lucide-react";
import MultiCheckDropdown from "../ui/MultiCheckDropdown";
import { useToast } from "../ui/Toast";
import { useConfirm } from "../ui/ConfirmDialog";
import StatusSelect from "./StatusSelect";

const EMPTY_DRAFT = { title: "", status: "pendiente", assignedUsers: [] };

/**
 * Panel de subacciones compartido por la tabla (fila expandida) y las
 * tarjetas móviles. Toda escritura pasa por onChangeSubactions(nuevoArray),
 * que el orquestador envía a la fachada actionEvents.
 * userOptions: miembros del proyecto (FIX B13).
 */
export default function SubactionsPanel({ action, statuses, userOptions, onChangeSubactions }) {
    const toast = useToast();
    const confirm = useConfirm();
    const [draft, setDraft] = useState(EMPTY_DRAFT);
    const subactions = action.subactions || [];

    function updateSubaction(subactionId, field, value) {
        onChangeSubactions(
            subactions.map((sub) => (sub.id === subactionId ? { ...sub, [field]: value } : sub))
        );
    }

    async function handleDelete(sub) {
        const ok = await confirm({
            title: "Eliminar subacción",
            message: `¿Eliminar la subacción "${sub.title}"?`,
            confirmLabel: "Eliminar",
            tone: "danger",
        });
        if (!ok) return;
        onChangeSubactions(subactions.filter((s) => s.id !== sub.id));
    }

    function handleAdd() {
        if (!draft.title.trim()) {
            toast.error("Escribe una descripción para la subacción.");
            return;
        }
        onChangeSubactions([
            ...subactions,
            {
                id: `sub_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
                title: draft.title.trim(),
                status: draft.status || "pendiente",
                assignedUsers: draft.assignedUsers || [],
            },
        ]);
        setDraft(EMPTY_DRAFT);
    }

    return (
        <div className="space-y-3">
            <div className="text-xs font-semibold text-gray-600 dark:text-gray-300">Subacciones</div>
            {subactions.length === 0 && (
                <div className="text-xs text-gray-400 dark:text-gray-500">Sin subacciones.</div>
            )}
            {subactions.map((sub) => (
                <div key={sub.id} className="rounded-xl border border-line bg-surface p-3">
                    <div className="flex flex-wrap items-center gap-2">
                        <input
                            type="text"
                            defaultValue={sub.title}
                            key={`subtitle-${sub.id}-${sub.title}`}
                            onBlur={(e) => {
                                if (e.target.value !== sub.title) {
                                    updateSubaction(sub.id, "title", e.target.value);
                                }
                            }}
                            aria-label="Descripción de la subacción"
                            placeholder="Descripción"
                            className="input min-w-[180px] flex-1 py-1 text-sm"
                        />
                        <MultiCheckDropdown
                            options={userOptions}
                            selected={sub.assignedUsers || []}
                            onChange={(selected) => updateSubaction(sub.id, "assignedUsers", selected)}
                            placeholder="Responsables"
                        />
                        <StatusSelect
                            statuses={statuses}
                            value={sub.status}
                            onChange={(statusId) => updateSubaction(sub.id, "status", statusId)}
                            ariaLabel="Estado de la subacción"
                            className="min-w-[130px]"
                        />
                        <button
                            type="button"
                            onClick={() => handleDelete(sub)}
                            aria-label="Eliminar subacción"
                            className="btn-icon btn-ghost text-red-500 hover:text-red-700"
                        >
                            <Trash2 className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            ))}

            <div className="rounded-xl border border-dashed border-line bg-surface p-3">
                <div className="flex flex-wrap items-center gap-2">
                    <input
                        type="text"
                        value={draft.title}
                        onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                        aria-label="Nueva subacción"
                        placeholder="Nueva subacción"
                        className="input min-w-[180px] flex-1 py-1 text-sm"
                    />
                    <MultiCheckDropdown
                        options={userOptions}
                        selected={draft.assignedUsers}
                        onChange={(selected) => setDraft({ ...draft, assignedUsers: selected })}
                        placeholder="Responsables"
                    />
                    <StatusSelect
                        statuses={statuses}
                        value={draft.status}
                        onChange={(statusId) => setDraft({ ...draft, status: statusId })}
                        ariaLabel="Estado de la nueva subacción"
                        className="min-w-[130px]"
                    />
                    <button type="button" onClick={handleAdd} className="btn-primary btn-sm">
                        Añadir subacción
                    </button>
                </div>
            </div>
        </div>
    );
}
