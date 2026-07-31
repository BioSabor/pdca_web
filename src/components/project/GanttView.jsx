import { useMemo } from "react";
import { CalendarRange } from "lucide-react";
import EmptyState from "../ui/EmptyState";
import { getStatusConfig } from "../../lib/status";
import { parseLocalISO, todayLocalISO, formatShortDate } from "../../lib/dates";

const MS_PER_DAY = 1000 * 60 * 60 * 24;

// Vista de cronograma del proyecto. Barras coloreadas con el color REAL del
// estado configurado (no ids hardcodeados) y marcador de "hoy".
export default function GanttView({ actions, statuses }) {
    const validActions = useMemo(() => {
        return actions
            .filter(
                (a) =>
                    (a.startDate || a.proposedStartDate) &&
                    (a.actualEndDate || a.proposedEndDate)
            )
            .sort((a, b) => {
                const startA = a.startDate || a.proposedStartDate;
                const startB = b.startDate || b.proposedStartDate;
                return startA.localeCompare(startB);
            });
    }, [actions]);

    const { minDate, totalDays } = useMemo(() => {
        if (validActions.length === 0) return { minDate: new Date(), totalDays: 1 };

        let min = null;
        let max = null;
        validActions.forEach((a) => {
            const start = parseLocalISO(a.startDate || a.proposedStartDate);
            const end = parseLocalISO(a.actualEndDate || a.proposedEndDate);
            if (!min || start < min) min = start;
            if (!max || end > max) max = end;
        });

        min.setDate(min.getDate() - 2);
        max.setDate(max.getDate() + 5);
        const diffDays = Math.max(1, Math.ceil(Math.abs(max - min) / MS_PER_DAY));
        return { minDate: min, totalDays: diffDays };
    }, [validActions]);

    function getPosition(action) {
        const start = parseLocalISO(action.startDate || action.proposedStartDate);
        const end = parseLocalISO(action.actualEndDate || action.proposedEndDate);
        const startDiff = Math.ceil((start - minDate) / MS_PER_DAY);
        const duration = Math.ceil((end - start) / MS_PER_DAY) + 1;
        return {
            left: `${(startDiff / totalDays) * 100}%`,
            width: `${Math.max((duration / totalDays) * 100, 1)}%`,
        };
    }

    const ticks = useMemo(() => {
        const t = [];
        const step = totalDays > 30 ? Math.ceil(totalDays / 10) : Math.max(1, Math.ceil(totalDays / 14));
        for (let i = 0; i < totalDays; i += step) {
            const d = new Date(minDate);
            d.setDate(d.getDate() + i);
            t.push({
                label: d.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit" }),
                left: `${(i / totalDays) * 100}%`,
            });
        }
        return t;
    }, [totalDays, minDate]);

    const todayLeft = useMemo(() => {
        const diff = Math.ceil((parseLocalISO(todayLocalISO()) - minDate) / MS_PER_DAY);
        if (diff < 0 || diff > totalDays) return null;
        return `${(diff / totalDays) * 100}%`;
    }, [minDate, totalDays]);

    if (validActions.length === 0) {
        return (
            <EmptyState
                icon={CalendarRange}
                title="Sin fechas suficientes para el cronograma"
                description="Define fechas de inicio y fin (propuestas o reales) en las acciones para verlas aquí."
            />
        );
    }

    return (
        <div className="card overflow-x-auto p-4">
            <div className="relative min-w-[600px]">
                {/* Cabecera de la línea temporal */}
                <div className="relative mb-2 h-6 border-b border-line pb-2">
                    {ticks.map((tick, i) => (
                        <div
                            key={i}
                            className="absolute -translate-x-1/2 text-xs text-gray-500 dark:text-gray-400"
                            style={{ left: tick.left }}
                        >
                            {tick.label}
                        </div>
                    ))}
                </div>

                {/* Líneas de la cuadrícula */}
                <div className="pointer-events-none absolute inset-0 top-8">
                    {ticks.map((tick, i) => (
                        <div
                            key={i}
                            className="absolute h-full border-l border-line/60"
                            style={{ left: tick.left }}
                        ></div>
                    ))}
                    {todayLeft && (
                        <div
                            className="absolute h-full border-l-2 border-red-400"
                            style={{ left: todayLeft }}
                            title="Hoy"
                        ></div>
                    )}
                </div>

                {/* Barras */}
                <div className="space-y-3 pt-2">
                    {validActions.map((action) => {
                        const { left, width } = getPosition(action);
                        const statusCfg = getStatusConfig(statuses, action.status);
                        const rangeLabel = `${formatShortDate(action.startDate || action.proposedStartDate)} – ${formatShortDate(action.actualEndDate || action.proposedEndDate)}`;
                        return (
                            <div key={action.id} className="group relative">
                                <div className="mb-1 flex items-center text-xs">
                                    <div
                                        className="w-1/4 truncate pr-2 font-medium text-gray-700 dark:text-gray-200"
                                        title={action.action}
                                    >
                                        {action.seqId ? `#${action.seqId} ` : ""}{action.action}
                                    </div>
                                    <div className="relative h-6 w-3/4 rounded bg-surface-2/60">
                                        <div
                                            className="absolute bottom-1 top-1 cursor-pointer rounded opacity-85 shadow-sm transition-opacity hover:opacity-100"
                                            style={{ left, width, backgroundColor: statusCfg.color }}
                                            title={`${action.action} · ${statusCfg.label} (${rangeLabel})`}
                                        ></div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
