import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { cn } from "../../lib/utils";

const WIDTHS = {
    "7xl": "max-w-7xl",
    "6xl": "max-w-6xl",
    "4xl": "max-w-4xl",
    "2xl": "max-w-2xl",
};

// Contenedor estándar de página: ancho, título y acciones unificados
export default function PageContainer({
    title,
    subtitle,
    actions,
    backTo,
    backLabel = "Volver",
    maxWidth = "7xl",
    children,
    className,
}) {
    return (
        <div className={cn("mx-auto w-full", WIDTHS[maxWidth] || WIDTHS["7xl"], className)}>
            {backTo && (
                <Link
                    to={backTo}
                    className="mb-3 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-brand-600 dark:text-gray-400 dark:hover:text-brand-400"
                >
                    <ArrowLeft className="h-4 w-4" />
                    {backLabel}
                </Link>
            )}
            {(title || actions) && (
                <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                        {title && (
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 md:text-3xl">
                                {title}
                            </h1>
                        )}
                        {subtitle && (
                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>
                        )}
                    </div>
                    {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
                </div>
            )}
            {children}
        </div>
    );
}
