import { db } from "../firebase";
import {
    collection,
    doc,
    addDoc,
    updateDoc,
    deleteDoc,
    query,
    orderBy,
    onSnapshot,
    serverTimestamp,
    increment
} from "firebase/firestore";
import { logActivity } from "./activityService";
import { notifyUsers, buildNotificationPayload } from "./notificationService";

/**
 * Comentarios por acción: projects/{pid}/actions/{aid}/comments
 * Doc: { text, authorId, authorName, mentions: [uid], edited?, createdAt }
 * La acción mantiene `commentsCount` con increment() para pintar el contador
 * sin suscribirse a N subcolecciones.
 */

function commentsCol(projectId, actionId) {
    return collection(db, "projects", projectId, "actions", actionId, "comments");
}

function actionRef(projectId, actionId) {
    return doc(db, "projects", projectId, "actions", actionId);
}

/**
 * ctx = { actorId, actorName, projectTitle }
 * action = la acción completa (para asignados, seqId y texto)
 */
export async function addComment(ctx, projectId, action, { text, mentions = [] }) {
    const commentDoc = await addDoc(commentsCol(projectId, action.id), {
        text,
        authorId: ctx.actorId,
        authorName: ctx.actorName || "",
        mentions,
        createdAt: serverTimestamp()
    });

    // Contador denormalizado (no bloqueante)
    updateDoc(actionRef(projectId, action.id), {
        commentsCount: increment(1)
    }).catch(console.error);

    // Actividad (no bloqueante)
    logActivity(projectId, {
        type: "comment_added",
        actorId: ctx.actorId,
        actorName: ctx.actorName || "",
        actionId: action.id,
        actionSeqId: action.seqId ?? null,
        detail: { text: text.slice(0, 120) }
    });

    // Notificaciones: mención tiene prioridad sobre comentario
    const base = {
        projectId,
        projectTitle: ctx.projectTitle,
        actionId: action.id,
        actionText: action.action,
        actorId: ctx.actorId,
        actorName: ctx.actorName
    };
    const mentioned = new Set(mentions);
    const commentRecipients = (action.assignedUsers || []).filter((uid) => !mentioned.has(uid));
    if (mentions.length > 0) {
        notifyUsers(mentions, buildNotificationPayload({
            ...base,
            type: "mention",
            message: `${ctx.actorName} te ha mencionado en un comentario`
        })).catch(console.error);
    }
    if (commentRecipients.length > 0) {
        notifyUsers(commentRecipients, buildNotificationPayload({
            ...base,
            type: "comment",
            message: `${ctx.actorName} ha comentado en una acción asignada a ti`
        })).catch(console.error);
    }

    return commentDoc.id;
}

export async function updateComment(projectId, actionId, commentId, text) {
    await updateDoc(doc(commentsCol(projectId, actionId), commentId), {
        text,
        edited: true
    });
}

export async function deleteComment(projectId, actionId, commentId) {
    await deleteDoc(doc(commentsCol(projectId, actionId), commentId));
    updateDoc(actionRef(projectId, actionId), {
        commentsCount: increment(-1)
    }).catch(console.error);
}

export function subscribeToComments(projectId, actionId, callback, onError) {
    const q = query(commentsCol(projectId, actionId), orderBy("createdAt", "asc"));
    return onSnapshot(q, (snapshot) => {
        callback(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
    }, (error) => {
        console.error("Error en suscripción de comentarios:", error);
        onError?.(error);
    });
}

/**
 * Extrae uids mencionados de un texto buscando @NombreVisible de la lista de
 * usuarios dada (fallback para menciones escritas sin el autocompletado).
 */
export function parseMentions(text, users) {
    const found = [];
    for (const u of users) {
        const name = u.displayName || u.email;
        if (name && text.includes(`@${name}`)) found.push(u.id);
    }
    return [...new Set(found)];
}
