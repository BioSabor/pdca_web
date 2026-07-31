import { cn } from "../../lib/utils";

export default function EmptyState({ icon: Icon, title, description, action, className }) {
    return (
        <div className={cn("card flex flex-col items-center p-12 text-center", className)}>
            {Icon && <Icon className="mb-3 h-12 w-12 text-gray-300 dark:text-gray-600" />}
            <p className="font-medium text-gray-700 dark:text-gray-200">{title}</p>
            {description && (
                <p className="mt-1 max-w-sm text-sm text-gray-500 dark:text-gray-400">{description}</p>
            )}
            {action && <div className="mt-4">{action}</div>}
        </div>
    );
}
