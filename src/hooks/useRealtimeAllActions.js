import { useState, useEffect } from "react";
import { subscriptions } from "../services/projectService";

/**
 * Hook para suscribirse a TODAS las acciones (collectionGroup) en tiempo real.
 * Usado por Reports y Calendar.
 * @returns {{ allActions: Array, loading: boolean }}
 */
export default function useRealtimeAllActions() {
    const [allActions, setAllActions] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let firstUpdate = true;

        const unsubscribe = subscriptions.subscribeToAllActions((data) => {
            setAllActions(data);
            if (firstUpdate) {
                setLoading(false);
                firstUpdate = false;
            }
        });

        return () => unsubscribe();
    }, []);

    return { allActions, loading };
}
