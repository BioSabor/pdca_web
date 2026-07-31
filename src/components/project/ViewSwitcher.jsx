import { cn } from "../../lib/utils";

// Control segmentado de vista, data-driven para poder añadir vistas nuevas
// (p. ej. "kanban") solo ampliando el array de opciones.
// options: [{ id, label, icon? }]
export default function ViewSwitcher({ options, value, onChange, className }) {
    return (
        <div
            role="group"
            aria-label="Vista"
            className={cn("inline-flex rounded-lg border border-line bg-surface p-0.5", className)}
        >
            {options.map((opt) => {
                const active = value === opt.id;
                const Icon = opt.icon;
                return (
                    <button
                        key={opt.id}
                        type="button"
                        onClick={() => onChange(opt.id)}
                        aria-pressed={active}
                        className={cn(
                            "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors",
                            active
                                ? "bg-brand-600 text-white"
                                : "text-gray-600 hover:bg-surface-2 dark:text-gray-300"
                        )}
                    >
                        {Icon && <Icon className="h-4 w-4" />}
                        {opt.label}
                    </button>
                );
            })}
        </div>
    );
}
