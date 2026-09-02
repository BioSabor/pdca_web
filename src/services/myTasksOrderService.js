import { db } from "../firebase";
import { doc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";

/**
 * Orden manual de "Mis Tareas": un documento por usuario, un campo por grupo
 * (vencidas/hoy/semana/luego/sin fecha) con el array de claves `projectId:actionId`
 * en el orden elegido. Sincronizado en la cuenta (no localStorage) para que
 * viaje entre dispositivos.
 */
export const myTasksOrderService = {
    subscribeToMyTasksOrder: (userId, callback, onError) => {
        const docRef = doc(db, "myTasksOrder", userId);
        return onSnapshot(
            docRef,
            (docSnap) => callback(docSnap.exists() ? docSnap.data() : {}),
            (error) => {
                console.error("Error en suscripción orden de mis tareas:", error);
                onError?.(error);
            }
        );
    },

    setGroupOrder: async (userId, groupId, order) => {
        const docRef = doc(db, "myTasksOrder", userId);
        await setDoc(docRef, { [groupId]: order, updatedAt: serverTimestamp() }, { merge: true });
    }
};
