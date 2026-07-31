import { db } from "../firebase";
import {
    collection,
    collectionGroup,
    addDoc,
    getDocs,
    doc,
    updateDoc,
    deleteDoc,
    setDoc,
    query,
    where,
    onSnapshot,
    serverTimestamp,
    runTransaction,
    writeBatch
} from "firebase/firestore";
import { deleteAllProjectAttachments } from "./attachmentService";

// ==================== PROYECTOS ====================

export const projectService = {
    // Crear un nuevo proyecto
    createProject: async (userId, projectData) => {
        const docRef = await addDoc(collection(db, "projects"), {
            ...projectData,
            archived: false,
            createdBy: userId,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });
        return docRef.id;
    },

    // Actualizar proyecto
    updateProject: async (projectId, updates) => {
        const docRef = doc(db, "projects", projectId);
        await updateDoc(docRef, { ...updates, updatedAt: serverTimestamp() });
    },

    // Archivar/Desarchivar proyecto
    toggleProjectArchive: async (projectId, archived) => {
        const docRef = doc(db, "projects", projectId);
        await updateDoc(docRef, { archived, updatedAt: serverTimestamp() });
    },

    /**
     * Retira usuarios de assignedUsers de TODAS las acciones del proyecto.
     * Se invoca al quitar miembros del proyecto para que no queden "tareas
     * fantasma": seguirían apareciendo en Mis Tareas pero las reglas ya no
     * les permitirían tocarlas.
     */
    removeUsersFromProjectActions: async (projectId, removedUids) => {
        if (!removedUids || removedUids.length === 0) return;
        const removed = new Set(removedUids);
        const snap = await getDocs(collection(db, "projects", projectId, "actions"));
        const toUpdate = snap.docs.filter((d) =>
            (d.data().assignedUsers || []).some((uid) => removed.has(uid))
        );
        for (let i = 0; i < toUpdate.length; i += 450) {
            const batch = writeBatch(db);
            toUpdate.slice(i, i + 450).forEach((d) => {
                batch.update(d.ref, {
                    assignedUsers: (d.data().assignedUsers || []).filter((uid) => !removed.has(uid)),
                    updatedAt: serverTimestamp(),
                });
            });
            await batch.commit();
        }
    },

    /**
     * Borrado profundo de un proyecto: adjuntos (Storage + docs), acciones y
     * subcolecciones, y por último el propio proyecto. Idempotente y
     * reintentable: si falla a mitad, el proyecto sigue visible y se puede
     * volver a intentar.
     * @returns {Promise<{orphanFiles: string[]}>} rutas de Storage no borradas
     */
    deleteProjectDeep: async (projectId) => {
        const { orphanFiles } = await deleteAllProjectAttachments(projectId);

        const actionsSnap = await getDocs(collection(db, "projects", projectId, "actions"));

        // Comentarios de cada acción (subcolección) — se borran junto a la acción
        for (const actionDoc of actionsSnap.docs) {
            const commentsSnap = await getDocs(
                collection(db, "projects", projectId, "actions", actionDoc.id, "comments")
            );
            if (commentsSnap.empty) continue;
            for (let i = 0; i < commentsSnap.docs.length; i += 450) {
                const batch = writeBatch(db);
                commentsSnap.docs.slice(i, i + 450).forEach(d => batch.delete(d.ref));
                await batch.commit();
            }
        }

        // Actividad del proyecto
        const activitySnap = await getDocs(collection(db, "projects", projectId, "activity"));
        const toDelete = [...actionsSnap.docs, ...activitySnap.docs];
        for (let i = 0; i < toDelete.length; i += 450) {
            const batch = writeBatch(db);
            toDelete.slice(i, i + 450).forEach(d => batch.delete(d.ref));
            await batch.commit();
        }

        // El doc del proyecto va el último: mientras existan acciones, las
        // reglas pueden validar pertenencia y el borrado es reintentable
        await deleteDoc(doc(db, "projects", projectId));

        return { orphanFiles };
    }
};

// ==================== ACCIONES ====================

export const actionService = {
    // Añadir una acción con ID secuencial por proyecto
    addAction: async (projectId, actionData, userId) => {
        const projectRef = doc(db, "projects", projectId);
        const actionsRef = collection(db, "projects", projectId, "actions");

        // Backfill SOLO para proyectos legacy sin contador: máximo seqId real
        // (nunca snapshot.size, que falla tras borrados). Fuera de la
        // transacción porque las transacciones no pueden hacer queries.
        let fallbackMaxSeq = 0;
        const existing = await getDocs(actionsRef);
        if (!existing.empty) {
            fallbackMaxSeq = existing.docs.reduce(
                (max, d) => Math.max(max, Number(d.data().seqId) || 0), 0
            );
        }

        return await runTransaction(db, async (transaction) => {
            const pDoc = await transaction.get(projectRef);
            if (!pDoc.exists()) throw new Error("Proyecto no encontrado");

            const data = pDoc.data();
            const base = typeof data.lastActionId === "number" ? data.lastActionId : fallbackMaxSeq;
            const nextId = base + 1;

            const newActionRef = doc(actionsRef);
            transaction.set(newActionRef, {
                ...actionData,
                seqId: nextId,
                orden: actionData.orden !== undefined ? actionData.orden : null,
                createdAt: serverTimestamp(),
                ...(userId ? { createdBy: userId } : {})
            });
            transaction.update(projectRef, { lastActionId: nextId, updatedAt: serverTimestamp() });

            return { id: newActionRef.id, seqId: nextId };
        });
    },

    // Actualizar una acción, con auditoría de quién y cuándo
    updateAction: async (projectId, actionId, updates, userId) => {
        const docRef = doc(db, "projects", projectId, "actions", actionId);
        await updateDoc(docRef, {
            ...updates,
            updatedAt: serverTimestamp(),
            ...(userId ? { updatedBy: userId } : {})
        });
    },

    // Eliminar una acción y sus comentarios
    deleteAction: async (projectId, actionId) => {
        const commentsSnap = await getDocs(
            collection(db, "projects", projectId, "actions", actionId, "comments")
        );
        if (!commentsSnap.empty) {
            for (let i = 0; i < commentsSnap.docs.length; i += 450) {
                const batch = writeBatch(db);
                commentsSnap.docs.slice(i, i + 450).forEach(d => batch.delete(d.ref));
                await batch.commit();
            }
        }
        await deleteDoc(doc(db, "projects", projectId, "actions", actionId));
    }
};

// ==================== ESTADOS (CONFIGURACIÓN) ====================

export const DEFAULT_STATUSES = [
    { id: "pendiente", label: "Pendiente", color: "#EAB308", type: "none" },
    { id: "en_curso", label: "En Curso", color: "#3B82F6", type: "start" },
    { id: "pendiente_validar", label: "Pendiente de Validar", color: "#F97316", type: "none" },
    { id: "finalizado", label: "Finalizado", color: "#22C55E", type: "end" },
    { id: "descartado", label: "Descartado", color: "#6B7280", type: "cancelled" }
];

export const statusService = {
    // Actualizar estados (solo admin)
    updateStatuses: async (statuses) => {
        const docRef = doc(db, "settings", "statuses");
        await setDoc(docRef, { statuses });
    }
};

// ==================== DEPARTAMENTOS ====================

export const departmentService = {
    // Actualizar departamentos (solo admin)
    updateDepartments: async (departments) => {
        const docRef = doc(db, "settings", "departments");
        await setDoc(docRef, { departments });
    }
};

// ==================== SUSCRIPCIONES EN TIEMPO REAL ====================

function sortByCreatedAtDesc(a, b) {
    return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
}

function sortByCreatedAtAsc(a, b) {
    return (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0);
}

export const subscriptions = {
    // Proyectos del usuario (creados por él o donde está asignado).
    // Si UNA de las dos queries falla, se emite igualmente con lo disponible
    // y se propaga el error: la UI nunca se queda en "Cargando..." infinito.
    subscribeToUserProjects: (userId, callback, onError) => {
        const q1 = query(collection(db, "projects"), where("assignedUsers", "array-contains", userId));
        const q2 = query(collection(db, "projects"), where("createdBy", "==", userId));

        let data1 = [];
        let data2 = [];
        let fired1 = false;
        let fired2 = false;

        function merge() {
            if (!fired1 || !fired2) return;
            const map = new Map();
            [...data1, ...data2].forEach(p => map.set(p.id, p));
            callback(Array.from(map.values()).sort(sortByCreatedAtDesc));
        }

        const unsub1 = onSnapshot(q1, (snapshot) => {
            data1 = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            fired1 = true;
            merge();
        }, (error) => {
            console.error("Error en suscripción proyectos (assigned):", error);
            data1 = [];
            fired1 = true;
            merge();
            onError?.(error);
        });

        const unsub2 = onSnapshot(q2, (snapshot) => {
            data2 = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            fired2 = true;
            merge();
        }, (error) => {
            console.error("Error en suscripción proyectos (created):", error);
            data2 = [];
            fired2 = true;
            merge();
            onError?.(error);
        });

        return () => { unsub1(); unsub2(); };
    },

    // Un proyecto individual
    subscribeToProject: (projectId, callback, onError) => {
        const docRef = doc(db, "projects", projectId);
        return onSnapshot(docRef, (docSnap) => {
            callback(docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null);
        }, (error) => {
            console.error("Error en suscripción proyecto:", error);
            onError?.(error);
        });
    },

    // Las acciones de un proyecto
    subscribeToActions: (projectId, callback, onError) => {
        const colRef = collection(db, "projects", projectId, "actions");
        return onSnapshot(colRef, (snapshot) => {
            const actions = snapshot.docs.map(d => ({ id: d.id, ...d.data(), projectId }));
            callback(actions.sort(sortByCreatedAtAsc));
        }, (error) => {
            console.error("Error en suscripción acciones:", error);
            onError?.(error);
        });
    },

    // Acciones de VARIOS proyectos (un listener por proyecto, resultado
    // combinado). Sustituye al collectionGroup global para no-admins.
    subscribeToActionsForProjects: (projectIds, callback, onError) => {
        if (!projectIds || projectIds.length === 0) {
            callback([]);
            return () => {};
        }
        const byProject = new Map();
        const fired = new Set();

        function emit() {
            if (fired.size < projectIds.length) return;
            callback(Array.from(byProject.values()).flat());
        }

        const unsubs = projectIds.map(pid =>
            onSnapshot(collection(db, "projects", pid, "actions"), (snapshot) => {
                byProject.set(pid, snapshot.docs.map(d => ({ id: d.id, ...d.data(), projectId: pid })));
                fired.add(pid);
                emit();
            }, (error) => {
                console.error(`Error en suscripción acciones de ${pid}:`, error);
                byProject.set(pid, []);
                fired.add(pid);
                emit();
                onError?.(error);
            })
        );
        return () => unsubs.forEach(u => u());
    },

    // TODAS las acciones (collectionGroup) — restringido por reglas a admin
    subscribeToAllActions: (callback, onError) => {
        const q = query(collectionGroup(db, "actions"));
        return onSnapshot(q, (snapshot) => {
            callback(snapshot.docs.map(d => ({
                id: d.id,
                ...d.data(),
                projectId: d.ref.parent.parent?.id || null
            })));
        }, (error) => {
            console.error("Error en suscripción todas las acciones:", error);
            onError?.(error);
        });
    },

    // Mis acciones en todos los proyectos (collectionGroup filtrado por
    // asignación; requiere el índice COLLECTION_GROUP de firestore.indexes.json)
    subscribeToMyActions: (userId, callback, onError) => {
        const q = query(
            collectionGroup(db, "actions"),
            where("assignedUsers", "array-contains", userId)
        );
        return onSnapshot(q, (snapshot) => {
            callback(snapshot.docs.map(d => ({
                id: d.id,
                ...d.data(),
                projectId: d.ref.parent.parent?.id || null
            })));
        }, (error) => {
            console.error("Error en suscripción mis acciones:", error);
            onError?.(error);
        });
    },

    // Todos los proyectos (títulos para Reports/Calendar de admin)
    subscribeToAllProjects: (callback, onError) => {
        const colRef = collection(db, "projects");
        return onSnapshot(colRef, (snapshot) => {
            callback(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
        }, (error) => {
            console.error("Error en suscripción todos los proyectos:", error);
            onError?.(error);
        });
    },

    // Colección de usuarios (selectores de asignación)
    subscribeToUsers: (callback, onError) => {
        const colRef = collection(db, "users");
        return onSnapshot(colRef, (snapshot) => {
            callback(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
        }, (error) => {
            console.error("Error en suscripción usuarios:", error);
            onError?.(error);
        });
    },

    // Un usuario individual (perfil del AuthContext)
    subscribeToUser: (uid, callback, onError) => {
        const docRef = doc(db, "users", uid);
        return onSnapshot(docRef, (docSnap) => {
            callback(docSnap.exists() ? docSnap.data() : null);
        }, (error) => {
            console.error("Error en suscripción usuario:", error);
            onError?.(error);
        });
    },

    // Estados. Si el doc no existe se emiten los defaults EN MEMORIA, sin
    // escribir: la materialización ocurre solo cuando un admin guarda.
    subscribeToStatuses: (callback, onError) => {
        const docRef = doc(db, "settings", "statuses");
        return onSnapshot(docRef, (docSnap) => {
            callback(docSnap.exists() ? docSnap.data().statuses : DEFAULT_STATUSES);
        }, (error) => {
            console.error("Error en suscripción estados:", error);
            onError?.(error);
        });
    },

    // Departamentos
    subscribeToDepartments: (callback, onError) => {
        const docRef = doc(db, "settings", "departments");
        return onSnapshot(docRef, (docSnap) => {
            callback(docSnap.exists() ? docSnap.data().departments || [] : []);
        }, (error) => {
            console.error("Error en suscripción departamentos:", error);
            onError?.(error);
        });
    }
};
