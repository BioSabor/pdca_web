import { useMemo } from "react";
import { Download } from "lucide-react";
import UserBreakdownTable from "./UserBreakdownTable";
import { useToast } from "../ui/Toast";
import { getStatusConfig } from "../../lib/status";
import { isDoneStatus } from "../../lib/progress";
import { formatShortDate } from "../../lib/dates";
import { exportCsv } from "../../lib/csv";

// Pestaña Terminadas: nº de acciones terminadas de verdad (no descartadas) por
// usuario dentro del rango global, con detalle expandible por proyecto.
export default function CompletedTab({
    scopedActions,
    statuses,
    users,
    startDate,
    endDate,
    projectTitleById,
    getUserName,
}) {
    const toast = useToast();

    const rows = useMemo(() => {
        const doneInRange = scopedActions.filter((action) => {
            if (!isDoneStatus(getStatusConfig(statuses, action.status))) return false;
            if (!action.actualEndDate) return false;
            return action.actualEndDate >= startDate && action.actualEndDate <= endDate;
        });

        const byUser = new Map();
        for (const action of doneInRange) {
            for (const uid of action.assignedUsers || []) {
                if (!byUser.has(uid)) byUser.set(uid, new Map());
                const byProject = byUser.get(uid);
                const projectId = action.projectId || "unknown";
                if (!byProject.has(projectId)) byProject.set(projectId, []);
                byProject.get(projectId).push(action);
            }
        }

        function buildGroups(byProject) {
            return Array.from(byProject.entries())
                .map(([projectId, items]) => ({
                    id: projectId,
                    title: projectTitleById[projectId] || "Proyecto",
                    items: items
                        .slice()
                        .sort((a, b) => (a.actualEndDate || "").localeCompare(b.actualEndDate || "")),
                }))
                .sort((a, b) => a.title.localeCompare(b.title, "es"));
        }

        // Todos los usuarios activos (aunque tengan 0), más cualquier uid con
        // datos que ya no exista en la colección de usuarios.
        const mapped = [];
        const seen = new Set();
        for (const user of users) {
            const byProject = byUser.get(user.id);
            const count = byProject
                ? Array.from(byProject.values()).reduce((sum, items) => sum + items.length, 0)
                : 0;
            if (user.disabled && count === 0) continue;
            seen.add(user.id);
            mapped.push({
                userId: user.id,
                name: getUserName(user.id),
                count,
                groups: byProject ? buildGroups(byProject) : [],
            });
        }
        for (const [uid, byProject] of byUser.entries()) {
            if (seen.has(uid)) continue;
            mapped.push({
                userId: uid,
                name: getUserName(uid),
                count: Array.from(byProject.values()).reduce((sum, items) => sum + items.length, 0),
                groups: buildGroups(byProject),
            });
        }

        mapped.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "es"));
        return mapped;
    }, [scopedActions, statuses, users, startDate, endDate, projectTitleById, getUserName]);

    const totalCompleted = rows.reduce((sum, row) => sum + row.count, 0);

    function handleExport() {
        exportCsv(
            `informe-terminadas-${startDate}-a-${endDate}`,
            ["Usuario", "Terminadas", "Detalle por proyecto"],
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
                <p className="text-xs text-gray-500 dark:text-gray-400">
                    {totalCompleted} acciones terminadas entre {formatShortDate(startDate)} y{" "}
                    {formatShortDate(endDate)}. Las descartadas no cuentan.
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
                countHeader="Terminadas"
                badgeClass="bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-200"
                emptyDetailText="Sin acciones terminadas en este periodo."
                emptyState={{
                    title: "No hay datos de usuarios",
                    description: "No se encontraron usuarios ni acciones terminadas con los filtros actuales.",
                }}
                renderItem={(action) => (
                    <span className="flex justify-between gap-2">
                        <span className="truncate">{action.action || "Sin descripción"}</span>
                        {action.actualEndDate && (
                            <span className="flex-shrink-0 text-gray-400 dark:text-gray-500">
                                {formatShortDate(action.actualEndDate)}
                            </span>
                        )}
                    </span>
                )}
            />
        </>
    );
}
