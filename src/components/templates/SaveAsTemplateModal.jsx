import { useState } from "react";
import Modal from "../ui/Modal";
import Field from "../ui/Field";
import { useToast } from "../ui/Toast";
import { createTemplateFromProject } from "../../services/templateService";

// Guarda el proyecto actual (estructura + acciones semilla, sin usuarios)
// como plantilla reutilizable.
export default function SaveAsTemplateModal({ open, onClose, project, actions, currentUser }) {
    const toast = useToast();
    const [name, setName] = useState(project?.title || "");
    const [description, setDescription] = useState("");
    const [includeDates, setIncludeDates] = useState(true);
    const [saving, setSaving] = useState(false);

    async function handleSave() {
        if (!name.trim()) {
            toast.error("La plantilla necesita un nombre");
            return;
        }
        setSaving(true);
        try {
            await createTemplateFromProject(currentUser.uid, project, actions, {
                name: name.trim(),
                description: description.trim(),
                includeDates,
            });
            toast.success("Plantilla guardada");
            onClose();
        } catch (error) {
            console.error(error);
            toast.error("No se pudo guardar la plantilla");
        } finally {
            setSaving(false);
        }
    }

    return (
        <Modal
            open={open}
            onClose={onClose}
            title="Guardar como plantilla"
            size="md"
            footer={
                <>
                    <button type="button" className="btn-secondary" onClick={onClose}>
                        Cancelar
                    </button>
                    <button type="button" className="btn-primary" onClick={handleSave} disabled={saving}>
                        {saving ? "Guardando…" : "Guardar plantilla"}
                    </button>
                </>
            }
        >
            <div className="space-y-4">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                    Se guardará la estructura del proyecto y sus {actions.length} acción(es) como
                    semilla, sin responsables ni fechas absolutas.
                </p>
                <Field label="Nombre de la plantilla" required>
                    <input
                        className="input"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="p. ej. Auditoría interna anual"
                    />
                </Field>
                <Field label="Descripción" hint="Opcional: cuándo usar esta plantilla">
                    <textarea
                        className="input h-20 resize-y"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                    />
                </Field>
                <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-line px-3 py-2 hover:bg-surface-2">
                    <input
                        type="checkbox"
                        checked={includeDates}
                        onChange={(e) => setIncludeDates(e.target.checked)}
                        className="h-4 w-4 rounded text-brand-600"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-200">
                        Conservar la planificación relativa (las fechas propuestas se recalculan desde
                        el día de creación)
                    </span>
                </label>
            </div>
        </Modal>
    );
}
