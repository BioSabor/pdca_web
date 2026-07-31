import { Paperclip } from "lucide-react";
import { cn } from "../lib/utils";

/**
 * Botón de clip que muestra si una acción tiene adjuntos. Presentacional:
 * recibe el conteo por prop (el padre usa useProjectAttachmentCounts, un
 * único listener por proyecto).
 */
export default function AttachmentToggleButton({ count = 0, isExpanded, onClick }) {
    const hasAttachments = count > 0;
    const label = isExpanded
        ? "Ocultar adjuntos"
        : hasAttachments
            ? `${count} adjunto(s)`
            : "Adjuntar archivos";

    return (
        <button
            type="button"
            onClick={onClick}
            aria-label={label}
            aria-expanded={isExpanded}
            title={label}
            className={cn(
                "relative rounded p-1 transition",
                isExpanded
                    ? "bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-400"
                    : hasAttachments
                        ? "text-brand-500 hover:bg-brand-50 hover:text-brand-700 dark:hover:bg-brand-900/30"
                        : "text-gray-300 hover:bg-surface-2 hover:text-gray-500 dark:text-gray-600 dark:hover:text-gray-400"
            )}
        >
            <Paperclip className="h-4 w-4" />
            {hasAttachments && (
                <span className="absolute -right-1 -top-1 inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-brand-600 text-[9px] font-bold leading-none text-white">
                    {count}
                </span>
            )}
        </button>
    );
}
