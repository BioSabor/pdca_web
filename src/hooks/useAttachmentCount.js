import { useState, useEffect } from "react";
import { subscribeToAttachments } from "../services/attachmentService";

/**
 * Hook ligero que devuelve solo el conteo de adjuntos de una acción.
 * Se suscribe en tiempo real.
 */
export default function useAttachmentCount(projectId, actionId) {
    const [count, setCount] = useState(0);

    useEffect(() => {
        if (!projectId || !actionId) { setCount(0); return; }
        const unsub = subscribeToAttachments(projectId, actionId, (attachments) => {
            setCount(attachments.length);
        });
        return () => unsub();
    }, [projectId, actionId]);

    return count;
}
