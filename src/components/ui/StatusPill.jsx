import { getReadableTextColor } from "../../lib/color";
import { cn } from "../../lib/utils";

// Píldora de estado con color de fondo configurable y texto de contraste calculado
export default function StatusPill({ status, size = "md", className }) {
    if (!status) return null;
    return (
        <span
            className={cn(
                "badge whitespace-nowrap",
                size === "sm" ? "px-1.5 py-0.5 text-[11px]" : "",
                className
            )}
            style={{ backgroundColor: status.color, color: getReadableTextColor(status.color) }}
        >
            {status.label}
        </span>
    );
}
