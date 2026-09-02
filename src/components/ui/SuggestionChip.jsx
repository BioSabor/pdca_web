import { Mic } from "lucide-react";
import { cn } from "../../lib/utils";

// Sugerencia detectada por voz para un campo: no se aplica sola, requiere
// que el usuario pulse para confirmarla. Sin onApply (p. ej. un nombre
// mencionado que no coincide con nadie del proyecto) se muestra como aviso
// no interactivo.
export default function SuggestionChip({ label, onApply }) {
    const className = cn(
        "mt-1 inline-flex items-center gap-1.5 rounded-full border border-brand-300 bg-brand-50 px-2 py-0.5 text-xs text-brand-700 dark:border-brand-700 dark:bg-brand-900/30 dark:text-brand-200",
        onApply && "hover:bg-brand-100 dark:hover:bg-brand-900/50"
    );

    if (!onApply) {
        return (
            <span className={className}>
                <Mic className="h-3 w-3 flex-shrink-0" />
                El audio menciona: {label}
            </span>
        );
    }

    return (
        <button type="button" onClick={onApply} className={className}>
            <Mic className="h-3 w-3 flex-shrink-0" />
            Sugerencia: {label} — usar
        </button>
    );
}
