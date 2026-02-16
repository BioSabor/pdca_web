import { useState, useEffect } from "react";
import { subscriptions } from "../services/projectService";

/**
 * Hook para suscribirse a TODOS los proyectos en tiempo real.
 * Útil para Reports/Calendar donde se necesitan títulos de proyectos.
 * @returns {{ projects: Array, loading: boolean }}
 */
export default function useRealtimeAllProjects() {
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let firstUpdate = true;

        const unsubscribe = subscriptions.subscribeToAllProjects((data) => {
            setProjects(data);
            if (firstUpdate) {
                setLoading(false);
                firstUpdate = false;
            }
        });

        return () => unsubscribe();
    }, []);

    return { projects, loading };
}
