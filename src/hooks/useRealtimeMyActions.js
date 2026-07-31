import { subscriptions } from "../services/projectService";
import useRealtimeSubscription from "./useRealtimeSubscription";

/**
 * Mis acciones en todos los proyectos (collectionGroup filtrado por
 * asignación). Requiere el índice COLLECTION_GROUP de firestore.indexes.json.
 * @returns {{ actions: Array, loading: boolean, error: Error|null, retry: Function }}
 */
export default function useRealtimeMyActions(userId) {
    const { data, loading, error, retry } = useRealtimeSubscription(
        (onData, onError) => subscriptions.subscribeToMyActions(userId, onData, onError),
        [userId],
        { enabled: !!userId }
    );
    return { actions: data, loading, error, retry };
}
