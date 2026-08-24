import { useCallback, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Upload, X, Download, Trash2, Eye, FolderOpen, Search } from "lucide-react";

import EmptyState from "../ui/EmptyState";
import ErrorState from "../ui/ErrorState";
import { SkeletonRows } from "../ui/Skeleton";
import { useToast } from "../ui/Toast";
import { useConfirm } from "../ui/ConfirmDialog";

import useProjectDocuments from "../../hooks/useProjectDocuments";
import {
    uploadProjectDocument,
    deleteAttachment,
    validateFile,
    formatFileSize,
    getFileIcon,
} from "../../services/attachmentService";
import { logActivity } from "../../services/activityService";
import { formatTimestampDate } from "../../lib/dates";
import { cn } from "../../lib/utils";

/**
 * Biblioteca documental del proyecto: ficheros e imágenes que pertenecen al
 * proyecto en su conjunto, no a una acción concreta.
 */
export default function ProjectDocuments({ projectId, currentUserId, actorName, getUserName }) {
    const toast = useToast();
    const confirm = useConfirm();
    const { documents, loading, error, retry } = useProjectDocuments(projectId);

    const [uploading, setUploading] = useState(null); // { name, progress, index, total }
    const [dragOver, setDragOver] = useState(false);
    const [search, setSearch] = useState("");
    const [previewUrl, setPreviewUrl] = useState(null);
    const fileInputRef = useRef(null);

    const handleUpload = useCallback(async (files) => {
        const list = Array.from(files || []);
        if (list.length === 0) return;

        for (const [index, file] of list.entries()) {
            const validation = validateFile(file);
            if (!validation.valid) {
                toast.error(`${file.name}: ${validation.error}`);
                continue;
            }
            try {
                setUploading({ name: file.name, progress: 0, index: index + 1, total: list.length });
                await uploadProjectDocument(file, projectId, currentUserId, (progress) =>
                    setUploading((prev) => (prev ? { ...prev, progress } : prev))
                );
                logActivity(projectId, {
                    type: "document_added",
                    actorId: currentUserId,
                    actorName,
                    detail: { text: file.name },
                });
            } catch (err) {
                toast.error(err.message || `No se pudo subir "${file.name}".`);
            } finally {
                setUploading(null);
            }
        }
        toast.success(list.length === 1 ? "Documento subido." : "Documentos subidos.");
        if (fileInputRef.current) fileInputRef.current.value = "";
    }, [projectId, currentUserId, actorName, toast]);

    async function handleDelete(doc) {
        const ok = await confirm({
            title: "Eliminar documento",
            message: `¿Eliminar "${doc.fileName}" de la documentación del proyecto?`,
            confirmLabel: "Eliminar",
            tone: "danger",
        });
        if (!ok) return;
        try {
            await deleteAttachment(doc.id, doc.storagePath);
            logActivity(projectId, {
                type: "document_deleted",
                actorId: currentUserId,
                actorName,
                detail: { text: doc.fileName },
            });
            toast.success("Documento eliminado.");
        } catch {
            toast.error("No se pudo eliminar el documento.");
        }
    }

    const filtered = useMemo(() => {
        const term = search.trim().toLowerCase();
        if (!term) return documents;
        return documents.filter((d) => d.fileName?.toLowerCase().includes(term));
    }, [documents, search]);

    const totalSize = useMemo(
        () => documents.reduce((sum, d) => sum + (d.fileSize || 0), 0),
        [documents]
    );

    const handleDragOver = (e) => { e.preventDefault(); e.stopPropagation(); setDragOver(true); };
    const handleDragLeave = (e) => { e.preventDefault(); e.stopPropagation(); setDragOver(false); };
    const handleDrop = (e) => {
        e.preventDefault(); e.stopPropagation(); setDragOver(false);
        if (e.dataTransfer.files) handleUpload(e.dataTransfer.files);
    };

    if (error) return <ErrorState error={error} onRetry={retry} />;

    return (
        <div className="space-y-3">
            {/* Zona de carga */}
            <div
                className={cn(
                    "cursor-pointer rounded-2xl border-2 border-dashed px-4 py-6 text-center transition-all",
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
                    <div className="mx-auto max-w-sm space-y-1" aria-live="polite">
                        <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                            <div
                                className="h-2 rounded-full bg-brand-600 transition-all duration-300"
                                style={{ width: `${uploading.progress}%` }}
                            />
                        </div>
                        <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                            Subiendo {uploading.index}/{uploading.total}: {uploading.name} — {uploading.progress}%
                        </p>
                    </div>
                ) : (
                    <div className="flex flex-col items-center gap-1">
                        <Upload className="h-6 w-6 text-gray-400 dark:text-gray-500" />
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                            Arrastra ficheros aquí o{" "}
                            <span className="font-medium text-brand-600 dark:text-brand-400">haz clic para seleccionar</span>
                        </p>
                        <p className="text-xs text-gray-400 dark:text-gray-500">
                            Máx. 10 MB por fichero · Imágenes, PDF, Word, Excel, PowerPoint, TXT, CSV
                        </p>
                    </div>
                )}
                <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv"
                    onChange={(e) => handleUpload(e.target.files)}
                    className="hidden"
                    aria-label="Seleccionar documentos del proyecto"
                />
            </div>

            {/* Buscador + resumen */}
            {documents.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                    <div className="relative min-w-0 flex-1 sm:max-w-xs">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                        <input
                            type="search"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Buscar documento…"
                            aria-label="Buscar documento"
                            className="input pl-9"
                        />
                    </div>
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                        {filtered.length} de {documents.length} · {formatFileSize(totalSize)}
                    </span>
                </div>
            )}

            {loading ? (
                <SkeletonRows rows={3} />
            ) : documents.length === 0 ? (
                <EmptyState
                    icon={FolderOpen}
                    title="Sin documentación"
                    description="Sube aquí planos, informes, fotografías o cualquier fichero que pertenezca al proyecto en su conjunto."
                />
            ) : filtered.length === 0 ? (
                <EmptyState
                    icon={Search}
                    title="Ningún documento coincide"
                    description="Prueba con otro término de búsqueda."
                    className="border-0 shadow-none"
                />
            ) : (
                <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {filtered.map((doc) => (
                        <li key={doc.id} className="card group flex gap-3 p-3">
                            {doc.isImage ? (
                                <button
                                    type="button"
                                    onClick={() => setPreviewUrl(doc.downloadURL)}
                                    className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl bg-surface-2"
                                    aria-label={`Vista previa de ${doc.fileName}`}
                                >
                                    <img src={doc.downloadURL} alt="" className="h-full w-full object-cover" />
                                </button>
                            ) : (
                                <span
                                    className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-xl bg-surface-2 text-2xl"
                                    aria-hidden="true"
                                >
                                    {getFileIcon(doc.fileType)}
                                </span>
                            )}

                            <div className="min-w-0 flex-1">
                                <a
                                    href={doc.downloadURL}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block truncate text-sm font-medium text-brand-600 hover:underline dark:text-brand-400"
                                    title={doc.fileName}
                                >
                                    {doc.fileName}
                                </a>
                                <p className="mt-0.5 truncate text-xs text-gray-500 dark:text-gray-400">
                                    {formatFileSize(doc.fileSize)} · {formatTimestampDate(doc.createdAt)}
                                </p>
                                <p className="truncate text-xs text-gray-400 dark:text-gray-500">
                                    {getUserName ? getUserName(doc.uploadedBy) : ""}
                                </p>

                                <div className="mt-1.5 flex items-center gap-1 opacity-100 transition-opacity lg:opacity-0 lg:group-hover:opacity-100 lg:group-focus-within:opacity-100">
                                    {doc.isImage && (
                                        <button
                                            type="button"
                                            onClick={() => setPreviewUrl(doc.downloadURL)}
                                            className="rounded p-1.5 text-gray-400 hover:text-brand-600 dark:hover:text-brand-400"
                                            aria-label={`Vista previa de ${doc.fileName}`}
                                            title="Vista previa"
                                        >
                                            <Eye className="h-4 w-4" />
                                        </button>
                                    )}
                                    <a
                                        href={doc.downloadURL}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="rounded p-1.5 text-gray-400 hover:text-green-600 dark:hover:text-green-400"
                                        aria-label={`Descargar ${doc.fileName}`}
                                        title="Descargar"
                                    >
                                        <Download className="h-4 w-4" />
                                    </a>
                                    <button
                                        type="button"
                                        onClick={() => handleDelete(doc)}
                                        className="rounded p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                                        aria-label={`Eliminar ${doc.fileName}`}
                                        title="Eliminar"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        </li>
                    ))}
                </ul>
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
                                type="button"
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
