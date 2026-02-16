import { useState, useEffect } from "react";
import { subscriptions } from "../services/projectService";

/**
 * Hook para suscribirse a la configuración de estados en tiempo real.
 * @returns {{ statuses: Array, loading: boolean }}
 */
export default function useRealtimeStatuses() {
    const [statuses, setStatuses] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let firstUpdate = true;

        const unsubscribe = subscriptions.subscribeToStatuses((data) => {
            setStatuses(data);
            if (firstUpdate) {
                setLoading(false);
                firstUpdate = false;
            }
        });

        return () => unsubscribe();
    }, []);

    return { statuses, loading };
}
