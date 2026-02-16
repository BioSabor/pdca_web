import { useState, useEffect } from "react";
import { subscriptions } from "../services/projectService";

/**
 * Hook para suscribirse a la configuración de departamentos en tiempo real.
 * @returns {{ departments: Array, loading: boolean }}
 */
export default function useRealtimeDepartments() {
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let firstUpdate = true;

        const unsubscribe = subscriptions.subscribeToDepartments((data) => {
            setDepartments(data);
            if (firstUpdate) {
                setLoading(false);
                firstUpdate = false;
            }
        });

        return () => unsubscribe();
    }, []);

    return { departments, loading };
}
