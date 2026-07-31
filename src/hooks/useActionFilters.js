import { useEffect, useState } from "react";
import { normalizePriority } from "../lib/priority";

const EMPTY_FILTERS = {
    users: [],
    statuses: [],
    phases: [],
    priorities: [],
    dateFrom: "",
    dateTo: "",
};

const storageKey = (uid, projectId) => `pdca_filters_v2_${uid}_${projectId}`;

/**
 * Filtros de la tabla de acciones, persistidos por usuario y proyecto.
 * - fase: multi con "none" = sin fase
 * - prioridad: multi por nivel (normalizePriority para datos booleanos antiguos)
 * - FIX B12: el rango de fechas filtra por proposedStartDate y, si hay filtro
 *   de fecha activo, las acciones SIN proposedStartDate se excluyen.
 */
export default function useActionFilters(uid, projectId) {
    const [filters, setFilters] = useState(EMPTY_FILTERS);
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        if (!uid || !projectId) return;
        const saved = localStorage.getItem(storageKey(uid, projectId));
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                setFilters({ ...EMPTY_FILTERS, ...parsed });
            } catch {
                setFilters(EMPTY_FILTERS);
            }
        } else {
            setFilters(EMPTY_FILTERS);
        }
        setLoaded(true);
        return () => setLoaded(false);
    }, [uid, projectId]);

    useEffect(() => {
        if (!uid || !projectId || !loaded) return;
        localStorage.setItem(storageKey(uid, projectId), JSON.stringify(filters));
    }, [filters, uid, projectId, loaded]);

    function setFilter(name, value) {
        setFilters((prev) => ({ ...prev, [name]: value }));
    }

    function clearFilters() {
        setFilters(EMPTY_FILTERS);
    }

    const activeCount =
        (filters.users.length > 0 ? 1 : 0) +
        (filters.statuses.length > 0 ? 1 : 0) +
        (filters.phases.length > 0 ? 1 : 0) +
        (filters.priorities.length > 0 ? 1 : 0) +
        (filters.dateFrom ? 1 : 0) +
        (filters.dateTo ? 1 : 0);

    function filterActions(actions) {
        return actions.filter((a) => {
            if (
                filters.users.length > 0 &&
                (!a.assignedUsers || !a.assignedUsers.some((u) => filters.users.includes(u)))
            ) {
                return false;
            }
            if (filters.statuses.length > 0 && !filters.statuses.includes(a.status)) return false;
            if (filters.phases.length > 0 && !filters.phases.includes(a.phase || "none")) return false;
            if (filters.priorities.length > 0 && !filters.priorities.includes(normalizePriority(a.priority))) {
                return false;
            }
            if (filters.dateFrom || filters.dateTo) {
                if (!a.proposedStartDate) return false;
                if (filters.dateFrom && a.proposedStartDate < filters.dateFrom) return false;
                if (filters.dateTo && a.proposedStartDate > filters.dateTo) return false;
            }
            return true;
        });
    }

    return {
        filters,
        setFilter,
        clearFilters,
        activeCount,
        hasActiveFilters: activeCount > 0,
        filterActions,
    };
}
