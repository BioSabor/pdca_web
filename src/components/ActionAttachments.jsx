import { useState, useEffect, useRef, useCallback } from "react";
import { X, Download, Trash2, Eye, Upload } from "lucide-react";
import {
    uploadAttachment,
    deleteAttachment,
    subscribeToAttachments,
    validateFile,
    formatFileSize,
    getFileIcon,
} from "../services/attachmentService";
import { logActivity } from "../services/activityService";
import { useAuth } from "../context/AuthContext";
import { useConfirm } from "./ui/ConfirmDialog";
import { cn } from "../lib/utils";
import { createPortal } from "react-dom";

export default function ActionAttachments({ projectId, actionId, userId, actionSeqId = null }) {
    const { currentUser } = useAuth();
    const confirm = useConfirm();
    const [attachments, setAttachments] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [error, setError] = useState("");
    const [dragOver, setDragOver] = useState(false);
    const [previewUrl, setPreviewUrl] = useState(null);
    const fileInputRef = useRef(null);

    const actorName = currentUser?.displayName || currentUser?.email || "";

    // Suscripción en tiempo real
    useEffect(() => {
        if (!projectId || !actionId) return;
        const unsub = subscribeToAttachments(projectId, actionId, setAttachments);
        return () => unsub();
    }, [projectId, actionId]);

    const handleUpload = useCallback(async (files) => {
        if (!files || files.length === 0) return;
        setError("");

        for (const file of Array.from(files)) {
            const validation = validateFile(file);
            if (!validation.valid) {
                setError(validation.error);
                continue;
            }
            try {
                setUploading(true);
                setUploadProgress(0);
                await uploadAttachment(file, projectId, actionId, userId, setUploadProgress);
                logActivity(projectId, {
                    type: "attachment_added",
                    actorId: userId,
                    actorName,
                    actionId,
                    actionSeqId,
                    detail: { text: file.name },
                });
            } catch (err) {
                setError(err.message);
            } finally {
                setUploading(false);
                setUploadProgress(0);
            }
        }
        if (fileInputRef.current) fileInputRef.current.value = "";
    }, [projectId, actionId, userId, actorName, actionSeqId]);

    const handleDelete = async (att) => {
        const ok = await confirm({
            title: "Eliminar adjunto",
            message: `¿Eliminar "${att.fileName}"?`,
            confirmLabel: "Eliminar",
            tone: "danger",
        });
        if (!ok) return;
        try {
            await deleteAttachment(att.id, att.storagePath);
            logActivity(projectId, {
                type: "attachment_deleted",
                actorId: userId,
                actorName,
                actionId,
                actionSeqId,
                detail: { text: att.fileName },
            });
        } catch {
            setError("Error al eliminar el archivo.");
        }
    };

    const handleDragOver = (e) => { e.preventDefault(); e.stopPropagation(); setDragOver(true); };
    const handleDragLeave = (e) => { e.preventDefault(); e.stopPropagation(); setDragOver(false); };
    const handleDrop = (e) => {
        e.preventDefault(); e.stopPropagation(); setDragOver(false);
        if (e.dataTransfer.files) handleUpload(e.dataTransfer.files);
    };

    return (
        <div className="space-y-2">
            {/* Error */}
            {error && (
                <div role="alert" className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
                    <span className="flex-1">{error}</span>
                    <button onClick={() => setError("")} aria-label="Cerrar error" className="flex-shrink-0 p-1">
                        <X className="h-3 w-3" />
                    </button>
                </div>
            )}

            {/* Zona de carga con drag & drop */}
            <div
                className={cn(
                    "cursor-pointer rounded-xl border-2 border-dashed px-4 py-3 text-center transition-all",
                    dragOver
                        ? "border-brand-400 bg-brand-50 dark:bg-brand-900/20"
                        : "border-line hover:border-brand-400 hover:bg-surface-2/60"
                )}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
            >
                {uploading ? (
                    <div className="space-y-1" aria-live="polite">
                        <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                            <div className="h-2 rounded-full bg-brand-600 transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Subiendo… {uploadProgress}%</p>
                    </div>
                ) : (
                    <div className="flex flex-col items-center gap-1">
                        <Upload className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            Arrastra archivos aquí o <span className="font-medium text-brand-600 dark:text-brand-400">haz clic</span>
                        </p>
                        <p className="text-xs text-gray-400 dark:text-gray-500">Máx. 10 MB · Imágenes, PDF, Office, TXT, CSV</p>
                    </div>
                )}
                <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv"
                    onChange={(e) => handleUpload(e.target.files)}
                    className="hidden"
                    aria-label="Seleccionar archivos"
                />
            </div>

            {/* Lista de archivos adjuntos */}
            {attachments.length > 0 && (
                <div className="space-y-1">
                    {attachments.map((att) => (
                        <div key={att.id} className="group flex items-center gap-2 rounded-xl bg-surface-2/60 px-3 py-1.5">
                            <span className="flex-shrink-0 text-base" aria-hidden="true">{getFileIcon(att.fileType)}</span>
                            <div className="min-w-0 flex-1">
                                <a
                                    href={att.downloadURL}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block truncate text-xs text-brand-600 hover:underline dark:text-brand-400"
                                    title={att.fileName}
                                >
                                    {att.fileName}
                                </a>
                                <span className="text-xs text-gray-400 dark:text-gray-500">{formatFileSize(att.fileSize)}</span>
                            </div>
                            <div className="flex flex-shrink-0 items-center gap-1 opacity-100 transition-opacity lg:opacity-0 lg:group-hover:opacity-100 lg:group-focus-within:opacity-100">
                                {att.isImage && (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setPreviewUrl(att.downloadURL); }}
                                        className="rounded p-1.5 text-gray-400 hover:text-brand-600 dark:hover:text-brand-400"
                                        aria-label={`Vista previa de ${att.fileName}`}
                                        title="Vista previa"
                                    >
                                        <Eye className="h-3.5 w-3.5" />
                                    </button>
                                )}
                                <a
                                    href={att.downloadURL}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="rounded p-1.5 text-gray-400 hover:text-green-600 dark:hover:text-green-400"
                                    aria-label={`Descargar ${att.fileName}`}
                                    title="Descargar"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <Download className="h-3.5 w-3.5" />
                                </a>
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleDelete(att); }}
                                    className="rounded p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                                    aria-label={`Eliminar ${att.fileName}`}
                                    title="Eliminar"
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {attachments.length === 0 && (
                <p className="py-1 text-center text-xs text-gray-400 dark:text-gray-500">Sin archivos adjuntos</p>
            )}

            {/* Lightbox de imagen */}
            {previewUrl &&
                createPortal(
                    <div
                        className="fixed inset-0 z-modal flex items-center justify-center bg-black/80 p-4"
                        onClick={() => setPreviewUrl(null)}
                        role="dialog"
                        aria-modal="true"
                        aria-label="Vista previa de imagen"
                    >
                        <div className="relative max-h-[90dvh] max-w-[90vw]" onClick={(e) => e.stopPropagation()}>
                            <button
                                onClick={() => setPreviewUrl(null)}
                                className="absolute right-2 top-2 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-surface text-gray-600 shadow-overlay hover:text-red-500 dark:text-gray-300"
                                aria-label="Cerrar vista previa"
                            >
                                <X className="h-4 w-4" />
                            </button>
                            <img
                                src={previewUrl}
                                alt="Vista previa"
                                className="max-h-[85dvh] max-w-[90vw] rounded-2xl object-contain shadow-overlay"
                            />
                        </div>
                    </div>,
                    document.body
                )}
        </div>
    );
}
