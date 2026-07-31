import { FilterX } from "lucide-react";
import Field from "../ui/Field";
import MultiCheckDropdown from "../ui/MultiCheckDropdown";

// Filtros globales de Informes: departamentos, proyectos y rango de fechas.
// El estado vive en el padre (Reports) y aplica a todas las pestañas.
export default function ReportsFilters({
    departments,
    projects,
    selectedDepartments,
    onDepartmentsChange,
    selectedProjects,
    onProjectsChange,
    startDate,
    onStartDateChange,
    endDate,
    onEndDateChange,
    onClear,
    isDirty,
}) {
    const departmentOptions = departments
        .map((d) => ({ value: d.id, label: d.name }))
        .sort((a, b) => a.label.localeCompare(b.label, "es"));

    const projectOptions = projects
        .map((p) => ({ value: p.id, label: p.title || p.id }))
        .sort((a, b) => a.label.localeCompare(b.label, "es"));

    return (
        <div className="card mb-6 p-4">
            <div className="flex flex-wrap items-end gap-3">
                <div className="min-w-0">
                    <span className="label">Departamentos</span>
                    <MultiCheckDropdown
                        options={departmentOptions}
                        selected={selectedDepartments}
                        onChange={onDepartmentsChange}
                        placeholder="Todos los departamentos"
                    />
                </div>
                <div className="min-w-0">
                    <span className="label">Proyectos</span>
                    <MultiCheckDropdown
                        options={projectOptions}
                        selected={selectedProjects}
                        onChange={onProjectsChange}
                        placeholder="Todos los proyectos"
                    />
                </div>
                <Field label="Desde" className="w-36 sm:w-40">
                    <input
                        type="date"
                        className="input"
                        value={startDate}
                        max={endDate || undefined}
                        onChange={(e) => onStartDateChange(e.target.value)}
                    />
                </Field>
                <Field label="Hasta" className="w-36 sm:w-40">
                    <input
                        type="date"
                        className="input"
                        value={endDate}
                        min={startDate || undefined}
                        onChange={(e) => onEndDateChange(e.target.value)}
                    />
                </Field>
                {isDirty && (
                    <button type="button" onClick={onClear} className="btn-ghost btn-sm">
                        <FilterX className="h-3.5 w-3.5" aria-hidden="true" />
                        Restablecer
                    </button>
                )}
            </div>
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                El rango de fechas por defecto cubre las últimas 4 semanas. Los filtros se aplican a todas las
                pestañas.
            </p>
        </div>
    );
}
