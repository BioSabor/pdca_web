import Modal from "../ui/Modal";
import NewActionForm from "./NewActionForm";

/**
 * Modal de alta de acción. Se usa tanto desde el botón "Nueva acción" de la
 * barra de herramientas (cualquier vista) como desde el botón "+" de cada
 * columna del Kanban (initialStatus precarga el estado de esa columna).
 */
export default function NewActionModal({
    open,
    onClose,
    statuses,
    userOptions,
    requiredFields,
    initialStatus,
    onSubmit,
}) {
    async function handleSubmit(data) {
        const ok = await onSubmit(data);
        if (ok) onClose();
        return ok;
    }

    return (
        <Modal open={open} onClose={onClose} title="Nueva acción" size="md">
            <NewActionForm
                statuses={statuses}
                userOptions={userOptions}
                requiredFields={requiredFields}
                initialStatus={initialStatus}
                onSubmit={handleSubmit}
                onCancel={onClose}
            />
        </Modal>
    );
}
