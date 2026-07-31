import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Pencil, Trash, Building2 } from "lucide-react";
import MultiCheckDropdown from "../ui/MultiCheckDropdown";
import { useToast } from "../ui/Toast";
import { useConfirm } from "../ui/ConfirmDialog";
import PhaseDistributionBar from "./PhaseDistributionBar";
import { projectService } from "../../services/projectService";
import { computeProgress } from "../../lib/progress";

const DEFAULT_REQUIRED_FIELDS = {
    assignedUsers: false,
    proposedStartDate: false,
    proposedEndDate: false,
};

/**
 * Cabecera del proyecto: título/descripción con edición inline (solo el
 * creador), chips de usuarios y departamentos, barra de progreso (los
 * descartados no cuentan — FIX B9) y distribución por fase PDCA.
 */
export default function ProjectHeader({
    project,
    projectId,
    actions,
    statuses,
    allUsers,
    allDepartments,
    isCreator,
}) {
    const navigate = useNavigate();
    const toast = useToast();
    const confirm = useConfirm();

    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [draft, setDraft] = useState(null);

    const projectUsers = allUsers.filter((u) => project.assignedUsers?.includes(u.id));
    const projectDepartments = allDepartments.filter((d) =>
        project.assignedDepartments?.includes(d.id)
    );

    const userOptions = allUsers.map((u) => ({
        value: u.id,
        label: `${u.displayName || u.email}${!u.email ? " (Entidad)" : ""}`,
    }));
    const deptOptions = allDepartments.map((d) => ({ value: d.id, label: d.name }));

    const progress = computeProgress(actions, statuses);

    function startEdit() {
        setDraft({
            title: project.title,
            description: project.description || "",
            assignedUsers: project.assignedUsers || [],
            assignedDepartments: project.assignedDepartments || [],
            requiredActionFields: { ...DEFAULT_REQUIRED_FIELDS, ...(project.requiredActionFields || {}) },
        });
        setEditing(true);
    }

    async function saveEdits() {
        if (!draft.title.trim()) {
            toast.error("El título del proyecto es obligatorio.");
            return;
        }
        setSaving(true);
        try {
            // Miembros retirados: se limpian también de las acciones para que
            // no les queden "tareas fantasma" que las reglas ya no permiten tocar
            const removedUids = (project.assignedUsers || []).filter(
                (uid) => !draft.assignedUsers.includes(uid)
            );
            await projectService.updateProject(projectId, {
                title: draft.title.trim(),
                description: draft.description,
                assignedUsers: draft.assignedUsers,
                assignedDepartments: draft.assignedDepartments,
                requiredActionFields: draft.requiredActionFields,
            });
            if (removedUids.length > 0) {
                projectService
                    .removeUsersFromProjectActions(projectId, removedUids)
                    .catch((err) => console.error("Error al limpiar asignaciones:", err));
            }
            setEditing(false);
            toast.success("Proyecto actualizado.");
        } catch {
            toast.error("Error al actualizar el proyecto.");
        } finally {
            setSaving(false);
        }
    }

    async function handleDeleteProject() {
        const ok = await confirm({
            title: "Eliminar proyecto",
            message:
                "¿Estás seguro de que quieres eliminar este proyecto y todas sus acciones? Esta acción no se puede deshacer.",
            confirmLabel: "Eliminar",
            tone: "danger",
        });
        if (!ok) return;
        try {
            const { orphanFiles } = await projectService.deleteProjectDeep(projectId);
            if (orphanFiles.length > 0) {
                console.warn("Ficheros de Storage no eliminados:", orphanFiles);
            }
            toast.success("Proyecto eliminado.");
            navigate("/");
        } catch (error) {
            console.error("Error al eliminar proyecto:", error);
            toast.error("Error al eliminar el proyecto. Vuelve a intentarlo.");
        }
    }

    const requiredFieldLabels = [
        { key: "assignedUsers", label: "Responsable" },
        { key: "proposedStartDate", label: "F. inicio propuesta" },
        { key: "proposedEndDate", label: "F. fin propuesta" },
    ];

    return (
        <div className="mb-6">
            <Link
                to="/"
                className="mb-4 flex items-center text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver al panel
            </Link>

            {editing ? (
                <div className="mb-3 space-y-3">
                    <input
                        type="text"
                        value={draft.title}
                        onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                        aria-label="Título del proyecto"
                        className="input text-2xl font-bold"
                    />
                    <textarea
                        value={draft.description}
                        onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                        rows={2}
                        placeholder="Descripción del proyecto"
                        aria-label="Descripción del proyecto"
                        className="input resize-none"
                    />
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm text-gray-600 dark:text-gray-300">Usuarios asignados:</span>
                        <MultiCheckDropdown
                            options={userOptions}
                            selected={draft.assignedUsers}
                            onChange={(v) => setDraft({ ...draft, assignedUsers: v })}
                            placeholder="Seleccionar usuarios"
                        />
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm text-gray-600 dark:text-gray-300">Departamentos:</span>
                        <MultiCheckDropdown
                            options={deptOptions}
                            selected={draft.assignedDepartments}
                            onChange={(v) => setDraft({ ...draft, assignedDepartments: v })}
                            placeholder="Seleccionar departamentos"
                        />
                    </div>
                    <div>
                        <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                            Campos obligatorios en acciones:
                        </span>
                        <p className="mb-2 text-xs text-gray-400 dark:text-gray-500">
                            El campo &quot;Acción&quot; siempre es obligatorio.
                        </p>
                        <div className="flex flex-wrap gap-4">
                            {requiredFieldLabels.map(({ key, label }) => (
                                <label
                                    key={key}
                                    className="flex cursor-pointer items-center gap-2 text-sm text-gray-700 dark:text-gray-200"
                                >
                                    <input
                                        type="checkbox"
                                        checked={draft.requiredActionFields[key]}
                                        onChange={(e) =>
                                            setDraft({
                                                ...draft,
                                                requiredActionFields: {
                                                    ...draft.requiredActionFields,
                                                    [key]: e.target.checked,
                                                },
                                            })
                                        }
                                        className="h-4 w-4 rounded text-brand-600"
                                    />
                                    {label}
                                </label>
                            ))}
                        </div>
                    </div>
                    <div className="flex gap-2 pt-2">
                        <button type="button" onClick={saveEdits} disabled={saving} className="btn-primary btn-sm">
                            Guardar
                        </button>
                        <button
                            type="button"
                            onClick={() => setEditing(false)}
                            className="btn-secondary btn-sm"
                        >
                            Cancelar
                        </button>
                    </div>
                </div>
            ) : (
                <div className="flex items-start justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 md:text-3xl">
                            {project.title}
                        </h1>
                        {project.description && (
                            <p className="mt-1 text-gray-600 dark:text-gray-300">{project.description}</p>
                        )}
                    </div>
                    {isCreator && (
                        <div className="ml-4 flex flex-shrink-0 gap-2">
                            <button
                                type="button"
                                onClick={startEdit}
                                aria-label="Editar proyecto"
                                title="Editar proyecto"
                                className="btn-icon btn-ghost text-gray-400 hover:text-brand-600"
                            >
                                <Pencil className="h-4 w-4" />
                            </button>
                            <button
                                type="button"
                                onClick={handleDeleteProject}
                                aria-label="Eliminar proyecto"
                                title="Eliminar proyecto"
                                className="btn-icon btn-ghost text-gray-400 hover:text-red-600"
                            >
                                <Trash className="h-4 w-4" />
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Progreso: las descartadas no cuentan (FIX B9) */}
            <div className="mb-2 mt-4">
                <div className="mb-1 flex justify-between text-xs text-gray-500 dark:text-gray-400">
                    <span>
                        {progress.done} de {progress.total - progress.discarded} completadas
                        {progress.discarded > 0 && ` · ${progress.discarded} descartadas`}
                    </span>
                    <span>{progress.pct}%</span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-surface-2">
                    <div
                        className="h-2.5 rounded-full bg-brand-600 transition-all duration-500"
                        style={{ width: `${progress.pct}%` }}
                    ></div>
                </div>
            </div>

            <PhaseDistributionBar actions={actions} />

            <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="text-xs text-gray-500 dark:text-gray-400">Usuarios:</span>
                {projectUsers.map((u) => (
                    <span key={u.id} className="chip">
                        {u.displayName || u.email}
                    </span>
                ))}
                {projectDepartments.length > 0 && (
                    <>
                        <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">Departamentos:</span>
                        {projectDepartments.map((d) => (
                            <span key={d.id} className="chip">
                                <Building2 className="h-3 w-3" />
                                {d.name}
                            </span>
                        ))}
                    </>
                )}
            </div>
        </div>
    );
}
