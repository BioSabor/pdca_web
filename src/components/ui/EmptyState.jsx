import { cn } from "../../lib/utils";

export default function EmptyState({ icon: Icon, title, description, action, className }) {
    return (
        <div className={cn("card flex flex-col items-center px-6 py-10 text-center sm:p-12", className)}>
            {Icon && (
                <span
                    className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-2"
                    aria-hidden="true"
                >
                    <Icon className="h-7 w-7 text-gray-400 dark:text-gray-500" />
                </span>
            )}
            <p className="font-medium text-gray-700 dark:text-gray-200">{title}</p>
            {description && (
                <p className="mt-1 max-w-sm text-sm text-gray-500 dark:text-gray-400">{description}</p>
            )}
            {action && <div className="mt-4">{action}</div>}
        </div>
    );
}
