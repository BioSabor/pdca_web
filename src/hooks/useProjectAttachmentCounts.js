import { useMemo } from "react";
import { subscribeToProjectAttachments, PROJECT_DOC_SCOPE } from "../services/attachmentService";
import useRealtimeSubscription from "./useRealtimeSubscription";

/**
 * Contadores de adjuntos de TODAS las acciones de un proyecto con UN solo
 * listener (antes: un onSnapshot por fila de la tabla).
 * @returns {{ counts: Record<string, number>, loading: boolean, error: Error|null }}
 */
export default function useProjectAttachmentCounts(projectId) {
    const { data, loading, error } = useRealtimeSubscription(
        (onData, onError) => subscribeToProjectAttachments(projectId, onData, onError),
        [projectId],
        { enabled: !!projectId }
    );

    const counts = useMemo(() => {
        const map = {};
        for (const att of data) {
            // Los documentos del proyecto no cuentan como adjunto de ninguna acción
            if (att.actionId && att.actionId !== PROJECT_DOC_SCOPE) {
                map[att.actionId] = (map[att.actionId] || 0) + 1;
            }
        }
        return map;
    }, [data]);

    return { counts, loading, error };
}
