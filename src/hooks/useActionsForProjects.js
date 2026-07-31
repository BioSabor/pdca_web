import { subscriptions } from "../services/projectService";
import useRealtimeSubscription from "./useRealtimeSubscription";

/**
 * Acciones de un conjunto de proyectos (un listener por proyecto, resultado
 * combinado con projectId anotado). Alternativa acotada al collectionGroup
 * global para usuarios no-admin.
 * @param {string[]} projectIds
 * @returns {{ actions: Array, loading: boolean, error: Error|null, retry: Function }}
 */
export default function useActionsForProjects(projectIds) {
    const key = (projectIds || []).slice().sort().join(",");
    const { data, loading, error, retry } = useRealtimeSubscription(
        (onData, onError) => subscriptions.subscribeToActionsForProjects(projectIds, onData, onError),
        [key]
    );
    return { actions: data, loading, error, retry };
}
