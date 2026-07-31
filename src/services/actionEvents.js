import { actionService } from "./projectService";
import { applyStatusSideEffects } from "../lib/status";
import { logActivity } from "./activityService";
import { notifyUsers, buildNotificationPayload } from "./notificationService";

/**
 * Fachada de comandos sobre acciones. TODA la UI escribe acciones a través de
 * aquí. La escritura principal es awaited; los efectos secundarios (registro
 * de actividad, notificaciones) son fire-and-forget: si fallan, la operación
 * principal ya está guardada.
 *
 * ctx = { actorId, actorName, projectTitle }
 */

function basePayload(ctx, projectId, action) {
    return {
        projectId,
        projectTitle: ctx?.projectTitle || "",
        actionId: action?.id || null,
        actionText: action?.action || "",
        actorId: ctx?.actorId || null,
        actorName: ctx?.actorName || ""
    };
}

function baseActivity(ctx, action) {
    return {
        actorId: ctx?.actorId || null,
        actorName: ctx?.actorName || "",
        actionId: action?.id || null,
        actionSeqId: action?.seqId ?? null
    };
}

export const actionEvents = {
    async createAction(ctx, projectId, actionData) {
        const result = await actionService.addAction(projectId, actionData, ctx?.actorId);
        const created = { id: result.id, seqId: result.seqId, ...actionData };

        logActivity(projectId, {
            type: "action_created",
            ...baseActivity(ctx, created),
            detail: { text: (actionData.action || "").slice(0, 120) }
        });

        if (actionData.assignedUsers?.length) {
            notifyUsers(actionData.assignedUsers, buildNotificationPayload({
                ...basePayload(ctx, projectId, created),
                type: "assigned",
                message: `${ctx?.actorName || "Alguien"} te ha asignado una acción`
            })).catch(console.error);
        }
        return result;
    },

    async updateAction(ctx, projectId, action, updates) {
        await actionService.updateAction(projectId, action.id, updates, ctx?.actorId);

        const fields = Object.keys(updates);
        logActivity(projectId, {
            type: "action_updated",
            ...baseActivity(ctx, action),
            detail: { fields }
        });
    },

    /**
     * Cambio de estado con auto-relleno de fechas (type start/end).
     */
    async changeStatus(ctx, projectId, action, statusCfg, statuses = []) {
        const updates = applyStatusSideEffects(action, statusCfg);
        await actionService.updateAction(projectId, action.id, updates, ctx?.actorId);

        const fromLabel = statuses.find((s) => s.id === action.status)?.label || action.status || "—";
        logActivity(projectId, {
            type: "status_changed",
            ...baseActivity(ctx, action),
            detail: { from: fromLabel, to: statusCfg.label }
        });

        if (action.assignedUsers?.length) {
            notifyUsers(action.assignedUsers, buildNotificationPayload({
                ...basePayload(ctx, projectId, action),
                type: "status_change",
                message: `${ctx?.actorName || "Alguien"} cambió el estado a "${statusCfg.label}"`
            })).catch(console.error);
        }
        return updates;
    },

    async changeAssignees(ctx, projectId, action, newAssignees) {
        await actionService.updateAction(projectId, action.id, { assignedUsers: newAssignees }, ctx?.actorId);

        const previous = new Set(action.assignedUsers || []);
        const added = newAssignees.filter((uid) => !previous.has(uid));

        logActivity(projectId, {
            type: "action_updated",
            ...baseActivity(ctx, action),
            detail: { fields: ["assignedUsers"] }
        });

        if (added.length > 0) {
            notifyUsers(added, buildNotificationPayload({
                ...basePayload(ctx, projectId, action),
                type: "assigned",
                message: `${ctx?.actorName || "Alguien"} te ha asignado una acción`
            })).catch(console.error);
        }
    },

    async deleteAction(ctx, projectId, action) {
        await actionService.deleteAction(projectId, action.id);
        logActivity(projectId, {
            type: "action_deleted",
            ...baseActivity(ctx, action),
            detail: { text: (action.action || "").slice(0, 120) }
        });
    },
};
