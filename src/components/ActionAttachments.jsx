import { useState, useEffect, useRef, useCallback } from "react";
import { Paperclip, X, Download, Trash2, Eye, Upload } from "lucide-react";
import {
    uploadAttachment,
    deleteAttachment,
    subscribeToAttachments,
    validateFile,
    formatFileSize,
    getFileIcon,
} from "../services/attachmentService";

export default function ActionAttachments({ projectId, actionId, userId }) {
    const [attachments, setAttachments] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [error, setError] = useState("");
    const [dragOver, setDragOver] = useState(false);
    const [previewUrl, setPreviewUrl] = useState(null);
    const fileInputRef = useRef(null);

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
            } catch (err) {
                setError(err.message);
            } finally {
                setUploading(false);
                setUploadProgress(0);
            }
        }
        if (fileInputRef.current) fileInputRef.current.value = "";
    }, [projectId, actionId, userId]);

    const handleDelete = async (att) => {
        if (!confirm(`¿Eliminar "${att.fileName}"?`)) return;
        try {
            await deleteAttachment(att.id, att.storagePath);
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
                <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-1.5 text-xs text-red-600 dark:text-red-300">
                    <span className="flex-1">{error}</span>
                    <button onClick={() => setError("")} className="flex-shrink-0"><X className="w-3 h-3" /></button>
                </div>
            )}

            {/* Zona de carga con drag & drop */}
            <div
                className={`border-2 border-dashed rounded-lg px-4 py-3 text-center cursor-pointer transition-all
                    ${dragOver
                        ? "border-blue-400 bg-blue-50 dark:bg-blue-900/20"
                        : "border-gray-300 dark:border-gray-600 hover:border-blue-400 hover:bg-gray-50 dark:hover:bg-gray-800"}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
            >
                {uploading ? (
                    <div className="space-y-1">
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                            <div className="bg-blue-600 h-2 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Subiendo... {uploadProgress}%</p>
                    </div>
                ) : (
                    <div className="flex flex-col items-center gap-1">
                        <Upload className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            Arrastra archivos aquí o <span className="text-blue-600 dark:text-blue-400 font-medium">haz clic</span>
                        </p>
                        <p className="text-[10px] text-gray-400 dark:text-gray-500">Máx. 10 MB · Imágenes, PDF, Office, TXT, CSV</p>
                    </div>
                )}
                <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv"
                    onChange={(e) => handleUpload(e.target.files)}
                    className="hidden"
                />
            </div>

            {/* Lista de archivos adjuntos */}
            {attachments.length > 0 && (
                <div className="space-y-1">
                    {attachments.map((att) => (
                        <div key={att.id} className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-1.5 group">
                            <span className="text-base flex-shrink-0">{getFileIcon(att.fileType)}</span>
                            <div className="flex-1 min-w-0">
                                <a
                                    href={att.downloadURL}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline truncate block"
                                    title={att.fileName}
                                >
                                    {att.fileName}
                                </a>
                                <span className="text-[10px] text-gray-400 dark:text-gray-500">{formatFileSize(att.fileSize)}</span>
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                                {att.isImage && (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setPreviewUrl(att.downloadURL); }}
                                        className="p-1 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 rounded"
                                        title="Vista previa"
                                    >
                                        <Eye className="w-3.5 h-3.5" />
                                    </button>
                                )}
                                <a
                                    href={att.downloadURL}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-1 text-gray-400 hover:text-green-600 dark:hover:text-green-400 rounded"
                                    title="Descargar"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <Download className="w-3.5 h-3.5" />
                                </a>
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleDelete(att); }}
                                    className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded"
                                    title="Eliminar"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {attachments.length === 0 && (
                <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-1">Sin archivos adjuntos</p>
            )}

            {/* Modal vista previa de imagen */}
            {previewUrl && (
                <div
                    className="fixed inset-0 z-[9999] bg-black/80 flex items-center justify-center p-4"
                    onClick={() => setPreviewUrl(null)}
                >
                    <div className="relative max-w-[90vw] max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
                        <button
                            onClick={() => setPreviewUrl(null)}
                            className="absolute -top-3 -right-3 w-8 h-8 bg-white dark:bg-gray-800 rounded-full shadow-lg flex items-center justify-center text-gray-600 dark:text-gray-300 hover:text-red-500 z-10"
                        >
                            <X className="w-4 h-4" />
                        </button>
                        <img src={previewUrl} alt="Vista previa" className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg shadow-2xl" />
                    </div>
                </div>
            )}
        </div>
    );
}
