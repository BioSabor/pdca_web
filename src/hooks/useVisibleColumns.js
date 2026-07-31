import { useEffect, useState } from "react";

// Columnas configurables de la tabla de acciones. Para añadir una columna
// nueva en el futuro: añadirla aquí y bumpear la versión de la clave.
export const COLUMN_OPTIONS = [
    { value: "proposedStartDate", label: "F. inicio propuesta" },
    { value: "proposedEndDate", label: "F. fin propuesta" },
    { value: "startDate", label: "F. inicio real" },
    { value: "actualEndDate", label: "F. fin real" },
    { value: "phase", label: "Fase" },
    { value: "observations", label: "Observaciones" },
    { value: "subactions", label: "Subacciones" },
    { value: "attachments", label: "Adjuntos" },
    { value: "comments", label: "Comentarios" },
];

const KNOWN_VALUES = COLUMN_OPTIONS.map((o) => o.value);
const DEFAULT_VISIBLE = [...KNOWN_VALUES];

// FIX B4: se persiste EXACTAMENTE la selección del usuario. La clave v1 tenía
// una heurística que re-añadía columnas desmarcadas; las claves v1 se ignoran.
const storageKey = (uid, projectId) => `pdca_action_columns_v2_${uid}_${projectId}`;

export default function useVisibleColumns(uid, projectId) {
    const [visibleColumns, setVisibleColumns] = useState(DEFAULT_VISIBLE);
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        if (!uid || !projectId) return;
        const saved = localStorage.getItem(storageKey(uid, projectId));
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed)) {
                    setVisibleColumns(parsed.filter((v) => KNOWN_VALUES.includes(v)));
                }
            } catch {
                setVisibleColumns(DEFAULT_VISIBLE);
            }
        } else {
            setVisibleColumns(DEFAULT_VISIBLE);
        }
        setLoaded(true);
        return () => setLoaded(false);
    }, [uid, projectId]);

    useEffect(() => {
        if (!uid || !projectId || !loaded) return;
        localStorage.setItem(storageKey(uid, projectId), JSON.stringify(visibleColumns));
    }, [visibleColumns, uid, projectId, loaded]);

    const isColumnVisible = (key) => visibleColumns.includes(key);

    return { visibleColumns, setVisibleColumns, isColumnVisible, columnOptions: COLUMN_OPTIONS };
}
