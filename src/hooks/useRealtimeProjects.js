import { useState, useEffect } from "react";
import { subscriptions } from "../services/projectService";

/**
 * Hook para suscribirse a los proyectos del usuario en tiempo real.
 * @param {string} userId - UID del usuario
 * @returns {{ projects: Array, loading: boolean }}
 */
export default function useRealtimeProjects(userId) {
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!userId) {
            setProjects([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        let firstUpdate = true;

        const unsubscribe = subscriptions.subscribeToUserProjects(userId, (data) => {
            setProjects(data);
            if (firstUpdate) {
                setLoading(false);
                firstUpdate = false;
            }
        });

        return () => unsubscribe();
    }, [userId]);

    return { projects, loading };
}
