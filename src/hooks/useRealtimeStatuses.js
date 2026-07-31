import { subscriptions } from "../services/projectService";
import useRealtimeSubscription from "./useRealtimeSubscription";

/**
 * Estados configurados en tiempo real (con defaults en memoria si no existen).
 * @returns {{ statuses: Array, loading: boolean, error: Error|null, retry: Function }}
 */
export default function useRealtimeStatuses() {
    const { data, loading, error, retry } = useRealtimeSubscription(
        (onData, onError) => subscriptions.subscribeToStatuses(onData, onError),
        []
    );
    return { statuses: data, loading, error, retry };
}
