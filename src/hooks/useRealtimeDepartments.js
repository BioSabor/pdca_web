import { subscriptions } from "../services/projectService";
import useRealtimeSubscription from "./useRealtimeSubscription";

/**
 * Departamentos configurados en tiempo real.
 * @returns {{ departments: Array, loading: boolean, error: Error|null, retry: Function }}
 */
export default function useRealtimeDepartments() {
    const { data, loading, error, retry } = useRealtimeSubscription(
        (onData, onError) => subscriptions.subscribeToDepartments(onData, onError),
        []
    );
    return { departments: data, loading, error, retry };
}
