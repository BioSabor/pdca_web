import { getStatusConfig } from "./status";

export const STATUS_KINDS = {
    NONE: "none",
    START: "start",
    DONE: "end",
    CANCELLED: "cancelled",
};

// Tipo efectivo de un estado, con compatibilidad hacia atrás: el estado por
// defecto "descartado" se creó históricamente con type "end"; se interpreta
// como cancelado sin necesidad de migrar datos.
export function getEffectiveStatusKind(status) {
    if (!status) return STATUS_KINDS.NONE;
    if (status.type === STATUS_KINDS.CANCELLED) return STATUS_KINDS.CANCELLED;
    if (status.type === STATUS_KINDS.DONE && status.id === "descartado") {
        return STATUS_KINDS.CANCELLED;
    }
    return status.type || STATUS_KINDS.NONE;
}

export function isDoneStatus(status) {
    return getEffectiveStatusKind(status) === STATUS_KINDS.DONE;
}

export function isDiscardedStatus(status) {
    return getEffectiveStatusKind(status) === STATUS_KINDS.CANCELLED;
}

// Cerrada = terminada o descartada (no cuenta como pendiente)
export function isClosedStatus(status) {
    const kind = getEffectiveStatusKind(status);
    return kind === STATUS_KINDS.DONE || kind === STATUS_KINDS.CANCELLED;
}

// Progreso de un conjunto de acciones. Las descartadas salen del numerador Y
// del denominador (un proyecto con todo descartado no está "100% completado",
// está vacío de trabajo real -> si no quedan abiertas, 100).
export function computeProgress(actions, statuses) {
    let done = 0;
    let discarded = 0;
    for (const a of actions) {
        const kind = getEffectiveStatusKind(getStatusConfig(statuses, a.status));
        if (kind === STATUS_KINDS.DONE) done++;
        else if (kind === STATUS_KINDS.CANCELLED) discarded++;
    }
    const total = actions.length;
    const denominator = total - discarded;
    const pct = denominator > 0 ? Math.round((done / denominator) * 100) : total > 0 ? 100 : 0;
    return { total, done, discarded, open: total - done - discarded, pct };
}
