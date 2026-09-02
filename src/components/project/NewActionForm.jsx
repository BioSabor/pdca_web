import { useState } from "react";
import MultiCheckDropdown from "../ui/MultiCheckDropdown";
import Field from "../ui/Field";
import PrioritySelect from "./PrioritySelect";
import PhaseSelect from "./PhaseSelect";

function emptyDraft(initialStatus) {
    return {
        action: "",
        assignedUsers: [],
        status: initialStatus || "pendiente",
        priority: "none",
        phase: "",
        proposedStartDate: "",
        proposedEndDate: "",
        startDate: "",
        actualEndDate: "",
        observations: "",
    };
}

/**
 * Formulario de alta de acción, siempre en formato vertical (sin scroll
 * horizontal) para poder usarse tanto dentro de un modal (ver
 * NewActionModal) como incrustado en la lista móvil.
 */
export default function NewActionForm({
    statuses,
    userOptions,
    requiredFields = {},
    initialStatus,
    onSubmit,
    onCancel,
}) {
    const [draft, setDraft] = useState(() => emptyDraft(initialStatus));

    function set(field, value) {
        setDraft((prev) => ({ ...prev, [field]: value }));
    }

    async function handleSubmit() {
        const ok = await onSubmit({ ...draft, phase: draft.phase || null });
        if (ok) setDraft(emptyDraft(initialStatus));
    }

    return (
        <div className="space-y-3">
            <Field label="Acción" required>
                <textarea
                    value={draft.action}
                    onChange={(e) => set("action", e.target.value)}
                    placeholder="Descripción de la acción..."
                    rows={2}
                    autoFocus
                    className="input resize-none"
                />
            </Field>
            <div className="grid grid-cols-2 gap-2">
                <Field label="Estado">
                    <select
                        value={draft.status}
                        onChange={(e) => set("status", e.target.value)}
                        className="input py-1.5 text-xs"
                    >
                        {statuses.map((s) => (
                            <option key={s.id} value={s.id}>
                                {s.label}
                            </option>
                        ))}
                    </select>
                </Field>
                <Field label="Responsable" required={!!requiredFields.assignedUsers}>
                    <MultiCheckDropdown
                        options={userOptions}
                        selected={draft.assignedUsers}
                        onChange={(selected) => set("assignedUsers", selected)}
                        placeholder="Seleccionar..."
                        className="w-full"
                    />
                </Field>
                <Field label="F. inicio propuesta" required={!!requiredFields.proposedStartDate}>
                    <input
                        type="date"
                        value={draft.proposedStartDate}
                        onChange={(e) => set("proposedStartDate", e.target.value)}
                        className="input py-1.5 text-xs"
                    />
                </Field>
                <Field label="F. fin propuesta" required={!!requiredFields.proposedEndDate}>
                    <input
                        type="date"
                        value={draft.proposedEndDate}
                        onChange={(e) => set("proposedEndDate", e.target.value)}
                        className="input py-1.5 text-xs"
                    />
                </Field>
            </div>
            <Field label="Prioridad">
                <PrioritySelect value={draft.priority} onChange={(v) => set("priority", v)} showLabel />
            </Field>
            <Field label="Fase">
                <PhaseSelect variant="chips" value={draft.phase} onChange={(v) => set("phase", v)} />
            </Field>
            <Field label="Observaciones">
                <textarea
                    value={draft.observations}
                    onChange={(e) => set("observations", e.target.value)}
                    rows={2}
                    placeholder="Observaciones..."
                    className="input resize-none text-sm"
                />
            </Field>
            <div className="flex gap-2 pt-1">
                <button type="button" onClick={handleSubmit} className="btn-primary flex-1">
                    Añadir
                </button>
                <button type="button" onClick={onCancel} className="btn-secondary flex-1">
                    Cancelar
                </button>
            </div>
        </div>
    );
}
