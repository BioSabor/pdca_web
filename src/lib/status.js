import { STATUS_FALLBACK_COLOR, getReadableTextColor } from "./color";
import { todayLocalISO } from "./dates";

// Config de un estado por id, con fallback para estados borrados/huérfanos
export function getStatusConfig(statuses, statusId) {
    return (
        statuses.find((s) => s.id === statusId) || {
            id: statusId,
            label: statusId,
            color: STATUS_FALLBACK_COLOR,
            type: "none",
        }
    );
}

export function getStatusStyle(statuses, statusId) {
    const cfg = getStatusConfig(statuses, statusId);
    return { backgroundColor: cfg.color, color: getReadableTextColor(cfg.color) };
}

// Efectos secundarios al cambiar de estado (auto-relleno de fechas reales).
// - type "start": rellena startDate solo si está vacía (no pisa el inicio real original)
// - type "end": rellena actualEndDate solo si está vacía
// - cancelado: no toca fechas (un descarte no es una finalización). Incluye el
//   caso legacy: "descartado" guardado históricamente con type "end".
export function applyStatusSideEffects(action, statusCfg) {
    const updates = { status: statusCfg.id };
    const isCancelled =
        statusCfg.type === "cancelled" ||
        (statusCfg.type === "end" && statusCfg.id === "descartado");
    if (isCancelled) return updates;

    const today = todayLocalISO();
    if (statusCfg.type === "start") {
        if (!action?.startDate) updates.startDate = today;
    } else if (statusCfg.type === "end") {
        if (!action?.actualEndDate) updates.actualEndDate = today;
    }
    return updates;
}
