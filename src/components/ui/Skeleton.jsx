import { cn } from "../../lib/utils";

export function Skeleton({ className }) {
    return (
        <div
            className={cn("animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700 motion-reduce:animate-none", className)}
        />
    );
}

// Placeholder con la silueta del tile de proyecto (icono, título, progreso)
export function SkeletonCard({ className }) {
    return (
        <div className={cn("card p-3 sm:p-4", className)}>
            <Skeleton className="h-9 w-9 rounded-xl sm:h-10 sm:w-10" />
            <Skeleton className="mb-2 mt-3 h-4 w-full" />
            <Skeleton className="mb-4 h-4 w-2/3" />
            <Skeleton className="h-1.5 w-full rounded-full" />
        </div>
    );
}

// Lista de tarjetas (tareas, acciones): una tarjeta por fila
export function SkeletonRows({ rows = 5, className }) {
    return (
        <div className={cn("space-y-2", className)}>
            {Array.from({ length: rows }, (_, i) => (
                <div key={i} className="card flex items-start gap-3 p-3">
                    <Skeleton className="h-7 w-7 flex-shrink-0 rounded-full" />
                    <div className="min-w-0 flex-1 space-y-2">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-1/3" />
                    </div>
                    <Skeleton className="hidden h-7 w-24 flex-shrink-0 rounded-lg sm:block" />
                </div>
            ))}
        </div>
    );
}
