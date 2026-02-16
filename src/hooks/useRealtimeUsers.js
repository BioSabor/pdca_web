import { useState, useEffect } from "react";
import { subscriptions } from "../services/projectService";

/**
 * Hook para suscribirse a la colección de usuarios en tiempo real.
 * @returns {{ users: Array, loading: boolean }}
 */
export default function useRealtimeUsers() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let firstUpdate = true;

        const unsubscribe = subscriptions.subscribeToUsers((data) => {
            setUsers(data);
            if (firstUpdate) {
                setLoading(false);
                firstUpdate = false;
            }
        });

        return () => unsubscribe();
    }, []);

    return { users, loading };
}
