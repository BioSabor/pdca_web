import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Building2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { projectService } from "../services/projectService";
import { subscribeToTemplates, instantiateTemplate } from "../services/templateService";
import useRealtimeUsers from "../hooks/useRealtimeUsers";
import useRealtimeDepartments from "../hooks/useRealtimeDepartments";
import useRealtimeSubscription from "../hooks/useRealtimeSubscription";
import PageContainer from "../components/ui/PageContainer";
import Field from "../components/ui/Field";
import { useToast } from "../components/ui/Toast";

const ACTION_FIELD_OPTIONS = [
    {
        key: "assignedUsers",
        label: "Responsable",
        description: "Cada acción deberá tener al menos una persona asignada.",
    },
    {
        key: "proposedStartDate",
        label: "Fecha de inicio propuesta",
        description: "Será obligatorio indicar cuándo se prevé empezar la acción.",
    },
    {
        key: "proposedEndDate",
        label: "Fecha de fin propuesta",
        description: "Será obligatorio indicar cuándo se prevé terminar la acción.",
    },
];

export default function CreateProject() {
    const { currentUser } = useAuth();
    const navigate = useNavigate();
    const toast = useToast();

    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const { users: allUsers, loading: loadingUsers } = useRealtimeUsers();
    const [selectedUsers, setSelectedUsers] = useState([currentUser?.uid].filter(Boolean));
    const { departments: allDepartments, loading: loadingDepartments } = useRealtimeDepartments();
    const [selectedDepartments, setSelectedDepartments] = useState([]);
    const [requiredActionFields, setRequiredActionFields] = useState({
        assignedUsers: false,
        proposedStartDate: false,
        proposedEndDate: false,
    });
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});

    // Plantillas disponibles (crear desde plantilla)
    const { data: templates } = useRealtimeSubscription(
        (onData, onError) => subscribeToTemplates(onData, onError),
        []
    );
    const [templateId, setTemplateId] = useState("");
    const selectedTemplate = templates.find((t) => t.id === templateId) || null;

    function handleTemplateChange(id) {
        setTemplateId(id);
        const template = templates.find((t) => t.id === id);
        if (template) {
            if (!description.trim() && template.projectData?.description) {
                setDescription(template.projectData.description);
            }
            if (template.projectData?.requiredActionFields) {
                setRequiredActionFields({
                    assignedUsers: false,
                    proposedStartDate: false,
                    proposedEndDate: false,
                    ...template.projectData.requiredActionFields,
                });
            }
        }
    }

    const creator = allUsers.find((u) => u.id === currentUser?.uid);
    const creatorName =
        creator?.displayName || creator?.email || currentUser?.displayName || currentUser?.email || "Tú";
    const otherUsers = allUsers.filter((u) => u.id !== currentUser?.uid);

    function toggleUser(uid) {
        // El creador se auto-incluye y no se puede quitar
        if (uid === currentUser?.uid) return;
        setSelectedUsers((prev) =>
            prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]
        );
        setErrors((prev) => ({ ...prev, users: undefined }));
    }

    function toggleDepartment(deptId) {
        setSelectedDepartments((prev) =>
            prev.includes(deptId) ? prev.filter((id) => id !== deptId) : [...prev, deptId]
        );
        setErrors((prev) => ({ ...prev, departments: undefined }));
    }

    function toggleRequiredField(key) {
        setRequiredActionFields((prev) => ({ ...prev, [key]: !prev[key] }));
    }

    function validate() {
        const nextErrors = {};
        if (!title.trim()) {
            nextErrors.title = "El título es obligatorio.";
        }
        if (selectedDepartments.length === 0) {
            nextErrors.departments = "Debes asignar al menos un departamento al proyecto.";
        }
        if (selectedUsers.length === 0) {
            nextErrors.users = "Debes asignar al menos un usuario al proyecto.";
        }
        return nextErrors;
    }

    async function handleSubmit(e) {
        e.preventDefault();
        const nextErrors = validate();
        if (Object.values(nextErrors).some(Boolean)) {
            setErrors(nextErrors);
            toast.error("Revisa los campos marcados antes de continuar.");
            return;
        }
        setErrors({});
        setLoading(true);

        try {
            let projectId;
            if (selectedTemplate) {
                projectId = await instantiateTemplate(currentUser.uid, selectedTemplate, {
                    title: title.trim(),
                    description,
                    assignedUsers: selectedUsers,
                    assignedDepartments: selectedDepartments,
                });
            } else {
                projectId = await projectService.createProject(currentUser.uid, {
                    title: title.trim(),
                    description,
                    assignedUsers: selectedUsers,
                    assignedDepartments: selectedDepartments,
                    requiredActionFields,
                });
            }
            toast.success("Proyecto creado correctamente.");
            navigate(`/projects/${projectId}`);
        } catch (err) {
            toast.error("No se pudo crear el proyecto: " + err.message);
            setLoading(false);
        }
    }

    const cardOptionClass = (selected) =>
        `flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 transition-colors ${
            selected
                ? "border-brand-500 bg-brand-500/10"
                : "border-line hover:bg-surface-2"
        }`;

    return (
        <PageContainer
            maxWidth="2xl"
            title="Nuevo Proyecto"
            subtitle="Define el proyecto, quién participa y qué exigirán sus acciones."
            backTo="/"
            backLabel="Volver al Panel"
        >
            <form onSubmit={handleSubmit} noValidate className="card space-y-6 p-5 sm:p-6">
                {templates.length > 0 && (
                    <Field
                        label="Empezar desde"
                        hint={
                            selectedTemplate
                                ? `Se crearán ${selectedTemplate.actions?.length || 0} acción(es) de la plantilla (sin responsables; fechas recalculadas desde hoy).`
                                : "Puedes partir de una plantilla con acciones predefinidas."
                        }
                    >
                        <select
                            className="input"
                            value={templateId}
                            onChange={(e) => handleTemplateChange(e.target.value)}
                        >
                            <option value="">Proyecto en blanco</option>
                            {templates.map((t) => (
                                <option key={t.id} value={t.id}>
                                    Plantilla: {t.name} ({t.actions?.length || 0} acciones)
                                </option>
                            ))}
                        </select>
                    </Field>
                )}

                <Field label="Título del proyecto" required error={errors.title}>
                    <input
                        type="text"
                        className="input"
                        placeholder="Ej: Plan de Mejora Continua - Línea 1"
                        value={title}
                        onChange={(e) => {
                            setTitle(e.target.value);
                            setErrors((prev) => ({ ...prev, title: undefined }));
                        }}
                    />
                </Field>

                <Field label="Descripción" hint="Opcional, pero ayuda a entender el objetivo.">
                    <textarea
                        className="input h-28 resize-y"
                        placeholder="Describe el objetivo del proyecto..."
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                    />
                </Field>

                <Field
                    label="Departamentos asignados"
                    required
                    error={errors.departments}
                    hint={`${selectedDepartments.length} departamento(s) seleccionado(s)`}
                >
                    <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
                        {loadingDepartments ? (
                            <p className="text-sm text-gray-500 dark:text-gray-400">Cargando departamentos…</p>
                        ) : allDepartments.length === 0 ? (
                            <p className="text-sm text-gray-500 dark:text-gray-400">No hay departamentos configurados.</p>
                        ) : (
                            allDepartments.map((dept) => (
                                <label key={dept.id} className={cardOptionClass(selectedDepartments.includes(dept.id))}>
                                    <input
                                        type="checkbox"
                                        checked={selectedDepartments.includes(dept.id)}
                                        onChange={() => toggleDepartment(dept.id)}
                                        className="h-4 w-4 shrink-0 rounded accent-brand-600"
                                    />
                                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-2 text-gray-600 dark:text-gray-300">
                                        <Building2 className="h-4 w-4" />
                                    </span>
                                    <span className="min-w-0 truncate text-sm font-medium text-gray-800 dark:text-gray-100">
                                        {dept.name}
                                    </span>
                                </label>
                            ))
                        )}
                    </div>
                </Field>

                <Field
                    label="Usuarios asignados"
                    required
                    error={errors.users}
                    hint={`${selectedUsers.length} usuario(s) seleccionado(s)`}
                >
                    <div>
                        <div className="mb-2">
                            <span className="chip">
                                <span className="font-medium">{creatorName}</span>
                                <span className="text-gray-500 dark:text-gray-400">(tú)</span>
                            </span>
                        </div>
                        <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
                            {loadingUsers ? (
                                <p className="text-sm text-gray-500 dark:text-gray-400">Cargando usuarios…</p>
                            ) : otherUsers.length === 0 ? (
                                <p className="text-sm text-gray-500 dark:text-gray-400">No hay más usuarios disponibles.</p>
                            ) : (
                                otherUsers.map((user) => (
                                    <label key={user.id} className={cardOptionClass(selectedUsers.includes(user.id))}>
                                        <input
                                            type="checkbox"
                                            checked={selectedUsers.includes(user.id)}
                                            onChange={() => toggleUser(user.id)}
                                            className="h-4 w-4 shrink-0 rounded accent-brand-600"
                                        />
                                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-500/10 text-sm font-bold text-brand-600 dark:text-brand-400">
                                            {(user.displayName || user.email)?.[0]?.toUpperCase()}
                                        </span>
                                        <span className="min-w-0">
                                            <span className="block truncate text-sm font-medium text-gray-800 dark:text-gray-100">
                                                {user.displayName || "Sin nombre"}
                                            </span>
                                            <span className="block truncate text-xs text-gray-500 dark:text-gray-400">
                                                {user.email}
                                            </span>
                                        </span>
                                    </label>
                                ))
                            )}
                        </div>
                    </div>
                </Field>

                <Field
                    label="Campos obligatorios de las acciones"
                    hint={'El campo "Acción" siempre es obligatorio. Marca qué campos adicionales se exigirán al crear o editar acciones.'}
                >
                    <div className="space-y-2">
                        {ACTION_FIELD_OPTIONS.map((option) => (
                            <label key={option.key} className={cardOptionClass(requiredActionFields[option.key])}>
                                <input
                                    type="checkbox"
                                    checked={requiredActionFields[option.key]}
                                    onChange={() => toggleRequiredField(option.key)}
                                    className="h-4 w-4 shrink-0 rounded accent-brand-600"
                                />
                                <span className="min-w-0">
                                    <span className="block text-sm font-medium text-gray-800 dark:text-gray-100">
                                        {option.label}
                                    </span>
                                    <span className="block text-xs text-gray-500 dark:text-gray-400">
                                        {option.description}
                                    </span>
                                </span>
                            </label>
                        ))}
                    </div>
                </Field>

                <div className="flex flex-col gap-3 border-t border-line pt-4 sm:flex-row sm:justify-end">
                    <button type="button" onClick={() => navigate(-1)} className="btn-secondary" disabled={loading}>
                        Cancelar
                    </button>
                    <button type="submit" className="btn-primary" disabled={loading}>
                        {loading ? "Creando…" : "Crear proyecto"}
                    </button>
                </div>
            </form>
        </PageContainer>
    );
}
