import { useEffect, useRef, useState, useCallback } from "react";

/**
 * Base de todos los hooks realtime. Gestiona loading, error y re-suscripción.
 *
 * @param {(onData: Function, onError: Function) => Function} subscribe
 *   Closure que abre la suscripción y devuelve el unsubscribe. Se lee vía ref,
 *   así el caller no necesita useCallback y no hay re-suscripciones por
 *   identidad del closure: solo `deps` controla cuándo re-suscribir.
 * @param {Array} deps
 * @param {{ enabled?: boolean, initialData?: any }} opts
 * @returns {{ data, loading, error, retry }}
 */
export default function useRealtimeSubscription(subscribe, deps, { enabled = true, initialData = [] } = {}) {
    const [data, setData] = useState(initialData);
    const [loading, setLoading] = useState(enabled);
    const [error, setError] = useState(null);
    const [retryTick, setRetryTick] = useState(0);

    const subscribeRef = useRef(subscribe);
    subscribeRef.current = subscribe;
    const initialDataRef = useRef(initialData);

    useEffect(() => {
        if (!enabled) {
            setData(initialDataRef.current);
            setLoading(false);
            setError(null);
            return;
        }
        setLoading(true);
        setError(null);

        const unsubscribe = subscribeRef.current(
            (result) => {
                setData(result);
                setError(null);
                setLoading(false);
            },
            (err) => {
                setError(err);
                setLoading(false);
            }
        );
        return () => unsubscribe?.();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [enabled, retryTick, ...deps]);

    const retry = useCallback(() => setRetryTick((t) => t + 1), []);

    return { data, loading, error, retry };
}
