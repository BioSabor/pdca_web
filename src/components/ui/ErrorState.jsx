import { AlertTriangle, Lock, RefreshCw } from "lucide-react";
import { cn } from "../../lib/utils";

// Estado de error reutilizable para fallos de carga de datos.
// Detecta permission-denied para dar un mensaje de acceso claro.
export default function ErrorState({ title, error, onRetry, className }) {
    const denied = error?.code === "permission-denied";
    const Icon = denied ? Lock : AlertTriangle;
    const heading = title || (denied ? "No tienes acceso a estos datos" : "No se pudieron cargar los datos");
    return (
        <div className={cn("card flex flex-col items-center p-12 text-center", className)}>
            <Icon className="mb-3 h-12 w-12 text-red-400" />
            <p className="font-medium text-gray-700 dark:text-gray-200">{heading}</p>
            <p className="mt-1 max-w-md text-sm text-gray-500 dark:text-gray-400">
                {denied
                    ? "Si crees que deberías tener acceso, contacta con un administrador."
                    : "Comprueba tu conexión e inténtalo de nuevo."}
            </p>
            {onRetry && !denied && (
                <button type="button" onClick={onRetry} className="btn-secondary mt-4">
                    <RefreshCw className="h-4 w-4" />
                    Reintentar
                </button>
            )}
        </div>
    );
}
