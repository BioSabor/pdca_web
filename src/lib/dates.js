// Utilidades de fecha en zona horaria LOCAL.
// Las fechas de acciones se almacenan como strings "YYYY-MM-DD"; nunca usar
// toISOString() para "hoy" (devuelve UTC y cambia de día entre las 00:00 y las
// 01:00/02:00 en España).

export function toLocalISO(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}

export function todayLocalISO() {
    return toLocalISO(new Date());
}

// "YYYY-MM-DD" -> Date a medianoche local (new Date("YYYY-MM-DD") parsea UTC)
export function parseLocalISO(str) {
    if (!str) return null;
    const [y, m, d] = str.split("-").map(Number);
    return new Date(y, m - 1, d);
}

// "YYYY-MM-DD" -> "dd/mm/aaaa"
export function formatShortDate(str) {
    if (!str) return "";
    const [y, m, d] = str.split("-");
    return `${d}/${m}/${y}`;
}

export function isBeforeToday(str) {
    return !!str && str < todayLocalISO();
}

export function addDays(str, days) {
    const date = parseLocalISO(str);
    if (!date) return "";
    date.setDate(date.getDate() + days);
    return toLocalISO(date);
}

// Lunes de la semana de la fecha dada (por defecto hoy)
export function startOfWeekISO(date = new Date()) {
    const d = new Date(date);
    const day = d.getDay(); // 0 = domingo
    d.setDate(d.getDate() - ((day + 6) % 7));
    return toLocalISO(d);
}

// Domingo de la semana de la fecha dada
export function endOfWeekISO(date = new Date()) {
    const d = new Date(date);
    const day = d.getDay();
    d.setDate(d.getDate() + ((7 - day) % 7));
    return toLocalISO(d);
}

// Timestamp de Firestore ({seconds}) -> "dd/mm/aaaa"
export function formatTimestampDate(ts) {
    if (!ts?.seconds) return "";
    return new Date(ts.seconds * 1000).toLocaleDateString("es-ES");
}

// Timestamp de Firestore -> "hace 5 min", "hace 2 h", "hace 3 d", o fecha corta
export function formatRelativeTime(ts) {
    if (!ts?.seconds) return "ahora";
    const diffMs = Date.now() - ts.seconds * 1000;
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return "ahora";
    if (mins < 60) return `hace ${mins} min`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `hace ${hours} h`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `hace ${days} d`;
    return new Date(ts.seconds * 1000).toLocaleDateString("es-ES");
}
