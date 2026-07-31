import { getStatusConfig, getStatusStyle } from "../../lib/status";
import { cn } from "../../lib/utils";

// Select de estado coloreado con el color real del estado. Las opciones no
// llevan estilos inline: color-scheme ya está definido en CSS.
export default function StatusSelect({ statuses, value, onChange, className, ariaLabel = "Estado" }) {
    const current = value || "pendiente";
    const isOrphan = !statuses.some((s) => s.id === current);
    return (
        <select
            value={current}
            onChange={(e) => onChange(e.target.value)}
            aria-label={ariaLabel}
            className={cn(
                "cursor-pointer rounded-full border-0 px-3 py-1.5 text-sm font-semibold shadow-sm",
                className
            )}
            style={getStatusStyle(statuses, current)}
        >
            {isOrphan && (
                <option value={current}>{getStatusConfig(statuses, current).label}</option>
            )}
            {statuses.map((s) => (
                <option key={s.id} value={s.id}>
                    {s.label}
                </option>
            ))}
        </select>
    );
}
