import { PDCA_PHASES } from "../../lib/pdca";
import { getReadableTextColor } from "../../lib/color";
import { cn } from "../../lib/utils";

// Selector de fase PDCA. variant="select" (tabla) o "chips" (tarjetas móviles).
// value: "" | "plan" | "do" | "check" | "act"; onChange recibe "" para "Sin fase".
export default function PhaseSelect({ value, onChange, variant = "select", className, ariaLabel = "Fase" }) {
    const current = value || "";

    if (variant === "chips") {
        return (
            <div role="group" aria-label={ariaLabel} className={cn("flex flex-wrap gap-1.5", className)}>
                <button
                    type="button"
                    onClick={() => onChange("")}
                    aria-pressed={current === ""}
                    className={cn("chip", current === "" && "ring-1 ring-gray-400 font-semibold")}
                >
                    Sin fase
                </button>
                {PDCA_PHASES.map((p) => {
                    const active = current === p.id;
                    return (
                        <button
                            key={p.id}
                            type="button"
                            onClick={() => onChange(p.id)}
                            aria-pressed={active}
                            className={cn("chip", active && "font-semibold")}
                            style={active ? { backgroundColor: p.color, color: getReadableTextColor(p.color) } : undefined}
                        >
                            {p.longLabel}
                        </button>
                    );
                })}
            </div>
        );
    }

    return (
        <select
            value={current}
            onChange={(e) => onChange(e.target.value)}
            aria-label={ariaLabel}
            className={cn(
                "w-full min-w-[5.5rem] cursor-pointer rounded-lg border border-line bg-surface px-2 py-1 text-xs text-gray-700 dark:text-gray-200",
                className
            )}
        >
            <option value="">Sin fase</option>
            {PDCA_PHASES.map((p) => (
                <option key={p.id} value={p.id}>
                    {p.longLabel}
                </option>
            ))}
        </select>
    );
}
