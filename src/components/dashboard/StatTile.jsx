import { cn } from "../../lib/utils";
import { withAlpha } from "../../lib/color";

/**
 * Tile de resumen del panel: icono con acento arriba, cifra y etiqueta debajo.
 * La cifra va en su propia línea a propósito: compartiendo línea con la
 * etiqueta se solapaban en cuanto el contador llegaba a 3 dígitos.
 */
export function StatTile({ icon: Icon, accent, value, label, title }) {
    return (
        <div className="card flex flex-col p-3 md:p-4" title={title}>
            <span
                className="flex h-9 w-9 items-center justify-center rounded-xl md:h-10 md:w-10"
                style={{ backgroundColor: withAlpha(accent, 0.16), color: accent }}
                aria-hidden="true"
            >
                <Icon className="h-4 w-4 md:h-5 md:w-5" />
            </span>
            <p className="mt-3 text-xl font-bold leading-none tabular-nums text-gray-800 dark:text-gray-100 md:text-2xl">
                {value}
            </p>
            <p className="mt-1 truncate text-[11px] font-medium leading-tight text-gray-500 dark:text-gray-400 md:text-xs">
                {label}
            </p>
        </div>
    );
}

// Cifra de "Mi semana" (vencidas / hoy / esta semana)
export function WeekStat({ value, label, tone }) {
    const toneClasses =
        value > 0 && tone === "danger"
            ? "text-red-600 dark:text-red-400"
            : value > 0 && tone === "warning"
                ? "text-amber-600 dark:text-amber-400"
                : "text-gray-800 dark:text-gray-100";
    return (
        <span className="block rounded-xl bg-surface-2 px-2 py-2">
            <span className={cn("block text-base font-bold leading-none tabular-nums", toneClasses)}>
                {value}
            </span>
            <span className="mt-1 block truncate text-[11px] text-gray-500 dark:text-gray-400">
                {label}
            </span>
        </span>
    );
}
