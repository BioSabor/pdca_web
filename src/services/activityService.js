import { db } from "../firebase";
import {
    collection,
    addDoc,
    query,
    orderBy,
    limit,
    onSnapshot,
    serverTimestamp
} from "firebase/firestore";

/**
 * Registro de actividad por proyecto (append-only).
 * entry = { type, actorId, actorName, actionId?, actionSeqId?, detail? }
 * Tipos: action_created | action_updated | action_deleted | status_changed |
 *        comment_added | attachment_added | attachment_deleted | project_updated
 *
 * Fire-and-forget: un fallo registrando actividad nunca rompe la operación
 * principal.
 */
export function logActivity(projectId, entry) {
    return addDoc(collection(db, "projects", projectId, "activity"), {
        ...entry,
        createdAt: serverTimestamp()
    }).catch((error) => {
        console.error("Error al registrar actividad:", error);
    });
}

export function subscribeToActivity(projectId, callback, onError, max = 100) {
    const q = query(
        collection(db, "projects", projectId, "activity"),
        orderBy("createdAt", "desc"),
        limit(max)
    );
    return onSnapshot(q, (snapshot) => {
        callback(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
    }, (error) => {
        console.error("Error en suscripción de actividad:", error);
        onError?.(error);
    });
}
