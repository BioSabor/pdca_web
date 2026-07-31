import { useMemo } from "react";
import { AlertTriangle, CheckCircle2, Clock, Target } from "lucide-react";
import BarChart from "../charts/BarChart";
import LineChart from "../charts/LineChart";
import DonutChart from "../charts/DonutChart";
import { getStatusConfig } from "../../lib/status";
import { isDoneStatus, isClosedStatus } from "../../lib/progress";
import {
    addDays,
    formatShortDate,
    parseLocalISO,
    startOfWeekISO,
    todayLocalISO,
} from "../../lib/dates";
import { cn } from "../../lib/utils";

const WEEKS_SHOWN = 12;

function KpiTile({ icon: Icon, iconClass, value, label, hint }) {
    return (
        <div className="card p-4">
            <div className="flex items-center gap-3">
                <div className={cn("rounded-lg p-2", iconClass)}>
                    <Icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                    <p className="text-2xl font-bold tabular-nums text-gray-800 dark:text-gray-100">{value}</p>
                    <p className="truncate text-xs text-gray-500 dark:text-gray-400" title={hint || label}>
                        {label}
                    </p>
                </div>
            </div>
        </div>
    );
}

function ChartCard({ title, subtitle, children }) {
    return (
        <div className="card p-4 md:p-6">
            <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-100">{title}</h2>
            {subtitle && <p className="mb-4 mt-0.5 text-xs text-gray-500 dark:text-gray-400">{subtitle}</p>}
            {children}
        </div>
    );
}

// Pestaña Resumen: KPIs, abiertas por estado, tendencia de completadas y
// cumplimiento de plazos sobre las acciones del scope y los filtros globales.
export default function OverviewTab({ scopedActions, statuses, startDate, endDate }) {
    const metrics = useMemo(() => {
        const today = todayLocalISO();
        let open = 0;
        let overdue = 0;
        const openByStatus = new Map();
        const completedInRange = [];

        for (const action of scopedActions) {
            const cfg = getStatusConfig(statuses, action.status);
            if (
                isDoneStatus(cfg) &&
                action.actualEndDate &&
                action.actualEndDate >= startDate &&
                action.actualEndDate <= endDate
            ) {
                completedInRange.push(action);
            }
            if (!isClosedStatus(cfg)) {
                open += 1;
                const entry = openByStatus.get(cfg.id) || { label: cfg.label, color: cfg.color, value: 0 };
                entry.value += 1;
                openByStatus.set(cfg.id, entry);
                if (action.proposedEndDate && action.proposedEndDate < today) overdue += 1;
            }
        }

        let onTime = 0;
        let late = 0;
        let noProposed = 0;
        for (const action of completedInRange) {
            if (!action.proposedEndDate) noProposed += 1;
            else if (action.actualEndDate <= action.proposedEndDate) onTime += 1;
            else late += 1;
        }
        const withProposed = onTime + late;
        const compliancePct = withProposed > 0 ? Math.round((onTime / withProposed) * 100) : null;

        return {
            open,
            overdue,
            completedInRange: completedInRange.length,
            onTime,
            late,
            noProposed,
            compliancePct,
            openByStatus: Array.from(openByStatus.values()).sort((a, b) => b.value - a.value),
        };
    }, [scopedActions, statuses, startDate, endDate]);

    // Completadas por semana (últimas 12): tendencia independiente del rango.
    const weeklyPoints = useMemo(() => {
        const currentMonday = startOfWeekISO();
        const weeks = [];
        for (let i = WEEKS_SHOWN - 1; i >= 0; i--) {
            weeks.push(addDays(currentMonday, -7 * i));
        }
        const countByWeek = new Map(weeks.map((week) => [week, 0]));
        for (const action of scopedActions) {
            if (!action.actualEndDate) continue;
            const cfg = getStatusConfig(statuses, action.status);
            if (!isDoneStatus(cfg)) continue;
            const week = startOfWeekISO(parseLocalISO(action.actualEndDate));
            if (countByWeek.has(week)) countByWeek.set(week, countByWeek.get(week) + 1);
        }
        return weeks.map((week) => ({
            label: formatShortDate(week).slice(0, 5),
            value: countByWeek.get(week),
        }));
    }, [scopedActions, statuses]);

    // Paleta validada para daltonismo (no modificar): brand / rojo / gris neutro.
    const donutSegments = [
        {
            label: "A tiempo",
            value: metrics.onTime,
            colorClass: "stroke-brand-600 dark:stroke-brand-500",
            swatchClass: "bg-brand-600 dark:bg-brand-500",
        },
        {
            label: "Con retraso",
            value: metrics.late,
            colorClass: "stroke-red-600 dark:stroke-red-500",
            swatchClass: "bg-red-600 dark:bg-red-500",
        },
        {
            label: "Sin fecha propuesta",
            value: metrics.noProposed,
            colorClass: "stroke-gray-300 dark:stroke-gray-600",
            swatchClass: "bg-gray-300 dark:bg-gray-600",
        },
    ];

    const rangeLabel = `${formatShortDate(startDate)} – ${formatShortDate(endDate)}`;

    return (
        <div className="space-y-4 md:space-y-6">
            {/* KPIs */}
            <div className="grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-4">
                <KpiTile
                    icon={Clock}
                    iconClass="bg-brand-100 text-brand-600 dark:bg-brand-900/40 dark:text-brand-400"
                    value={metrics.open}
                    label="Acciones abiertas"
                    hint="Acciones no terminadas ni descartadas"
                />
                <KpiTile
                    icon={CheckCircle2}
                    iconClass="bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-400"
                    value={metrics.completedInRange}
                    label="Completadas en el rango"
                    hint={`Terminadas entre ${rangeLabel}`}
                />
                <KpiTile
                    icon={Target}
                    iconClass="bg-brand-100 text-brand-600 dark:bg-brand-900/40 dark:text-brand-400"
                    value={metrics.compliancePct === null ? "—" : `${metrics.compliancePct}%`}
                    label="Cumplimiento de plazos"
                    hint="Completadas en el rango que terminaron dentro de su fecha propuesta"
                />
                <KpiTile
                    icon={AlertTriangle}
                    iconClass="bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400"
                    value={metrics.overdue}
                    label="Vencidas ahora"
                    hint="Abiertas con fecha propuesta anterior a hoy"
                />
            </div>

            <div className="grid gap-4 md:gap-6 lg:grid-cols-2">
                <ChartCard
                    title="Acciones abiertas por estado"
                    subtitle="Situación actual de las acciones no cerradas"
                >
                    {metrics.openByStatus.length === 0 ? (
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            No hay acciones abiertas con los filtros actuales.
                        </p>
                    ) : (
                        <BarChart
                            data={metrics.openByStatus}
                            ariaLabel={`Acciones abiertas por estado: ${metrics.openByStatus
                                .map((d) => `${d.label} ${d.value}`)
                                .join(", ")}`}
                        />
                    )}
                </ChartCard>

                <ChartCard title="Cumplimiento de plazos" subtitle={`Acciones completadas entre ${rangeLabel}`}>
                    {metrics.completedInRange === 0 ? (
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            No hay acciones completadas en el rango seleccionado.
                        </p>
                    ) : (
                        <DonutChart
                            segments={donutSegments}
                            centerValue={metrics.compliancePct === null ? "—" : `${metrics.compliancePct}%`}
                            centerLabel="a tiempo"
                            ariaLabel={`Cumplimiento de plazos: ${metrics.onTime} a tiempo, ${metrics.late} con retraso, ${metrics.noProposed} sin fecha propuesta`}
                        />
                    )}
                </ChartCard>
            </div>

            <ChartCard
                title="Completadas por semana"
                subtitle="Últimas 12 semanas, con independencia del rango de fechas"
            >
                <LineChart
                    points={weeklyPoints}
                    ariaLabel={`Acciones completadas por semana en las últimas ${WEEKS_SHOWN} semanas`}
                />
            </ChartCard>
        </div>
    );
}
