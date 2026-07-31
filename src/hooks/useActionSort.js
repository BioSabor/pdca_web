import { useEffect, useState } from "react";
import { priorityWeight } from "../lib/priority";
import { PDCA_PHASES } from "../lib/pdca";
import { getStatusConfig } from "../lib/status";

const PHASE_ORDER = Object.fromEntries(PDCA_PHASES.map((p, i) => [p.id, i]));

const storageKey = (uid, projectId) => `pdca_sort_v2_${uid}_${projectId}`;

function compareText(a, b) {
    return (a || "").toLowerCase().localeCompare((b || "").toLowerCase());
}

/**
 * Orden de la tabla de acciones, persistido por usuario y proyecto.
 * Ciclo de cabecera: asc -> desc -> sin orden.
 */
export default function useActionSort(uid, projectId) {
    const [sortColumn, setSortColumn] = useState(null);
    const [sortDirection, setSortDirection] = useState("asc");
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        if (!uid || !projectId) return;
        const saved = localStorage.getItem(storageKey(uid, projectId));
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                setSortColumn(parsed.sortColumn || null);
                setSortDirection(parsed.sortDirection === "desc" ? "desc" : "asc");
            } catch {
                setSortColumn(null);
                setSortDirection("asc");
            }
        } else {
            setSortColumn(null);
            setSortDirection("asc");
        }
        setLoaded(true);
        return () => setLoaded(false);
    }, [uid, projectId]);

    useEffect(() => {
        if (!uid || !projectId || !loaded) return;
        localStorage.setItem(storageKey(uid, projectId), JSON.stringify({ sortColumn, sortDirection }));
    }, [sortColumn, sortDirection, uid, projectId, loaded]);

    function toggleSort(column) {
        if (sortColumn === column) {
            if (sortDirection === "asc") {
                setSortDirection("desc");
            } else {
                setSortColumn(null);
                setSortDirection("asc");
            }
        } else {
            setSortColumn(column);
            setSortDirection("asc");
        }
    }

    /**
     * Ordena una copia de las acciones según la columna activa.
     * helpers = { statuses, getUserName }
     */
    function sortActions(actions, { statuses, getUserName }) {
        if (!sortColumn) return actions;
        const dir = sortDirection === "asc" ? 1 : -1;
        return [...actions].sort((a, b) => {
            switch (sortColumn) {
                case "seqId":
                    return ((a.seqId || 0) - (b.seqId || 0)) * dir;
                case "orden": {
                    const va = a.orden ?? null;
                    const vb = b.orden ?? null;
                    if (va === null && vb === null) return 0;
                    if (va === null) return 1; // null siempre al final
                    if (vb === null) return -1;
                    return (va - vb) * dir;
                }
                case "priority":
                    // asc = más prioritarias primero (peso descendente)
                    return (priorityWeight(b.priority) - priorityWeight(a.priority)) * dir;
                case "createdAt":
                    return ((a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0)) * dir;
                case "action":
                    return compareText(a.action, b.action) * dir;
                case "assignedUsers": {
                    const names = (x) => (x.assignedUsers || []).map((u) => getUserName(u)).join(", ");
                    return compareText(names(a), names(b)) * dir;
                }
                case "status":
                    return (
                        compareText(
                            getStatusConfig(statuses, a.status).label,
                            getStatusConfig(statuses, b.status).label
                        ) * dir
                    );
                case "phase": {
                    const order = (x) => (x.phase in PHASE_ORDER ? PHASE_ORDER[x.phase] : PDCA_PHASES.length);
                    return (order(a) - order(b)) * dir;
                }
                case "proposedStartDate":
                case "proposedEndDate":
                case "startDate":
                case "actualEndDate":
                    return (a[sortColumn] || "").localeCompare(b[sortColumn] || "") * dir;
                default:
                    return 0;
            }
        });
    }

    return { sortColumn, sortDirection, toggleSort, sortActions };
}
