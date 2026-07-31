import { getPriorityConfig, normalizePriority } from "../../lib/priority";
import { cn } from "../../lib/utils";

// Indicador de prioridad: punto de color + etiqueta opcional.
// No renderiza nada para "none" salvo que se pida showNone.
export default function PriorityBadge({ priority, showLabel = true, showNone = false, className }) {
    const id = normalizePriority(priority);
    if (id === "none" && !showNone) return null;
    const cfg = getPriorityConfig(id);
    return (
        <span
            className={cn("inline-flex items-center gap-1 text-xs text-gray-600 dark:text-gray-300", className)}
            title={`Prioridad: ${cfg.label}`}
        >
            <span className="h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: cfg.color }} />
            {showLabel && cfg.label}
        </span>
    );
}
