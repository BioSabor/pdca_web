import { useState } from "react";
import { Mic, Square } from "lucide-react";
import useAudioRecorder from "../../hooks/useAudioRecorder";
import { transcribeAudio, extractActionFields } from "../../services/openaiService";
import { todayLocalISO } from "../../lib/dates";
import { useToast } from "../ui/Toast";
import Spinner from "../ui/Spinner";
import { cn } from "../../lib/utils";

function formatSeconds(total) {
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
}

/**
 * Botón de micrófono junto a "Nueva acción": graba una nota de voz, la
 * transcribe (Whisper) y extrae los campos de la acción (gpt-5.6-luna).
 * Al terminar entrega el resultado a onExtracted, que abre NewActionModal
 * pre-rellenado.
 */
export default function VoiceActionButton({ userOptions, onExtracted }) {
    const toast = useToast();
    const recorder = useAudioRecorder();
    const [processing, setProcessing] = useState(null); // null | "transcribing" | "analyzing"

    async function handleStop() {
        const blob = await recorder.stop();
        if (!blob || blob.size === 0) return;
        try {
            setProcessing("transcribing");
            const transcript = await transcribeAudio(blob);
            if (!transcript) {
                toast.error("No se detectó audio. Inténtalo de nuevo.");
                return;
            }
            setProcessing("analyzing");
            const result = await extractActionFields(transcript, {
                userOptions,
                todayISO: todayLocalISO(),
            });
            onExtracted(result);
        } catch (error) {
            console.error(error);
            toast.error("No se pudo procesar el audio.");
        } finally {
            setProcessing(null);
        }
    }

    async function handleClick() {
        if (recorder.status === "recording") {
            handleStop();
            return;
        }
        try {
            await recorder.start();
        } catch (error) {
            console.error(error);
            toast.error("No se pudo acceder al micrófono. Revisa los permisos del navegador.");
        }
    }

    if (processing) {
        return (
            <button type="button" disabled aria-live="polite" className="btn-secondary btn-sm">
                <Spinner size="sm" />
                {processing === "transcribing" ? "Transcribiendo…" : "Analizando…"}
            </button>
        );
    }

    const recording = recorder.status === "recording";

    return (
        <button
            type="button"
            onClick={handleClick}
            aria-label={recording ? "Detener grabación" : "Nueva acción por voz"}
            title={recording ? "Detener grabación" : "Nueva acción por voz"}
            className={cn(
                "btn-secondary btn-sm",
                recording &&
                    "border-red-300 bg-red-50 text-red-700 hover:bg-red-100 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300"
            )}
        >
            {recording ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            {recording && <span className="tabular-nums">{formatSeconds(recorder.seconds)}</span>}
        </button>
    );
}
