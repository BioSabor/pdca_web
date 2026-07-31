import { Link } from "react-router-dom";
import { Users, Clock, AlertTriangle, Archive, RotateCcw, Calendar, Building2 } from "lucide-react";
import { formatTimestampDate } from "../../lib/dates";
import { cn } from "../../lib/utils";

// Tarjeta de proyecto ÚNICA y responsive (antes había dos copias divergentes
// móvil/desktop). Navegación accesible con patrón overlay-link: el <Link>
// cubre la tarjeta y los botones interactivos se elevan con z-10.
export default function ProjectCard({
    project,
    stat,
    archived,
    onToggleArchive,
    getUserName,
    extraDeptCount = 0,
}) {
    const assignedUsers = project.assignedUsers || [];
    const visibleUsers = assignedUsers.slice(0, 3);
    const remainingUsers = assignedUsers.length - visibleUsers.length;

    return (
        <article
            className={cn(
                "card relative p-4 transition-shadow hover:shadow-card-hover md:p-5",
                archived && "opacity-80"
            )}
        >
            <Link
                to={`/projects/${project.id}`}
                className="absolute inset-0 rounded-xl"
                aria-label={`Abrir proyecto ${project.title}`}
            />

            <div className="mb-2 flex items-start justify-between gap-2">
                <h3 className="min-w-0 flex-1 truncate text-base font-bold text-gray-800 dark:text-gray-100 md:text-lg">
                    {project.title}
                </h3>
                {onToggleArchive && (
                    <button
                        onClick={onToggleArchive}
                        className="btn-icon btn-ghost relative z-10 -mr-1 -mt-1 flex-shrink-0"
                        aria-label={archived ? "Desarchivar proyecto" : "Archivar proyecto"}
                        title={archived ? "Desarchivar proyecto" : "Archivar proyecto"}
                    >
                        {archived ? <RotateCcw className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
                    </button>
                )}
            </div>

            {project.description && (
                <p className="mb-3 line-clamp-2 hidden text-sm text-gray-600 dark:text-gray-300 md:block">
                    {project.description}
                </p>
            )}

            {stat && (
                <div className="mb-2 flex items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                        <div
                            className="h-1.5 rounded-full bg-brand-600 transition-all duration-500 motion-reduce:transition-none"
                            style={{ width: `${stat.progress}%` }}
                        ></div>
                    </div>
                    <span className="flex-shrink-0 text-xs text-gray-500 dark:text-gray-400">
                        {stat.progress}%
                    </span>
                </div>
            )}

            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                {stat && (
                    <>
                        <span className="flex items-center gap-1" title="Mis acciones pendientes">
                            <Users className="h-3 w-3" />
                            {stat.myPending} mías
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="flex items-center gap-1" title="Acciones pendientes del proyecto">
                            <Clock className="h-3 w-3" />
                            {stat.projectPending} pendientes
                        </span>
                        {stat.myPriority > 0 && (
                            <>
                                <span aria-hidden="true">·</span>
                                <span className="flex items-center gap-1 text-red-500" title="Mis prioritarias">
                                    <AlertTriangle className="h-3 w-3" />
                                    {stat.myPriority}
                                </span>
                            </>
                        )}
                    </>
                )}
                {extraDeptCount > 0 && (
                    <>
                        <span aria-hidden="true">·</span>
                        <span className="flex items-center gap-1" title="Aparece también en otros departamentos">
                            <Building2 className="h-3 w-3" />+{extraDeptCount} dpto(s)
                        </span>
                    </>
                )}
            </div>

            <div className="mt-3 hidden flex-wrap items-center gap-2 md:flex">
                {visibleUsers.map((uid) => (
                    <span key={uid} className="chip">
                        {getUserName(uid)}
                    </span>
                ))}
                {remainingUsers > 0 && <span className="chip">+{remainingUsers}</span>}
                {assignedUsers.length === 0 && (
                    <span className="text-xs text-gray-400 dark:text-gray-500">Sin usuarios asignados</span>
                )}
                <span className="ml-auto flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
                    <Calendar className="h-3 w-3" />
                    {formatTimestampDate(project.createdAt) || "Ahora"}
                </span>
            </div>
        </article>
    );
}
