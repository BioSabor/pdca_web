import { subscriptions } from "../services/projectService";
import useRealtimeSubscription from "./useRealtimeSubscription";

/**
 * Acciones de un proyecto en tiempo real.
 * @returns {{ actions: Array, loading: boolean, error: Error|null, retry: Function }}
 */
export default function useRealtimeActions(projectId) {
    const { data, loading, error, retry } = useRealtimeSubscription(
        (onData, onError) => subscriptions.subscribeToActions(projectId, onData, onError),
        [projectId],
        { enabled: !!projectId }
    );
    return { actions: data, loading, error, retry };
}
