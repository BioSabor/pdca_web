import { useState, useEffect } from "react";
import { subscriptions } from "../services/projectService";

/**
 * Hook para suscribirse a las acciones de un proyecto en tiempo real.
 * @param {string} projectId
 * @returns {{ actions: Array, loading: boolean }}
 */
export default function useRealtimeActions(projectId) {
    const [actions, setActions] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!projectId) {
            setActions([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        let firstUpdate = true;

        const unsubscribe = subscriptions.subscribeToActions(projectId, (data) => {
            setActions(data);
            if (firstUpdate) {
                setLoading(false);
                firstUpdate = false;
            }
        });

        return () => unsubscribe();
    }, [projectId]);

    return { actions, loading };
}
