import { subscriptions } from "../services/projectService";
import useRealtimeSubscription from "./useRealtimeSubscription";

/**
 * TODAS las acciones de la organización (collectionGroup). Pensado para
 * admins; usar {enabled} para no abrir la query cuando no toca.
 * @returns {{ allActions: Array, loading: boolean, error: Error|null, retry: Function }}
 */
export default function useRealtimeAllActions({ enabled = true } = {}) {
    const { data, loading, error, retry } = useRealtimeSubscription(
        (onData, onError) => subscriptions.subscribeToAllActions(onData, onError),
        [],
        { enabled }
    );
    return { allActions: data, loading, error, retry };
}
