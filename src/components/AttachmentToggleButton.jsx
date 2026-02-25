import { Paperclip } from "lucide-react";
import useAttachmentCount from "../hooks/useAttachmentCount";

/**
 * Botón de clip que muestra si una acción tiene adjuntos.
 * Se suscribe al conteo en tiempo real.
 */
export default function AttachmentToggleButton({ projectId, actionId, isExpanded, onClick }) {
    const count = useAttachmentCount(projectId, actionId);
    const hasAttachments = count > 0;

    return (
        <button
            onClick={onClick}
            className={`p-1 rounded transition relative ${
                isExpanded
                    ? "text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/30"
                    : hasAttachments
                        ? "text-blue-500 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/30"
                        : "text-gray-300 dark:text-gray-600 hover:text-gray-500 dark:hover:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
            }`}
            title={isExpanded ? "Ocultar adjuntos" : hasAttachments ? `${count} adjunto(s)` : "Adjuntar archivos"}
        >
            <Paperclip className="w-4 h-4" />
            {hasAttachments && (
                <span className="absolute -top-1 -right-1 inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-blue-600 text-white text-[9px] font-bold leading-none">
                    {count}
                </span>
            )}
        </button>
    );
}
