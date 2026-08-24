import { useMemo } from "react";
import { AlertTriangle, Clock, Download, Users } from "lucide-react";
import EmptyState from "../ui/EmptyState";
import { useToast } from "../ui/Toast";
import { getStatusConfig } from "../../lib/status";
import { isClosedStatus } from "../../lib/progress";
import { isHighlighted } from "../../lib/priority";
import { exportCsv } from "../../lib/csv";
import { todayLocalISO } from "../../lib/dates";

function SummaryTile({ icon: Icon, iconClass, value, label }) {
    return (
        <div className="card p-4">
            <div className="flex items-center gap-3">
                <div className={`rounded-xl p-2 ${iconClass}`}>
                    <Icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                    <p className="text-2xl font-bold tabular-nums text-gray-800 dark:text-gray-100">{value}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
                </div>
            </div>
        </div>
    );
}

// Pestaña Pendientes por usuario: acciones no cerradas (ni terminadas ni
// descartadas) por usuario asignado, con contador de prioritarias (media/alta).
export default function PendingByUserTab({ scopedActions, statuses, getUserName }) {
    const toast = useToast();

    const rows = useMemo(() => {
        const byUser = new Map();
        for (const action of scopedActions) {
            if (isClosedStatus(getStatusConfig(statuses, action.status))) continue;
            const highlighted = isHighlighted(action.priority);
            for (const uid of action.assignedUsers || []) {
                if (!byUser.has(uid)) byUser.set(uid, { pending: 0, priority: 0 });
                const stats = byUser.get(uid);
                stats.pending += 1;
                if (highlighted) stats.priority += 1;
            }
        }
        return Array.from(byUser.entries())
            .map(([uid, stats]) => ({ userId: uid, name: getUserName(uid), ...stats }))
            .sort((a, b) => b.pending - a.pending || a.name.localeCompare(b.name, "es"));
    }, [scopedActions, statuses, getUserName]);

    const totalPending = rows.reduce((sum, row) => sum + row.pending, 0);
    const totalPriority = rows.reduce((sum, row) => sum + row.priority, 0);

    function handleExport() {
        exportCsv(
            `informe-pendientes-${todayLocalISO()}`,
            ["Usuario", "Pendientes", "Prioritarias"],
            rows.map((row) => [row.name, row.pending, row.priority])
        );
        toast.success("CSV exportado");
    }

    if (rows.length === 0) {
        return (
            <EmptyState
                icon={Users}
                title="No hay acciones pendientes"
                description="Con los filtros actuales, todos los usuarios tienen sus tareas al día."
            />
        );
    }

    return (
        <>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div className="grid flex-1 grid-cols-2 gap-3 md:max-w-lg md:gap-4">
                    <SummaryTile
                        icon={Clock}
                        iconClass="bg-brand-100 text-brand-600 dark:bg-brand-900/40 dark:text-brand-400"
                        value={totalPending}
                        label="Total pendientes"
                    />
                    <SummaryTile
                        icon={AlertTriangle}
                        iconClass="bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400"
                        value={totalPriority}
                        label="Prioritarias"
                    />
                </div>
                <button type="button" onClick={handleExport} className="btn-secondary btn-sm">
                    <Download className="h-3.5 w-3.5" aria-hidden="true" />
                    Exportar CSV
                </button>
            </div>

            {/* Móvil y tablet: tarjetas */}
            <div className="space-y-2 lg:hidden">
                {rows.map((row) => (
                    <div key={row.userId} className="card flex items-center justify-between gap-2 px-4 py-3">
                        <span className="truncate text-sm font-medium text-gray-800 dark:text-gray-100">
                            {row.name}
                        </span>
                        <span className="flex flex-shrink-0 items-center gap-2">
                            <span className="badge bg-brand-100 tabular-nums text-brand-700 dark:bg-brand-900/40 dark:text-brand-200">
                                {row.pending} pend.
                            </span>
                            {row.priority > 0 && (
                                <span className="badge bg-red-100 tabular-nums text-red-700 dark:bg-red-900/40 dark:text-red-200">
                                    {row.priority} prior.
                                </span>
                            )}
                        </span>
                    </div>
                ))}
            </div>

            {/* Escritorio: tabla */}
            <div className="card hidden scroll-x lg:block">
                <table className="w-full min-w-[560px] text-sm">
                    <thead className="bg-surface-2">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-300">
                                Usuario
                            </th>
                            <th className="w-32 px-4 py-3 text-center text-xs font-medium uppercase text-gray-500 dark:text-gray-300">
                                Pendientes
                            </th>
                            <th className="w-32 px-4 py-3 text-center text-xs font-medium uppercase text-gray-500 dark:text-gray-300">
                                Prioritarias
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                        {rows.map((row) => (
                            <tr key={row.userId} className="hover:bg-surface-2">
                                <td className="px-4 py-3 text-gray-800 dark:text-gray-100">{row.name}</td>
                                <td className="px-4 py-3 text-center">
                                    <span className="badge bg-brand-100 tabular-nums text-brand-700 dark:bg-brand-900/40 dark:text-brand-200">
                                        {row.pending}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-center">
                                    {row.priority > 0 ? (
                                        <span className="badge bg-red-100 tabular-nums text-red-700 dark:bg-red-900/40 dark:text-red-200">
                                            {row.priority}
                                        </span>
                                    ) : (
                                        <span className="text-xs text-gray-400 dark:text-gray-500">0</span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </>
    );
}
