import { useState, useEffect } from "react";
import { Download, X } from "lucide-react";

export default function InstallPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [showIosModal, setShowIosModal] = useState(false);

  useEffect(() => {
    // Si ya está instalada como standalone, no mostrar nada
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone;
    if (isStandalone) return;

    // Detectar iOS
    const ua = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(ua);

    if (isIosDevice) {
      setIsIos(true);
      const dismissed = localStorage.getItem("pdca_pwa_dismissed");
      if (!dismissed || Date.now() - parseInt(dismissed) > 7 * 24 * 60 * 60 * 1000) {
        setShowBanner(true);
      }
      return;
    }

    // Android / Chrome / Edge
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      const dismissed = localStorage.getItem("pdca_pwa_dismissed");
      if (!dismissed || Date.now() - parseInt(dismissed) > 7 * 24 * 60 * 60 * 1000) {
        setShowBanner(true);
      }
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (isIos) {
      setShowIosModal(true);
      return;
    }
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setShowBanner(false);
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowBanner(false);
    setShowIosModal(false);
    localStorage.setItem("pdca_pwa_dismissed", Date.now().toString());
  };

  if (!showBanner) return null;

  return (
    <>
      {/* Banner inferior */}
      <div className="fixed bottom-0 left-0 right-0 bg-blue-600 text-white px-4 py-3 flex items-center justify-between z-[9999] shadow-[0_-2px_10px_rgba(0,0,0,0.2)] gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Download className="w-6 h-6 flex-shrink-0" />
          <div className="flex flex-col leading-tight min-w-0">
            <span className="font-semibold text-sm truncate">Instalar PDCA BioSabor</span>
            <span className="text-xs opacity-85 truncate">Acceso directo en tu pantalla de inicio</span>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={handleInstall}
            className="bg-white text-blue-600 border-none rounded-lg px-4 py-2 font-bold cursor-pointer text-sm hover:bg-blue-50 transition"
          >
            Instalar
          </button>
          <button
            onClick={handleDismiss}
            className="bg-transparent border-none text-white cursor-pointer p-1 opacity-80 hover:opacity-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Modal instrucciones iOS */}
      {showIosModal && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-[10000] p-4"
          onClick={handleDismiss}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-sm w-full shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
              📱 Instalar en iPhone/iPad
            </h3>
            <ol className="space-y-3 text-sm text-gray-700 dark:text-gray-200 pl-5 list-decimal">
              <li>
                Pulsa el botón <strong>Compartir</strong>{" "}
                <span className="text-lg">⬆️</span> en la barra de Safari
              </li>
              <li>
                Selecciona <strong>"Añadir a pantalla de inicio"</strong>{" "}
                <span className="text-lg">➕</span>
              </li>
              <li>
                Pulsa <strong>"Añadir"</strong> en la esquina superior derecha
              </li>
            </ol>
            <button
              onClick={handleDismiss}
              className="w-full mt-5 py-2.5 bg-blue-600 text-white border-none rounded-lg font-bold cursor-pointer text-sm hover:bg-blue-700 transition"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </>
  );
}
