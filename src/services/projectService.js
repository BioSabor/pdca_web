import { db } from "../firebase";
import {
    collection,
    collectionGroup,
    addDoc,
    getDocs,
    doc,
    getDoc,
    updateDoc,
    deleteDoc,
    setDoc,
    query,
    where,
    onSnapshot,
    serverTimestamp,
    runTransaction
} from "firebase/firestore";

// ==================== PROYECTOS ====================

export const projectService = {
    // Crear un nuevo proyecto
    createProject: async (userId, projectData) => {
        try {
            const docRef = await addDoc(collection(db, "projects"), {
                ...projectData,
                createdBy: userId,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });
            return docRef.id;
        } catch (error) {
            console.error("Error al crear proyecto:", error);
            throw error;
        }
    },

    // Obtener proyectos del usuario (creados por él o donde está asignado)
    getUserProjects: async (userId) => {
        try {
            // Obtener proyectos donde el usuario está asignado
            const q = query(
                collection(db, "projects"),
                where("assignedUsers", "array-contains", userId)
            );
            const snapshot = await getDocs(q);
            const projects = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

            // También obtener proyectos creados por el usuario (podría no estar asignado)
            const qCreated = query(
                collection(db, "projects"),
                where("createdBy", "==", userId)
            );
            const snapshotCreated = await getDocs(qCreated);
            snapshotCreated.docs.forEach(d => {
                if (!projects.find(p => p.id === d.id)) {
                    projects.push({ id: d.id, ...d.data() });
                }
            });

            // Ordenar por fecha de creación (más recientes primero)
            projects.sort((a, b) => {
                const aTime = a.createdAt?.seconds || 0;
                const bTime = b.createdAt?.seconds || 0;
                return bTime - aTime;
            });

            return projects;
        } catch (error) {
            console.error("Error al obtener proyectos:", error);
            throw error;
        }
    },

    // Obtener un proyecto por ID
    getProject: async (projectId) => {
        try {
            const docRef = doc(db, "projects", projectId);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                return { id: docSnap.id, ...docSnap.data() };
            }
            throw new Error("Proyecto no encontrado");
        } catch (error) {
            console.error("Error al obtener proyecto:", error);
            throw error;
        }
    },

    // Actualizar proyecto
    updateProject: async (projectId, updates) => {
        try {
            const docRef = doc(db, "projects", projectId);
            await updateDoc(docRef, { ...updates, updatedAt: serverTimestamp() });
        } catch (error) {
            console.error("Error al actualizar proyecto:", error);
            throw error;
        }
    },

    // Eliminar proyecto
    deleteProject: async (projectId) => {
        try {
            await deleteDoc(doc(db, "projects", projectId));
        } catch (error) {
            console.error("Error al eliminar proyecto:", error);
            throw error;
        }
    },

    // Archivar/Desarchivar proyecto
    toggleProjectArchive: async (projectId, archived) => {
        try {
            const docRef = doc(db, "projects", projectId);
            await updateDoc(docRef, { archived, updatedAt: serverTimestamp() });
        } catch (error) {
            console.error("Error al cambiar estado de archivo:", error);
            throw error;
        }
    }
};

// ==================== ACCIONES ====================

export const actionService = {
    // Obtener todas las acciones de un proyecto
    getActions: async (projectId) => {
        try {
            const snapshot = await getDocs(collection(db, "projects", projectId, "actions"));
            const actions = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            actions.sort((a, b) => {
                const aTime = a.createdAt?.seconds || 0;
                const bTime = b.createdAt?.seconds || 0;
                return aTime - bTime;
            });
            return actions;
        } catch (error) {
            console.error("Error al obtener acciones:", error);
            throw error;
        }
    },

    // Añadir una acción con ID autoincremental
    addAction: async (projectId, actionData) => {
        try {
            // Referencias
            const projectRef = doc(db, "projects", projectId);
            const actionsRef = collection(db, "projects", projectId, "actions");

            // Paso 1: Check rápido
            console.log("Adding action to project:", projectId);
            const pSnap = await getDoc(projectRef);

            // Check if lastActionId exists
            let currentLastId = 0;
            if (pSnap.exists() && pSnap.data().lastActionId !== undefined) {
                currentLastId = pSnap.data().lastActionId;
                console.log("Project has lastActionId:", currentLastId);
            } else {
                console.log("Project missing lastActionId, counting actions...");
                const existing = await getDocs(actionsRef);
                currentLastId = existing.size;
                console.log("Counted actions:", currentLastId);
            }

            // Paso 2: Transacción de escritura
            return await runTransaction(db, async (transaction) => {
                // Volver a leer proyecto para bloqueo
                const pDoc = await transaction.get(projectRef);
                if (!pDoc.exists()) throw new Error("Proyecto no encontrado");

                const data = pDoc.data();
                // Ensure we have a valid number
                const latestId = (data.lastActionId !== undefined) ? data.lastActionId : currentLastId;
                const nextId = Number(latestId) + 1;

                console.log("Generated nextId:", nextId);

                // Crear referencia nueva acción
                const newActionRef = doc(actionsRef);

                transaction.set(newActionRef, {
                    ...actionData,
                    seqId: nextId,
                    createdAt: serverTimestamp()
                });

                transaction.update(projectRef, { lastActionId: nextId });

                return { id: newActionRef.id, seqId: nextId };
            });

        } catch (error) {
            console.error("Error al añadir acción:", error);
            throw error;
        }
    },

    // Actualizar una acción
    updateAction: async (projectId, actionId, updates) => {
        try {
            const docRef = doc(db, "projects", projectId, "actions", actionId);
            await updateDoc(docRef, updates);
        } catch (error) {
            console.error("Error al actualizar acción:", error);
            throw error;
        }
    },

    // Eliminar una acción
    deleteAction: async (projectId, actionId) => {
        try {
            await deleteDoc(doc(db, "projects", projectId, "actions", actionId));
        } catch (error) {
            console.error("Error al eliminar acción:", error);
            throw error;
        }
    }
};

// ==================== ESTADOS (CONFIGURACIÓN) ====================

const DEFAULT_STATUSES = [
    { id: "pendiente", label: "Pendiente", color: "#EAB308", type: "none" },
    { id: "en_curso", label: "En Curso", color: "#3B82F6", type: "start" },
    { id: "pendiente_validar", label: "Pendiente de Validar", color: "#F97316", type: "none" },
    { id: "finalizado", label: "Finalizado", color: "#22C55E", type: "end" },
    { id: "descartado", label: "Descartado", color: "#6B7280", type: "end" }
];

export const statusService = {
    // Obtener estados configurados
    getStatuses: async () => {
        try {
            const docRef = doc(db, "settings", "statuses");
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                return docSnap.data().statuses;
            }
            // Si no existe, crear con valores por defecto
            await setDoc(docRef, { statuses: DEFAULT_STATUSES });
            return DEFAULT_STATUSES;
        } catch (error) {
            console.error("Error al obtener estados:", error);
            return DEFAULT_STATUSES;
        }
    },

    // Actualizar estados
    updateStatuses: async (statuses) => {
        try {
            const docRef = doc(db, "settings", "statuses");
            await setDoc(docRef, { statuses });
        } catch (error) {
            console.error("Error al actualizar estados:", error);
            throw error;
        }
    }
};

// ==================== USUARIOS ====================

export const userService = {
    // Obtener todos los usuarios (para selector de asignación)
    getAllUsers: async () => {
        try {
            const snapshot = await getDocs(collection(db, "users"));
            return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        } catch (error) {
            console.error("Error al obtener usuarios:", error);
            throw error;
        }
    }
};

// ==================== DEPARTAMENTOS ====================

export const departmentService = {
    // Obtener departamentos configurados
    getDepartments: async () => {
        try {
            const docRef = doc(db, "settings", "departments");
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                return docSnap.data().departments || [];
            }
            return [];
        } catch (error) {
            console.error("Error al obtener departamentos:", error);
            return [];
        }
    },

    // Actualizar departamentos
    updateDepartments: async (departments) => {
        try {
            const docRef = doc(db, "settings", "departments");
            await setDoc(docRef, { departments });
        } catch (error) {
            console.error("Error al actualizar departamentos:", error);
            throw error;
        }
    }
};

// ==================== SUSCRIPCIONES EN TIEMPO REAL ====================

export const subscriptions = {
    // Suscribirse a proyectos del usuario (creados por él o donde está asignado)
    subscribeToUserProjects: (userId, callback) => {
        // Listener 1: proyectos donde el usuario está asignado
        const q1 = query(
            collection(db, "projects"),
            where("assignedUsers", "array-contains", userId)
        );
        // Listener 2: proyectos creados por el usuario
        const q2 = query(
            collection(db, "projects"),
            where("createdBy", "==", userId)
        );

        let data1 = [];
        let data2 = [];
        let firstFire1 = false;
        let firstFire2 = false;

        function merge() {
            const map = new Map();
            [...data1, ...data2].forEach(p => map.set(p.id, p));
            const merged = Array.from(map.values());
            merged.sort((a, b) => {
                const aTime = a.createdAt?.seconds || 0;
                const bTime = b.createdAt?.seconds || 0;
                return bTime - aTime;
            });
            callback(merged);
        }

        const unsub1 = onSnapshot(q1, (snapshot) => {
            data1 = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            firstFire1 = true;
            if (firstFire1 && firstFire2) merge();
            else if (firstFire1 && !firstFire2) { /* esperar al segundo */ }
        }, (error) => {
            console.error("Error en suscripción proyectos (assigned):", error);
        });

        const unsub2 = onSnapshot(q2, (snapshot) => {
            data2 = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            firstFire2 = true;
            if (firstFire1 && firstFire2) merge();
            else if (firstFire2 && !firstFire1) { /* esperar al primero */ }
        }, (error) => {
            console.error("Error en suscripción proyectos (created):", error);
        });

        return () => { unsub1(); unsub2(); };
    },

    // Suscribirse a un proyecto individual
    subscribeToProject: (projectId, callback) => {
        const docRef = doc(db, "projects", projectId);
        return onSnapshot(docRef, (docSnap) => {
            if (docSnap.exists()) {
                callback({ id: docSnap.id, ...docSnap.data() });
            } else {
                callback(null);
            }
        }, (error) => {
            console.error("Error en suscripción proyecto:", error);
        });
    },

    // Suscribirse a las acciones de un proyecto
    subscribeToActions: (projectId, callback) => {
        const colRef = collection(db, "projects", projectId, "actions");
        return onSnapshot(colRef, (snapshot) => {
            const actions = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            actions.sort((a, b) => {
                const aTime = a.createdAt?.seconds || 0;
                const bTime = b.createdAt?.seconds || 0;
                return aTime - bTime;
            });
            callback(actions);
        }, (error) => {
            console.error("Error en suscripción acciones:", error);
        });
    },

    // Suscribirse a TODAS las acciones (collectionGroup) — para Reports y Calendar
    subscribeToAllActions: (callback) => {
        const q = query(collectionGroup(db, "actions"));
        return onSnapshot(q, (snapshot) => {
            const actions = snapshot.docs.map(d => ({
                id: d.id,
                ...d.data(),
                projectId: d.ref.parent.parent?.id || null
            }));
            callback(actions);
        }, (error) => {
            console.error("Error en suscripción todas las acciones:", error);
        });
    },

    // Suscribirse a todos los proyectos (para obtener títulos, usado en Reports/Calendar)
    subscribeToAllProjects: (callback) => {
        const colRef = collection(db, "projects");
        return onSnapshot(colRef, (snapshot) => {
            const projects = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            callback(projects);
        }, (error) => {
            console.error("Error en suscripción todos los proyectos:", error);
        });
    },

    // Suscribirse a la colección de usuarios
    subscribeToUsers: (callback) => {
        const colRef = collection(db, "users");
        return onSnapshot(colRef, (snapshot) => {
            const users = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            callback(users);
        }, (error) => {
            console.error("Error en suscripción usuarios:", error);
        });
    },

    // Suscribirse a un usuario individual (para AuthContext)
    subscribeToUser: (uid, callback) => {
        const docRef = doc(db, "users", uid);
        return onSnapshot(docRef, (docSnap) => {
            if (docSnap.exists()) {
                callback(docSnap.data());
            } else {
                callback(null);
            }
        }, (error) => {
            console.error("Error en suscripción usuario:", error);
        });
    },

    // Suscribirse a los estados
    subscribeToStatuses: (callback) => {
        const docRef = doc(db, "settings", "statuses");
        return onSnapshot(docRef, (docSnap) => {
            if (docSnap.exists()) {
                callback(docSnap.data().statuses);
            } else {
                // Si no existe, crear con valores por defecto
                setDoc(docRef, { statuses: DEFAULT_STATUSES });
                callback(DEFAULT_STATUSES);
            }
        }, (error) => {
            console.error("Error en suscripción estados:", error);
        });
    },

    // Suscribirse a los departamentos
    subscribeToDepartments: (callback) => {
        const docRef = doc(db, "settings", "departments");
        return onSnapshot(docRef, (docSnap) => {
            if (docSnap.exists()) {
                callback(docSnap.data().departments || []);
            } else {
                callback([]);
            }
        }, (error) => {
            console.error("Error en suscripción departamentos:", error);
        });
    }
};
