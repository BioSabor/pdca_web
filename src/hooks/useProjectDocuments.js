import { subscribeToProjectDocuments } from "../services/attachmentService";
import useRealtimeSubscription from "./useRealtimeSubscription";

/**
 * Documentación del proyecto (adjuntos no ligados a una acción concreta),
 * más reciente primero.
 * @returns {{ documents: Array, loading: boolean, error: Error|null, retry: Function }}
 */
export default function useProjectDocuments(projectId) {
    const { data, loading, error, retry } = useRealtimeSubscription(
        (onData, onError) => subscribeToProjectDocuments(projectId, onData, onError),
        [projectId],
        { enabled: !!projectId }
    );

    return { documents: data, loading, error, retry };
}
