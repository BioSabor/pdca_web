import { subscriptions } from "../services/projectService";
import useRealtimeSubscription from "./useRealtimeSubscription";

/**
 * Un proyecto individual en tiempo real.
 * @returns {{ project: Object|null, loading: boolean, error: Error|null, retry: Function }}
 */
export default function useRealtimeProject(projectId) {
    const { data, loading, error, retry } = useRealtimeSubscription(
        (onData, onError) => subscriptions.subscribeToProject(projectId, onData, onError),
        [projectId],
        { enabled: !!projectId, initialData: null }
    );
    return { project: data, loading, error, retry };
}
