import { useState } from "react";
import { Send, Pencil, Trash2, MessageSquare } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import useRealtimeSubscription from "../../hooks/useRealtimeSubscription";
import {
    subscribeToComments,
    addComment,
    updateComment,
    deleteComment,
    parseMentions,
} from "../../services/commentService";
import MentionTextarea from "../ui/MentionTextarea";
import { useToast } from "../ui/Toast";
import { useConfirm } from "../ui/ConfirmDialog";
import Spinner from "../ui/Spinner";
import { formatRelativeTime } from "../../lib/dates";

// Hilo de comentarios de una acción. Se monta SOLO al expandir la fila
// (suscripción perezosa, mismo patrón que los adjuntos).
export default function ActionComments({ projectId, action, projectUsers, projectTitle }) {
    const { currentUser } = useAuth();
    const toast = useToast();
    const confirm = useConfirm();
    const [draft, setDraft] = useState("");
    const [sending, setSending] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [editText, setEditText] = useState("");

    const { data: comments, loading } = useRealtimeSubscription(
        (onData, onError) => subscribeToComments(projectId, action.id, onData, onError),
        [projectId, action.id]
    );

    const isAdmin = currentUser?.role === "admin";

    async function handleSend() {
        const text = draft.trim();
        if (!text || sending) return;
        setSending(true);
        try {
            const mentions = parseMentions(text, projectUsers);
            await addComment(
                {
                    actorId: currentUser.uid,
                    actorName: currentUser.displayName || currentUser.email,
                    projectTitle,
                },
                projectId,
                action,
                { text, mentions }
            );
            setDraft("");
        } catch (error) {
            console.error(error);
            toast.error("No se pudo publicar el comentario");
        } finally {
            setSending(false);
        }
    }

    async function handleSaveEdit(comment) {
        const text = editText.trim();
        if (!text) return;
        try {
            await updateComment(projectId, action.id, comment.id, text);
            setEditingId(null);
        } catch (error) {
            console.error(error);
            toast.error("No se pudo editar el comentario");
        }
    }

    async function handleDelete(comment) {
        const ok = await confirm({
            title: "Eliminar comentario",
            message: "¿Seguro que quieres eliminar este comentario?",
            confirmLabel: "Eliminar",
            tone: "danger",
        });
        if (!ok) return;
        try {
            await deleteComment(projectId, action.id, comment.id);
        } catch (error) {
            console.error(error);
            toast.error("No se pudo eliminar el comentario");
        }
    }

    return (
        <div className="space-y-3">
            <h4 className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-200">
                <MessageSquare className="h-4 w-4" />
                Comentarios {comments.length > 0 && `(${comments.length})`}
            </h4>

            {loading ? (
                <Spinner size="sm" className="py-2" />
            ) : comments.length === 0 ? (
                <p className="text-sm text-gray-400 dark:text-gray-500">
                    Sin comentarios todavía. Usa @ para mencionar a alguien.
                </p>
            ) : (
                <ul className="space-y-2">
                    {comments.map((comment) => {
                        const own = comment.authorId === currentUser?.uid;
                        return (
                            <li key={comment.id} className="rounded-xl bg-surface-2/60 p-2.5">
                                <div className="flex items-center justify-between gap-2">
                                    <span className="text-xs font-medium text-gray-700 dark:text-gray-200">
                                        {comment.authorName || "Usuario"}
                                        <span className="ml-2 font-normal text-gray-400 dark:text-gray-500">
                                            {formatRelativeTime(comment.createdAt)}
                                            {comment.edited && " · editado"}
                                        </span>
                                    </span>
                                    {(own || isAdmin) && editingId !== comment.id && (
                                        <span className="flex gap-1">
                                            {own && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setEditingId(comment.id);
                                                        setEditText(comment.text);
                                                    }}
                                                    aria-label="Editar comentario"
                                                    className="rounded p-1 text-gray-400 hover:bg-surface-2 hover:text-gray-600 dark:hover:text-gray-200"
                                                >
                                                    <Pencil className="h-3.5 w-3.5" />
                                                </button>
                                            )}
                                            <button
                                                type="button"
                                                onClick={() => handleDelete(comment)}
                                                aria-label="Eliminar comentario"
                                                className="rounded p-1 text-gray-400 hover:bg-surface-2 hover:text-red-600"
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </button>
                                        </span>
                                    )}
                                </div>
                                {editingId === comment.id ? (
                                    <div className="mt-1.5 space-y-2">
                                        <MentionTextarea
                                            value={editText}
                                            onChange={setEditText}
                                            users={projectUsers}
                                            rows={2}
                                            onSubmit={() => handleSaveEdit(comment)}
                                        />
                                        <div className="flex gap-2">
                                            <button type="button" className="btn-primary btn-sm" onClick={() => handleSaveEdit(comment)}>
                                                Guardar
                                            </button>
                                            <button type="button" className="btn-secondary btn-sm" onClick={() => setEditingId(null)}>
                                                Cancelar
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="mt-1 whitespace-pre-wrap break-words text-sm text-gray-800 dark:text-gray-100">
                                        {comment.text}
                                    </p>
                                )}
                            </li>
                        );
                    })}
                </ul>
            )}

            <div className="flex items-end gap-2">
                <MentionTextarea
                    value={draft}
                    onChange={setDraft}
                    users={projectUsers}
                    placeholder="Escribe un comentario… (@ para mencionar)"
                    rows={2}
                    onSubmit={handleSend}
                    className="flex-1"
                />
                <button
                    type="button"
                    onClick={handleSend}
                    disabled={!draft.trim() || sending}
                    aria-label="Enviar comentario"
                    className="btn-primary btn-icon"
                >
                    <Send className="h-4 w-4" />
                </button>
            </div>
        </div>
    );
}
