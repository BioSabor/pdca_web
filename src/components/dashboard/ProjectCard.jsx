import { Link } from "react-router-dom";
import { AlertTriangle, Archive, Building2, ListChecks, RotateCcw } from "lucide-react";
import { getEntityColor, withAlpha } from "../../lib/color";
import { cn } from "../../lib/utils";

/**
 * Tile de proyecto: rejilla compacta al estilo "carpetas" (icono con acento
 * propio arriba a la izquierda, acción arriba a la derecha, título y métricas
 * abajo). Única y responsive — 2 columnas en móvil, hasta 4 en escritorio.
 * Navegación accesible con patrón overlay-link: el <Link> cubre el tile y los
 * botones interactivos se elevan con z-10.
 */
export default function ProjectCard({
    project,
    stat,
    archived,
    onToggleArchive,
    getUserName,
    extraDeptCount = 0,
}) {
    const accent = getEntityColor(project.id || project.title);
    const assignedUsers = project.assignedUsers || [];
    const progress = stat?.progress ?? 0;
    const complete = progress >= 100;
    const minePending = stat?.myPending ?? 0;
    const mineLabel = minePending === 1 ? "1 mía" : `${minePending} mías`;
    const openLabel =
        stat?.projectPending === 1 ? "1 pendiente" : `${stat?.projectPending ?? 0} pendientes`;

    return (
        <article
            className={cn(
                "card-interactive group relative flex flex-col p-3 sm:p-4",
                archived && "opacity-70"
            )}
        >
            <Link
                to={`/projects/${project.id}`}
                className="absolute inset-0 rounded-2xl"
                aria-label={`Abrir proyecto ${project.title}`}
            />

            {/* Cabecera: icono con acento + acción de archivar */}
            <div className="flex items-start justify-between gap-2">
                <span
                    className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl sm:h-10 sm:w-10"
                    style={{ backgroundColor: withAlpha(accent, 0.16), color: accent }}
                    aria-hidden="true"
                >
                    <ListChecks className="h-5 w-5" />
                </span>

                <div className="flex items-center gap-1">
                    {stat?.myPriority > 0 && (
                        <span
                            className="badge bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-300"
                            title={`${stat.myPriority} acción(es) prioritarias tuyas`}
                        >
                            <AlertTriangle className="h-3 w-3" />
                            {stat.myPriority}
                        </span>
                    )}
                    {onToggleArchive && (
                        <button
                            type="button"
                            onClick={onToggleArchive}
                            className="btn-icon btn-ghost relative z-10 -mr-1.5 -mt-1.5 h-9 min-w-9 flex-shrink-0 text-gray-400 hover:text-brand-600 dark:hover:text-brand-300"
                            aria-label={archived ? "Desarchivar proyecto" : "Archivar proyecto"}
                            title={archived ? "Desarchivar proyecto" : "Archivar proyecto"}
                        >
                            {archived ? <RotateCcw className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
                        </button>
                    )}
                </div>
            </div>

            {/* Título */}
            <h3 className="mt-3 line-clamp-2 text-sm font-semibold leading-snug text-gray-800 dark:text-gray-100 sm:text-[15px]">
                {project.title}
            </h3>

            {project.description && (
                <p className="mt-1 hidden line-clamp-2 text-xs text-gray-500 dark:text-gray-400 lg:block">
                    {project.description}
                </p>
            )}

            {/* Métricas + progreso, siempre pegados al pie del tile */}
            <div className="mt-auto pt-3">
                {stat && (
                    <div className="flex items-end justify-between gap-2">
                        <div className="min-w-0 text-[11px] leading-tight text-gray-500 dark:text-gray-400">
                            <span
                                className={cn(
                                    "block truncate font-medium",
                                    minePending > 0 && "text-brand-600 dark:text-brand-300"
                                )}
                                title="Acciones abiertas asignadas a ti"
                            >
                                {mineLabel}
                            </span>
                            <span className="block truncate" title="Acciones abiertas del proyecto">
                                {openLabel}
                            </span>
                        </div>
                        <span
                            className={cn(
                                "flex-shrink-0 text-lg font-bold leading-none tabular-nums",
                                complete
                                    ? "text-green-600 dark:text-green-400"
                                    : "text-gray-800 dark:text-gray-100"
                            )}
                        >
                            {progress}
                            <span className="text-xs font-semibold">%</span>
                        </span>
                    </div>
                )}

                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-2">
                    <div
                        className="h-full rounded-full transition-all duration-500 motion-reduce:transition-none"
                        style={{
                            width: `${progress}%`,
                            backgroundColor: complete ? "#22C55E" : accent,
                        }}
                    />
                </div>

                {/* Detalle extra solo cuando hay sitio (escritorio) */}
                <div className="mt-2 hidden flex-wrap items-center gap-1 text-[11px] text-gray-400 dark:text-gray-500 lg:flex">
                    {assignedUsers.length > 0 ? (
                        <span className="truncate" title={assignedUsers.map(getUserName).join(", ")}>
                            {getUserName(assignedUsers[0])}
                            {assignedUsers.length > 1 && ` +${assignedUsers.length - 1}`}
                        </span>
                    ) : (
                        <span>Sin asignar</span>
                    )}
                    {extraDeptCount > 0 && (
                        <span
                            className="flex items-center gap-0.5"
                            title="Aparece también en otros departamentos"
                        >
                            <Building2 className="h-3 w-3" />+{extraDeptCount}
                        </span>
                    )}
                </div>
            </div>
        </article>
    );
}
