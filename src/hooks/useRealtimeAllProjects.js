import { subscriptions } from "../services/projectService";
import useRealtimeSubscription from "./useRealtimeSubscription";

/**
 * Todos los proyectos (títulos para Reports/Calendar de admin).
 * @returns {{ projects: Array, loading: boolean, error: Error|null, retry: Function }}
 */
export default function useRealtimeAllProjects({ enabled = true } = {}) {
    const { data, loading, error, retry } = useRealtimeSubscription(
        (onData, onError) => subscriptions.subscribeToAllProjects(onData, onError),
        [],
        { enabled }
    );
    return { projects: data, loading, error, retry };
}
