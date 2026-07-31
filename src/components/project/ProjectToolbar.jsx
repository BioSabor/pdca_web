import { Filter, X, FileDown, Plus, History, LayoutTemplate } from "lucide-react";
import MultiCheckDropdown from "../ui/MultiCheckDropdown";
import ViewSwitcher from "./ViewSwitcher";
import { cn } from "../../lib/utils";

/**
 * Barra de herramientas del proyecto. flex-wrap para que no desborde en
 * pantallas estrechas. El botón de limpiar filtros va AL LADO del botón de
 * filtros (nunca anidado: HTML inválido).
 */
export default function ProjectToolbar({
    showFilters,
    onToggleFilters,
    activeFilterCount,
    onClearFilters,
    columnOptions,
    visibleColumns,
    onColumnsChange,
    viewOptions,
    view,
    onViewChange,
    onExportPdf,
    exportDisabled,
    onNewAction,
    onShowActivity,
    onSaveTemplate,
}) {
    return (
        <div className="mb-4 flex flex-wrap items-center gap-2">
            <button
                type="button"
                onClick={onToggleFilters}
                aria-expanded={showFilters}
                className={cn(
                    "btn-secondary btn-sm",
                    (showFilters || activeFilterCount > 0) &&
                        "border-brand-300 bg-brand-50 text-brand-700 hover:bg-brand-100 dark:border-brand-700 dark:bg-brand-900/30 dark:text-brand-200 dark:hover:bg-brand-900/50"
                )}
            >
                <Filter className="h-4 w-4" />
                Filtros
                {activeFilterCount > 0 && (
                    <span className="badge bg-brand-600 text-white">{activeFilterCount}</span>
                )}
            </button>
            {activeFilterCount > 0 && (
                <button
                    type="button"
                    onClick={onClearFilters}
                    aria-label="Limpiar filtros"
                    title="Limpiar filtros"
                    className="btn-icon btn-ghost h-9 min-w-9"
                >
                    <X className="h-4 w-4" />
                </button>
            )}
            <MultiCheckDropdown
                options={columnOptions}
                selected={visibleColumns}
                onChange={onColumnsChange}
                placeholder="Columnas"
            />
            <ViewSwitcher options={viewOptions} value={view} onChange={onViewChange} />
            <div className="ml-auto flex flex-wrap items-center gap-2">
                {onShowActivity && (
                    <button
                        type="button"
                        onClick={onShowActivity}
                        className="btn-icon btn-ghost h-9"
                        aria-label="Ver actividad del proyecto"
                        title="Actividad del proyecto"
                    >
                        <History className="h-4 w-4" />
                    </button>
                )}
                {onSaveTemplate && (
                    <button
                        type="button"
                        onClick={onSaveTemplate}
                        className="btn-icon btn-ghost h-9"
                        aria-label="Guardar como plantilla"
                        title="Guardar como plantilla"
                    >
                        <LayoutTemplate className="h-4 w-4" />
                    </button>
                )}
                <button
                    type="button"
                    onClick={onExportPdf}
                    disabled={exportDisabled}
                    className="btn-secondary btn-sm"
                >
                    <FileDown className="h-4 w-4" />
                    Exportar PDF
                </button>
                <button type="button" onClick={onNewAction} className="btn-primary btn-sm">
                    <Plus className="h-4 w-4" />
                    Nueva acción
                </button>
            </div>
        </div>
    );
}
