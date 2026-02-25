import { storage, db } from "../firebase";
import {
    ref,
    uploadBytesResumable,
    getDownloadURL,
    deleteObject
} from "firebase/storage";
import {
    collection,
    addDoc,
    getDocs,
    deleteDoc,
    doc,
    query,
    where,
    orderBy,
    serverTimestamp,
    onSnapshot
} from "firebase/firestore";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

const ALLOWED_IMAGE_TYPES = [
    "image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"
];

const ALLOWED_DOC_TYPES = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "text/plain",
    "text/csv"
];

const ALLOWED_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_DOC_TYPES];

export function validateFile(file) {
    if (!file) return { valid: false, error: "No se ha seleccionado ningún archivo." };
    if (file.size > MAX_FILE_SIZE) return { valid: false, error: `El archivo supera el tamaño máximo (${MAX_FILE_SIZE / 1024 / 1024} MB).` };
    if (!ALLOWED_TYPES.includes(file.type)) return { valid: false, error: "Tipo de archivo no permitido. Se aceptan: imágenes (JPG, PNG, GIF, WebP, SVG) y documentos (PDF, Word, Excel, PowerPoint, TXT, CSV)." };
    return { valid: true };
}

export function isImageType(fileType) {
    return ALLOWED_IMAGE_TYPES.includes(fileType);
}

/**
 * Sube un archivo a Firebase Storage y registra metadatos en Firestore.
 */
export async function uploadAttachment(file, projectId, actionId, userId, onProgress) {
    const validation = validateFile(file);
    if (!validation.valid) throw new Error(validation.error);

    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const storagePath = `attachments/${projectId}/${actionId}/${timestamp}_${safeName}`;
    const storageRef = ref(storage, storagePath);

    return new Promise((resolve, reject) => {
        const uploadTask = uploadBytesResumable(storageRef, file);

        uploadTask.on("state_changed",
            (snapshot) => {
                const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
                if (onProgress) onProgress(progress);
            },
            (error) => {
                console.error("Error al subir archivo:", error);
                reject(new Error("Error al subir el archivo."));
            },
            async () => {
                try {
                    const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                    const attachmentData = {
                        projectId,
                        actionId,
                        fileName: file.name,
                        fileType: file.type,
                        fileSize: file.size,
                        storagePath,
                        downloadURL,
                        uploadedBy: userId,
                        isImage: isImageType(file.type),
                        createdAt: serverTimestamp()
                    };
                    const docRef = await addDoc(collection(db, "attachments"), attachmentData);
                    resolve({ id: docRef.id, ...attachmentData, createdAt: new Date() });
                } catch (err) {
                    console.error("Error al guardar metadatos:", err);
                    reject(new Error("Archivo subido pero error al guardar metadatos."));
                }
            }
        );
    });
}

/**
 * Obtiene todos los adjuntos de una acción.
 */
export async function getAttachments(projectId, actionId) {
    const q = query(
        collection(db, "attachments"),
        where("projectId", "==", projectId),
        where("actionId", "==", actionId)
    );
    const snapshot = await getDocs(q);
    const results = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    results.sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0));
    return results;
}

/**
 * Suscripción en tiempo real a los adjuntos de una acción.
 */
export function subscribeToAttachments(projectId, actionId, callback) {
    const q = query(
        collection(db, "attachments"),
        where("projectId", "==", projectId),
        where("actionId", "==", actionId)
    );
    return onSnapshot(q, (snapshot) => {
        const results = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        results.sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0));
        callback(results);
    }, (error) => {
        console.error("Error en suscripción de adjuntos:", error);
    });
}

/**
 * Elimina un adjunto (Storage + Firestore).
 */
export async function deleteAttachment(attachmentId, storagePath) {
    try {
        const storageRef = ref(storage, storagePath);
        await deleteObject(storageRef);
    } catch (err) {
        console.warn("No se pudo eliminar de Storage:", err);
    }
    await deleteDoc(doc(db, "attachments", attachmentId));
}

/**
 * Elimina todos los adjuntos de una acción.
 */
export async function deleteAllAttachments(projectId, actionId) {
    const attachments = await getAttachments(projectId, actionId);
    await Promise.all(attachments.map(att => deleteAttachment(att.id, att.storagePath)));
}

/**
 * Formatea tamaño de archivo para mostrar.
 */
export function formatFileSize(bytes) {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

/**
 * Devuelve un emoji/icono según el tipo de archivo.
 */
export function getFileIcon(fileType) {
    if (fileType?.startsWith("image/")) return "🖼️";
    if (fileType === "application/pdf") return "📕";
    if (fileType?.includes("word")) return "📘";
    if (fileType?.includes("excel") || fileType?.includes("spreadsheet")) return "📗";
    if (fileType?.includes("powerpoint") || fileType?.includes("presentation")) return "📙";
    if (fileType?.startsWith("text/")) return "📄";
    return "📎";
}
