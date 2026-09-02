import { useState } from "react";
import MultiCheckDropdown from "../ui/MultiCheckDropdown";
import Field from "../ui/Field";
import PrioritySelect from "./PrioritySelect";
import PhaseSelect from "./PhaseSelect";
import SuggestionChip from "../ui/SuggestionChip";

function emptyDraft(initialStatus, prefill) {
    return {
        action: prefill?.action || "",
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
 *
 * `prefill` aplica valores directos al draft inicial (hoy solo `action`,
 * viene del alta por voz). `suggestions` son valores detectados en el
 * audio para el resto de campos: no se aplican solos, se muestran como
 * chip y el usuario decide si los usa.
 */
export default function NewActionForm({
    statuses,
    userOptions,
    requiredFields = {},
    initialStatus,
    prefill,
    suggestions,
    onSubmit,
    onCancel,
}) {
    const [draft, setDraft] = useState(() => emptyDraft(initialStatus, prefill));
    const [dismissed, setDismissed] = useState({});

    function set(field, value) {
        setDraft((prev) => ({ ...prev, [field]: value }));
    }

    function applySuggestion(field, value) {
        set(field, value);
        setDismissed((prev) => ({ ...prev, [field]: true }));
    }

    function suggestionFor(field) {
        if (dismissed[field]) return null;
        return suggestions?.[field] ?? null;
    }

    async function handleSubmit() {
        const ok = await onSubmit({ ...draft, phase: draft.phase || null });
        if (ok) setDraft(emptyDraft(initialStatus, prefill));
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
                    {(fieldId) => (
                        <>
                            <MultiCheckDropdown
                                id={fieldId}
                                options={userOptions}
                                selected={draft.assignedUsers}
                                onChange={(selected) => set("assignedUsers", selected)}
                                placeholder="Seleccionar..."
                                className="w-full"
                            />
                            {suggestionFor("assignedUsers") ? (
                                <SuggestionChip
                                    label={suggestionFor("assignedUsers").label}
                                    onApply={() =>
                                        applySuggestion("assignedUsers", suggestionFor("assignedUsers").value)
                                    }
                                />
                            ) : (
                                suggestions?.assignedUserHint && (
                                    <SuggestionChip label={suggestions.assignedUserHint.label} />
                                )
                            )}
                        </>
                    )}
                </Field>
                <Field label="F. inicio propuesta" required={!!requiredFields.proposedStartDate}>
                    {(fieldId) => (
                        <>
                            <input
                                id={fieldId}
                                type="date"
                                value={draft.proposedStartDate}
                                onChange={(e) => set("proposedStartDate", e.target.value)}
                                className="input py-1.5 text-xs"
                            />
                            {suggestionFor("proposedStartDate") && (
                                <SuggestionChip
                                    label={suggestionFor("proposedStartDate").label}
                                    onApply={() =>
                                        applySuggestion("proposedStartDate", suggestionFor("proposedStartDate").value)
                                    }
                                />
                            )}
                        </>
                    )}
                </Field>
                <Field label="F. fin propuesta" required={!!requiredFields.proposedEndDate}>
                    {(fieldId) => (
                        <>
                            <input
                                id={fieldId}
                                type="date"
                                value={draft.proposedEndDate}
                                onChange={(e) => set("proposedEndDate", e.target.value)}
                                className="input py-1.5 text-xs"
                            />
                            {suggestionFor("proposedEndDate") && (
                                <SuggestionChip
                                    label={suggestionFor("proposedEndDate").label}
                                    onApply={() =>
                                        applySuggestion("proposedEndDate", suggestionFor("proposedEndDate").value)
                                    }
                                />
                            )}
                        </>
                    )}
                </Field>
            </div>
            <Field label="Prioridad">
                {(fieldId) => (
                    <>
                        <PrioritySelect
                            id={fieldId}
                            value={draft.priority}
                            onChange={(v) => set("priority", v)}
                            showLabel
                        />
                        {suggestionFor("priority") && (
                            <SuggestionChip
                                label={suggestionFor("priority").label}
                                onApply={() => applySuggestion("priority", suggestionFor("priority").value)}
                            />
                        )}
                    </>
                )}
            </Field>
            <Field label="Fase">
                {(fieldId) => (
                    <>
                        <PhaseSelect
                            id={fieldId}
                            variant="chips"
                            value={draft.phase}
                            onChange={(v) => set("phase", v)}
                        />
                        {suggestionFor("phase") && (
                            <SuggestionChip
                                label={suggestionFor("phase").label}
                                onApply={() => applySuggestion("phase", suggestionFor("phase").value)}
                            />
                        )}
                    </>
                )}
            </Field>
            <Field label="Observaciones">
                {(fieldId) => (
                    <>
                        <textarea
                            id={fieldId}
                            value={draft.observations}
                            onChange={(e) => set("observations", e.target.value)}
                            rows={2}
                            placeholder="Observaciones..."
                            className="input resize-none text-sm"
                        />
                        {suggestionFor("observations") && (
                            <SuggestionChip
                                label={suggestionFor("observations").label}
                                onApply={() =>
                                    applySuggestion("observations", suggestionFor("observations").value)
                                }
                            />
                        )}
                    </>
                )}
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
