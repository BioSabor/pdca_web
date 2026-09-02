import { myTasksOrderService } from "../services/myTasksOrderService";
import useRealtimeSubscription from "./useRealtimeSubscription";

/**
 * Orden manual guardado por el usuario para "Mis Tareas" (uno por grupo).
 * @returns {{ order: Object, loading: boolean, error: Error|null, retry: Function }}
 */
export default function useRealtimeMyTasksOrder(userId) {
    const { data, loading, error, retry } = useRealtimeSubscription(
        (onData, onError) => myTasksOrderService.subscribeToMyTasksOrder(userId, onData, onError),
        [userId],
        { enabled: !!userId, initialData: {} }
    );
    return { order: data, loading, error, retry };
}
