import { db } from "../firebase";
import {
    collection,
    doc,
    query,
    where,
    orderBy,
    limit,
    getDocs,
    onSnapshot,
    writeBatch,
    updateDoc,
    serverTimestamp
} from "firebase/firestore";

/**
 * Notificaciones in-app (colección raíz `notifications`), generadas por el
 * cliente que origina el evento (sin Cloud Functions).
 *
 * Doc: { recipientId, type: "assigned"|"comment"|"mention"|"status_change",
 *        projectId, projectTitle, actionId, actionText, actorId, actorName,
 *        message, read, createdAt }
 */

const MAX_ACTION_TEXT = 80;

export function buildNotificationPayload({ type, projectId, projectTitle, actionId, actionText, actorId, actorName, message }) {
    return {
        type,
        projectId: projectId || null,
        projectTitle: projectTitle || "",
        actionId: actionId || null,
        actionText: (actionText || "").slice(0, MAX_ACTION_TEXT),
        actorId: actorId || null,
        actorName: actorName || "",
        message: message || ""
    };
}

/**
 * Fan-out a varios destinatarios en un writeBatch. Excluye al propio actor y
 * duplicados. Fire-and-forget en los callers (no bloquear la escritura
 * principal).
 */
export async function notifyUsers(recipientIds, payload) {
    const unique = [...new Set(recipientIds)].filter(
        (uid) => uid && uid !== payload.actorId
    );
    if (unique.length === 0) return;

    for (let i = 0; i < unique.length; i += 450) {
        const batch = writeBatch(db);
        unique.slice(i, i + 450).forEach((recipientId) => {
            const ref = doc(collection(db, "notifications"));
            batch.set(ref, {
                ...payload,
                recipientId,
                read: false,
                createdAt: serverTimestamp()
            });
        });
        await batch.commit();
    }
}

export function subscribeToMyNotifications(userId, callback, onError, max = 50) {
    const q = query(
        collection(db, "notifications"),
        where("recipientId", "==", userId),
        orderBy("createdAt", "desc"),
        limit(max)
    );
    return onSnapshot(q, (snapshot) => {
        callback(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
    }, (error) => {
        console.error("Error en suscripción de notificaciones:", error);
        onError?.(error);
    });
}

export function markAsRead(notificationId) {
    return updateDoc(doc(db, "notifications", notificationId), { read: true });
}

export async function markAllAsRead(notifications) {
    const unread = notifications.filter((n) => !n.read);
    for (let i = 0; i < unread.length; i += 450) {
        const batch = writeBatch(db);
        unread.slice(i, i + 450).forEach((n) => {
            batch.update(doc(db, "notifications", n.id), { read: true });
        });
        await batch.commit();
    }
}

/**
 * Limpieza oportunista de notificaciones antiguas del usuario (>days días).
 * Se invoca al abrir el panel; los fallos se ignoran.
 */
export async function pruneOld(userId, days = 30) {
    try {
        const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
        const q = query(
            collection(db, "notifications"),
            where("recipientId", "==", userId),
            where("createdAt", "<", cutoff),
            orderBy("createdAt", "asc"),
            limit(200)
        );
        const snapshot = await getDocs(q);
        if (snapshot.empty) return;
        const batch = writeBatch(db);
        snapshot.docs.forEach((d) => batch.delete(d.ref));
        await batch.commit();
    } catch (error) {
        console.error("Error al limpiar notificaciones antiguas:", error);
    }
}
