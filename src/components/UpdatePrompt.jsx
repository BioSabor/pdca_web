import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { registerSW } from "virtual:pwa-register";

let updateSWRef = null;

// Registra el service worker (una sola vez) y muestra un aviso discreto
// cuando hay una versión nueva desplegada.
export default function UpdatePrompt() {
    const [needRefresh, setNeedRefresh] = useState(false);

    useEffect(() => {
        // Limpieza one-shot del caché del SW manual antiguo
        if ("caches" in window) {
            caches.delete("pdca-web-v1").catch(() => {});
        }
        if (!updateSWRef) {
            updateSWRef = registerSW({
                onNeedRefresh() {
                    setNeedRefresh(true);
                },
            });
        }
    }, []);

    if (!needRefresh) return null;

    return (
        <div className="fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+var(--pwa-banner-h,0px))] z-toast flex justify-center p-3">
            <div className="flex items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3 shadow-overlay">
                <span className="text-sm text-gray-700 dark:text-gray-200">
                    Hay una nueva versión disponible
                </span>
                <button
                    type="button"
                    className="btn-primary btn-sm"
                    onClick={() => updateSWRef?.(true)}
                >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Actualizar
                </button>
            </div>
        </div>
    );
}
