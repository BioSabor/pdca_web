import { cn } from "../../lib/utils";

export function Skeleton({ className }) {
    return (
        <div
            className={cn("animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700 motion-reduce:animate-none", className)}
        />
    );
}

export function SkeletonCard({ className }) {
    return (
        <div className={cn("card p-4", className)}>
            <Skeleton className="mb-3 h-5 w-2/3" />
            <Skeleton className="mb-2 h-3 w-full" />
            <Skeleton className="mb-4 h-3 w-4/5" />
            <Skeleton className="h-2 w-full" />
        </div>
    );
}

export function SkeletonRows({ rows = 5, className }) {
    return (
        <div className={cn("card divide-y divide-line", className)}>
            {Array.from({ length: rows }, (_, i) => (
                <div key={i} className="flex items-center gap-4 p-4">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-4 w-1/4" />
                    <Skeleton className="h-4 flex-1" />
                </div>
            ))}
        </div>
    );
}
