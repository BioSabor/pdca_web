import { subscriptions } from "../services/projectService";
import useRealtimeSubscription from "./useRealtimeSubscription";

/**
 * Colección de usuarios en tiempo real (selectores de asignación).
 * @returns {{ users: Array, loading: boolean, error: Error|null, retry: Function }}
 */
export default function useRealtimeUsers() {
    const { data, loading, error, retry } = useRealtimeSubscription(
        (onData, onError) => subscriptions.subscribeToUsers(onData, onError),
        []
    );
    return { users: data, loading, error, retry };
}
