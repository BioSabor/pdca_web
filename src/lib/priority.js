export const PRIORITY_LEVELS = [
    { id: "none", label: "Sin prioridad", color: "#9CA3AF", weight: 0 },
    { id: "low", label: "Baja", color: "#22C55E", weight: 1 },
    { id: "medium", label: "Media", color: "#F59E0B", weight: 2 },
    { id: "high", label: "Alta", color: "#EF4444", weight: 3 },
];

// Compatibilidad: priority era booleano (true = prioritaria). Toda lectura
// pasa por aquí; las escrituras nuevas guardan siempre el string.
export function normalizePriority(priority) {
    if (priority === true) return "high";
    if (typeof priority === "string" && PRIORITY_LEVELS.some((l) => l.id === priority)) {
        return priority;
    }
    return "none";
}

export function getPriorityConfig(priority) {
    const id = normalizePriority(priority);
    return PRIORITY_LEVELS.find((l) => l.id === id);
}

export function priorityWeight(priority) {
    return getPriorityConfig(priority).weight;
}

// "Prioritaria" a efectos de contadores (media o alta)
export function isHighlighted(priority) {
    return priorityWeight(priority) >= 2;
}
