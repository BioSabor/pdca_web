import { useState } from "react";
import MultiCheckDropdown from "../ui/MultiCheckDropdown";
import Field from "../ui/Field";
import PrioritySelect from "./PrioritySelect";
import PhaseSelect from "./PhaseSelect";

const DATE_LABELS = {
    proposedStartDate: "Fecha inicio propuesta",
    proposedEndDate: "Fecha fin propuesta",
    startDate: "Fecha inicio real",
    actualEndDate: "Fecha fin real",
};

const EMPTY_DRAFT = {
    action: "",
    assignedUsers: [],
    status: "pendiente",
    priority: "none",
    phase: "",
    proposedStartDate: "",
    proposedEndDate: "",
    startDate: "",
    actualEndDate: "",
    observations: "",
};

function autoResize(el) {
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
}

/**
 * Formulario de alta de acción, único para tabla (variant="row", renderiza un
 * <tr> alineado con las columnas visibles) y móvil (variant="card").
 * La validación de campos obligatorios y la escritura viven en onSubmit
 * (orquestador); si onSubmit devuelve truthy, el formulario se resetea.
 */
export default function NewActionForm({
    variant = "card",
    statuses,
    userOptions,
    requiredFields = {},
    isColumnVisible = () => false,
    onSubmit,
    onCancel,
}) {
    const [draft, setDraft] = useState(EMPTY_DRAFT);

    function set(field, value) {
        setDraft((prev) => ({ ...prev, [field]: value }));
    }

    async function handleSubmit() {
        const ok = await onSubmit({ ...draft, phase: draft.phase || null });
        if (ok) setDraft(EMPTY_DRAFT);
    }

    const statusSelect = (
        <select
            value={draft.status}
            onChange={(e) => set("status", e.target.value)}
            aria-label="Estado"
            className="input py-1 text-xs"
        >
            {statuses.map((s) => (
                <option key={s.id} value={s.id}>
                    {s.label}
                </option>
            ))}
        </select>
    );

    if (variant === "row") {
        const dateInput = (field) => (
            <input
                type="date"
                value={draft[field]}
                onChange={(e) => set(field, e.target.value)}
                aria-label={DATE_LABELS[field]}
                className="input min-h-0 px-1 py-0.5 text-xs"
            />
        );
        return (
            <tr className="bg-brand-50 dark:bg-brand-900/20">
                <td className="px-3 py-2 text-gray-400 dark:text-gray-500">+</td>
                <td className="px-2 py-2 text-xs text-gray-400 dark:text-gray-500">–</td>
                <td className="px-2 py-2 text-center">
                    <PrioritySelect value={draft.priority} onChange={(v) => set("priority", v)} />
                </td>
                <td className="sticky left-0 z-10 bg-surface px-3 py-2">
                    <textarea
                        value={draft.action}
                        onChange={(e) => set("action", e.target.value)}
                        onInput={(e) => autoResize(e.target)}
                        placeholder="Descripción de la acción..."
                        aria-label="Descripción de la acción"
                        rows={1}
                        autoFocus
                        className="input min-h-0 resize-none overflow-hidden py-1 text-sm"
                    />
                </td>
                <td className="px-3 py-2">
                    <MultiCheckDropdown
                        options={userOptions}
                        selected={draft.assignedUsers}
                        onChange={(selected) => set("assignedUsers", selected)}
                        placeholder="Seleccionar..."
                    />
                </td>
                <td className="px-3 py-2">{statusSelect}</td>
                {isColumnVisible("phase") && (
                    <td className="px-2 py-2">
                        <PhaseSelect value={draft.phase} onChange={(v) => set("phase", v)} />
                    </td>
                )}
                {isColumnVisible("proposedStartDate") && <td className="px-1 py-2">{dateInput("proposedStartDate")}</td>}
                {isColumnVisible("proposedEndDate") && <td className="px-1 py-2">{dateInput("proposedEndDate")}</td>}
                {isColumnVisible("startDate") && <td className="px-1 py-2">{dateInput("startDate")}</td>}
                {isColumnVisible("actualEndDate") && <td className="px-1 py-2">{dateInput("actualEndDate")}</td>}
                {isColumnVisible("observations") && (
                    <td className="px-2 py-2">
                        <textarea
                            value={draft.observations}
                            onChange={(e) => set("observations", e.target.value)}
                            onInput={(e) => autoResize(e.target)}
                            placeholder="Observaciones..."
                            aria-label="Observaciones"
                            rows={1}
                            className="input min-h-0 resize-none overflow-hidden py-1 text-xs"
                        />
                    </td>
                )}
                <td className="px-1 py-2 text-center text-xs text-gray-400 dark:text-gray-500">–</td>
                {isColumnVisible("subactions") && (
                    <td className="px-1 py-2 text-center text-xs text-gray-400 dark:text-gray-500">–</td>
                )}
                {isColumnVisible("attachments") && (
                    <td className="px-1 py-2 text-center text-xs text-gray-400 dark:text-gray-500">–</td>
                )}
                {isColumnVisible("comments") && (
                    <td className="px-1 py-2 text-center text-xs text-gray-400 dark:text-gray-500">–</td>
                )}
                <td className="px-3 py-2">
                    <div className="flex gap-2">
                        <button type="button" onClick={handleSubmit} className="btn-primary btn-sm">
                            Añadir
                        </button>
                        <button type="button" onClick={onCancel} className="btn-secondary btn-sm">
                            Cancelar
                        </button>
                    </div>
                </td>
            </tr>
        );
    }

    // variant="card" (móvil)
    return (
        <div className="card space-y-3 border-brand-200 bg-brand-50/60 p-4 dark:border-brand-800 dark:bg-brand-900/20">
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
                <Field label="Estado">{statusSelect}</Field>
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
            <div className="flex gap-2">
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
