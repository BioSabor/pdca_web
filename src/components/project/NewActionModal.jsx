import Modal from "../ui/Modal";
import NewActionForm from "./NewActionForm";
import { getPriorityConfig } from "../../lib/priority";
import { getPhaseConfig } from "../../lib/pdca";
import { formatShortDate } from "../../lib/dates";

// Convierte el resultado saneado de openaiService.extractActionFields en
// prefill (se aplica directo) + suggestions (requieren un clic del usuario).
function fromVoiceExtraction(extraction, userOptions) {
    if (!extraction) return { prefill: undefined, suggestions: undefined };

    const suggestions = {};
    if (extraction.assignedUserId) {
        const user = userOptions.find((o) => o.value === extraction.assignedUserId);
        if (user) suggestions.assignedUsers = { value: [user.value], label: user.label };
    } else if (extraction.assignedUserRaw) {
        suggestions.assignedUserHint = { label: extraction.assignedUserRaw };
    }
    if (extraction.priority) {
        suggestions.priority = { value: extraction.priority, label: getPriorityConfig(extraction.priority).label };
    }
    if (extraction.phase) {
        suggestions.phase = { value: extraction.phase, label: getPhaseConfig(extraction.phase)?.longLabel };
    }
    if (extraction.proposedStartDate) {
        suggestions.proposedStartDate = {
            value: extraction.proposedStartDate,
            label: formatShortDate(extraction.proposedStartDate),
        };
    }
    if (extraction.proposedEndDate) {
        suggestions.proposedEndDate = {
            value: extraction.proposedEndDate,
            label: formatShortDate(extraction.proposedEndDate),
        };
    }
    if (extraction.observations) {
        suggestions.observations = { value: extraction.observations, label: extraction.observations };
    }

    return { prefill: { action: extraction.action }, suggestions };
}

/**
 * Modal de alta de acción. Se usa desde el botón "Nueva acción" de la barra
 * de herramientas (cualquier vista), desde el botón "+" de cada columna del
 * Kanban (initialStatus precarga el estado de esa columna) y desde el alta
 * por voz (voiceExtraction precarga la descripción y sugiere el resto).
 */
export default function NewActionModal({
    open,
    onClose,
    statuses,
    userOptions,
    requiredFields,
    initialStatus,
    voiceExtraction,
    onSubmit,
}) {
    async function handleSubmit(data) {
        const ok = await onSubmit(data);
        if (ok) onClose();
        return ok;
    }

    const { prefill, suggestions } = fromVoiceExtraction(voiceExtraction, userOptions);

    return (
        <Modal open={open} onClose={onClose} title="Nueva acción" size="md">
            <NewActionForm
                statuses={statuses}
                userOptions={userOptions}
                requiredFields={requiredFields}
                initialStatus={initialStatus}
                prefill={prefill}
                suggestions={suggestions}
                onSubmit={handleSubmit}
                onCancel={onClose}
            />
        </Modal>
    );
}
