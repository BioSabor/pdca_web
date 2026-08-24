import { Fragment, useState } from "react";
import { ChevronDown, Users } from "lucide-react";
import EmptyState from "../ui/EmptyState";
import { cn } from "../../lib/utils";

// Detalle expandido de un usuario: acciones agrupadas por proyecto.
function DetailGroups({ groups, renderItem, emptyDetailText }) {
    if (groups.length === 0) {
        return <p className="text-xs text-gray-500 dark:text-gray-400">{emptyDetailText}</p>;
    }
    return (
        <div className="space-y-3">
            {groups.map((group) => (
                <div key={group.id} className="rounded-xl border border-line bg-surface p-3">
                    <p className="mb-1.5 text-xs font-semibold text-gray-800 dark:text-gray-100">
                        {group.title} ({group.items.length})
                    </p>
                    <ul className="space-y-1">
                        {group.items.map((item) => (
                            <li key={item.id} className="text-xs text-gray-600 dark:text-gray-300">
                                {renderItem(item)}
                            </li>
                        ))}
                    </ul>
                </div>
            ))}
        </div>
    );
}

// Tabla/lista de usuarios con fila expandible (detalle por proyecto), compartida
// por las pestañas Terminadas y En curso. Responsive: cards <lg, tabla en lg+.
// rows: [{ userId, name, count, groups: [{ id, title, items: [...] }] }]
export default function UserBreakdownTable({
    rows,
    countHeader,
    badgeClass,
    renderItem,
    emptyDetailText,
    emptyState,
}) {
    const [expandedUserId, setExpandedUserId] = useState(null);

    if (rows.length === 0) {
        return (
            <EmptyState
                icon={Users}
                title={emptyState?.title || "Sin datos"}
                description={emptyState?.description}
            />
        );
    }

    function toggle(userId) {
        setExpandedUserId((prev) => (prev === userId ? null : userId));
    }

    return (
        <>
            {/* Móvil y tablet: tarjetas */}
            <div className="space-y-2 lg:hidden">
                {rows.map((row) => {
                    const expanded = expandedUserId === row.userId;
                    return (
                        <div key={row.userId} className="card">
                            <button
                                type="button"
                                onClick={() => toggle(row.userId)}
                                aria-expanded={expanded}
                                className="flex w-full items-center justify-between gap-2 rounded-xl px-4 py-3 text-left"
                            >
                                <span className="truncate text-sm font-medium text-gray-800 dark:text-gray-100">
                                    {row.name}
                                </span>
                                <span className="flex flex-shrink-0 items-center gap-2">
                                    <span className={cn("badge tabular-nums", badgeClass)}>{row.count}</span>
                                    <ChevronDown
                                        aria-hidden="true"
                                        className={cn(
                                            "h-4 w-4 text-gray-400 transition-transform duration-200 motion-reduce:transition-none",
                                            expanded && "rotate-180"
                                        )}
                                    />
                                </span>
                            </button>
                            {expanded && (
                                <div className="border-t border-line px-4 py-3">
                                    <DetailGroups
                                        groups={row.groups}
                                        renderItem={renderItem}
                                        emptyDetailText={emptyDetailText}
                                    />
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Escritorio: tabla */}
            <div className="card hidden scroll-x lg:block">
                <table className="w-full min-w-[640px] text-sm">
                    <thead className="bg-surface-2">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-300">
                                Usuario
                            </th>
                            <th className="w-32 px-4 py-3 text-center text-xs font-medium uppercase text-gray-500 dark:text-gray-300">
                                {countHeader}
                            </th>
                            <th className="w-28 px-4 py-3">
                                <span className="sr-only">Detalle</span>
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                        {rows.map((row) => {
                            const expanded = expandedUserId === row.userId;
                            return (
                                <Fragment key={row.userId}>
                                    <tr
                                        className="cursor-pointer hover:bg-surface-2"
                                        onClick={() => toggle(row.userId)}
                                    >
                                        <td className="px-4 py-3 text-gray-800 dark:text-gray-100">{row.name}</td>
                                        <td className="px-4 py-3 text-center">
                                            <span className={cn("badge tabular-nums", badgeClass)}>{row.count}</span>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <button
                                                type="button"
                                                aria-expanded={expanded}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    toggle(row.userId);
                                                }}
                                                className="text-xs font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
                                            >
                                                {expanded ? "Ocultar" : "Ver detalle"}
                                            </button>
                                        </td>
                                    </tr>
                                    {expanded && (
                                        <tr>
                                            <td colSpan={3} className="bg-surface-2/60 px-4 py-3">
                                                <DetailGroups
                                                    groups={row.groups}
                                                    renderItem={renderItem}
                                                    emptyDetailText={emptyDetailText}
                                                />
                                            </td>
                                        </tr>
                                    )}
                                </Fragment>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </>
    );
}
