import { db } from "../firebase";
import {
    collection,
    doc,
    addDoc,
    deleteDoc,
    onSnapshot,
    writeBatch,
    serverTimestamp
} from "firebase/firestore";
import { normalizePriority } from "../lib/priority";
import { parseLocalISO, addDays, todayLocalISO } from "../lib/dates";

/**
 * Plantillas de proyecto (colección raíz `templates`).
 * Doc: { name, description, createdBy, createdAt,
 *        projectData: { description, requiredActionFields },
 *        actions: [{ action, phase, priority, orden, observations,
 *                    subactions: [{title}], offsetStartDays?, offsetEndDays? }] }
 * Sin usuarios ni fechas absolutas: las fechas se guardan como offsets en días
 * relativos al inicio más temprano y se reproyectan al instanciar.
 */

export function subscribeToTemplates(callback, onError) {
    return onSnapshot(collection(db, "templates"), (snapshot) => {
        const templates = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        templates.sort((a, b) => (a.name || "").localeCompare(b.name || "", "es"));
        callback(templates);
    }, (error) => {
        console.error("Error en suscripción de plantillas:", error);
        onError?.(error);
    });
}

export async function createTemplateFromProject(userId, project, actions, { name, description, includeDates }) {
    // Fecha base = proposedStartDate más temprana (para offsets relativos)
    let baseDate = null;
    if (includeDates) {
        for (const a of actions) {
            if (a.proposedStartDate && (!baseDate || a.proposedStartDate < baseDate)) {
                baseDate = a.proposedStartDate;
            }
        }
    }
    const base = baseDate ? parseLocalISO(baseDate) : null;

    function offsetOf(dateStr) {
        if (!includeDates || !base || !dateStr) return null;
        const diff = Math.round((parseLocalISO(dateStr) - base) / (1000 * 60 * 60 * 24));
        return diff >= 0 ? diff : 0;
    }

    const templateActions = [...actions]
        .sort((a, b) => (a.seqId || 0) - (b.seqId || 0))
        .map((a) => ({
            action: a.action || "",
            phase: a.phase || null,
            priority: normalizePriority(a.priority),
            orden: a.orden ?? null,
            observations: a.observations || "",
            subactions: (a.subactions || []).map((s) => ({ title: s.title || "" })),
            offsetStartDays: offsetOf(a.proposedStartDate),
            offsetEndDays: offsetOf(a.proposedEndDate),
        }));

    const docRef = await addDoc(collection(db, "templates"), {
        name,
        description: description || "",
        createdBy: userId,
        createdAt: serverTimestamp(),
        projectData: {
            description: project.description || "",
            requiredActionFields: project.requiredActionFields || {},
        },
        actions: templateActions,
    });
    return docRef.id;
}

export async function deleteTemplate(templateId) {
    await deleteDoc(doc(db, "templates", templateId));
}

/**
 * Crea un proyecto real a partir de una plantilla: proyecto + N acciones con
 * seqId 1..N y lastActionId = N. Las fechas propuestas se reproyectan desde
 * hoy usando los offsets guardados.
 */
export async function instantiateTemplate(userId, template, { title, description, assignedUsers, assignedDepartments }) {
    const projectRef = await addDoc(collection(db, "projects"), {
        title,
        description: description ?? template.projectData?.description ?? "",
        assignedUsers,
        assignedDepartments,
        requiredActionFields: template.projectData?.requiredActionFields || {},
        archived: false,
        createdBy: userId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        lastActionId: 0,
    });

    const templateActions = template.actions || [];
    const today = todayLocalISO();
    let seq = 0;

    for (let i = 0; i < templateActions.length; i += 400) {
        const batch = writeBatch(db);
        templateActions.slice(i, i + 400).forEach((ta) => {
            seq++;
            const actionRef = doc(collection(db, "projects", projectRef.id, "actions"));
            batch.set(actionRef, {
                seqId: seq,
                orden: ta.orden ?? null,
                action: ta.action || "",
                phase: ta.phase || null,
                priority: ta.priority || "none",
                status: "pendiente",
                assignedUsers: [],
                proposedStartDate: ta.offsetStartDays != null ? addDays(today, ta.offsetStartDays) : "",
                proposedEndDate: ta.offsetEndDays != null ? addDays(today, ta.offsetEndDays) : "",
                startDate: "",
                actualEndDate: "",
                observations: ta.observations || "",
                subactions: (ta.subactions || []).map((s, idx) => ({
                    id: `${Date.now()}_${seq}_${idx}`,
                    title: s.title || "",
                    status: "pendiente",
                    assignedUsers: [],
                })),
                createdAt: serverTimestamp(),
                createdBy: userId,
            });
        });
        if (i + 400 >= templateActions.length) {
            batch.update(projectRef, { lastActionId: seq });
        }
        await batch.commit();
    }

    return projectRef.id;
}
