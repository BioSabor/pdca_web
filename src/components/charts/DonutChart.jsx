// Donut de proporción con KPI central. Segmentos separados con anillo de 2px
// del color de superficie; identidad reforzada con leyenda (nunca solo color).
// Paleta divergente validada (CVD): azul (positivo) / rojo (negativo) / gris neutro.
export default function DonutChart({ segments, centerValue, centerLabel, ariaLabel }) {
    const total = segments.reduce((sum, s) => sum + s.value, 0);
    const size = 160;
    const radius = 60;
    const strokeW = 22;
    const c = size / 2;
    const circumference = 2 * Math.PI * radius;

    let acc = 0;
    const arcs = segments
        .filter((s) => s.value > 0)
        .map((s) => {
            const fraction = total > 0 ? s.value / total : 0;
            const arc = { ...s, offset: acc, fraction };
            acc += fraction;
            return arc;
        });

    return (
        <div role="img" aria-label={ariaLabel} className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center sm:gap-8">
            <svg viewBox={`0 0 ${size} ${size}`} className="h-40 w-40 flex-shrink-0 -rotate-90">
                {total === 0 ? (
                    <circle
                        cx={c} cy={c} r={radius} fill="none"
                        strokeWidth={strokeW}
                        className="stroke-gray-200 dark:stroke-gray-700"
                    />
                ) : (
                    arcs.map((arc) => (
                        <circle
                            key={arc.label}
                            cx={c} cy={c} r={radius} fill="none"
                            strokeWidth={strokeW}
                            strokeDasharray={`${arc.fraction * circumference} ${circumference}`}
                            strokeDashoffset={-arc.offset * circumference}
                            className={arc.colorClass}
                        >
                            <title>{`${arc.label}: ${arc.value} (${Math.round(arc.fraction * 100)}%)`}</title>
                        </circle>
                    ))
                )}
                {/* Anillos separadores del color de superficie */}
                {total > 0 && arcs.length > 1 && arcs.map((arc) => (
                    <circle
                        key={`gap-${arc.label}`}
                        cx={c} cy={c} r={radius} fill="none"
                        strokeWidth={strokeW + 2}
                        strokeDasharray={`2 ${circumference - 2}`}
                        strokeDashoffset={-arc.offset * circumference}
                        className="stroke-surface"
                    />
                ))}
                <g className="rotate-90" style={{ transformOrigin: "50% 50%" }}>
                    <text x={c} y={c - 4} textAnchor="middle" className="fill-gray-900 text-2xl font-bold dark:fill-gray-100">
                        {centerValue}
                    </text>
                    <text x={c} y={c + 16} textAnchor="middle" className="fill-gray-500 text-[10px] dark:fill-gray-400">
                        {centerLabel}
                    </text>
                </g>
            </svg>
            <ul className="space-y-1.5">
                {segments.map((s) => (
                    <li key={s.label} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
                        <span className={`h-3 w-3 flex-shrink-0 rounded-sm ${s.swatchClass}`} aria-hidden="true" />
                        <span>{s.label}</span>
                        <span className="font-medium tabular-nums">{s.value}</span>
                        {total > 0 && (
                            <span className="text-xs text-gray-400 dark:text-gray-500">
                                ({Math.round((s.value / total) * 100)}%)
                            </span>
                        )}
                    </li>
                ))}
            </ul>
        </div>
    );
}
