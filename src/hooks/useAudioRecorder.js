import { useCallback, useEffect, useRef, useState } from "react";

const MAX_SECONDS = 120;

// Graba audio del micrófono con MediaRecorder. stop() resuelve con el Blob
// grabado (undefined si se para sin haber grabado nada). Corte automático a
// MAX_SECONDS para acotar coste/tamaño (límite de Whisper: 25MB).
export default function useAudioRecorder() {
    const [status, setStatus] = useState("idle"); // idle | recording
    const [seconds, setSeconds] = useState(0);
    const recorderRef = useRef(null);
    const chunksRef = useRef([]);
    const streamRef = useRef(null);
    const resolveRef = useRef(null);
    const intervalRef = useRef(null);

    const cleanup = useCallback(() => {
        clearInterval(intervalRef.current);
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        recorderRef.current = null;
    }, []);

    const stop = useCallback(() => {
        return new Promise((resolve) => {
            const recorder = recorderRef.current;
            if (!recorder || recorder.state === "inactive") {
                resolve(undefined);
                return;
            }
            resolveRef.current = resolve;
            recorder.stop();
        });
    }, []);

    // Deja que los errores (permiso denegado, sin soporte, etc.) se propaguen:
    // el estado se mantiene "idle" para poder reintentar sin recargar.
    const start = useCallback(async () => {
        chunksRef.current = [];
        setSeconds(0);
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
        const recorder = new MediaRecorder(stream);
        recorderRef.current = recorder;

        recorder.ondataavailable = (e) => {
            if (e.data.size > 0) chunksRef.current.push(e.data);
        };
        recorder.onstop = () => {
            const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
            cleanup();
            setStatus("idle");
            resolveRef.current?.(blob);
            resolveRef.current = null;
        };

        recorder.start();
        setStatus("recording");
        intervalRef.current = setInterval(() => {
            setSeconds((s) => {
                if (s + 1 >= MAX_SECONDS) {
                    stop();
                    return s;
                }
                return s + 1;
            });
        }, 1000);
    }, [cleanup, stop]);

    useEffect(() => cleanup, [cleanup]);

    return { status, seconds, start, stop };
}
