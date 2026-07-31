import { LayoutTemplate, Trash2 } from "lucide-react";
import useRealtimeSubscription from "../../hooks/useRealtimeSubscription";
import { subscribeToTemplates, deleteTemplate } from "../../services/templateService";
import { useAuth } from "../../context/AuthContext";
import EmptyState from "../ui/EmptyState";
import ErrorState from "../ui/ErrorState";
import { SkeletonRows } from "../ui/Skeleton";
import { useToast } from "../ui/Toast";
import { useConfirm } from "../ui/ConfirmDialog";
import { formatTimestampDate } from "../../lib/dates";

// Gestión de plantillas de proyecto (pestaña del panel de administración)
export default function TemplateManager() {
    const { currentUser } = useAuth();
    const toast = useToast();
    const confirm = useConfirm();
    const { data: templates, loading, error, retry } = useRealtimeSubscription(
        (onData, onError) => subscribeToTemplates(onData, onError),
        []
    );

    const isAdmin = currentUser?.role === "admin";

    async function handleDelete(template) {
        const ok = await confirm({
            title: "Eliminar plantilla",
            message: `¿Eliminar la plantilla "${template.name}"? Los proyectos ya creados no se ven afectados.`,
            confirmLabel: "Eliminar",
            tone: "danger",
        });
        if (!ok) return;
        try {
            await deleteTemplate(template.id);
            toast.success("Plantilla eliminada");
        } catch (err) {
            console.error(err);
            toast.error("No se pudo eliminar la plantilla");
        }
    }

    if (error) return <ErrorState error={error} onRetry={retry} />;
    if (loading) return <SkeletonRows rows={3} />;

    return (
        <div className="space-y-4">
            <div>
                <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">Plantillas de proyecto</h2>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Se crean desde un proyecto existente (&quot;Guardar como plantilla&quot;) y se usan
                    al crear un proyecto nuevo.
                </p>
            </div>
            {templates.length === 0 ? (
                <EmptyState
                    icon={LayoutTemplate}
                    title="No hay plantillas"
                    description='Abre un proyecto y usa "Guardar como plantilla" para crear la primera.'
                />
            ) : (
                <div className="card divide-y divide-line">
                    {templates.map((t) => (
                        <div key={t.id} className="flex items-center gap-3 p-3">
                            <LayoutTemplate className="h-5 w-5 flex-shrink-0 text-brand-500" />
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium text-gray-800 dark:text-gray-100">
                                    {t.name}
                                </p>
                                <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                                    {t.actions?.length || 0} acción(es)
                                    {t.description ? ` · ${t.description}` : ""}
                                    {t.createdAt ? ` · ${formatTimestampDate(t.createdAt)}` : ""}
                                </p>
                            </div>
                            {(isAdmin || t.createdBy === currentUser?.uid) && (
                                <button
                                    type="button"
                                    onClick={() => handleDelete(t)}
                                    className="btn-icon btn-ghost text-gray-400 hover:text-red-600"
                                    aria-label={`Eliminar plantilla ${t.name}`}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
