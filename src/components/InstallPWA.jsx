import { useState, useEffect, useRef } from "react";
import { Download, X } from "lucide-react";
import Modal from "./ui/Modal";

export default function InstallPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [showIosModal, setShowIosModal] = useState(false);
  const bannerRef = useRef(null);

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

  // Publicar la altura del banner para que el layout reserve espacio y no
  // tape el contenido inferior de las páginas
  useEffect(() => {
    const root = document.documentElement;
    if (showBanner && bannerRef.current) {
      const height = bannerRef.current.offsetHeight;
      root.style.setProperty("--pwa-banner-h", `${height}px`);
    } else {
      root.style.removeProperty("--pwa-banner-h");
    }
    return () => root.style.removeProperty("--pwa-banner-h");
  }, [showBanner]);

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
      <div
        ref={bannerRef}
        className="fixed bottom-0 left-0 right-0 z-banner flex items-center justify-between gap-3 bg-brand-600 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] text-white shadow-[0_-2px_10px_rgba(0,0,0,0.2)]"
      >
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <Download className="h-6 w-6 flex-shrink-0" />
          <div className="flex min-w-0 flex-col leading-tight">
            <span className="truncate text-sm font-semibold">Instalar PDCA BioSabor</span>
            <span className="truncate text-xs opacity-85">Acceso directo en tu pantalla de inicio</span>
          </div>
        </div>
        <div className="flex flex-shrink-0 items-center gap-2">
          <button
            onClick={handleInstall}
            className="rounded-xl bg-white px-4 py-2 text-sm font-bold text-brand-600 transition-colors hover:bg-brand-50"
          >
            Instalar
          </button>
          <button
            onClick={handleDismiss}
            aria-label="Descartar aviso de instalación"
            className="p-2 opacity-80 transition-opacity hover:opacity-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Modal instrucciones iOS */}
      <Modal
        open={showIosModal}
        onClose={handleDismiss}
        title="Instalar en iPhone/iPad"
        size="sm"
        footer={
          <button onClick={handleDismiss} className="btn-primary w-full">
            Entendido
          </button>
        }
      >
        <ol className="list-decimal space-y-3 pl-5 text-sm text-gray-700 dark:text-gray-200">
          <li>
            Pulsa el botón <strong>Compartir</strong> <span className="text-lg">⬆️</span> en la barra
            de Safari
          </li>
          <li>
            Selecciona <strong>&quot;Añadir a pantalla de inicio&quot;</strong>{" "}
            <span className="text-lg">➕</span>
          </li>
          <li>
            Pulsa <strong>&quot;Añadir&quot;</strong> en la esquina superior derecha
          </li>
        </ol>
      </Modal>
    </>
  );
}
