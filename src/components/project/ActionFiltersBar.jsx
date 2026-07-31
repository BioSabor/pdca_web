import MultiCheckDropdown from "../ui/MultiCheckDropdown";
import Field from "../ui/Field";
import { PDCA_PHASES } from "../../lib/pdca";
import { PRIORITY_LEVELS } from "../../lib/priority";

const PHASE_OPTIONS = [
    ...PDCA_PHASES.map((p) => ({ value: p.id, label: p.longLabel, color: p.color })),
    { value: "none", label: "Sin fase", color: "#9CA3AF" },
];

const PRIORITY_OPTIONS = PRIORITY_LEVELS.map((l) => ({
    value: l.id,
    label: l.label,
    color: l.color,
}));

/**
 * Barra de filtros de acciones: usuarios, estados, fase, prioridad y rango de
 * fechas (por fecha de inicio propuesta — FIX B12).
 */
export default function ActionFiltersBar({ filtersApi, userOptions, statusOptions }) {
    const { filters, setFilter, clearFilters, hasActiveFilters } = filtersApi;

    return (
        <div className="card mb-4 flex flex-wrap items-end gap-4 bg-surface-2/50 p-4">
            <Field label="Usuarios">
                <MultiCheckDropdown
                    options={userOptions}
                    selected={filters.users}
                    onChange={(v) => setFilter("users", v)}
                    placeholder="Todos"
                />
            </Field>
            <Field label="Estados">
                <MultiCheckDropdown
                    options={statusOptions}
                    selected={filters.statuses}
                    onChange={(v) => setFilter("statuses", v)}
                    placeholder="Todos"
                />
            </Field>
            <Field label="Fase">
                <MultiCheckDropdown
                    options={PHASE_OPTIONS}
                    selected={filters.phases}
                    onChange={(v) => setFilter("phases", v)}
                    placeholder="Todas"
                />
            </Field>
            <Field label="Prioridad">
                <MultiCheckDropdown
                    options={PRIORITY_OPTIONS}
                    selected={filters.priorities}
                    onChange={(v) => setFilter("priorities", v)}
                    placeholder="Todas"
                />
            </Field>
            <Field label="Inicio propuesto desde">
                <input
                    type="date"
                    value={filters.dateFrom}
                    onChange={(e) => setFilter("dateFrom", e.target.value)}
                    className="input py-1.5 text-sm"
                />
            </Field>
            <Field label="Inicio propuesto hasta">
                <input
                    type="date"
                    value={filters.dateTo}
                    onChange={(e) => setFilter("dateTo", e.target.value)}
                    className="input py-1.5 text-sm"
                />
            </Field>
            {hasActiveFilters && (
                <button
                    type="button"
                    onClick={clearFilters}
                    className="btn-ghost btn-sm text-red-500 hover:text-red-700 dark:text-red-300"
                >
                    Limpiar filtros
                </button>
            )}
        </div>
    );
}
