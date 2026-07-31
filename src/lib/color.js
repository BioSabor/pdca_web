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
