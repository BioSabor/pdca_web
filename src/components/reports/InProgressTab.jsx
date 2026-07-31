import { useMemo } from "react";
import { Clock, Download } from "lucide-react";
import UserBreakdownTable from "./UserBreakdownTable";
import PriorityBadge from "../ui/PriorityBadge";
import { useToast } from "../ui/Toast";
import { getStatusConfig } from "../../lib/status";
import { exportCsv } from "../../lib/csv";
import { todayLocalISO } from "../../lib/dates";

// Pestaña En curso por usuario: acciones cuyo estado es de tipo "start",
// agrupadas por usuario asignado con detalle expandible por proyecto.
export default function InProgressTab({ scopedActions, statuses, projectTitleById, getUserName }) {
    const toast = useToast();

    const rows = useMemo(() => {
        const byUser = new Map();
        for (const action of scopedActions) {
            if (getStatusConfig(statuses, action.status).type !== "start") continue;
            for (const uid of action.assignedUsers || []) {
                if (!byUser.has(uid)) byUser.set(uid, new Map());
                const byProject = byUser.get(uid);
                const projectId = action.projectId || "unknown";
                if (!byProject.has(projectId)) byProject.set(projectId, []);
                byProject.get(projectId).push(action);
            }
        }

        return Array.from(byUser.entries())
            .map(([uid, byProject]) => {
                const groups = Array.from(byProject.entries())
                    .map(([projectId, items]) => ({
                        id: projectId,
                        title: projectTitleById[projectId] || "Proyecto",
                        items,
                    }))
                    .sort((a, b) => a.title.localeCompare(b.title, "es"));
                return {
                    userId: uid,
                    name: getUserName(uid),
                    count: groups.reduce((sum, g) => sum + g.items.length, 0),
                    groups,
                };
            })
            .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "es"));
    }, [scopedActions, statuses, projectTitleById, getUserName]);

    const totalInProgress = rows.reduce((sum, row) => sum + row.count, 0);

    function handleExport() {
        exportCsv(
            `informe-en-curso-${todayLocalISO()}`,
            ["Usuario", "En curso", "Detalle por proyecto"],
            rows.map((row) => [
                row.name,
                row.count,
                row.groups.map((g) => `${g.title}: ${g.items.length}`).join(" | "),
            ])
        );
        toast.success("CSV exportado");
    }

    return (
        <>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <p className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                    <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                    {totalInProgress} acciones en curso con los filtros actuales.
                </p>
                <button
                    type="button"
                    onClick={handleExport}
                    disabled={rows.length === 0}
                    className="btn-secondary btn-sm"
                >
                    <Download className="h-3.5 w-3.5" aria-hidden="true" />
                    Exportar CSV
                </button>
            </div>

            <UserBreakdownTable
                rows={rows}
                countHeader="En curso"
                badgeClass="bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200"
                emptyDetailText="Sin acciones en curso."
                emptyState={{
                    title: "No hay acciones en curso",
                    description: "Con los filtros actuales no hay acciones iniciadas sin terminar.",
                }}
                renderItem={(action) => (
                    <span className="flex items-center justify-between gap-2">
                        <span className="truncate">{action.action || "Sin descripción"}</span>
                        <PriorityBadge priority={action.priority} className="flex-shrink-0" />
                    </span>
                )}
            />
        </>
    );
}
