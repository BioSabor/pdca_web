// Barras horizontales (magnitud por categoría). HTML puro: responsive por
// defecto, etiquetas directas en tokens de texto, extremos redondeados.
export default function BarChart({ data, ariaLabel }) {
    const max = Math.max(1, ...data.map((d) => d.value));
    return (
        <div role="img" aria-label={ariaLabel} className="space-y-2.5">
            {data.map((d) => (
                <div key={d.label} className="flex items-center gap-3">
                    <span
                        className="w-32 flex-shrink-0 truncate text-right text-xs text-gray-600 dark:text-gray-300 sm:w-40"
                        title={d.label}
                    >
                        {d.label}
                    </span>
                    <div className="h-4 flex-1 rounded-r bg-transparent" title={`${d.label}: ${d.value}`}>
                        <div
                            className="flex h-4 min-w-[2px] items-center rounded-r bg-brand-600 transition-[width] duration-300 motion-reduce:transition-none"
                            style={{
                                width: `${(d.value / max) * 100}%`,
                                backgroundColor: d.color || undefined,
                            }}
                        />
                    </div>
                    <span className="w-8 flex-shrink-0 text-xs font-medium tabular-nums text-gray-700 dark:text-gray-200">
                        {d.value}
                    </span>
                </div>
            ))}
        </div>
    );
}
