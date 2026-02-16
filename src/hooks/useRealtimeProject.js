import { useState, useEffect } from "react";
import { subscriptions } from "../services/projectService";

/**
 * Hook para suscribirse a un proyecto individual en tiempo real.
 * @param {string} projectId
 * @returns {{ project: Object|null, loading: boolean }}
 */
export default function useRealtimeProject(projectId) {
    const [project, setProject] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!projectId) {
            setProject(null);
            setLoading(false);
            return;
        }

        setLoading(true);
        let firstUpdate = true;

        const unsubscribe = subscriptions.subscribeToProject(projectId, (data) => {
            setProject(data);
            if (firstUpdate) {
                setLoading(false);
                firstUpdate = false;
            }
        });

        return () => unsubscribe();
    }, [projectId]);

    return { project, loading };
}
