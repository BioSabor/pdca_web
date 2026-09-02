import { useEffect, useRef, useState } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";
import { Table, ChartGantt, SquareKanban, FolderOpen } from "lucide-react";
import { useAuth } from "../context/AuthContext";

import useRealtimeProject from "../hooks/useRealtimeProject";
import useRealtimeActions from "../hooks/useRealtimeActions";
import useRealtimeStatuses from "../hooks/useRealtimeStatuses";
import useRealtimeUsers from "../hooks/useRealtimeUsers";
import useRealtimeDepartments from "../hooks/useRealtimeDepartments";
import useProjectAttachmentCounts from "../hooks/useProjectAttachmentCounts";
import useActionFilters from "../hooks/useActionFilters";
import useActionSort from "../hooks/useActionSort";
import useVisibleColumns from "../hooks/useVisibleColumns";

import ErrorState from "../components/ui/ErrorState";
import EmptyState from "../components/ui/EmptyState";
import { Skeleton, SkeletonRows } from "../components/ui/Skeleton";
import { useToast } from "../components/ui/Toast";
import { useConfirm } from "../components/ui/ConfirmDialog";

import ProjectHeader from "../components/project/ProjectHeader";
import ProjectToolbar from "../components/project/ProjectToolbar";
import ActionFiltersBar from "../components/project/ActionFiltersBar";
import ActionsTable from "../components/project/ActionsTable";
import ActionCardList from "../components/project/ActionCardList";
import NewActionModal from "../components/project/NewActionModal";
import GanttView from "../components/project/GanttView";
import KanbanBoard from "../components/project/KanbanBoard";
import ActivityPanel from "../components/project/ActivityPanel";
import ProjectDocuments from "../components/project/ProjectDocuments";
import SaveAsTemplateModal from "../components/templates/SaveAsTemplateModal";

import { actionEvents } from "../services/actionEvents";
import { projectService } from "../services/projectService";
import { deleteAllAttachments } from "../services/attachmentService";
import { getStatusConfig } from "../lib/status";
import { formatShortDate, formatTimestampDate, todayLocalISO } from "../lib/dates";
import { getPriorityConfig } from "../lib/priority";
import { getPhaseConfig } from "../lib/pdca";

// Contenedor centrado. Más ancho que el resto de páginas porque el Kanban y la
// tabla aprovechan el espacio, pero acotado para que en monitores grandes no
// quede todo pegado al borde izquierdo.
const PAGE_CLASS = "mx-auto w-full max-w-[96rem]";

const VIEW_OPTIONS = [
    { id: "table", label: "Tabla", icon: Table },
    { id: "kanban", label: "Kanban", icon: SquareKanban },
    { id: "gantt", label: "Gantt", icon: ChartGantt },
    { id: "docs", label: "Documentos", icon: FolderOpen },
];

export default function ProjectDetail() {
    const { id } = useParams();
    const { currentUser } = useAuth();
    const uid = currentUser?.uid;
    const toast = useToast();
    const confirm = useConfirm();
    const [searchParams, setSearchParams] = useSearchParams();

    // Datos en tiempo real
    const { project, loading: loadingProject, error: errorProject, retry: retryProject } = useRealtimeProject(id);
    const { actions, loading: loadingActions } = useRealtimeActions(id);
    const { statuses, loading: loadingStatuses } = useRealtimeStatuses();
    const { users: allUsers, loading: loadingUsers } = useRealtimeUsers();
    const { departments: allDepartments, loading: loadingDepts } = useRealtimeDepartments();
    const { counts: attachmentCounts } = useProjectAttachmentCounts(id);
    const loading = loadingProject || loadingActions || loadingStatuses || loadingUsers || loadingDepts;

    // Estado de UI persistido por usuario y proyecto
    const filtersApi = useActionFilters(uid, id);
    const sortApi = useActionSort(uid, id);
    const { visibleColumns, setVisibleColumns, isColumnVisible, columnOptions } = useVisibleColumns(uid, id);

    const [view, setView] = useState("table");
    const [viewLoaded, setViewLoaded] = useState(false);
    useEffect(() => {
        if (!uid || !id) return;
        const saved = localStorage.getItem(`pdca_view_${uid}_${id}`);
        setView(VIEW_OPTIONS.some((o) => o.id === saved) ? saved : "table");
        setViewLoaded(true);
        return () => setViewLoaded(false);
    }, [uid, id]);
    useEffect(() => {
        if (!uid || !id || !viewLoaded) return;
        localStorage.setItem(`pdca_view_${uid}_${id}`, view);
    }, [view, uid, id, viewLoaded]);

    const [showFilters, setShowFilters] = useState(false);
    const [showNewRow, setShowNewRow] = useState(false);
    const [newActionStatus, setNewActionStatus] = useState(null);
    const [showActivity, setShowActivity] = useState(false);
    const [showSaveTemplate, setShowSaveTemplate] = useState(false);

    // Deep-link ?action=<id>: scroll a la fila/tarjeta y resaltado temporal
    const [highlightId, setHighlightId] = useState(null);
    const rowRefs = useRef({});
    const registerRowRef = (kind) => (actionId) => (el) => {
        rowRefs.current[`${kind}_${actionId}`] = el;
    };
    const pendingActionId = searchParams.get("action");
    useEffect(() => {
        if (!pendingActionId || loadingActions) return;
        const frame = requestAnimationFrame(() => {
            const candidates = [
                rowRefs.current[`t_${pendingActionId}`],
                rowRefs.current[`c_${pendingActionId}`],
            ].filter(Boolean);
            const el = candidates.find((c) => c.offsetParent !== null) || candidates[0];
            if (el) {
                el.scrollIntoView({ behavior: "smooth", block: "center" });
                setHighlightId(pendingActionId);
                window.setTimeout(() => setHighlightId(null), 2000);
            }
            setSearchParams({}, { replace: true });
        });
        return () => cancelAnimationFrame(frame);
    }, [pendingActionId, loadingActions, setSearchParams]);

    // Derivados
    const isCreator = uid === project?.createdBy;
    const requiredFields = project?.requiredActionFields || {};
    const projectUsers = allUsers.filter((u) => project?.assignedUsers?.includes(u.id));

    function getUserName(userId) {
        const user = allUsers.find((u) => u.id === userId);
        return user?.displayName || user?.email?.split("@")[0] || userId;
    }

    // FIX B13: las listas de asignables usan los miembros del proyecto
    const projectUserOptions = projectUsers.map((u) => ({
        value: u.id,
        label: `${u.displayName || u.email}${!u.email ? " (Entidad)" : ""}`,
    }));
    const allUserOptions = allUsers.map((u) => ({
        value: u.id,
        label: `${u.displayName || u.email}${!u.email ? " (Entidad)" : ""}`,
    }));
    const statusOptions = statuses.map((s) => ({ value: s.id, label: s.label, color: s.color }));

    const filteredActions = filtersApi.filterActions(actions);
    const sortedActions = sortApi.sortActions(filteredActions, { statuses, getUserName });

    // ctx para la fachada de eventos de acciones
    const ctx = {
        actorId: uid,
        actorName: currentUser?.displayName || currentUser?.email,
        projectTitle: project?.title,
    };

    // ==================== Comandos sobre acciones ====================

    async function createAction(data) {
        const errors = [];
        if (!data.action.trim()) errors.push("Acción");
        if (requiredFields.assignedUsers && data.assignedUsers.length === 0) errors.push("Responsable");
        if (requiredFields.proposedStartDate && !data.proposedStartDate) errors.push("Fecha inicio propuesta");
        if (requiredFields.proposedEndDate && !data.proposedEndDate) errors.push("Fecha fin propuesta");
        if (errors.length > 0) {
            toast.error(`Campos obligatorios sin completar: ${errors.join(", ")}`);
            return false;
        }
        try {
            await actionEvents.createAction(ctx, id, data);
            toast.success("Acción creada.");
            setShowNewRow(false);
            return true;
        } catch {
            toast.error("Error al añadir la acción.");
            return false;
        }
    }

    const api = {
        createAction,

        async updateField(action, field, value) {
            if (field === "action" && (!value || !value.trim())) {
                toast.error("El campo Acción es obligatorio.");
                return;
            }
            if (field === "proposedStartDate" && requiredFields.proposedStartDate && !value) {
                toast.error("El campo Fecha inicio propuesta es obligatorio en este proyecto.");
                return;
            }
            if (field === "proposedEndDate" && requiredFields.proposedEndDate && !value) {
                toast.error("El campo Fecha fin propuesta es obligatorio en este proyecto.");
                return;
            }
            try {
                await actionEvents.updateAction(ctx, id, action, { [field]: value });
            } catch {
                toast.error("No se pudo guardar el cambio.");
            }
        },

        async changeStatus(action, statusId) {
            try {
                await actionEvents.changeStatus(ctx, id, action, getStatusConfig(statuses, statusId), statuses);
            } catch {
                toast.error("No se pudo actualizar el estado.");
            }
        },

        async changeAssignees(action, newAssignees) {
            if (requiredFields.assignedUsers && newAssignees.length === 0) {
                toast.error("El campo Responsable es obligatorio en este proyecto.");
                return;
            }
            try {
                await actionEvents.changeAssignees(ctx, id, action, newAssignees);
            } catch {
                toast.error("No se pudieron actualizar los responsables.");
            }
        },

        async updateSubactions(action, subactions) {
            try {
                await actionEvents.updateAction(ctx, id, action, { subactions });
            } catch {
                toast.error("No se pudieron guardar las subacciones.");
            }
        },

        async deleteAction(action) {
            const ok = await confirm({
                title: "Eliminar acción",
                message: `¿Eliminar la acción "${action.action || `#${action.seqId}`}"? Se borrarán también sus adjuntos.`,
                confirmLabel: "Eliminar",
                tone: "danger",
            });
            if (!ok) return;
            try {
                await deleteAllAttachments(id, action.id);
                await actionEvents.deleteAction(ctx, id, action);
                toast.success("Acción eliminada.");
            } catch {
                toast.error("Error al eliminar la acción.");
            }
        },
    };

    // ==================== Exportar PDF (import dinámico) ====================

    async function handleExportPdf() {
        if (sortedActions.length === 0) {
            toast.error("No hay acciones visibles para exportar.");
            return;
        }
        try {
            const { jsPDF } = await import("jspdf");
            const autoTable = (await import("jspdf-autotable")).default;

            const columns = [
                { key: "seq", label: "#" },
                { key: "orden", label: "Orden" },
                { key: "priority", label: "Prioridad" },
                { key: "createdAt", label: "Fecha" },
                { key: "action", label: "Acción" },
                { key: "assignedUsers", label: "Responsable" },
                { key: "status", label: "Estado" },
            ];
            if (isColumnVisible("phase")) columns.push({ key: "phase", label: "Fase" });
            if (isColumnVisible("proposedStartDate")) columns.push({ key: "proposedStartDate", label: "F. inicio propuesta" });
            if (isColumnVisible("proposedEndDate")) columns.push({ key: "proposedEndDate", label: "F. fin propuesta" });
            if (isColumnVisible("startDate")) columns.push({ key: "startDate", label: "F. inicio real" });
            if (isColumnVisible("actualEndDate")) columns.push({ key: "actualEndDate", label: "F. fin real" });
            if (isColumnVisible("observations")) columns.push({ key: "observations", label: "Observaciones" });
            if (isColumnVisible("subactions")) columns.push({ key: "subactions", label: "Subacciones" });

            const rows = sortedActions.map((action, index) => ({
                seq: action.seqId || index + 1,
                orden: action.orden ?? "",
                priority: getPriorityConfig(action.priority).label,
                createdAt: formatTimestampDate(action.createdAt),
                action: action.action || "",
                assignedUsers:
                    (action.assignedUsers || []).length > 0
                        ? action.assignedUsers.map((u) => getUserName(u)).join(", ")
                        : "Sin asignar",
                status: getStatusConfig(statuses, action.status).label || "",
                phase: getPhaseConfig(action.phase)?.longLabel || "",
                proposedStartDate: formatShortDate(action.proposedStartDate),
                proposedEndDate: formatShortDate(action.proposedEndDate),
                startDate: formatShortDate(action.startDate),
                actualEndDate: formatShortDate(action.actualEndDate),
                observations: action.observations || "",
                subactions: (action.subactions || []).map((sub) => sub.title).join(" | "),
            }));

            const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
            doc.setFontSize(14);
            doc.text(`Proyecto: ${project.title}`, 40, 40);
            doc.setFontSize(10);
            doc.text(`Fecha: ${formatShortDate(todayLocalISO())}`, 40, 58);

            autoTable(doc, {
                startY: 80,
                head: [columns.map((c) => c.label)],
                body: rows.map((row) => columns.map((c) => row[c.key] ?? "")),
                styles: { fontSize: 8, cellPadding: 4, overflow: "linebreak" },
                headStyles: { fillColor: [243, 244, 246], textColor: 31 },
                theme: "grid",
            });

            doc.save(`acciones_${project.title.replace(/\s+/g, "_")}_${todayLocalISO()}.pdf`);
        } catch (error) {
            console.error("Error al exportar PDF:", error);
            toast.error("No se pudo generar el PDF.");
        }
    }

    function handleNewAction() {
        setNewActionStatus(null);
        setShowNewRow(true);
    }

    function handleAddActionToColumn(statusId) {
        setNewActionStatus(statusId);
        setShowNewRow(true);
    }

    // Límites WIP del kanban (editables por el creador)
    async function handleWipLimitChange(statusId, limit) {
        const next = { ...(project?.kanbanLimits || {}) };
        if (limit == null || Number.isNaN(limit)) delete next[statusId];
        else next[statusId] = limit;
        try {
            await projectService.updateProject(id, { kanbanLimits: next });
        } catch {
            toast.error("No se pudo guardar el límite.");
        }
    }

    // ==================== Guards de carga ====================

    if (errorProject) {
        return <ErrorState error={errorProject} onRetry={retryProject} />;
    }

    if (loading) {
        return (
            <div className={PAGE_CLASS}>
                <Skeleton className="mb-3 h-8 w-1/3" />
                <Skeleton className="mb-6 h-4 w-2/3" />
                <SkeletonRows rows={6} />
            </div>
        );
    }

    if (!project) {
        return (
            <EmptyState
                title="Proyecto no encontrado"
                description="Puede que haya sido eliminado o que no tengas acceso a él."
                action={
                    <Link to="/" className="btn-primary">
                        Volver al panel
                    </Link>
                }
            />
        );
    }

    return (
        <div className={PAGE_CLASS}>
            <ProjectHeader
                project={project}
                projectId={id}
                actions={actions}
                statuses={statuses}
                allUsers={allUsers}
                allDepartments={allDepartments}
                isCreator={isCreator}
            />

            <ProjectToolbar
                showFilters={showFilters}
                onToggleFilters={() => setShowFilters((v) => !v)}
                activeFilterCount={filtersApi.activeCount}
                onClearFilters={filtersApi.clearFilters}
                columnOptions={columnOptions}
                visibleColumns={visibleColumns}
                onColumnsChange={setVisibleColumns}
                viewOptions={VIEW_OPTIONS}
                view={view}
                onViewChange={setView}
                onExportPdf={handleExportPdf}
                exportDisabled={sortedActions.length === 0}
                onNewAction={handleNewAction}
                onShowActivity={() => setShowActivity(true)}
                onSaveTemplate={isCreator ? () => setShowSaveTemplate(true) : undefined}
                showFilterControls={view !== "docs"}
            />

            {showFilters && view !== "docs" && (
                <ActionFiltersBar
                    filtersApi={filtersApi}
                    userOptions={allUserOptions}
                    statusOptions={statusOptions}
                />
            )}

            {view === "docs" ? (
                <ProjectDocuments
                    projectId={id}
                    currentUserId={uid}
                    actorName={ctx.actorName}
                    getUserName={getUserName}
                />
            ) : view === "gantt" ? (
                <GanttView actions={filteredActions} statuses={statuses} />
            ) : view === "kanban" ? (
                <KanbanBoard
                    actions={filteredActions}
                    statuses={statuses}
                    getUserName={getUserName}
                    attachmentCounts={attachmentCounts}
                    onStatusChange={(action, statusCfg) => api.changeStatus(action, statusCfg.id)}
                    wipLimits={project.kanbanLimits || {}}
                    canEditLimits={isCreator}
                    onWipLimitChange={handleWipLimitChange}
                    highlightId={highlightId}
                    onAddAction={handleAddActionToColumn}
                />
            ) : (
                <>
                    {/* Móvil: tarjetas */}
                    <div className="space-y-2 lg:hidden">
                        <ActionCardList
                            actions={sortedActions}
                            statuses={statuses}
                            projectUserOptions={projectUserOptions}
                            getUserName={getUserName}
                            isColumnVisible={isColumnVisible}
                            api={api}
                            attachmentCounts={attachmentCounts}
                            highlightId={highlightId}
                            registerRowRef={registerRowRef("c")}
                            hasActiveFilters={filtersApi.hasActiveFilters}
                            projectId={id}
                            currentUserId={uid}
                            projectUsers={projectUsers}
                            projectTitle={project.title}
                        />
                    </div>

                    {/* Desktop: tabla */}
                    <div className="hidden lg:block">
                        <ActionsTable
                            actions={sortedActions}
                            statuses={statuses}
                            projectUserOptions={projectUserOptions}
                            getUserName={getUserName}
                            requiredFields={requiredFields}
                            isColumnVisible={isColumnVisible}
                            sortColumn={sortApi.sortColumn}
                            sortDirection={sortApi.sortDirection}
                            toggleSort={sortApi.toggleSort}
                            api={api}
                            attachmentCounts={attachmentCounts}
                            highlightId={highlightId}
                            registerRowRef={registerRowRef("t")}
                            hasActiveFilters={filtersApi.hasActiveFilters}
                            projectId={id}
                            currentUserId={uid}
                            projectUsers={projectUsers}
                            projectTitle={project.title}
                        />
                    </div>
                </>
            )}

            <NewActionModal
                open={showNewRow}
                onClose={() => setShowNewRow(false)}
                statuses={statuses}
                userOptions={projectUserOptions}
                requiredFields={requiredFields}
                initialStatus={newActionStatus}
                onSubmit={createAction}
            />

            <ActivityPanel open={showActivity} onClose={() => setShowActivity(false)} projectId={id} />

            {showSaveTemplate && (
                <SaveAsTemplateModal
                    open={showSaveTemplate}
                    onClose={() => setShowSaveTemplate(false)}
                    project={project}
                    actions={actions}
                    currentUser={currentUser}
                />
            )}

            {view !== "docs" && (
                <div className="mt-4 flex items-center justify-between">
                    <div className="text-xs text-gray-400 dark:text-gray-500">
                        {sortedActions.length} de {actions.length} acciones
                    </div>
                    <button type="button" onClick={handleNewAction} className="btn-primary btn-sm">
                        Nueva acción
                    </button>
                </div>
            )}
        </div>
    );
}
