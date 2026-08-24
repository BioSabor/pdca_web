export const STATUS_FALLBACK_COLOR = "#9CA3AF";

// Devuelve un color de texto legible (oscuro o claro) según la luminancia del fondo
export function getReadableTextColor(hexColor) {
    if (!hexColor || typeof hexColor !== "string") return "#111827";
    const clean = hexColor.replace("#", "");
    if (clean.length !== 6) return "#111827";
    const r = parseInt(clean.slice(0, 2), 16);
    const g = parseInt(clean.slice(2, 4), 16);
    const b = parseInt(clean.slice(4, 6), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.6 ? "#111827" : "#F9FAFB";
}

// Paleta de acentos para identificar entidades (proyectos, departamentos…).
// Tonos alineados con el sistema visual: violeta, ámbar, azul, rosa, teal…
export const ENTITY_COLORS = [
    "#8B5CF6", // violet-500
    "#F97316", // orange-500
    "#3B82F6", // blue-500
    "#EC4899", // pink-500
    "#14B8A6", // teal-500
    "#F59E0B", // amber-500
    "#6366F1", // indigo-500
    "#22C55E", // green-500
    "#EF4444", // red-500
    "#06B6D4", // cyan-500
];

// Color estable a partir de una semilla (id o nombre): la misma entidad
// conserva siempre el mismo acento entre sesiones y dispositivos.
export function getEntityColor(seed) {
    const text = String(seed || "");
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
        hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
    }
    return ENTITY_COLORS[hash % ENTITY_COLORS.length];
}

// Mezcla un color con transparencia para fondos suaves (chips de icono).
// alpha en 0..1 -> sufijo hexadecimal de 2 dígitos.
export function withAlpha(hexColor, alpha) {
    if (!hexColor || typeof hexColor !== "string") return hexColor;
    const clean = hexColor.replace("#", "");
    if (clean.length !== 6) return hexColor;
    const a = Math.round(Math.min(Math.max(alpha, 0), 1) * 255)
        .toString(16)
        .padStart(2, "0");
    return `#${clean}${a}`;
}
