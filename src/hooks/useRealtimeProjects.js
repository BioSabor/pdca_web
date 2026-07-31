import { subscriptions } from "../services/projectService";
import useRealtimeSubscription from "./useRealtimeSubscription";

/**
 * Proyectos del usuario (creados por él o donde está asignado), en tiempo real.
 * @returns {{ projects: Array, loading: boolean, error: Error|null, retry: Function }}
 */
export default function useRealtimeProjects(userId) {
    const { data, loading, error, retry } = useRealtimeSubscription(
        (onData, onError) => subscriptions.subscribeToUserProjects(userId, onData, onError),
        [userId],
        { enabled: !!userId }
    );
    return { projects: data, loading, error, retry };
}
