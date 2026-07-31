import { PDCA_PHASES } from "../../lib/pdca";
import { cn } from "../../lib/utils";

const NO_PHASE_COLOR = "#9CA3AF";

// Barra apilada con la distribución de acciones por fase PDCA.
// No renderiza nada si no hay acciones.
export default function PhaseDistributionBar({ actions, className }) {
    if (!actions || actions.length === 0) return null;

    const counts = {};
    let noPhase = 0;
    for (const a of actions) {
        if (a.phase && PDCA_PHASES.some((p) => p.id === a.phase)) {
            counts[a.phase] = (counts[a.phase] || 0) + 1;
        } else {
            noPhase++;
        }
    }

    const segments = [
        ...PDCA_PHASES.map((p) => ({
            id: p.id,
            label: p.longLabel,
            color: p.color,
            count: counts[p.id] || 0,
        })),
        { id: "none", label: "Sin fase", color: NO_PHASE_COLOR, count: noPhase },
    ].filter((s) => s.count > 0);

    const total = actions.length;

    return (
        <div className={cn("mt-3", className)}>
            <div className="flex h-2 w-full overflow-hidden rounded-full bg-surface-2">
                {segments.map((s) => (
                    <div
                        key={s.id}
                        className="h-full"
                        style={{ width: `${(s.count / total) * 100}%`, backgroundColor: s.color }}
                        title={`${s.label}: ${s.count}`}
                    />
                ))}
            </div>
            <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
                {segments.map((s) => (
                    <span
                        key={s.id}
                        className="inline-flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400"
                        title={`${s.label}: ${s.count}`}
                    >
                        <span
                            className="h-2 w-2 flex-shrink-0 rounded-full"
                            style={{ backgroundColor: s.color }}
                        />
                        {s.label} {s.count}
                    </span>
                ))}
            </div>
        </div>
    );
}
